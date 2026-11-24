import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTimelineLayout, parseTimelineInput } from './timeline-sequencer.ts';

test('buildTimelineLayout aligns chords to bars in 4/4 and detects bar-crossing chords', () => {
  const layout = parseTimelineInput(
    'chords',
    'Cmaj7(3) Am7(4) Fmaj7(1)',
    '',
    'C',
    'ionian',
    '4/4',
    120
  );

  assert.equal(layout.beatsPerMeasure, 4);
  assert.equal(layout.totalBeats, 8);
  assert.equal(layout.totalBars, 2);
  assert.equal(layout.gridBeats, 8);
  assert.equal(layout.totalDurationSec, 4);

  assert.equal(layout.items.length, 3);
  assert.deepEqual(
    layout.items.map((i) => ({
      name: i.displayName,
      startBeat: i.startBeat,
      endBeat: i.endBeat,
      startBar: i.startBar,
      beatInBar: i.beatInBar,
      spansMultipleBars: i.spansMultipleBars,
    })),
    [
      { name: 'Cmaj7', startBeat: 0, endBeat: 3, startBar: 1, beatInBar: 1, spansMultipleBars: false },
      { name: 'Am7', startBeat: 3, endBeat: 7, startBar: 1, beatInBar: 4, spansMultipleBars: true },
      { name: 'Fmaj7', startBeat: 7, endBeat: 8, startBar: 2, beatInBar: 4, spansMultipleBars: false },
    ]
  );
});

test('parseTimelineInput resolves Scale Degrees to chord names and honors 3/4 time', () => {
  const layout = parseTimelineInput(
    'degrees',
    '',
    'I(3) vi(3) IV(3) V(3)',
    'D',
    'ionian',
    '3/4',
    90
  );

  assert.equal(layout.beatsPerMeasure, 3);
  assert.equal(layout.totalBars, 4);
  assert.equal(layout.gridBeats, 12);
  assert.deepEqual(
    layout.items.map((i) => i.displayName),
    ['D', 'Bm', 'G', 'A']
  );
  assert.equal(layout.items[1].startBar, 2);
  assert.equal(layout.items[1].beatInBar, 1);
  assert.equal(layout.items[1].spansMultipleBars, false);
});

test('buildTimelineLayout handles empty input cleanly with 1-bar grid', () => {
  const layout = buildTimelineLayout([], '4/4', 120);
  assert.equal(layout.totalBeats, 0);
  assert.equal(layout.totalBars, 1);
  assert.equal(layout.gridBeats, 4);
  assert.equal(layout.bars.length, 1);
  assert.equal(layout.items.length, 0);
});
