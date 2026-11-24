export type InputMode = 'chords' | 'degrees' | 'livePlaying';

export type OscillatorKind = 'sine' | 'square' | 'sawtooth' | 'triangle';

export type InstrumentPreset =
  | 'piano'
  | 'epiano'
  | 'organ'
  | 'pad'
  | 'strings'
  | 'pluck'
  | 'brass'
  | 'bell'
  | 'custom';

export type FilterKind = 'lowpass' | 'bandpass' | 'highpass';

export type ThemeMode = 'light' | 'dark';

export type ArpPattern = 'up' | 'down' | 'upDown' | 'downUp' | 'random' | 'chord';

export type ArpRate = '1/4' | '1/8' | '1/8T' | '1/16';

export interface ArpeggiatorSettings {
  enabled: boolean;
  pattern: ArpPattern;
  rate: ArpRate;
  octaves: number; // 1 | 2 | 3
  gate: number;    // 0.2..1.0
}

export type KeyModeKind =
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian'
  | 'harmonicMinor'
  | 'melodicMinor';

export interface ADSRSettings {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export type BpmSyncDivision =
  | '4/1'
  | '2/1'
  | '1/1'
  | '1/2.'
  | '1/2'
  | '1/4.'
  | '1/4'
  | '1/8.'
  | '1/8'
  | '1/8T'
  | '1/16';

export interface SynthEffectsSettings {
  reverb: {
    enabled: boolean;
    mix: number;   // 0..1
    decay: number; // 0.3..5.0 s
  };
  delay: {
    enabled: boolean;
    mix: number;      // 0..1
    time: number;     // 0.05..1.0 s
    feedback: number; // 0..0.85
    syncBpm: boolean;
    syncDivision: BpmSyncDivision;
  };
  chorus: {
    enabled: boolean;
    mix: number;   // 0..1
    rate: number;  // 0.1..5 Hz
    depth: number; // 0..1
    syncBpm: boolean;
    syncDivision: BpmSyncDivision;
  };
  flanger: {
    enabled: boolean;
    mix: number;      // 0..1
    rate: number;     // 0.1..5 Hz
    depth: number;    // 0..1
    feedback: number; // 0..0.85
    syncBpm: boolean;
    syncDivision: BpmSyncDivision;
  };
  phaser: {
    enabled: boolean;
    mix: number;      // 0..1
    rate: number;     // 0.1..5 Hz
    depth: number;    // 0..1
    feedback: number; // 0..0.85
    syncBpm: boolean;
    syncDivision: BpmSyncDivision;
  };
  vibrato: {
    enabled: boolean;
    rate: number;  // 0.5..12 Hz
    depth: number; // 0..100 cents
    syncBpm: boolean;
    syncDivision: BpmSyncDivision;
  };
  tremolo: {
    enabled: boolean;
    rate: number;  // 0.5..15 Hz
    depth: number; // 0..1
    syncBpm: boolean;
    syncDivision: BpmSyncDivision;
  };
}

export type EffectKey = keyof SynthEffectsSettings;

export interface ChordotronSettings {
  theme: ThemeMode;
  bpm: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  timeSignature: string;
  instrumentPreset: InstrumentPreset;
  oscillatorType: OscillatorKind;
  filterType: FilterKind;
  filterCutoff: number;    // 120..12000 Hz
  filterResonance: number; // 0.1..18 Q
  filterEnvAmount: number; // 0..1
  detuneCents: number;     // 0..40 cents
  subOscMix: number;       // 0..1
  metronomeVolume: number;
  loopToggle: boolean;
  metronomeAudioToggle: boolean;
  inputMode: InputMode;
  chordInput: string;
  scaleDegreeInput: string;
  songKey: string;
  keyMode: KeyModeKind;
  rangeStartMidi: number;
  rangeLength: number;
  masterGain: number;
  synthGain: number;
  livePlayingChords: string[];
  effects: SynthEffectsSettings;
  arpeggiator: ArpeggiatorSettings;
}

export interface ParsedChordToken {
  name: string;
  bassNoteName: string | null;
  beats: number;
  originalInputToken: string;
  error?: boolean;
  comment?: string;
}

export interface VoicedChord extends ParsedChordToken {
  frequencies: number[];
  wasSlashPlayed: boolean;
}

export interface AppNotice {
  id: number;
  type: 'info' | 'warning' | 'error';
  message: string;
}
