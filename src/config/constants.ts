import type {
  ArpPattern,
  ArpRate,
  ArpeggiatorSettings,
  ChordotronSettings,
  EffectKey,
  FilterKind,
  InstrumentPreset,
  KeyModeKind,
  OscillatorKind,
  SynthEffectsSettings,
} from '../types/chordotron';

export const ALL_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export const NOTE_NAMES_MAP: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
  'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
  'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11,
};

export const A4 = 440;
export const SEMITONES_IN_OCTAVE = 12;

export const MIDI_C2 = 36;
export const MIDI_C3 = 48;
export const MIDI_C4 = 60;
export const MIDI_C5 = 72;
export const MIDI_B5 = 83;
export const MIDI_A0 = 21;
export const MIDI_C8 = 108;

export const DEFAULT_MIN_MIDI_RANGE_START = MIDI_C3;
export const DEFAULT_RANGE_LENGTH = 24;
export const MAX_POSSIBLE_MIDI_START_FOR_RANGE_B5 = MIDI_B5 - (12 - 1);

export const CHORD_FORMULAS: Record<string, number[]> = {
  '': [0, 4, 7], 'maj': [0, 4, 7], 'M': [0, 4, 7], 'm': [0, 3, 7], 'min': [0, 3, 7],
  'o': [0, 3, 6], 'dim': [0, 3, 6], '°': [0, 3, 6], 'aug': [0, 4, 8], '+': [0, 4, 8],
  'sus4': [0, 5, 7], 'sus': [0, 5, 7], 'sus2': [0, 2, 7], '5': [0, 7],
  'maj7': [0, 4, 7, 11], 'M7': [0, 4, 7, 11], '6': [0, 4, 7, 9], 'M6': [0, 4, 7, 9],
  'maj9': [0, 4, 7, 11, 14], 'M9': [0, 4, 7, 11, 14], 'maj11': [0, 4, 7, 11, 14, 17],
  'M11': [0, 4, 7, 11, 14, 17], 'maj13': [0, 4, 7, 11, 14, 17, 21], 'M13': [0, 4, 7, 11, 14, 17, 21],
  'add9': [0, 4, 7, 14], 'add2': [0, 4, 7, 14], 'M(add9)': [0, 4, 7, 14],
  '6/9': [0, 4, 7, 9, 14], 'M6/9': [0, 4, 7, 9, 14], 'maj7#11': [0, 4, 7, 11, 18],
  'M7#11': [0, 4, 7, 11, 18], 'M7#5': [0, 4, 8, 11], 'maj7#5': [0, 4, 8, 11], 'M7b5': [0, 4, 6, 11],
  'm7': [0, 3, 7, 10], 'min7': [0, 3, 7, 10], 'm6': [0, 3, 7, 9], 'min6': [0, 3, 7, 9],
  'm9': [0, 3, 7, 10, 14], 'min9': [0, 3, 7, 10, 14], 'm11': [0, 3, 7, 10, 14, 17],
  'min11': [0, 3, 7, 10, 14, 17], 'm13': [0, 3, 7, 10, 14, 17, 21], 'min13': [0, 3, 7, 10, 14, 17, 21],
  'm(add9)': [0, 3, 7, 14], 'madd9': [0, 3, 7, 14], 'm(maj7)': [0, 3, 7, 11], 'mM7': [0, 3, 7, 11],
  'min(maj7)': [0, 3, 7, 11], 'h7': [0, 3, 6, 10], 'm7b5': [0, 3, 6, 10], 'ø': [0, 3, 6, 10],
  '7': [0, 4, 7, 10], '9': [0, 4, 7, 10, 14], '11': [0, 4, 7, 10, 14, 17], '13': [0, 4, 7, 10, 14, 17, 21],
  '7sus4': [0, 5, 7, 10], '7sus': [0, 5, 7, 10], '9sus4': [0, 5, 7, 10, 14], '9sus': [0, 5, 7, 10, 14],
  '13sus4': [0, 5, 7, 10, 14, 21], '13sus': [0, 5, 7, 10, 14, 21], '7b5': [0, 4, 6, 10],
  '7#5': [0, 4, 8, 10], 'aug7': [0, 4, 8, 10], '7b9': [0, 4, 7, 10, 13], '7#9': [0, 4, 7, 10, 15],
  '7#11': [0, 4, 7, 10, 18], '9#11': [0, 4, 7, 10, 14, 18], '9b5': [0, 4, 6, 10, 14],
  '9#5': [0, 4, 8, 10, 14], '13b9': [0, 4, 7, 10, 13, 21], '13#9': [0, 4, 7, 10, 15, 21],
  '7b9b5': [0, 4, 6, 10, 13], '7b9#5': [0, 4, 8, 10, 13], '7#9b5': [0, 4, 6, 10, 15],
  '7#9#5': [0, 4, 8, 10, 15], '7alt': [0, 4, 6, 8, 10, 13, 15],
  'o7': [0, 3, 6, 9], 'dim7': [0, 3, 6, 9], '°7': [0, 3, 6, 9],
  'oM7': [0, 3, 6, 11], 'dim(maj7)': [0, 3, 6, 11], '°M7': [0, 3, 6, 11],
  'augM7': [0, 4, 8, 11], '+M7': [0, 4, 8, 11], 'm7sus4': [0, 5, 7, 10], 'm9sus4': [0, 5, 7, 10, 14],
  'no3': [0, 7], '(no3)': [0, 7], '7(no3)': [0, 7, 10], 'maj7(no3)': [0, 7, 11], 'M7(no3)': [0, 7, 11],
  'Mb5': [0, 4, 6], 'm#5': [0, 3, 8], '1': [], 'R': []
};

export const SCALE_INTERVAL_MAP: Record<string, number[]> = {
  'ionian': [0, 2, 4, 5, 7, 9, 11],
  'dorian': [0, 2, 3, 5, 7, 9, 10],
  'phrygian': [0, 1, 3, 5, 7, 8, 10],
  'lydian': [0, 2, 4, 6, 7, 9, 11],
  'mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'aeolian': [0, 2, 3, 5, 7, 8, 10],
  'locrian': [0, 1, 3, 5, 6, 8, 10],
  'harmonicMinor': [0, 2, 3, 5, 7, 8, 11],
  'melodicMinor': [0, 2, 3, 5, 7, 9, 11],
  'major': [0, 2, 4, 5, 7, 9, 11],
  'minor': [0, 2, 3, 5, 7, 8, 10],
};

export const DIATONIC_CHORD_QUALITIES: Record<string, Record<number, string>> = {
  'ionian': { 1: '', 2: 'm', 3: 'm', 4: '', 5: '', 6: 'm', 7: 'o' },
  'dorian': { 1: 'm', 2: 'm', 3: '', 4: '', 5: 'm', 6: 'o', 7: '' },
  'phrygian': { 1: 'm', 2: '', 3: '', 4: 'm', 5: 'o', 6: '', 7: 'm' },
  'lydian': { 1: '', 2: '', 3: 'm', 4: 'o', 5: '', 6: 'm', 7: 'm' },
  'mixolydian': { 1: '', 2: 'm', 3: 'o', 4: '', 5: 'm', 6: 'm', 7: '' },
  'aeolian': { 1: 'm', 2: 'o', 3: '', 4: 'm', 5: 'm', 6: '', 7: '' },
  'locrian': { 1: 'o', 2: '', 3: 'm', 4: 'm', 5: '', 6: 'm', 7: '' },
  'harmonicMinor': { 1: 'm', 2: 'o', 3: 'aug', 4: 'm', 5: '', 6: '', 7: 'o7' },
  'melodicMinor': { 1: 'm', 2: 'm', 3: 'aug', 4: '', 5: '', 6: 'o', 7: 'o' },
};
DIATONIC_CHORD_QUALITIES['major'] = DIATONIC_CHORD_QUALITIES['ionian'];
DIATONIC_CHORD_QUALITIES['minor'] = DIATONIC_CHORD_QUALITIES['aeolian'];

export const ROMAN_NUMERAL_MAP: Record<string, number> = {
  'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7,
  'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7,
};

export const LIVE_PLAYING_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='] as const;

export const KEY_TO_LIVE_PLAYING_INDEX_MAP: Record<string, number> = {
  '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5,
  '7': 6, '8': 7, '9': 8, '0': 9, '-': 10, '=': 11,
};

export const SONG_KEY_OPTIONS = [
  { value: 'C', label: 'C' },
  { value: 'C#', label: 'C# / Db' },
  { value: 'D', label: 'D' },
  { value: 'D#', label: 'D# / Eb' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'F#', label: 'F# / Gb' },
  { value: 'G', label: 'G' },
  { value: 'G#', label: 'G# / Ab' },
  { value: 'A', label: 'A' },
  { value: 'A#', label: 'A# / Bb' },
  { value: 'B', label: 'B' },
] as const;

export const KEY_MODE_OPTIONS: { value: KeyModeKind; label: string }[] = [
  { value: 'ionian', label: 'Ionian (Major)' },
  { value: 'dorian', label: 'Dorian' },
  { value: 'phrygian', label: 'Phrygian' },
  { value: 'lydian', label: 'Lydian' },
  { value: 'mixolydian', label: 'Mixolydian' },
  { value: 'aeolian', label: 'Aeolian (Nat. Minor)' },
  { value: 'locrian', label: 'Locrian' },
  { value: 'harmonicMinor', label: 'Harmonic Minor' },
  { value: 'melodicMinor', label: 'Melodic Minor (Asc)' },
];

export const TIME_SIGNATURE_OPTIONS = ['2/4', '3/4', '4/4', '5/4', '6/8', '9/8', '12/8'] as const;

export const OSCILLATOR_OPTIONS: { value: OscillatorKind; label: string }[] = [
  { value: 'sine', label: 'Sine' },
  { value: 'square', label: 'Square' },
  { value: 'sawtooth', label: 'Sawtooth' },
  { value: 'triangle', label: 'Triangle' },
];

export const FILTER_TYPE_OPTIONS: { value: FilterKind; label: string }[] = [
  { value: 'lowpass', label: 'Low-Pass' },
  { value: 'bandpass', label: 'Band-Pass' },
  { value: 'highpass', label: 'High-Pass' },
];

export interface InstrumentPresetProfile {
  value: InstrumentPreset;
  label: string;
  oscillatorType: OscillatorKind;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filterType: FilterKind;
  filterCutoff: number;
  filterResonance: number;
  filterEnvAmount: number;
  detuneCents: number;
  subOscMix: number;
}

export const INSTRUMENT_PRESETS: InstrumentPresetProfile[] = [
  {
    value: 'piano',
    label: 'Acoustic Piano',
    oscillatorType: 'triangle',
    attack: 0.01,
    decay: 0.65,
    sustain: 0.28,
    release: 0.35,
    filterType: 'lowpass',
    filterCutoff: 3200,
    filterResonance: 0.8,
    filterEnvAmount: 0.45,
    detuneCents: 4,
    subOscMix: 0,
  },
  {
    value: 'epiano',
    label: 'Electric Piano',
    oscillatorType: 'sine',
    attack: 0.01,
    decay: 0.55,
    sustain: 0.42,
    release: 0.4,
    filterType: 'lowpass',
    filterCutoff: 4200,
    filterResonance: 1.1,
    filterEnvAmount: 0.35,
    detuneCents: 6,
    subOscMix: 0,
  },
  {
    value: 'organ',
    label: 'Drawbar Organ',
    oscillatorType: 'sine',
    attack: 0.02,
    decay: 0.1,
    sustain: 0.95,
    release: 0.08,
    filterType: 'lowpass',
    filterCutoff: 5600,
    filterResonance: 0.7,
    filterEnvAmount: 0.1,
    detuneCents: 5,
    subOscMix: 0.25,
  },
  {
    value: 'pad',
    label: 'Warm Synth Pad',
    oscillatorType: 'sawtooth',
    attack: 0.38,
    decay: 0.6,
    sustain: 0.75,
    release: 0.85,
    filterType: 'lowpass',
    filterCutoff: 1450,
    filterResonance: 1.8,
    filterEnvAmount: 0.35,
    detuneCents: 16,
    subOscMix: 0.3,
  },
  {
    value: 'strings',
    label: 'Chamber Strings',
    oscillatorType: 'sawtooth',
    attack: 0.28,
    decay: 0.45,
    sustain: 0.82,
    release: 0.65,
    filterType: 'lowpass',
    filterCutoff: 2400,
    filterResonance: 1.2,
    filterEnvAmount: 0.2,
    detuneCents: 18,
    subOscMix: 0.15,
  },
  {
    value: 'pluck',
    label: 'Nylon Pluck',
    oscillatorType: 'triangle',
    attack: 0.01,
    decay: 0.28,
    sustain: 0.12,
    release: 0.2,
    filterType: 'lowpass',
    filterCutoff: 2600,
    filterResonance: 2.2,
    filterEnvAmount: 0.6,
    detuneCents: 2,
    subOscMix: 0,
  },
  {
    value: 'brass',
    label: 'Synth Brass',
    oscillatorType: 'sawtooth',
    attack: 0.08,
    decay: 0.32,
    sustain: 0.68,
    release: 0.22,
    filterType: 'lowpass',
    filterCutoff: 1800,
    filterResonance: 2.6,
    filterEnvAmount: 0.7,
    detuneCents: 12,
    subOscMix: 0.2,
  },
  {
    value: 'bell',
    label: 'Crystal Bell',
    oscillatorType: 'sine',
    attack: 0.01,
    decay: 0.9,
    sustain: 0.2,
    release: 0.9,
    filterType: 'lowpass',
    filterCutoff: 7500,
    filterResonance: 1.0,
    filterEnvAmount: 0.25,
    detuneCents: 3,
    subOscMix: 0,
  },
  {
    value: 'custom',
    label: 'Raw Synth',
    oscillatorType: 'triangle',
    attack: 0.01,
    decay: 0.1,
    sustain: 0.7,
    release: 0.05,
    filterType: 'lowpass',
    filterCutoff: 8000,
    filterResonance: 0.7,
    filterEnvAmount: 0,
    detuneCents: 0,
    subOscMix: 0,
  },
];

export const EFFECT_LABELS: Record<EffectKey, string> = {
  reverb: 'Reverb',
  delay: 'Delay',
  chorus: 'Chorus',
  flanger: 'Flanger',
  phaser: 'Phaser',
  vibrato: 'Vibrato',
  tremolo: 'Tremolo',
};

export const defaultEffectsSettings: SynthEffectsSettings = {
  reverb: { enabled: false, mix: 0.28, decay: 1.8 },
  delay: { enabled: false, mix: 0.25, time: 0.32, feedback: 0.35, syncBpm: false, syncDivision: '1/8' },
  chorus: { enabled: false, mix: 0.35, rate: 1.2, depth: 0.45, syncBpm: false, syncDivision: '1/1' },
  flanger: { enabled: false, mix: 0.35, rate: 0.45, depth: 0.55, feedback: 0.4, syncBpm: false, syncDivision: '2/1' },
  phaser: { enabled: false, mix: 0.45, rate: 0.6, depth: 0.65, feedback: 0.35, syncBpm: false, syncDivision: '1/1' },
  vibrato: { enabled: false, rate: 5.5, depth: 18, syncBpm: false, syncDivision: '1/8' },
  tremolo: { enabled: false, rate: 4.5, depth: 0.5, syncBpm: false, syncDivision: '1/8' },
};

export const ARP_PATTERN_OPTIONS: { value: ArpPattern; label: string }[] = [
  { value: 'up', label: 'Up' },
  { value: 'down', label: 'Down' },
  { value: 'upDown', label: 'Up-Down' },
  { value: 'downUp', label: 'Down-Up' },
  { value: 'random', label: 'Random' },
  { value: 'chord', label: 'Chord Pulse' },
];

export const ARP_RATE_OPTIONS: { value: ArpRate; label: string }[] = [
  { value: '1/4', label: '1/4' },
  { value: '1/8', label: '1/8' },
  { value: '1/8T', label: '1/8T' },
  { value: '1/16', label: '1/16' },
];

export const defaultArpeggiatorSettings: ArpeggiatorSettings = {
  enabled: false,
  pattern: 'up',
  rate: '1/8',
  octaves: 1,
  gate: 0.75,
};

export const DEFAULT_CHORD_PROGRESSION = 'Cmaj7(4) Am7(4) Fmaj7(4) G7(4)';
export const DEFAULT_DEGREE_PROGRESSION = 'I(2) V(2) vi(2) iii(2) IV(2) I(2) IV(2) V(2)';

export const defaultSettings: ChordotronSettings = {
  theme: 'light',
  bpm: 120,
  attack: 0.01,
  decay: 0.65,
  sustain: 0.28,
  release: 0.35,
  timeSignature: '4/4',
  instrumentPreset: 'piano',
  oscillatorType: 'triangle',
  filterType: 'lowpass',
  filterCutoff: 3200,
  filterResonance: 0.8,
  filterEnvAmount: 0.45,
  detuneCents: 4,
  subOscMix: 0,
  metronomeVolume: 0.8,
  loopToggle: false,
  metronomeAudioToggle: false,
  inputMode: 'chords',
  chordInput: DEFAULT_CHORD_PROGRESSION,
  scaleDegreeInput: DEFAULT_DEGREE_PROGRESSION,
  songKey: 'C',
  keyMode: 'ionian',
  rangeStartMidi: DEFAULT_MIN_MIDI_RANGE_START,
  rangeLength: DEFAULT_RANGE_LENGTH,
  masterGain: 0.5,
  synthGain: 0.5,
  livePlayingChords: ['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5', 'C/E', 'F/A', 'G/B', 'E7', 'A7'],
  effects: structuredClone(defaultEffectsSettings),
  arpeggiator: { ...defaultArpeggiatorSettings },
};
