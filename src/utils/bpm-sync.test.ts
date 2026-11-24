import assert from 'node:assert/strict';
import test from 'node:test';
import { bpmToDelaySeconds, bpmToLfoHz, isValidBpmSyncDivision } from './bpm-sync.ts';

test('bpmToDelaySeconds computes musical delay times accurately', () => {
  // At 120 BPM, 1/4 note = 0.5s, 1/8 = 0.25s, 1/8. = 0.375s, 1/16 = 0.125s
  assert.equal(bpmToDelaySeconds(120, '1/4'), 0.5);
  assert.equal(bpmToDelaySeconds(120, '1/8'), 0.25);
  assert.equal(bpmToDelaySeconds(120, '1/8.'), 0.375);
  assert.equal(bpmToDelaySeconds(120, '1/16'), 0.125);

  // At 60 BPM, 1/4 = 1.0s, 1/2 = 2.0s clamped to 1.8s
  assert.equal(bpmToDelaySeconds(60, '1/4'), 1.0);
  assert.equal(bpmToDelaySeconds(60, '1/2'), 1.8);
});

test('bpmToLfoHz computes LFO rates accurately from BPM', () => {
  // At 120 BPM (2 beats/sec):
  // 1/4 cycle = 2 Hz, 1/8 cycle = 4 Hz, 1/1 bar (4 beats) = 0.5 Hz, 4/1 = 0.125 Hz
  assert.equal(bpmToLfoHz(120, '1/4'), 2);
  assert.equal(bpmToLfoHz(120, '1/8'), 4);
  assert.equal(bpmToLfoHz(120, '1/1'), 0.5);
  assert.equal(bpmToLfoHz(120, '4/1'), 0.125);

  // At 60 BPM (1 beat/sec): 1/4 = 1 Hz, 1/8 = 2 Hz
  assert.equal(bpmToLfoHz(60, '1/4'), 1);
  assert.equal(bpmToLfoHz(60, '1/8'), 2);
});

test('isValidBpmSyncDivision validates supported divisions', () => {
  assert.equal(isValidBpmSyncDivision('1/8T'), true);
  assert.equal(isValidBpmSyncDivision('4/1'), true);
  assert.equal(isValidBpmSyncDivision('1/32'), false);
});
