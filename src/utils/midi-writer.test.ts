import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMidiBytes } from './midi-writer';
import { parseDirectChordString, voiceProgression } from './music-theory';

test('buildMidiBytes generates valid SMF MIDI header and track chunk', () => {
  const parsed = parseDirectChordString('C(4) G/B(2) Am(2)', 4);
  const voiced = voiceProgression(parsed, 48, 24);
  const bytes = buildMidiBytes(voiced, 120, '4/4');

  // Verify MThd magic bytes
  assert.equal(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]), 'MThd');
  // Header length 6
  assert.equal(bytes[7], 6);
  // 1 track
  assert.equal(bytes[11], 1);
  // Verify MTrk magic bytes at offset 14
  assert.equal(String.fromCharCode(bytes[14], bytes[15], bytes[16], bytes[17]), 'MTrk');
  // Verify End-of-Track meta event (FF 2F 00) at end
  assert.equal(bytes[bytes.length - 3], 0xff);
  assert.equal(bytes[bytes.length - 2], 0x2f);
  assert.equal(bytes[bytes.length - 1], 0x00);
});

test('buildMidiBytes throws when progression is empty', () => {
  assert.throws(() => buildMidiBytes([], 120, '4/4'));
});

test('buildMidiBytes expands arpeggiated steps when arpeggiator is enabled', () => {
  const parsed = parseDirectChordString('Cmaj7(4)', 4);
  const voiced = voiceProgression(parsed, 48, 24);
  const blockBytes = buildMidiBytes(voiced, 120, '4/4');
  const arpBytes = buildMidiBytes(voiced, 120, '4/4', {
    enabled: true,
    pattern: 'up',
    rate: '1/8',
    octaves: 1,
    gate: 0.75,
  });

  // 4 beats of 1/8 notes = 8 individual note-on/off pairs vs 4 block note-on/off pairs
  assert.ok(arpBytes.length > blockBytes.length);
  assert.equal(String.fromCharCode(arpBytes[0], arpBytes[1], arpBytes[2], arpBytes[3]), 'MThd');
});
