import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildArpStepFrequencies,
  expandArpNotes,
  generateArpEventsForChord,
  getArpStepDurationSec,
} from './arpeggiator';
import type { ArpeggiatorSettings } from '../types/chordotron';

const baseTriad = [261.63, 329.63, 392.0]; // C4, E4, G4

const defaultArp: ArpeggiatorSettings = {
  enabled: true,
  pattern: 'up',
  rate: '1/8',
  octaves: 1,
  gate: 0.75,
};

test('expandArpNotes duplicates ascending notes across requested octaves', () => {
  const oneOct = expandArpNotes(baseTriad, 1);
  assert.equal(oneOct.length, 3);
  assert.deepEqual(oneOct, baseTriad);

  const twoOct = expandArpNotes(baseTriad, 2);
  assert.equal(twoOct.length, 6);
  assert.ok(Math.abs(twoOct[3] - baseTriad[0] * 2) < 0.01);
  assert.ok(Math.abs(twoOct[5] - baseTriad[2] * 2) < 0.01);
});

test('buildArpStepFrequencies sequences up, down, upDown, downUp, and chord patterns', () => {
  const upSeq = [0, 1, 2, 3].map((i) => buildArpStepFrequencies(baseTriad, { ...defaultArp, pattern: 'up' }, i)[0]);
  assert.deepEqual(upSeq, [261.63, 329.63, 392.0, 261.63]);

  const downSeq = [0, 1, 2, 3].map((i) => buildArpStepFrequencies(baseTriad, { ...defaultArp, pattern: 'down' }, i)[0]);
  assert.deepEqual(downSeq, [392.0, 329.63, 261.63, 392.0]);

  const upDownSeq = [0, 1, 2, 3, 4].map(
    (i) => buildArpStepFrequencies(baseTriad, { ...defaultArp, pattern: 'upDown' }, i)[0]
  );
  assert.deepEqual(upDownSeq, [261.63, 329.63, 392.0, 329.63, 261.63]);

  const downUpSeq = [0, 1, 2, 3, 4].map(
    (i) => buildArpStepFrequencies(baseTriad, { ...defaultArp, pattern: 'downUp' }, i)[0]
  );
  assert.deepEqual(downUpSeq, [392.0, 329.63, 261.63, 329.63, 392.0]);

  const chordStep = buildArpStepFrequencies(baseTriad, { ...defaultArp, pattern: 'chord' }, 0);
  assert.deepEqual(chordStep, baseTriad);
});

test('getArpStepDurationSec and generateArpEventsForChord divide beats accurately', () => {
  assert.equal(getArpStepDurationSec(120, '1/4'), 0.5);
  assert.equal(getArpStepDurationSec(120, '1/8'), 0.25);
  assert.equal(getArpStepDurationSec(120, '1/16'), 0.125);
  assert.ok(Math.abs(getArpStepDurationSec(120, '1/8T') - 0.5 / 3) < 1e-6);

  // 4 beats at 120 BPM = 2.0 seconds -> 8 eighth-note arp events
  const events = generateArpEventsForChord(baseTriad, 1.0, 2.0, 120, defaultArp);
  assert.equal(events.length, 8);
  assert.equal(events[0].startTime, 1.0);
  assert.ok(Math.abs(events[0].durationSec - 0.25 * 0.75) < 1e-6);
  assert.equal(events[1].startTime, 1.25);
  assert.equal(events[3].frequencies[0], 261.63);
});
