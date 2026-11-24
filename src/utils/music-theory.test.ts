import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTapBpm,
  formatChordForDisplay,
  formatCutoffHz,
  frequencyToMidi,
  getBeatDurationFactorForTimeSignature,
  getBeatsPerMeasure,
  midiToFrequency,
  midiToNoteNameWithOctave,
  normalizeNoteName,
  noteNameToMidi,
  parseChordNameToFrequencies,
  parseDirectChordString,
  parseScaleDegreeString,
  voiceFrequenciesInRange,
  voiceProgression,
} from './music-theory';

test('normalizeNoteName handles sharps, flats, and case normalization', () => {
  assert.equal(normalizeNoteName('c#'), 'C#');
  assert.equal(normalizeNoteName('bb'), 'Bb');
  assert.equal(normalizeNoteName('Eb'), 'Eb');
  assert.equal(normalizeNoteName('f'), 'F');
  assert.equal(normalizeNoteName('invalid'), null);
});

test('MIDI and frequency conversions round-trip accurately', () => {
  assert.equal(noteNameToMidi('C4'), 60);
  assert.equal(noteNameToMidi('A4'), 69);
  assert.equal(midiToNoteNameWithOctave(60), 'C4');
  assert.equal(midiToNoteNameWithOctave(48), 'C3');
  assert.equal(Math.round(midiToFrequency(69)), 440);
  assert.equal(frequencyToMidi(440), 69);
});

test('parseDirectChordString parses chord names, slash chords, and beat counts', () => {
  const parsed = parseDirectChordString('E(8) C#m/G#(4) A B7', 4);
  assert.equal(parsed.length, 4);
  assert.deepEqual(parsed[0], {
    name: 'E',
    bassNoteName: null,
    beats: 8,
    originalInputToken: 'E(8)',
  });
  assert.deepEqual(parsed[1], {
    name: 'C#m',
    bassNoteName: 'G#',
    beats: 4,
    originalInputToken: 'C#m/G#(4)',
  });
  assert.equal(parsed[2].beats, 4);
  assert.equal(parsed[3].name, 'B7');
});

test('parseDirectChordString marks malformed tokens with error flag', () => {
  const parsed = parseDirectChordString('Cmaj7 ??? G7', 4);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].error, undefined);
  assert.equal(parsed[1].error, true);
  assert.equal(parsed[2].error, undefined);
});

test('parseScaleDegreeString resolves Roman numerals in D major and C dorian', () => {
  const dMajor = parseScaleDegreeString('I(2) V(2) vi(2) IV/I(4)', 'D', 'ionian', 4);
  assert.equal(dMajor.length, 4);
  assert.equal(dMajor[0].name, 'D');
  assert.equal(dMajor[0].beats, 2);
  assert.equal(dMajor[1].name, 'A');
  assert.equal(dMajor[2].name, 'Bm');
  assert.equal(dMajor[3].name, 'G');
  assert.equal(dMajor[3].bassNoteName, 'D');
  assert.equal(dMajor[3].beats, 4);

  const cDorian = parseScaleDegreeString('i IV VII', 'C', 'dorian', 4);
  assert.equal(cDorian[0].name, 'Cm');
  assert.equal(cDorian[1].name, 'F');
  assert.equal(cDorian[2].name, 'A#');

  const cMajorFlatSeven = parseScaleDegreeString('bVII bVIIM', 'C', 'ionian', 4);
  assert.equal(cMajorFlatSeven[0].name, 'A#o');
  assert.equal(cMajorFlatSeven[1].name, 'A#M');
});

test('voiceFrequenciesInRange keeps all voiced notes inside [minMidi, maxMidi] and honors slash bass', () => {
  const parsed = parseChordNameToFrequencies('Cmaj7', 2);
  const minMidi = 48; // C3
  const maxMidi = 71; // B4
  const voiced = voiceFrequenciesInRange(parsed.frequencies, parsed.rootNoteName, minMidi, maxMidi, 'E');
  const midiNotes = voiced.frequencies.map((f) => frequencyToMidi(f));

  assert.equal(voiced.playedAsSlash, true);
  assert.ok(midiNotes.length >= 3);
  assert.equal(midiNotes[0] % 12, 4); // E bass note is lowest
  for (const n of midiNotes) {
    assert.ok(n >= minMidi && n <= maxMidi, `Note ${n} out of range [${minMidi}, ${maxMidi}]`);
  }
});

test('voiceProgression voices full chord list', () => {
  const parsed = parseDirectChordString('Cmaj7(4) G/B(4)', 4);
  const voiced = voiceProgression(parsed, 48, 24);
  assert.equal(voiced.length, 2);
  assert.ok(voiced[0].frequencies.length >= 4);
  assert.equal(voiced[1].wasSlashPlayed, true);
});

test('formatChordForDisplay converts diminished and half-diminished symbols cleanly', () => {
  assert.equal(formatChordForDisplay('Bo'), 'B°');
  assert.equal(formatChordForDisplay('Bo7'), 'B°7');
  assert.equal(formatChordForDisplay('Bm7b5'), 'Bø7');
  assert.equal(formatChordForDisplay('g/b'), 'G/B');
});

test('time signature helpers compute beats per measure and beat duration factor', () => {
  assert.equal(getBeatsPerMeasure('6/8'), 6);
  assert.equal(getBeatDurationFactorForTimeSignature('4/4'), 1);
  assert.equal(getBeatDurationFactorForTimeSignature('6/8'), 0.5);
  assert.equal(getBeatDurationFactorForTimeSignature('2/2'), 2);
});

test('calculateTapBpm computes accurate BPM, resets across long gaps, and clamps bounds', () => {
  assert.equal(calculateTapBpm([1000]), null);
  assert.equal(calculateTapBpm([1000, 1500, 2000, 2500]), 120);
  assert.equal(calculateTapBpm([1000, 2000, 3000]), 60);
  // Long gap (>2000ms) discards earlier taps
  assert.equal(calculateTapBpm([1000, 2000, 6000, 6500]), 120);
  // Clamping to [30, 300]
  assert.equal(calculateTapBpm([0, 50]), 300);
});

test('formatCutoffHz formats Hz and kHz cleanly', () => {
  assert.equal(formatCutoffHz(450), '450 Hz');
  assert.equal(formatCutoffHz(3200), '3.2 kHz');
});
