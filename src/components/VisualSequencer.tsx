import React, { useMemo, useRef, useState } from 'react';
import { ListFilter, SlidersHorizontal, X } from 'lucide-react';
import type { InputMode, KeyModeKind, ParsedChordToken } from '../types/chordotron';
import {
  type ChordSelectionRange,
  normalizeSelectionRange,
} from '../utils/chord-selection';
import { parseTimelineInput } from '../utils/timeline-sequencer';

interface VisualSequencerProps {
  inputMode: InputMode;
  chordInput: string;
  scaleDegreeInput: string;
  songKey: string;
  keyMode: KeyModeKind;
  timeSignature: string;
  bpm: number;
  sequencePlaying: boolean;
  isSelectionPlayback: boolean;
  selectedRange: ChordSelectionRange | null;
  selectionStartBeatOffset: number;
  activeChordIndex: number | null;
  activeSequenceBeat: number | null;
  onSelectRange: (range: ChordSelectionRange | null) => void;
  onPreviewChordDown: (token: ParsedChordToken, index: number) => void;
  onPreviewChordUp: (index: number) => void;
}

const KEY_MODE_SHORT_LABELS: Record<KeyModeKind, string> = {
  ionian: 'Ionian',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  aeolian: 'Aeolian',
  locrian: 'Locrian',
  harmonicMinor: 'Harm. Minor',
  melodicMinor: 'Mel. Minor',
};

export const VisualSequencer: React.FC<VisualSequencerProps> = ({
  inputMode,
  chordInput,
  scaleDegreeInput,
  songKey,
  keyMode,
  timeSignature,
  bpm,
  sequencePlaying,
  isSelectionPlayback,
  selectedRange,
  selectionStartBeatOffset,
  activeChordIndex,
  activeSequenceBeat,
  onSelectRange,
  onPreviewChordDown,
  onPreviewChordUp,
}) => {
  const heldIndexRef = useRef<number | null>(null);
  const anchorIndexRef = useRef<number | null>(null);
  const [selectMode, setSelectMode] = useState(false);

  const layout = useMemo(
    () =>
      parseTimelineInput(
        inputMode,
        chordInput,
        scaleDegreeInput,
        songKey,
        keyMode,
        timeSignature,
        bpm
      ),
    [inputMode, chordInput, scaleDegreeInput, songKey, keyMode, timeSignature, bpm]
  );

  const isLiveMode = inputMode === 'livePlaying';
  const normalizedSelection = useMemo(
    () => (isLiveMode ? null : normalizeSelectionRange(selectedRange, layout.items.length)),
    [isLiveMode, selectedRange, layout.items.length]
  );

  const effectiveActiveChordIndex = useMemo(() => {
    if (!sequencePlaying || activeChordIndex === null) return null;
    if (isSelectionPlayback && normalizedSelection) {
      return normalizedSelection.startIndex + activeChordIndex;
    }
    return activeChordIndex;
  }, [sequencePlaying, activeChordIndex, isSelectionPlayback, normalizedSelection]);

  const effectivePlayheadBeat = useMemo(() => {
    if (!sequencePlaying || activeSequenceBeat === null) return null;
    if (isSelectionPlayback) {
      return selectionStartBeatOffset + activeSequenceBeat;
    }
    return activeSequenceBeat;
  }, [sequencePlaying, activeSequenceBeat, isSelectionPlayback, selectionStartBeatOffset]);

  const activeBarBeatText = useMemo(() => {
    if (effectivePlayheadBeat === null) return null;
    const bar = Math.floor(effectivePlayheadBeat / layout.beatsPerMeasure) + 1;
    const beat = (effectivePlayheadBeat % layout.beatsPerMeasure) + 1;
    return `Bar ${bar} · Beat ${beat}`;
  }, [effectivePlayheadBeat, layout.beatsPerMeasure]);

  const selectionSpanMetrics = useMemo(() => {
    if (!normalizedSelection || layout.items.length === 0) return null;
    const first = layout.items[normalizedSelection.startIndex];
    const last = layout.items[normalizedSelection.endIndex];
    if (!first || !last) return null;
    return {
      startBeat: first.startBeat,
      beats: last.endBeat - first.startBeat,
      chordCount: normalizedSelection.endIndex - normalizedSelection.startIndex + 1,
    };
  }, [normalizedSelection, layout.items]);

  const handleRangeClick = (idx: number, isShiftClick: boolean) => {
    if (sequencePlaying) return;
    if (!normalizedSelection) {
      anchorIndexRef.current = idx;
      onSelectRange({ startIndex: idx, endIndex: idx });
      return;
    }

    if (isShiftClick || (selectMode && anchorIndexRef.current !== null)) {
      const anchor = anchorIndexRef.current ?? normalizedSelection.startIndex;
      if (
        normalizedSelection.startIndex === idx &&
        normalizedSelection.endIndex === idx &&
        anchor === idx
      ) {
        anchorIndexRef.current = null;
        onSelectRange(null);
      } else {
        onSelectRange({
          startIndex: Math.min(anchor, idx),
          endIndex: Math.max(anchor, idx),
        });
      }
      return;
    }

    anchorIndexRef.current = idx;
    onSelectRange({ startIndex: idx, endIndex: idx });
  };

  const minTimelineWidthPx = Math.max(560, layout.totalBars * 156);

  return (
    <section
      aria-labelledby="visual-sequencer-heading"
      data-testid="visual-sequencer"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2.5 flex flex-col gap-2 shrink-0"
    >
      {/* Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="visual-sequencer-heading"
            className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            Visual Sequencer
          </h2>

          {!isLiveMode && (
            <div className="flex flex-wrap items-center gap-1.5 font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-300">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold">
                {timeSignature}
              </span>
              <span data-testid="sequencer-summary">
                {layout.totalBars} {layout.totalBars === 1 ? 'bar' : 'bars'} · {layout.totalBeats}{' '}
                {layout.totalBeats === 1 ? 'beat' : 'beats'} · {layout.totalDurationSec.toFixed(1)}s
              </span>
              {inputMode === 'degrees' && (
                <span className="hidden sm:inline text-slate-500 dark:text-slate-400">
                  · {songKey} {KEY_MODE_SHORT_LABELS[keyMode]}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {!isLiveMode && layout.items.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={sequencePlaying}
                aria-pressed={selectMode}
                onClick={() => setSelectMode((prev) => !prev)}
                title="Toggle range selection mode on the timeline (or Shift+Click chords anytime)"
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                  selectMode
                    ? 'bg-amber-600 border-amber-600 text-white hover:bg-amber-700'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <ListFilter className="w-3 h-3" aria-hidden="true" />
                <span>{selectMode ? 'Selecting' : 'Select Range'}</span>
              </button>

              {normalizedSelection && (
                <button
                  type="button"
                  disabled={sequencePlaying}
                  aria-label="Clear chord selection"
                  onClick={() => {
                    anchorIndexRef.current = null;
                    setSelectMode(false);
                    onSelectRange(null);
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-[11px] font-medium cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          )}

          <div className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {isLiveMode ? (
              <span>Live Playing mode active</span>
            ) : activeBarBeatText ? (
              <span
                data-testid="sequencer-playhead-readout"
                className="font-semibold text-emerald-700 dark:text-emerald-400"
              >
                {activeBarBeatText}
                {isSelectionPlayback ? ' (Sel)' : ''}
              </span>
            ) : selectionSpanMetrics ? (
              <span
                data-testid="sequencer-selection-readout"
                className="font-semibold text-amber-700 dark:text-amber-300"
              >
                Sel: {selectionSpanMetrics.chordCount}{' '}
                {selectionSpanMetrics.chordCount === 1 ? 'chord' : 'chords'} ·{' '}
                {selectionSpanMetrics.beats}b
              </span>
            ) : (
              <span className="font-sans hidden sm:inline">
                {selectMode
                  ? 'Click start & end chords to select range'
                  : 'Hold chord to audition · Shift+Click to select'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Body */}
      {isLiveMode ? (
        <div className="h-[66px] rounded-md border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/60 flex items-center justify-center px-4 text-xs text-slate-500 dark:text-slate-400 gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>
            Switch to <strong>Chord Names</strong> or <strong>Scale Degrees</strong> to view your bar-by-bar chord timeline.
          </span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700/90 bg-slate-50/70 dark:bg-slate-950/70">
          <div
            data-testid="sequencer-track-canvas"
            style={{ minWidth: `${minTimelineWidthPx}px` }}
            className="relative w-full select-none"
          >
            {/* Bar & Beat Ruler */}
            <div
              data-testid="sequencer-bar-ruler"
              className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/90 h-7"
            >
              {layout.bars.map((bar) => (
                <div
                  key={bar.barNumber}
                  data-testid={`sequencer-bar-${bar.barNumber}`}
                  style={{ width: `${(layout.beatsPerMeasure / layout.gridBeats) * 100}%` }}
                  className={`flex flex-col justify-between px-1.5 py-0.5 shrink-0 ${
                    bar.barNumber > 1
                      ? 'border-l-2 border-slate-400/80 dark:border-slate-500/80'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] leading-none">
                    <span className="font-mono tabular-nums font-bold text-slate-700 dark:text-slate-200">
                      Bar {bar.barNumber}
                    </span>
                  </div>
                  <div
                    className="grid gap-0 text-[9px] leading-none font-mono tabular-nums text-slate-400 dark:text-slate-500"
                    style={{ gridTemplateColumns: `repeat(${layout.beatsPerMeasure}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: layout.beatsPerMeasure }, (_, beatIdx) => (
                      <span key={beatIdx} className="pl-0.5">
                        {beatIdx + 1}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Chord Lane with Beat/Bar Gridlines + Selection Span + Playhead */}
            <div className="relative h-[50px]">
              {/* Background Beat & Bar Vertical Gridlines */}
              <div
                aria-hidden="true"
                className="absolute inset-0 flex pointer-events-none"
              >
                {Array.from({ length: layout.gridBeats }, (_, beatOffset) => {
                  const isBarStart = beatOffset % layout.beatsPerMeasure === 0;
                  return (
                    <div
                      key={beatOffset}
                      style={{ width: `${(1 / layout.gridBeats) * 100}%` }}
                      className={`h-full shrink-0 ${
                        beatOffset === 0
                          ? ''
                          : isBarStart
                            ? 'border-l-2 border-slate-300 dark:border-slate-600'
                            : 'border-l border-dashed border-slate-200/90 dark:border-slate-800/90'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Selection Range Highlight Backdrop */}
              {selectionSpanMetrics && (
                <div
                  data-testid="sequencer-selection-span"
                  aria-hidden="true"
                  style={{
                    left: `${(selectionSpanMetrics.startBeat / layout.gridBeats) * 100}%`,
                    width: `${(selectionSpanMetrics.beats / layout.gridBeats) * 100}%`,
                  }}
                  className="absolute top-0 bottom-0 bg-amber-400/12 dark:bg-amber-400/10 border-t-2 border-t-amber-500 pointer-events-none"
                />
              )}

              {/* Empty state message inside lane */}
              {layout.items.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                  Enter chords above to see them arranged across bars
                </div>
              )}

              {/* Chord Blocks */}
              {layout.items.map((item) => {
                const isActive = effectiveActiveChordIndex === item.index;
                const isSelected =
                  normalizedSelection !== null &&
                  item.index >= normalizedSelection.startIndex &&
                  item.index <= normalizedSelection.endIndex;
                const isDimmedBySelection = normalizedSelection !== null && !isSelected;

                const leftPct = (item.startBeat / layout.gridBeats) * 100;
                const widthPct = (item.beats / layout.gridBeats) * 100;
                const showOriginalDegree =
                  inputMode === 'degrees' &&
                  !item.error &&
                  item.originalToken.replace(/\(\d+\)$/, '') !== item.displayName;

                return (
                  <div
                    key={`${item.index}-${item.originalToken}-${item.startBeat}`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    className="absolute top-1.5 bottom-1.5 px-[2px]"
                  >
                    <button
                      type="button"
                      data-testid={`sequencer-chord-${item.index}`}
                      data-active={isActive ? 'true' : 'false'}
                      data-selected={isSelected ? 'true' : 'false'}
                      data-bar={item.startBar}
                      data-beat-in-bar={item.beatInBar}
                      disabled={sequencePlaying}
                      title={`${item.displayName} — Bar ${item.startBar}, Beat ${item.beatInBar} (${item.beats} ${
                        item.beats === 1 ? 'beat' : 'beats'
                      })${item.spansMultipleBars ? ' · crosses barline' : ''}`}
                      onClick={(e) => {
                        if (selectMode || e.shiftKey) {
                          handleRangeClick(item.index, e.shiftKey);
                        }
                      }}
                      onPointerDown={(e) => {
                        if (sequencePlaying || item.error || selectMode || e.shiftKey) return;
                        e.preventDefault();
                        heldIndexRef.current = item.index;
                        onPreviewChordDown(item.parsedToken, item.index);
                      }}
                      onPointerUp={() => {
                        if (heldIndexRef.current === item.index) {
                          heldIndexRef.current = null;
                          onPreviewChordUp(item.index);
                        }
                      }}
                      onPointerLeave={() => {
                        if (heldIndexRef.current === item.index) {
                          heldIndexRef.current = null;
                          onPreviewChordUp(item.index);
                        }
                      }}
                      onPointerCancel={() => {
                        if (heldIndexRef.current === item.index) {
                          heldIndexRef.current = null;
                          onPreviewChordUp(item.index);
                        }
                      }}
                      className={`w-full h-full rounded px-2 py-0.5 flex flex-col justify-center text-left border transition-all overflow-hidden cursor-pointer disabled:cursor-default ${
                        item.error
                          ? 'bg-red-50/90 dark:bg-red-950/60 border-red-400 dark:border-red-700 border-dashed text-red-700 dark:text-red-300'
                          : isActive
                            ? 'bg-blue-600 dark:bg-blue-500 border-blue-700 dark:border-blue-300 text-white shadow-sm'
                            : isSelected
                              ? 'bg-amber-50 dark:bg-amber-950/55 border-amber-500 dark:border-amber-400 border-l-[3px] border-l-amber-600 dark:border-l-amber-400 text-slate-900 dark:text-amber-50 ring-1 ring-amber-400/40'
                              : isDimmedBySelection
                                ? 'bg-white/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 border-l-[3px] border-l-slate-400 text-slate-500 dark:text-slate-400 opacity-55 hover:opacity-90'
                                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 border-l-[3px] border-l-blue-600 dark:border-l-blue-400 text-slate-900 dark:text-slate-100 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/60 dark:hover:bg-slate-700/80'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-1 min-w-0">
                        <span className="font-mono text-xs font-bold truncate leading-tight">
                          {item.displayName}
                        </span>
                        <span
                          className={`font-mono tabular-nums text-[10px] shrink-0 leading-tight ${
                            isActive
                              ? 'text-blue-100'
                              : isSelected
                                ? 'text-amber-700 dark:text-amber-300'
                                : item.error
                                  ? 'text-red-500 dark:text-red-400'
                                  : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {item.beats}b
                        </span>
                      </div>
                      <div
                        className={`flex items-center justify-between gap-1 text-[10px] font-mono tabular-nums leading-tight truncate ${
                          isActive
                            ? 'text-blue-100'
                            : isSelected
                              ? 'text-amber-700/85 dark:text-amber-300/85'
                              : item.error
                                ? 'text-red-500 dark:text-red-400'
                                : 'text-slate-400 dark:text-slate-400'
                        }`}
                      >
                        <span className="truncate">
                          B{item.startBar}.{item.beatInBar}
                          {showOriginalDegree
                            ? ` · ${item.originalToken.replace(/\(\d+\)$/, '')}`
                            : ''}
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}

              {/* Moving Playhead */}
              {effectivePlayheadBeat !== null && (
                <div
                  data-testid="sequencer-playhead"
                  aria-hidden="true"
                  style={{
                    left: `${Math.min(100, (effectivePlayheadBeat / layout.gridBeats) * 100)}%`,
                  }}
                  className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 dark:bg-emerald-400 pointer-events-none z-10 transition-[left] duration-100 ease-linear"
                >
                  <div className="w-2 h-2 -ml-[3px] -mt-1 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-xs" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
