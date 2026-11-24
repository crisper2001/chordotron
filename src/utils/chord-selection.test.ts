import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveTokenRangeFromTextSelection,
  sliceProgressionForSelection,
  tokenizeWithOffsets,
} from './chord-selection.ts';

test('tokenizeWithOffsets records exact token boundaries', () => {
  const spans = tokenizeWithOffsets('  Cmaj7(4)   Am7(4) Fmaj7(4) ');
  assert.deepEqual(
    spans.map((s) => ({ index: s.index, token: s.token, slice: '  Cmaj7(4)   Am7(4) Fmaj7(4) '.slice(s.start, s.end) })),
    [
      { index: 0, token: 'Cmaj7(4)', slice: 'Cmaj7(4)' },
      { index: 1, token: 'Am7(4)', slice: 'Am7(4)' },
      { index: 2, token: 'Fmaj7(4)', slice: 'Fmaj7(4)' },
    ]
  );
});

test('resolveTokenRangeFromTextSelection snaps partial token highlights to full chord tokens', () => {
  const input = 'Cmaj7(4) Am7(4) Fmaj7(4) G7(4)';
  // Highlighting "aj7(4) Am7" spans inside token 0 and token 1
  const range = resolveTokenRangeFromTextSelection(input, 2, 12);
  assert.deepEqual(range, { startIndex: 0, endIndex: 1 });

  // Highlighting whitespace only returns null
  assert.equal(resolveTokenRangeFromTextSelection(input, 8, 9), null);

  // Collapsed caret returns null
  assert.equal(resolveTokenRangeFromTextSelection(input, 5, 5), null);
});

test('sliceProgressionForSelection extracts sliced chords and computes startBeatOffset', () => {
  const tokens = [
    { name: 'Cmaj7', beats: 4 },
    { name: 'Am7', beats: 3 },
    { name: 'Fmaj7', beats: 5 },
    { name: 'G7', beats: 4 },
  ];

  const sliced = sliceProgressionForSelection(tokens, { startIndex: 1, endIndex: 2 });
  assert.equal(sliced.startBeatOffset, 4);
  assert.equal(sliced.selectedBeats, 8);
  assert.deepEqual(
    sliced.items.map((i) => i.name),
    ['Am7', 'Fmaj7']
  );

  // Reversed indices normalize cleanly
  const reversed = sliceProgressionForSelection(tokens, { startIndex: 3, endIndex: 2 });
  assert.deepEqual(reversed.normalizedRange, { startIndex: 2, endIndex: 3 });
  assert.equal(reversed.startBeatOffset, 7);
});
