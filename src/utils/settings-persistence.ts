import {
  DEFAULT_MIN_MIDI_RANGE_START,
  DEFAULT_RANGE_LENGTH,
  LIVE_PLAYING_KEYS,
  MIDI_B5,
  MIDI_C2,
  defaultArpeggiatorSettings,
  defaultEffectsSettings,
  defaultSettings,
} from '../config/constants';
import type {
  ArpPattern,
  ArpRate,
  ArpeggiatorSettings,
  BpmSyncDivision,
  ChordotronSettings,
  FilterKind,
  InputMode,
  InstrumentPreset,
  KeyModeKind,
  OscillatorKind,
  SynthEffectsSettings,
  ThemeMode,
} from '../types/chordotron';
import { isValidBpmSyncDivision } from './bpm-sync';

const AUTOSAVE_KEY = 'chordotronAutosaveData_v2';

const VALID_THEMES: ThemeMode[] = ['light', 'dark'];
const VALID_INPUT_MODES: InputMode[] = ['chords', 'degrees', 'livePlaying'];
const VALID_OSCILLATORS: OscillatorKind[] = ['sine', 'square', 'sawtooth', 'triangle'];
const VALID_INSTRUMENTS: InstrumentPreset[] = [
  'piano',
  'epiano',
  'organ',
  'pad',
  'strings',
  'pluck',
  'brass',
  'bell',
  'custom',
];
const VALID_FILTER_TYPES: FilterKind[] = ['lowpass', 'bandpass', 'highpass'];
const VALID_KEY_MODES: KeyModeKind[] = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
  'harmonicMinor',
  'melodicMinor',
];

const VALID_ARP_PATTERNS: ArpPattern[] = ['up', 'down', 'upDown', 'downUp', 'random', 'chord'];
const VALID_ARP_RATES: ArpRate[] = ['1/4', '1/8', '1/8T', '1/16'];

export function createBlankResetSettings(preserveTheme?: ThemeMode): ChordotronSettings {
  return {
    ...defaultSettings,
    theme: preserveTheme ?? defaultSettings.theme,
    chordInput: '',
    scaleDegreeInput: '',
    livePlayingChords: Array(LIVE_PLAYING_KEYS.length).fill(''),
    effects: structuredClone(defaultEffectsSettings),
    arpeggiator: { ...defaultArpeggiatorSettings },
  };
}

function sanitizeArpeggiator(rawArp: Partial<ArpeggiatorSettings> | undefined): ArpeggiatorSettings {
  const def = defaultArpeggiatorSettings;
  if (!rawArp || typeof rawArp !== 'object') {
    return { ...def };
  }
  return {
    enabled: typeof rawArp.enabled === 'boolean' ? rawArp.enabled : def.enabled,
    pattern: VALID_ARP_PATTERNS.includes(rawArp.pattern as ArpPattern)
      ? (rawArp.pattern as ArpPattern)
      : def.pattern,
    rate: VALID_ARP_RATES.includes(rawArp.rate as ArpRate) ? (rawArp.rate as ArpRate) : def.rate,
    octaves: clampNumber(rawArp.octaves, 1, 3, def.octaves, true),
    gate: clampNumber(rawArp.gate, 0.2, 1.0, def.gate, false),
  };
}

function sanitizeSyncDivision(value: unknown, fallback: BpmSyncDivision): BpmSyncDivision {
  return isValidBpmSyncDivision(value) ? value : fallback;
}

function sanitizeEffects(rawEffects: Partial<SynthEffectsSettings> | undefined): SynthEffectsSettings {
  const def = defaultEffectsSettings;
  if (!rawEffects || typeof rawEffects !== 'object') {
    return structuredClone(def);
  }
  return {
    reverb: {
      enabled: typeof rawEffects.reverb?.enabled === 'boolean' ? rawEffects.reverb.enabled : def.reverb.enabled,
      mix: clampNumber(rawEffects.reverb?.mix, 0, 1, def.reverb.mix, false),
      decay: clampNumber(rawEffects.reverb?.decay, 0.3, 5.0, def.reverb.decay, false),
    },
    delay: {
      enabled: typeof rawEffects.delay?.enabled === 'boolean' ? rawEffects.delay.enabled : def.delay.enabled,
      mix: clampNumber(rawEffects.delay?.mix, 0, 1, def.delay.mix, false),
      time: clampNumber(rawEffects.delay?.time, 0.05, 1.0, def.delay.time, false),
      feedback: clampNumber(rawEffects.delay?.feedback, 0, 0.85, def.delay.feedback, false),
      syncBpm: typeof rawEffects.delay?.syncBpm === 'boolean' ? rawEffects.delay.syncBpm : def.delay.syncBpm,
      syncDivision: sanitizeSyncDivision(rawEffects.delay?.syncDivision, def.delay.syncDivision),
    },
    chorus: {
      enabled: typeof rawEffects.chorus?.enabled === 'boolean' ? rawEffects.chorus.enabled : def.chorus.enabled,
      mix: clampNumber(rawEffects.chorus?.mix, 0, 1, def.chorus.mix, false),
      rate: clampNumber(rawEffects.chorus?.rate, 0.1, 5.0, def.chorus.rate, false),
      depth: clampNumber(rawEffects.chorus?.depth, 0, 1, def.chorus.depth, false),
      syncBpm: typeof rawEffects.chorus?.syncBpm === 'boolean' ? rawEffects.chorus.syncBpm : def.chorus.syncBpm,
      syncDivision: sanitizeSyncDivision(rawEffects.chorus?.syncDivision, def.chorus.syncDivision),
    },
    flanger: {
      enabled: typeof rawEffects.flanger?.enabled === 'boolean' ? rawEffects.flanger.enabled : def.flanger.enabled,
      mix: clampNumber(rawEffects.flanger?.mix, 0, 1, def.flanger.mix, false),
      rate: clampNumber(rawEffects.flanger?.rate, 0.1, 5.0, def.flanger.rate, false),
      depth: clampNumber(rawEffects.flanger?.depth, 0, 1, def.flanger.depth, false),
      feedback: clampNumber(rawEffects.flanger?.feedback, 0, 0.85, def.flanger.feedback, false),
      syncBpm: typeof rawEffects.flanger?.syncBpm === 'boolean' ? rawEffects.flanger.syncBpm : def.flanger.syncBpm,
      syncDivision: sanitizeSyncDivision(rawEffects.flanger?.syncDivision, def.flanger.syncDivision),
    },
    phaser: {
      enabled: typeof rawEffects.phaser?.enabled === 'boolean' ? rawEffects.phaser.enabled : def.phaser.enabled,
      mix: clampNumber(rawEffects.phaser?.mix, 0, 1, def.phaser.mix, false),
      rate: clampNumber(rawEffects.phaser?.rate, 0.1, 5.0, def.phaser.rate, false),
      depth: clampNumber(rawEffects.phaser?.depth, 0, 1, def.phaser.depth, false),
      feedback: clampNumber(rawEffects.phaser?.feedback, 0, 0.85, def.phaser.feedback, false),
      syncBpm: typeof rawEffects.phaser?.syncBpm === 'boolean' ? rawEffects.phaser.syncBpm : def.phaser.syncBpm,
      syncDivision: sanitizeSyncDivision(rawEffects.phaser?.syncDivision, def.phaser.syncDivision),
    },
    vibrato: {
      enabled: typeof rawEffects.vibrato?.enabled === 'boolean' ? rawEffects.vibrato.enabled : def.vibrato.enabled,
      rate: clampNumber(rawEffects.vibrato?.rate, 0.5, 12.0, def.vibrato.rate, false),
      depth: clampNumber(rawEffects.vibrato?.depth, 0, 100, def.vibrato.depth, false),
      syncBpm: typeof rawEffects.vibrato?.syncBpm === 'boolean' ? rawEffects.vibrato.syncBpm : def.vibrato.syncBpm,
      syncDivision: sanitizeSyncDivision(rawEffects.vibrato?.syncDivision, def.vibrato.syncDivision),
    },
    tremolo: {
      enabled: typeof rawEffects.tremolo?.enabled === 'boolean' ? rawEffects.tremolo.enabled : def.tremolo.enabled,
      rate: clampNumber(rawEffects.tremolo?.rate, 0.5, 15.0, def.tremolo.rate, false),
      depth: clampNumber(rawEffects.tremolo?.depth, 0, 1, def.tremolo.depth, false),
      syncBpm: typeof rawEffects.tremolo?.syncBpm === 'boolean' ? rawEffects.tremolo.syncBpm : def.tremolo.syncBpm,
      syncDivision: sanitizeSyncDivision(rawEffects.tremolo?.syncDivision, def.tremolo.syncDivision),
    },
  };
}

export function sanitizeSettings(raw: Partial<ChordotronSettings> | null | undefined): ChordotronSettings {
  const base = {
    ...defaultSettings,
    effects: structuredClone(defaultEffectsSettings),
    arpeggiator: { ...defaultArpeggiatorSettings },
  };
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  const rangeLength = clampNumber(raw.rangeLength, 12, 24, DEFAULT_RANGE_LENGTH, true);
  const maxStart = MIDI_B5 - (rangeLength - 1);
  const rangeStartMidi = clampNumber(raw.rangeStartMidi, MIDI_C2, maxStart, DEFAULT_MIN_MIDI_RANGE_START, true);

  const liveChords =
    Array.isArray(raw.livePlayingChords) && raw.livePlayingChords.length === LIVE_PLAYING_KEYS.length
      ? raw.livePlayingChords.map((item) => (typeof item === 'string' ? item : ''))
      : [...base.livePlayingChords];

  return {
    theme: VALID_THEMES.includes(raw.theme as ThemeMode) ? (raw.theme as ThemeMode) : base.theme,
    bpm: clampNumber(raw.bpm, 30, 300, base.bpm, true),
    attack: clampNumber(raw.attack, 0.01, 2, base.attack, false),
    decay: clampNumber(raw.decay, 0.01, 2, base.decay, false),
    sustain: clampNumber(raw.sustain, 0, 1, base.sustain, false),
    release: clampNumber(raw.release, 0.01, 3, base.release, false),
    timeSignature:
      typeof raw.timeSignature === 'string' && /^\d+\/\d+$/.test(raw.timeSignature)
        ? raw.timeSignature
        : base.timeSignature,
    instrumentPreset: VALID_INSTRUMENTS.includes(raw.instrumentPreset as InstrumentPreset)
      ? (raw.instrumentPreset as InstrumentPreset)
      : base.instrumentPreset,
    oscillatorType: VALID_OSCILLATORS.includes(raw.oscillatorType as OscillatorKind)
      ? (raw.oscillatorType as OscillatorKind)
      : base.oscillatorType,
    filterType: VALID_FILTER_TYPES.includes(raw.filterType as FilterKind)
      ? (raw.filterType as FilterKind)
      : base.filterType,
    filterCutoff: clampNumber(raw.filterCutoff, 120, 12000, base.filterCutoff, true),
    filterResonance: clampNumber(raw.filterResonance, 0.1, 18, base.filterResonance, false),
    filterEnvAmount: clampNumber(raw.filterEnvAmount, 0, 1, base.filterEnvAmount, false),
    detuneCents: clampNumber(raw.detuneCents, 0, 40, base.detuneCents, true),
    subOscMix: clampNumber(raw.subOscMix, 0, 1, base.subOscMix, false),
    metronomeVolume: clampNumber(raw.metronomeVolume, 0, 1, base.metronomeVolume, false),
    loopToggle: typeof raw.loopToggle === 'boolean' ? raw.loopToggle : base.loopToggle,
    metronomeAudioToggle:
      typeof raw.metronomeAudioToggle === 'boolean' ? raw.metronomeAudioToggle : base.metronomeAudioToggle,
    inputMode: VALID_INPUT_MODES.includes(raw.inputMode as InputMode) ? (raw.inputMode as InputMode) : base.inputMode,
    chordInput: typeof raw.chordInput === 'string' ? raw.chordInput : base.chordInput,
    scaleDegreeInput: typeof raw.scaleDegreeInput === 'string' ? raw.scaleDegreeInput : base.scaleDegreeInput,
    songKey: typeof raw.songKey === 'string' ? raw.songKey : base.songKey,
    keyMode: VALID_KEY_MODES.includes(raw.keyMode as KeyModeKind) ? (raw.keyMode as KeyModeKind) : base.keyMode,
    rangeStartMidi,
    rangeLength,
    masterGain: clampNumber(raw.masterGain, 0, 1, base.masterGain, false),
    synthGain: clampNumber(raw.synthGain, 0, 1, base.synthGain, false),
    livePlayingChords: liveChords,
    effects: sanitizeEffects(raw.effects),
    arpeggiator: sanitizeArpeggiator(raw.arpeggiator),
  };
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
  integer: boolean
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const clamped = Math.max(min, Math.min(max, value));
  return integer ? Math.round(clamped) : clamped;
}

export function autosaveSettings(settings: ChordotronSettings): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function loadAutosavedSettings(): ChordotronSettings | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ChordotronSettings>;
    return sanitizeSettings(parsed);
  } catch {
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch {
      // Ignore
    }
    return null;
  }
}

export function clearAutosavedSettings(): void {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // Ignore
  }
}
