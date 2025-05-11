export const ALL_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_MAP = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
    'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
    'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11
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

export const CHORD_FORMULAS = {
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

export const SCALE_INTERVAL_MAP = {
    'ionian': [0, 2, 4, 5, 7, 9, 11], 'dorian': [0, 2, 3, 5, 7, 9, 10], 'phrygian': [0, 1, 3, 5, 7, 8, 10],
    'lydian': [0, 2, 4, 6, 7, 9, 11], 'mixolydian': [0, 2, 4, 5, 7, 9, 10], 'aeolian': [0, 2, 3, 5, 7, 8, 10],
    'locrian': [0, 1, 3, 5, 6, 8, 10], 'harmonicMinor': [0, 2, 3, 5, 7, 8, 11], 'melodicMinor': [0, 2, 3, 5, 7, 9, 11],
    'major': [0, 2, 4, 5, 7, 9, 11], 'minor': [0, 2, 3, 5, 7, 8, 10]
};

export const DIATONIC_CHORD_QUALITIES = {
    'ionian': { 1: '', 2: 'm', 3: 'm', 4: '', 5: '', 6: 'm', 7: 'o' },
    'dorian': { 1: 'm', 2: 'm', 3: '', 4: '', 5: 'm', 6: 'o', 7: '' },
    'phrygian': { 1: 'm', 2: '', 3: '', 4: 'm', 5: 'o', 6: '', 7: 'm' },
    'lydian': { 1: '', 2: '', 3: 'm', 4: 'o', 5: '', 6: 'm', 7: 'm' },
    'mixolydian': { 1: '', 2: 'm', 3: 'o', 4: '', 5: 'm', 6: 'm', 7: '' },
    'aeolian': { 1: 'm', 2: 'o', 3: '', 4: 'm', 5: 'm', 6: '', 7: '' },
    'locrian': { 1: 'o', 2: '', 3: 'm', 4: 'm', 5: '', 6: 'm', 7: '' },
    'harmonicMinor': { 1: 'm', 2: 'o', 3: 'aug', 4: 'm', 5: '', 6: '', 7: 'o7' },
    'melodicMinor': { 1: 'm', 2: 'm', 3: 'aug', 4: '', 5: '', 6: 'o', 7: 'o' }
};
DIATONIC_CHORD_QUALITIES['major'] = DIATONIC_CHORD_QUALITIES['ionian'];
DIATONIC_CHORD_QUALITIES['minor'] = DIATONIC_CHORD_QUALITIES['aeolian'];

export const ROMAN_NUMERAL_MAP = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7,
    'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7
};

export const DISPLAY_SYMBOL_MAP = { 'o': '°', 'o7': '°7', 'oM7': '°M7', 'h7': 'ø' };

export const LIVE_PLAYING_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
export const KEY_TO_LIVE_PLAYING_INDEX_MAP = {
    '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5,
    '7': 6, '8': 7, '9': 8, '0': 9, '-': 10, '=': 11
};

export const defaultSettings = {
    bpm: 120, attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.01,
    timeSignature: "4/4", oscillatorType: "triangle",
    metronomeVolume: 0.8,
    loopToggle: false, metronomeAudioToggle: false,
    inputMode: "chords", chordInput: "",
    scaleDegreeInput: "", songKey: "C", keyMode: "ionian",
    rangeStartMidi: DEFAULT_MIN_MIDI_RANGE_START,
    rangeLength: DEFAULT_RANGE_LENGTH,
    masterGain: 0.5,
    synthGain: 0.5,
    livePlayingChords: Array(LIVE_PLAYING_KEYS.length).fill("")
};
