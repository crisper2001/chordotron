import type { ParsedChordToken } from '../types/chordotron';

export interface ChordSelectionRange {
  startIndex: number; // 0-based inclusive
  endIndex: number;   // 0-based inclusive
}

export interface TextTokenSpan {
  index: number;
  token: string;
  start: number;
  end: number;
}

/**
 * Splits a chord/degree string by whitespace while preserving exact character [start, end) offsets
 * matching the token indices returned by parseDirectChordString / parseScaleDegreeString.
 */
export function tokenizeWithOffsets(input: string): TextTokenSpan[] {
  const spans: TextTokenSpan[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = regex.exec(input)) !== null) {
    spans.push({
      index: idx,
      token: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
    idx += 1;
  }
  return spans;
}

/**
 * Maps a textarea character selection [selectionStart, selectionEnd) onto the inclusive
 * range of chord tokens that overlap the highlighted text.
 * Snapping partial token highlights to full tokens prevents malformed half-chord playback.
 */
export function resolveTokenRangeFromTextSelection(
  input: string,
  selectionStart: number,
  selectionEnd: number
): ChordSelectionRange | null {
  if (selectionEnd <= selectionStart) return null;
  const spans = tokenizeWithOffsets(input);
  if (spans.length === 0) return null;

  const overlapping = spans.filter(
    (span) => span.end > selectionStart && span.start < selectionEnd
  );
  if (overlapping.length === 0) return null;

  return {
    startIndex: overlapping[0].index,
    endIndex: overlapping[overlapping.length - 1].index,
  };
}

export function normalizeSelectionRange(
  range: ChordSelectionRange | null,
  totalItems: number
): ChordSelectionRange | null {
  if (!range || totalItems <= 0) return null;
  const rawStart = Math.min(range.startIndex, range.endIndex);
  const rawEnd = Math.max(range.startIndex, range.endIndex);
  const startIndex = Math.max(0, Math.min(totalItems - 1, rawStart));
  const endIndex = Math.max(startIndex, Math.min(totalItems - 1, rawEnd));
  return { startIndex, endIndex };
}

export function sliceProgressionForSelection<T extends Pick<ParsedChordToken, 'beats'>>(
  items: T[],
  range: ChordSelectionRange | null
): {
  items: T[];
  normalizedRange: ChordSelectionRange | null;
  startBeatOffset: number;
  selectedBeats: number;
} {
  const normalized = normalizeSelectionRange(range, items.length);
  if (!normalized) {
    const totalBeats = items.reduce((sum, item) => sum + Math.max(1, item.beats), 0);
    return {
      items,
      normalizedRange: null,
      startBeatOffset: 0,
      selectedBeats: totalBeats,
    };
  }

  let startBeatOffset = 0;
  for (let i = 0; i < normalized.startIndex; i++) {
    startBeatOffset += Math.max(1, items[i].beats);
  }

  const sliced = items.slice(normalized.startIndex, normalized.endIndex + 1);
  const selectedBeats = sliced.reduce((sum, item) => sum + Math.max(1, item.beats), 0);

  return {
    items: sliced,
    normalizedRange: normalized,
    startBeatOffset,
    selectedBeats,
  };
}
