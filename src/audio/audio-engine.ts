import type {
  ADSRSettings,
  ChordotronSettings,
  InstrumentPreset,
  OscillatorKind,
  SynthEffectsSettings,
  VoicedChord,
} from '../types/chordotron';
import {
  buildArpStepFrequencies,
  generateArpEventsForChord,
  getArpStepDurationSec,
} from '../utils/arpeggiator';
import { bpmToDelaySeconds, bpmToLfoHz } from '../utils/bpm-sync';
import {
  frequencyToMidi,
  getBeatDurationFactorForTimeSignature,
  getBeatsPerMeasure,
  midiToFrequency,
} from '../utils/music-theory';

interface ActiveVoiceEntry {
  oscillators: OscillatorNode[];
  gainNode: GainNode;
  stopTime: number;
  type: 'chord' | 'metronome' | 'livePlaying' | 'audition';
}

interface SchedulerCallbacks {
  onChordChange: (index: number, allChords: VoicedChord[], activeMidiNotes: number[]) => void;
  onActiveNotesChange?: (activeMidiNotes: number[]) => void;
  onBeatTick: (beatIndexInMeasure: number, isDownbeat: boolean, sequenceBeatIndex: number) => void;
  onPlaybackComplete: () => void;
}

interface RecordingCallbacks {
  onStart: (startTimeMs: number) => void;
  onStop: (chunks: Blob[], mimeType: string, finalDurationSec: number | null) => void;
  onError: (message: string) => void;
}

interface EffectsRackNodes {
  input: GainNode;
  // Tremolo
  tremoloNode: GainNode;
  tremoloLfo: OscillatorNode;
  tremoloLfoGain: GainNode;
  // Phaser (4-stage allpass)
  phaserDry: GainNode;
  phaserWet: GainNode;
  phaserStages: BiquadFilterNode[];
  phaserFeedback: GainNode;
  phaserLfo: OscillatorNode;
  phaserLfoGain: GainNode;
  phaserOut: GainNode;
  // Flanger
  flangerDry: GainNode;
  flangerWet: GainNode;
  flangerDelay: DelayNode;
  flangerFeedback: GainNode;
  flangerLfo: OscillatorNode;
  flangerLfoGain: GainNode;
  flangerOut: GainNode;
  // Chorus
  chorusDry: GainNode;
  chorusWet: GainNode;
  chorusDelay: DelayNode;
  chorusLfo: OscillatorNode;
  chorusLfoGain: GainNode;
  chorusOut: GainNode;
  // Delay
  delayDry: GainNode;
  delayWet: GainNode;
  delayNode: DelayNode;
  delayFeedback: GainNode;
  delayDamping: BiquadFilterNode;
  delayOut: GainNode;
  // Reverb
  reverbDry: GainNode;
  reverbWet: GainNode;
  reverbConvolver: ConvolverNode;
  reverbDamping: BiquadFilterNode;
  reverbOut: GainNode;
  lastReverbDecay: number;
  // Global Vibrato LFO (connects to voice oscillator.detune)
  vibratoLfo: OscillatorNode;
  vibratoDepthGain: GainNode;
}

function buildImpulseResponse(ctx: AudioContext, decaySec: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = Math.max(0.3, Math.min(5.5, decaySec));
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const env = Math.pow(1 - t, 2.6);
      // Scaled to prevent high-energy convolver bursts before normalization
      channelData[i] = (Math.random() * 2 - 1) * env * 0.14;
    }
  }
  return buffer;
}

export class ChordotronAudioEngine {
  private audioCtx: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private safetyLimiter: DynamicsCompressorNode | null = null;
  private fx: EffectsRackNodes | null = null;
  private periodicWaves = new Map<string, PeriodicWave>();

  private recordStreamDestination: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingStartTimeMs: number | null = null;

  private activeVoices: ActiveVoiceEntry[] = [];
  private liveNodesMap = new Map<string, ActiveVoiceEntry[]>();
  private liveArpTimers = new Map<string, number>();
  private auditionNodesMap = new Map<number, ActiveVoiceEntry>();

  private sequencePlaying = false;
  private schedulerTimeoutId: number | null = null;
  private uiTimeouts = new Set<number>();
  private originalChords: VoicedChord[] = [];
  private currentChordIndex = 0;
  private currentBeatInSequence = 0;
  private nextEventTime = 0;

  private settingsGetter: () => ChordotronSettings;

  constructor(settingsGetter: () => ChordotronSettings) {
    this.settingsGetter = settingsGetter;
  }

  public isRecordingSupported(): boolean {
    return typeof MediaRecorder !== 'undefined';
  }

  private createEffectsRack(ctx: AudioContext, destination: AudioNode): EffectsRackNodes {
    const input = ctx.createGain();

    // 1. Tremolo
    const tremoloNode = ctx.createGain();
    tremoloNode.gain.value = 1;
    const tremoloLfo = ctx.createOscillator();
    tremoloLfo.type = 'sine';
    const tremoloLfoGain = ctx.createGain();
    tremoloLfoGain.gain.value = 0;
    tremoloLfo.connect(tremoloLfoGain);
    tremoloLfoGain.connect(tremoloNode.gain);
    tremoloLfo.start();
    input.connect(tremoloNode);

    // 2. Phaser (4 cascaded allpass filters)
    const phaserDry = ctx.createGain();
    const phaserWet = ctx.createGain();
    const phaserOut = ctx.createGain();
    const phaserFeedback = ctx.createGain();
    const phaserStages: BiquadFilterNode[] = [];
    for (let i = 0; i < 4; i++) {
      const stage = ctx.createBiquadFilter();
      stage.type = 'allpass';
      stage.frequency.value = 1100 + i * 340;
      stage.Q.value = 0.7;
      phaserStages.push(stage);
    }
    const phaserLfo = ctx.createOscillator();
    phaserLfo.type = 'sine';
    const phaserLfoGain = ctx.createGain();
    phaserLfo.connect(phaserLfoGain);
    for (const stage of phaserStages) {
      phaserLfoGain.connect(stage.frequency);
    }
    phaserLfo.start();

    tremoloNode.connect(phaserDry);
    phaserDry.connect(phaserOut);
    tremoloNode.connect(phaserStages[0]);
    for (let i = 0; i < phaserStages.length - 1; i++) {
      phaserStages[i].connect(phaserStages[i + 1]);
    }
    const lastStage = phaserStages[phaserStages.length - 1];
    lastStage.connect(phaserFeedback);
    phaserFeedback.connect(phaserStages[0]);
    lastStage.connect(phaserWet);
    phaserWet.connect(phaserOut);

    // 3. Flanger
    const flangerDry = ctx.createGain();
    const flangerWet = ctx.createGain();
    const flangerOut = ctx.createGain();
    const flangerDelay = ctx.createDelay(0.05);
    flangerDelay.delayTime.value = 0.0035;
    const flangerFeedback = ctx.createGain();
    const flangerLfo = ctx.createOscillator();
    flangerLfo.type = 'sine';
    const flangerLfoGain = ctx.createGain();
    flangerLfo.connect(flangerLfoGain);
    flangerLfoGain.connect(flangerDelay.delayTime);
    flangerLfo.start();

    phaserOut.connect(flangerDry);
    flangerDry.connect(flangerOut);
    phaserOut.connect(flangerDelay);
    flangerDelay.connect(flangerFeedback);
    flangerFeedback.connect(flangerDelay);
    flangerDelay.connect(flangerWet);
    flangerWet.connect(flangerOut);

    // 4. Chorus
    const chorusDry = ctx.createGain();
    const chorusWet = ctx.createGain();
    const chorusOut = ctx.createGain();
    const chorusDelay = ctx.createDelay(0.08);
    chorusDelay.delayTime.value = 0.022;
    const chorusLfo = ctx.createOscillator();
    chorusLfo.type = 'sine';
    const chorusLfoGain = ctx.createGain();
    chorusLfo.connect(chorusLfoGain);
    chorusLfoGain.connect(chorusDelay.delayTime);
    chorusLfo.start();

    flangerOut.connect(chorusDry);
    chorusDry.connect(chorusOut);
    flangerOut.connect(chorusDelay);
    chorusDelay.connect(chorusWet);
    chorusWet.connect(chorusOut);

    // 5. Delay
    const delayDry = ctx.createGain();
    const delayWet = ctx.createGain();
    const delayOut = ctx.createGain();
    const delayNode = ctx.createDelay(2.0);
    const delayFeedback = ctx.createGain();
    const delayDamping = ctx.createBiquadFilter();
    delayDamping.type = 'lowpass';
    delayDamping.frequency.value = 4500;

    chorusOut.connect(delayDry);
    delayDry.connect(delayOut);
    chorusOut.connect(delayNode);
    delayNode.connect(delayDamping);
    delayDamping.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayDamping.connect(delayWet);
    delayWet.connect(delayOut);

    // 6. Reverb
    const reverbDry = ctx.createGain();
    const reverbWet = ctx.createGain();
    const reverbOut = ctx.createGain();
    const reverbConvolver = ctx.createConvolver();
    reverbConvolver.normalize = true;
    const reverbDamping = ctx.createBiquadFilter();
    reverbDamping.type = 'lowpass';
    reverbDamping.frequency.value = 5500;
    const initialDecay = this.settingsGetter().effects.reverb.decay;
    reverbConvolver.buffer = buildImpulseResponse(ctx, initialDecay);

    delayOut.connect(reverbDry);
    reverbDry.connect(reverbOut);
    delayOut.connect(reverbConvolver);
    reverbConvolver.connect(reverbDamping);
    reverbDamping.connect(reverbWet);
    reverbWet.connect(reverbOut);

    reverbOut.connect(destination);

    // 7. Global Vibrato LFO
    const vibratoLfo = ctx.createOscillator();
    vibratoLfo.type = 'sine';
    const vibratoDepthGain = ctx.createGain();
    vibratoLfo.connect(vibratoDepthGain);
    vibratoLfo.start();

    return {
      input,
      tremoloNode,
      tremoloLfo,
      tremoloLfoGain,
      phaserDry,
      phaserWet,
      phaserStages,
      phaserFeedback,
      phaserLfo,
      phaserLfoGain,
      phaserOut,
      flangerDry,
      flangerWet,
      flangerDelay,
      flangerFeedback,
      flangerLfo,
      flangerLfoGain,
      flangerOut,
      chorusDry,
      chorusWet,
      chorusDelay,
      chorusLfo,
      chorusLfoGain,
      chorusOut,
      delayDry,
      delayWet,
      delayNode,
      delayFeedback,
      delayDamping,
      delayOut,
      reverbDry,
      reverbWet,
      reverbConvolver,
      reverbDamping,
      reverbOut,
      lastReverbDecay: initialDecay,
      vibratoLfo,
      vibratoDepthGain,
    };
  }

  public updateEffects(effects: SynthEffectsSettings, bpm?: number): void {
    if (!this.audioCtx || !this.fx) return;
    const now = this.audioCtx.currentTime;
    const fx = this.fx;
    const effectiveBpm = bpm ?? this.settingsGetter().bpm;

    const vibratoRate = effects.vibrato.syncBpm
      ? bpmToLfoHz(effectiveBpm, effects.vibrato.syncDivision)
      : effects.vibrato.rate;
    const tremoloRate = effects.tremolo.syncBpm
      ? bpmToLfoHz(effectiveBpm, effects.tremolo.syncDivision)
      : effects.tremolo.rate;
    const phaserRate = effects.phaser.syncBpm
      ? bpmToLfoHz(effectiveBpm, effects.phaser.syncDivision)
      : effects.phaser.rate;
    const flangerRate = effects.flanger.syncBpm
      ? bpmToLfoHz(effectiveBpm, effects.flanger.syncDivision)
      : effects.flanger.rate;
    const chorusRate = effects.chorus.syncBpm
      ? bpmToLfoHz(effectiveBpm, effects.chorus.syncDivision)
      : effects.chorus.rate;
    const delayTime = effects.delay.syncBpm
      ? bpmToDelaySeconds(effectiveBpm, effects.delay.syncDivision)
      : effects.delay.time;

    // Vibrato
    fx.vibratoLfo.frequency.setTargetAtTime(vibratoRate, now, 0.02);
    fx.vibratoDepthGain.gain.setTargetAtTime(
      effects.vibrato.enabled ? effects.vibrato.depth : 0,
      now,
      0.02
    );

    // Tremolo
    fx.tremoloLfo.frequency.setTargetAtTime(tremoloRate, now, 0.02);
    if (effects.tremolo.enabled) {
      const d = Math.max(0, Math.min(1, effects.tremolo.depth));
      fx.tremoloNode.gain.setTargetAtTime(1 - d * 0.5, now, 0.02);
      fx.tremoloLfoGain.gain.setTargetAtTime(d * 0.5, now, 0.02);
    } else {
      fx.tremoloNode.gain.setTargetAtTime(1, now, 0.02);
      fx.tremoloLfoGain.gain.setTargetAtTime(0, now, 0.02);
    }

    // Phaser (keep modulated frequency strictly >= 480 Hz)
    fx.phaserLfo.frequency.setTargetAtTime(phaserRate, now, 0.02);
    fx.phaserLfoGain.gain.setTargetAtTime(effects.phaser.depth * 620, now, 0.02);
    fx.phaserFeedback.gain.setTargetAtTime(
      effects.phaser.enabled ? Math.min(0.75, effects.phaser.feedback) : 0,
      now,
      0.02
    );
    const phaserWet = effects.phaser.enabled ? effects.phaser.mix * 0.75 : 0;
    fx.phaserDry.gain.setTargetAtTime(1 - phaserWet * 0.45, now, 0.02);
    fx.phaserWet.gain.setTargetAtTime(phaserWet, now, 0.02);

    // Flanger
    fx.flangerLfo.frequency.setTargetAtTime(flangerRate, now, 0.02);
    fx.flangerLfoGain.gain.setTargetAtTime(effects.flanger.depth * 0.0026, now, 0.02);
    fx.flangerFeedback.gain.setTargetAtTime(
      effects.flanger.enabled ? Math.min(0.75, effects.flanger.feedback) : 0,
      now,
      0.02
    );
    const flangerWet = effects.flanger.enabled ? effects.flanger.mix * 0.7 : 0;
    fx.flangerDry.gain.setTargetAtTime(1 - flangerWet * 0.4, now, 0.02);
    fx.flangerWet.gain.setTargetAtTime(flangerWet, now, 0.02);

    // Chorus
    fx.chorusLfo.frequency.setTargetAtTime(chorusRate, now, 0.02);
    fx.chorusLfoGain.gain.setTargetAtTime(effects.chorus.depth * 0.006, now, 0.02);
    const chorusWet = effects.chorus.enabled ? effects.chorus.mix * 0.75 : 0;
    fx.chorusDry.gain.setTargetAtTime(1 - chorusWet * 0.35, now, 0.02);
    fx.chorusWet.gain.setTargetAtTime(chorusWet, now, 0.02);

    // Delay
    fx.delayNode.delayTime.setTargetAtTime(delayTime, now, 0.03);
    fx.delayFeedback.gain.setTargetAtTime(
      effects.delay.enabled ? Math.min(0.78, effects.delay.feedback) : 0,
      now,
      0.02
    );
    const delayWet = effects.delay.enabled ? effects.delay.mix * 0.75 : 0;
    fx.delayDry.gain.setTargetAtTime(1 - delayWet * 0.2, now, 0.02);
    fx.delayWet.gain.setTargetAtTime(delayWet, now, 0.02);

    // Reverb
    if (Math.abs(effects.reverb.decay - fx.lastReverbDecay) > 0.08) {
      fx.lastReverbDecay = effects.reverb.decay;
      fx.reverbConvolver.buffer = buildImpulseResponse(this.audioCtx, effects.reverb.decay);
    }
    const reverbWet = effects.reverb.enabled ? effects.reverb.mix * 0.65 : 0;
    fx.reverbDry.gain.setTargetAtTime(1 - reverbWet * 0.35, now, 0.02);
    fx.reverbWet.gain.setTargetAtTime(reverbWet, now, 0.02);
  }

  private getPeriodicWaveForPreset(ctx: AudioContext, preset: InstrumentPreset): PeriodicWave | null {
    if (preset === 'custom' || preset === 'pad' || preset === 'strings' || preset === 'brass') {
      return null;
    }
    const cached = this.periodicWaves.get(preset);
    if (cached) return cached;

    let imag: number[];
    switch (preset) {
      case 'piano':
        imag = [0, 1.0, 0.52, 0.28, 0.16, 0.09, 0.05, 0.025];
        break;
      case 'epiano':
        imag = [0, 1.0, 0.22, 0.08, 0.04, 0.02];
        break;
      case 'organ':
        // Classic drawbar harmonics (8', 4', 2 2/3', 2', 1 3/5', 1')
        imag = [0, 1.0, 0.85, 0.48, 0.65, 0.18, 0.32, 0, 0.28];
        break;
      case 'pluck':
        imag = [0, 1.0, 0.65, 0.42, 0.28, 0.18, 0.12, 0.07];
        break;
      case 'bell':
        imag = [0, 1.0, 0.12, 0.42, 0.08, 0.24, 0.05, 0.14];
        break;
      default:
        return null;
    }
    const real = new Float32Array(imag.length);
    const wave = ctx.createPeriodicWave(real, new Float32Array(imag), { disableNormalization: false });
    this.periodicWaves.set(preset, wave);
    return wave;
  }

  private ensureContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();

      // Studio bus safety limiter prevents digital clipping on dense chords, resonance peaks, or stacked FX
      this.safetyLimiter = this.audioCtx.createDynamicsCompressor();
      this.safetyLimiter.threshold.value = -4;
      this.safetyLimiter.knee.value = 8;
      this.safetyLimiter.ratio.value = 12;
      this.safetyLimiter.attack.value = 0.003;
      this.safetyLimiter.release.value = 0.14;

      this.masterGainNode = this.audioCtx.createGain();
      const currentSettings = this.settingsGetter();
      this.masterGainNode.gain.value = currentSettings.masterGain;

      this.safetyLimiter.connect(this.masterGainNode);
      this.masterGainNode.connect(this.audioCtx.destination);

      this.fx = this.createEffectsRack(this.audioCtx, this.safetyLimiter);
      this.updateEffects(currentSettings.effects, currentSettings.bpm);

      if (typeof this.audioCtx.createMediaStreamDestination === 'function') {
        this.recordStreamDestination = this.audioCtx.createMediaStreamDestination();
        this.masterGainNode.connect(this.recordStreamDestination);
      }
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public resumeIfNeeded(): void {
    this.ensureContext();
  }

  public setMasterGain(value: number): void {
    if (this.audioCtx && this.masterGainNode) {
      this.masterGainNode.gain.setValueAtTime(value, this.audioCtx.currentTime);
    }
  }

  public silenceMetronome(): void {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    this.activeVoices = this.activeVoices.filter((entry) => {
      if (entry.type === 'metronome') {
        try {
          entry.gainNode.gain.cancelScheduledValues(now);
          entry.gainNode.gain.setValueAtTime(entry.gainNode.gain.value, now);
          entry.gainNode.gain.linearRampToValueAtTime(0, now + 0.02);
          for (const osc of entry.oscillators) {
            osc.stop(now + 0.03);
          }
        } catch {
          // Ignore
        }
        return false;
      }
      return true;
    });
  }

  private createVoiceSource(
    freq: number,
    startTime: number,
    adsr: ADSRSettings,
    noteHeldDuration: number,
    oscillatorType: OscillatorKind,
    targetGainValue: number,
    isMetronome = false
  ): { oscillators: OscillatorNode[]; gainNode: GainNode; theoreticalEndTime: number } | null {
    if (freq <= 0) return null;
    const ctx = this.ensureContext();
    if (!this.masterGainNode || !this.fx) return null;

    if (isMetronome) {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = oscillatorType;
      osc.frequency.setValueAtTime(freq, startTime);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(targetGainValue, startTime + adsr.attack);
      const sustainStart = startTime + adsr.attack + adsr.decay;
      gainNode.gain.linearRampToValueAtTime(targetGainValue * adsr.sustain, sustainStart);
      const releaseStart = startTime + noteHeldDuration;
      if (releaseStart > sustainStart) {
        gainNode.gain.setValueAtTime(targetGainValue * adsr.sustain, releaseStart);
      }
      gainNode.gain.linearRampToValueAtTime(0, releaseStart + adsr.release);
      osc.connect(gainNode);
      gainNode.connect(this.masterGainNode);
      osc.start(startTime);
      return {
        oscillators: [osc],
        gainNode,
        theoreticalEndTime: releaseStart + adsr.release,
      };
    }

    const s = this.settingsGetter();
    const oscillators: OscillatorNode[] = [];
    const voiceMixer = ctx.createGain();
    // Normalize internal oscillator summing + resonant Q peak headroom
    const detuneWeight = s.detuneCents > 0 ? 0.55 : 0;
    const subWeight = s.subOscMix > 0.01 ? s.subOscMix * 0.6 : 0;
    const resonanceHeadroom = 1 / (1 + Math.max(0, s.filterResonance - 3) * 0.07);
    voiceMixer.gain.value = (1 / (1 + detuneWeight + subWeight)) * resonanceHeadroom;

    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();

    filter.type = s.filterType;
    filter.Q.setValueAtTime(s.filterResonance, startTime);

    const baseCutoff = Math.max(80, Math.min(18000, s.filterCutoff));
    const envPeakCutoff = Math.min(18000, baseCutoff + s.filterEnvAmount * (14000 - baseCutoff));
    filter.frequency.setValueAtTime(baseCutoff, startTime);
    if (s.filterEnvAmount > 0.01) {
      filter.frequency.linearRampToValueAtTime(envPeakCutoff, startTime + adsr.attack);
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(80, baseCutoff),
        startTime + adsr.attack + Math.max(0.05, adsr.decay)
      );
    }

    const customWave = this.getPeriodicWaveForPreset(ctx, s.instrumentPreset);
    const primaryOsc = ctx.createOscillator();
    if (customWave) {
      primaryOsc.setPeriodicWave(customWave);
    } else {
      primaryOsc.type = oscillatorType;
    }
    primaryOsc.frequency.setValueAtTime(freq, startTime);
    this.fx.vibratoDepthGain.connect(primaryOsc.detune);

    const primaryGain = ctx.createGain();
    primaryGain.gain.value = 1.0;
    primaryOsc.connect(primaryGain);
    primaryGain.connect(voiceMixer);
    oscillators.push(primaryOsc);

    // Optional detuned unison voice
    if (s.detuneCents > 0) {
      const detunedOsc = ctx.createOscillator();
      if (customWave) {
        detunedOsc.setPeriodicWave(customWave);
      } else {
        detunedOsc.type = oscillatorType;
      }
      detunedOsc.frequency.setValueAtTime(freq, startTime);
      detunedOsc.detune.setValueAtTime(s.detuneCents * 0.5, startTime);
      primaryOsc.detune.setValueAtTime(-s.detuneCents * 0.5, startTime);
      this.fx.vibratoDepthGain.connect(detunedOsc.detune);

      const detunedGain = ctx.createGain();
      detunedGain.gain.value = detuneWeight;
      detunedOsc.connect(detunedGain);
      detunedGain.connect(voiceMixer);
      oscillators.push(detunedOsc);
    }

    // Optional sub-oscillator (-1 octave)
    if (s.subOscMix > 0.01) {
      const subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(freq * 0.5, startTime);
      this.fx.vibratoDepthGain.connect(subOsc.detune);
      const subGain = ctx.createGain();
      subGain.gain.value = subWeight;
      subOsc.connect(subGain);
      subGain.connect(voiceMixer);
      oscillators.push(subOsc);
    }

    // Subtle FM attack transient (bounded strictly below carrier freq to avoid aliasing/negative swing)
    if (s.instrumentPreset === 'bell' || s.instrumentPreset === 'epiano') {
      const fmOsc = ctx.createOscillator();
      fmOsc.type = 'sine';
      fmOsc.frequency.setValueAtTime(
        freq * (s.instrumentPreset === 'bell' ? 2.756 : 4.0),
        startTime
      );
      const fmGain = ctx.createGain();
      const fmPeak = s.instrumentPreset === 'bell' ? freq * 0.42 : freq * 0.16;
      fmGain.gain.setValueAtTime(fmPeak, startTime);
      fmGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      fmOsc.connect(fmGain);
      fmGain.connect(primaryOsc.frequency);
      oscillators.push(fmOsc);
    }

    // ADSR Amplitude Envelope (strictly monotonic timestamps)
    const safeTargetGain = Math.max(0, Math.min(0.85, targetGainValue));
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(safeTargetGain, startTime + adsr.attack);

    const sustainStartTime = startTime + adsr.attack + adsr.decay;
    const sustainLevelAbsolute = safeTargetGain * adsr.sustain;
    gainNode.gain.linearRampToValueAtTime(sustainLevelAbsolute, sustainStartTime);

    if (noteHeldDuration !== Infinity) {
      const releasePhaseStartTime = startTime + noteHeldDuration;
      if (releasePhaseStartTime > sustainStartTime) {
        gainNode.gain.setValueAtTime(sustainLevelAbsolute, releasePhaseStartTime);
      }
      gainNode.gain.linearRampToValueAtTime(0, releasePhaseStartTime + adsr.release);
    }

    voiceMixer.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.fx.input);

    for (const osc of oscillators) {
      osc.start(startTime);
    }

    const theoreticalEndTime =
      noteHeldDuration === Infinity ? Infinity : startTime + noteHeldDuration + adsr.release;

    return { oscillators, gainNode, theoreticalEndTime };
  }

  private fadeOutVoice(gainNode: GainNode, oscillators: OscillatorNode[], releaseTime: number): void {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    const safeRelease = Math.max(0.015, releaseTime);
    try {
      const gainParam = gainNode.gain as AudioParam & { cancelAndHoldAtTime?: (t: number) => void };
      if (typeof gainParam.cancelAndHoldAtTime === 'function') {
        gainParam.cancelAndHoldAtTime(now);
      } else {
        gainParam.cancelScheduledValues(now);
        gainParam.setValueAtTime(gainParam.value, now);
      }
      gainParam.linearRampToValueAtTime(0, now + safeRelease);
      for (const osc of oscillators) {
        osc.stop(now + safeRelease + 0.02);
      }
    } catch {
      // Ignore already stopped oscillators
    }
  }

  private playTimedFrequencies(
    frequencies: number[],
    noteHeldDuration: number,
    startTime: number,
    adsr: ADSRSettings,
    oscillatorType: OscillatorKind,
    gainValue: number,
    type: 'chord' | 'metronome'
  ): void {
    const newEntries: ActiveVoiceEntry[] = [];
    // Scale gain inversely with sqrt(polyphony) to keep multi-note chords clean and distortion-free
    const polyScale =
      type === 'metronome'
        ? 0.45
        : 0.68 / Math.sqrt(Math.max(1, frequencies.length));
    const perVoiceGain = gainValue * polyScale;

    for (const freq of frequencies) {
      const source = this.createVoiceSource(
        freq,
        startTime,
        adsr,
        noteHeldDuration,
        oscillatorType,
        perVoiceGain,
        type === 'metronome'
      );
      if (source) {
        for (const osc of source.oscillators) {
          osc.stop(source.theoreticalEndTime + 0.01);
        }
        newEntries.push({
          oscillators: source.oscillators,
          gainNode: source.gainNode,
          stopTime: source.theoreticalEndTime,
          type,
        });
      }
    }
    const ctxNow = this.audioCtx?.currentTime ?? 0;
    this.activeVoices = [
      ...this.activeVoices.filter((entry) => entry.stopTime > ctxNow),
      ...newEntries,
    ];
  }

  public startLiveChord(
    frequencies: number[],
    keyIdentifier: string,
    adsr: ADSRSettings,
    oscillatorType: OscillatorKind,
    synthGain: number,
    onArpNotes?: (midiNotes: number[]) => void
  ): void {
    const ctx = this.ensureContext();
    if (this.liveNodesMap.has(keyIdentifier) || this.liveArpTimers.has(keyIdentifier)) {
      this.stopLiveChord(keyIdentifier, 0.015);
    }

    const s = this.settingsGetter();
    if (s.arpeggiator.enabled && frequencies.length > 0) {
      let stepIdx = 0;
      const triggerStep = () => {
        const latest = this.settingsGetter();
        const stepDur = getArpStepDurationSec(latest.bpm, latest.arpeggiator.rate);
        const noteDur = Math.max(0.03, stepDur * Math.max(0.15, Math.min(1, latest.arpeggiator.gate)));
        const stepFreqs = buildArpStepFrequencies(frequencies, latest.arpeggiator, stepIdx);
        const now = this.audioCtx?.currentTime ?? ctx.currentTime;
        const stepAdsr: ADSRSettings = {
          attack: Math.max(0.01, latest.attack),
          decay: Math.max(0.01, latest.decay),
          sustain: latest.sustain,
          release: Math.max(0.015, Math.min(latest.release, stepDur * 1.1)),
        };
        this.playTimedFrequencies(
          stepFreqs,
          noteDur,
          now + 0.01,
          stepAdsr,
          latest.oscillatorType,
          latest.synthGain,
          'chord'
        );
        onArpNotes?.(stepFreqs.map((f) => frequencyToMidi(f)));
        stepIdx += 1;
      };

      triggerStep();
      const stepMs = Math.max(40, getArpStepDurationSec(s.bpm, s.arpeggiator.rate) * 1000);
      const timerId = window.setInterval(triggerStep, stepMs);
      this.liveArpTimers.set(keyIdentifier, timerId);
      return;
    }

    const entries: ActiveVoiceEntry[] = [];
    const startTime = ctx.currentTime;
    const polyScale = 0.68 / Math.sqrt(Math.max(1, frequencies.length));
    const perVoiceGain = synthGain * polyScale;

    for (const freq of frequencies) {
      const source = this.createVoiceSource(
        freq,
        startTime,
        adsr,
        Infinity,
        oscillatorType,
        perVoiceGain,
        false
      );
      if (source) {
        entries.push({
          oscillators: source.oscillators,
          gainNode: source.gainNode,
          stopTime: Infinity,
          type: 'livePlaying',
        });
      }
    }
    this.liveNodesMap.set(keyIdentifier, entries);
  }

  public stopLiveChord(keyIdentifier: string, customReleaseTime?: number): void {
    const arpTimer = this.liveArpTimers.get(keyIdentifier);
    if (arpTimer !== undefined) {
      clearInterval(arpTimer);
      this.liveArpTimers.delete(keyIdentifier);
    }

    const entries = this.liveNodesMap.get(keyIdentifier);
    if (!entries || entries.length === 0 || !this.audioCtx) {
      this.liveNodesMap.delete(keyIdentifier);
      return;
    }

    const releaseTime =
      customReleaseTime !== undefined
        ? customReleaseTime
        : Math.max(0.015, this.settingsGetter().release);

    for (const { oscillators, gainNode } of entries) {
      this.fadeOutVoice(gainNode, oscillators, releaseTime);
    }
    this.liveNodesMap.delete(keyIdentifier);
  }

  public stopAllLiveChords(customReleaseTime?: number): void {
    const allKeys = new Set<string>([
      ...Array.from(this.liveNodesMap.keys()),
      ...Array.from(this.liveArpTimers.keys()),
    ]);
    for (const keyId of allKeys) {
      this.stopLiveChord(keyId, customReleaseTime);
    }
  }

  public startAuditionNote(midiNote: number): void {
    const ctx = this.ensureContext();
    if (this.auditionNodesMap.has(midiNote)) {
      this.stopAuditionNote(midiNote);
    }
    const s = this.settingsGetter();
    const freq = midiToFrequency(midiNote);
    const source = this.createVoiceSource(
      freq,
      ctx.currentTime,
      {
        attack: Math.max(0.01, s.attack),
        decay: Math.max(0.01, s.decay),
        sustain: s.sustain,
        release: Math.max(0.015, s.release),
      },
      Infinity,
      s.oscillatorType,
      s.synthGain * 0.68,
      false
    );
    if (source) {
      this.auditionNodesMap.set(midiNote, {
        oscillators: source.oscillators,
        gainNode: source.gainNode,
        stopTime: Infinity,
        type: 'audition',
      });
    }
  }

  public stopAuditionNote(midiNote: number): void {
    const entry = this.auditionNodesMap.get(midiNote);
    if (!entry || !this.audioCtx) {
      this.auditionNodesMap.delete(midiNote);
      return;
    }
    const releaseTime = Math.max(0.015, this.settingsGetter().release);
    this.fadeOutVoice(entry.gainNode, entry.oscillators, releaseTime);
    this.auditionNodesMap.delete(midiNote);
  }

  private scheduleUiTimeout(fn: () => void, delayMs: number): void {
    const id = window.setTimeout(() => {
      this.uiTimeouts.delete(id);
      fn();
    }, Math.max(0, delayMs));
    this.uiTimeouts.add(id);
  }

  public startSequence(
    chords: VoicedChord[],
    isSelectionPlayback: boolean,
    callbacks: SchedulerCallbacks
  ): void {
    const ctx = this.ensureContext();
    this.stopSequence();

    this.originalChords = chords;
    this.sequencePlaying = true;
    this.currentChordIndex = -1;
    this.currentBeatInSequence = 0;
    this.nextEventTime = ctx.currentTime + 0.08;

    this.scheduleNextEvent(isSelectionPlayback, callbacks);
  }

  private scheduleNextEvent(isSelectionPlayback: boolean, callbacks: SchedulerCallbacks): void {
    if (!this.sequencePlaying || !this.audioCtx) return;

    this.currentChordIndex += 1;
    const settings = this.settingsGetter();

    if (this.currentChordIndex >= this.originalChords.length) {
      if (!settings.loopToggle) {
        let lastChordDuration = 0;
        if (this.originalChords.length > 0) {
          const lastChord = this.originalChords[this.originalChords.length - 1];
          const quarterNoteDuration = 60 / settings.bpm;
          const timeSigBeatFactor = getBeatDurationFactorForTimeSignature(settings.timeSignature);
          lastChordDuration = lastChord.beats * quarterNoteDuration * timeSigBeatFactor;
        }
        const releaseSec = Math.max(0.01, settings.release);
        const lastChordReleaseStartTime = this.nextEventTime - lastChordDuration;
        const lastSoundTheoreticalEndTime = lastChordReleaseStartTime + releaseSec;
        const uiResetDelay = (lastSoundTheoreticalEndTime - this.audioCtx.currentTime + 0.1) * 1000;

        this.schedulerTimeoutId = window.setTimeout(() => {
          if (this.sequencePlaying) {
            this.stopSequence();
            callbacks.onPlaybackComplete();
          }
        }, Math.max(0, uiResetDelay));
        return;
      }

      this.currentChordIndex = 0;
      this.currentBeatInSequence = 0;
    }

    const chordToPlay = this.originalChords[this.currentChordIndex];
    const chordStartTime = this.nextEventTime;
    const quarterNoteDuration = 60 / settings.bpm;
    const timeSigBeatFactor = getBeatDurationFactorForTimeSignature(settings.timeSignature);
    const actualSingleBeatDuration = quarterNoteDuration * timeSigBeatFactor;
    const beatsPerMeasure = getBeatsPerMeasure(settings.timeSignature);

    const adsr: ADSRSettings = {
      attack: Math.max(0.01, settings.attack),
      decay: Math.max(0.01, settings.decay),
      sustain: settings.sustain,
      release: Math.max(0.01, settings.release),
    };

    for (let i = 0; i < chordToPlay.beats; i++) {
      const tickTime = chordStartTime + i * actualSingleBeatDuration;
      const sequenceBeatIndex = this.currentBeatInSequence;
      const visualBeatIndex = sequenceBeatIndex % beatsPerMeasure;
      const isDownbeat = visualBeatIndex === 0;
      const visualDelayMs = (tickTime - this.audioCtx.currentTime) * 1000 - 10;

      this.scheduleUiTimeout(() => {
        if (this.sequencePlaying) {
          callbacks.onBeatTick(visualBeatIndex, isDownbeat, sequenceBeatIndex);
        }
      }, visualDelayMs);

      const latestSettings = this.settingsGetter();
      if (latestSettings.metronomeAudioToggle && latestSettings.metronomeVolume > 0) {
        this.playTimedFrequencies(
          [isDownbeat ? 1200 : 1000],
          0.05,
          tickTime,
          { attack: 0.005, decay: 0.03, sustain: 0.1, release: 0.06 },
          'sine',
          latestSettings.metronomeVolume,
          'metronome'
        );
      }

      this.currentBeatInSequence += 1;
    }

    const noteHeldDuration = chordToPlay.beats * actualSingleBeatDuration;
    const frequencies = chordToPlay.frequencies;
    const chordIndexSnapshot = this.currentChordIndex;

    if (settings.arpeggiator.enabled && frequencies && frequencies.length > 0) {
      const arpEvents = generateArpEventsForChord(
        frequencies,
        chordStartTime,
        noteHeldDuration,
        settings.bpm,
        settings.arpeggiator
      );

      // Update Prev / Current / Next chord labels at chord start
      const chordDisplayDelayMs = (chordStartTime - this.audioCtx.currentTime) * 1000 - 20;
      const initialStepNotes = arpEvents[0]?.frequencies.map((f) => frequencyToMidi(f)) ?? [];
      this.scheduleUiTimeout(() => {
        if (this.sequencePlaying) {
          callbacks.onChordChange(chordIndexSnapshot, this.originalChords, initialStepNotes);
        }
      }, chordDisplayDelayMs);

      for (let stepIdx = 0; stepIdx < arpEvents.length; stepIdx++) {
        const ev = arpEvents[stepIdx];
        const stepAdsr: ADSRSettings = {
          attack: Math.min(adsr.attack, Math.max(0.008, ev.durationSec * 0.45)),
          decay: adsr.decay,
          sustain: adsr.sustain,
          release: Math.min(adsr.release, Math.max(0.02, ev.durationSec * 0.9)),
        };
        this.playTimedFrequencies(
          ev.frequencies,
          ev.durationSec,
          ev.startTime,
          stepAdsr,
          settings.oscillatorType,
          settings.synthGain,
          'chord'
        );

        if (stepIdx > 0) {
          const stepNotes = ev.frequencies.map((f) => frequencyToMidi(f));
          const stepDelayMs = (ev.startTime - this.audioCtx.currentTime) * 1000 - 15;
          this.scheduleUiTimeout(() => {
            if (this.sequencePlaying) {
              callbacks.onActiveNotesChange?.(stepNotes);
            }
          }, stepDelayMs);
        }
      }
    } else {
      if (frequencies && frequencies.length > 0) {
        this.playTimedFrequencies(
          frequencies,
          noteHeldDuration,
          chordStartTime,
          adsr,
          settings.oscillatorType,
          settings.synthGain,
          'chord'
        );
      }

      const activeMidiNotes = frequencies ? frequencies.map((f) => frequencyToMidi(f)) : [];
      const displayDelayMs = (chordStartTime - this.audioCtx.currentTime) * 1000 - 20;

      this.scheduleUiTimeout(() => {
        if (this.sequencePlaying) {
          callbacks.onChordChange(chordIndexSnapshot, this.originalChords, activeMidiNotes);
        }
      }, displayDelayMs);
    }

    this.nextEventTime += noteHeldDuration;
    const timeUntilNextMs = (this.nextEventTime - this.audioCtx.currentTime) * 1000;
    this.schedulerTimeoutId = window.setTimeout(() => {
      this.scheduleNextEvent(isSelectionPlayback, callbacks);
    }, Math.max(0, timeUntilNextMs - 50));
  }

  public stopSequence(): void {
    this.sequencePlaying = false;
    if (this.schedulerTimeoutId !== null) {
      clearTimeout(this.schedulerTimeoutId);
      this.schedulerTimeoutId = null;
    }
    for (const id of this.uiTimeouts) {
      clearTimeout(id);
    }
    this.uiTimeouts.clear();

    if (this.audioCtx) {
      const releaseTime = Math.max(0.015, this.settingsGetter().release);
      for (const { oscillators, gainNode } of this.activeVoices) {
        this.fadeOutVoice(gainNode, oscillators, releaseTime);
      }
    }
    this.activeVoices = [];
    this.stopAllLiveChords();
  }

  public startRecording(callbacks: RecordingCallbacks): void {
    this.ensureContext();
    if (!this.recordStreamDestination) {
      callbacks.onError('Audio recording is not supported in this browser.');
      return;
    }
    this.recordedChunks = [];
    try {
      let recorder: MediaRecorder;
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        recorder = new MediaRecorder(this.recordStreamDestination.stream, {
          mimeType: 'audio/webm;codecs=opus',
        });
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        recorder = new MediaRecorder(this.recordStreamDestination.stream, { mimeType: 'audio/wav' });
      } else {
        recorder = new MediaRecorder(this.recordStreamDestination.stream);
      }
      this.mediaRecorder = recorder;
    } catch (err) {
      callbacks.onError(
        `Could not start audio recorder: ${err instanceof Error ? err.message : 'Unsupported format'}`
      );
      return;
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const finalDuration =
        this.recordingStartTimeMs !== null ? (Date.now() - this.recordingStartTimeMs) / 1000 : null;
      this.recordingStartTimeMs = null;
      const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
      callbacks.onStop([...this.recordedChunks], mimeType, finalDuration);
    };

    this.mediaRecorder.onerror = () => {
      callbacks.onError('An error occurred during audio recording.');
      this.stopRecording();
    };

    try {
      this.mediaRecorder.start();
      this.recordingStartTimeMs = Date.now();
      callbacks.onStart(this.recordingStartTimeMs);
    } catch (err) {
      this.mediaRecorder = null;
      callbacks.onError(
        `Could not start recording: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  public stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  public dispose(): void {
    this.stopSequence();
    this.stopRecording();
    for (const midiNote of Array.from(this.auditionNodesMap.keys())) {
      this.stopAuditionNote(midiNote);
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
    this.audioCtx = null;
    this.fx = null;
  }
}
