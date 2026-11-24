import React from 'react';
import { Bell, Play, Repeat, SkipBack, SkipForward, Square } from 'lucide-react';
import type { InputMode } from '../types/chordotron';

interface PlaybackFooterProps {
  inputMode: InputMode;
  sequencePlaying: boolean;
  loopEnabled: boolean;
  metronomeEnabled: boolean;
  selectionCount: number;
  prevChordLabel: string;
  currentChordLabel: string;
  nextChordLabel: string;
  beatsPerMeasure: number;
  activeBeatIndex: number | null;
  isDownbeatActive: boolean;
  onTogglePlayStop: () => void;
  onToggleLoop: () => void;
  onToggleMetronome: () => void;
}

export const PlaybackFooter: React.FC<PlaybackFooterProps> = ({
  inputMode,
  sequencePlaying,
  loopEnabled,
  metronomeEnabled,
  selectionCount,
  prevChordLabel,
  currentChordLabel,
  nextChordLabel,
  beatsPerMeasure,
  activeBeatIndex,
  isDownbeatActive,
  onTogglePlayStop,
  onToggleLoop,
  onToggleMetronome,
}) => {
  const isLiveMode = inputMode === 'livePlaying';
  const hasSelection = !isLiveMode && selectionCount > 0;
  const displayCurrentLabel =
    !sequencePlaying && hasSelection && (currentChordLabel === 'Playing: --' || currentChordLabel === 'Stopped')
      ? `Sel: ${selectionCount} ${selectionCount === 1 ? 'chord' : 'chords'}`
      : currentChordLabel;

  return (
    <footer className="bg-[#1C242E] dark:bg-slate-950 text-slate-100 border-t border-slate-800 px-3 sm:px-6 py-1.5 sm:py-2.5 shrink-0">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
        {/* Prev Chord Context */}
        <div
          className={`hidden md:flex items-center justify-end gap-1.5 w-44 truncate text-xs text-slate-400 ${
            isLiveMode ? 'opacity-40' : ''
          }`}
        >
          <SkipBack className="w-3.5 h-3.5 shrink-0 text-slate-500" aria-hidden="true" />
          <span data-testid="prev-chord-display" className="font-mono truncate">
            {prevChordLabel}
          </span>
        </div>

        {/* Center Transport & Beat Indicators */}
        <div className="flex-1 flex flex-col items-center gap-1 sm:gap-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={loopEnabled}
              disabled={isLiveMode}
              onClick={onToggleLoop}
              title={hasSelection ? 'Loop selected chords [L]' : 'Toggle loop playback [L]'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                loopEnabled
                  ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500'
                  : 'bg-slate-700/80 border-slate-600 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Loop</span>
            </button>

            <button
              type="button"
              disabled={isLiveMode}
              onClick={onTogglePlayStop}
              title={
                sequencePlaying
                  ? 'Stop playback [Space]'
                  : hasSelection
                    ? 'Play selected chord range [Space]'
                    : 'Start playback [Space]'
              }
              className={`inline-flex items-center justify-center gap-1.5 px-5 py-1.5 min-w-[104px] text-xs font-semibold rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                sequencePlaying
                  ? 'bg-red-600 border-red-500 text-white hover:bg-red-500'
                  : hasSelection
                    ? 'bg-amber-600 border-amber-500 text-white hover:bg-amber-500'
                    : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
              }`}
            >
              {sequencePlaying ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>{hasSelection ? 'Play Sel' : 'Play'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              aria-pressed={metronomeEnabled}
              disabled={isLiveMode}
              onClick={onToggleMetronome}
              title="Toggle audible metronome click [M]"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                metronomeEnabled
                  ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500'
                  : 'bg-slate-700/80 border-slate-600 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <Bell className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Metro</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <div
              data-testid="current-chord-display"
              className="font-mono text-sm font-semibold text-white bg-slate-800/90 dark:bg-slate-900 border border-slate-700 rounded px-2.5 py-0.5 min-w-[130px] text-center"
            >
              {displayCurrentLabel}
            </div>

            {!isLiveMode && (
              <div
                data-testid="beat-indicators"
                aria-label="Beat indicators"
                className="flex items-center gap-1.5"
              >
                {Array.from({ length: beatsPerMeasure }, (_, idx) => {
                  const isBeatActive = activeBeatIndex === idx;
                  const isDownbeat = isBeatActive && isDownbeatActive;
                  return (
                    <span
                      key={idx}
                      data-active={isBeatActive ? 'true' : 'false'}
                      className={`w-3 h-3 rounded-full border transition-transform duration-75 ${
                        isDownbeat
                          ? 'bg-amber-500 border-amber-300 scale-110'
                          : isBeatActive
                            ? 'bg-blue-500 border-blue-300 scale-110'
                            : 'bg-slate-700 border-slate-600'
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Next Chord Context */}
        <div
          className={`hidden md:flex items-center justify-start gap-1.5 w-44 truncate text-xs text-slate-400 ${
            isLiveMode ? 'opacity-40' : ''
          }`}
        >
          <span data-testid="next-chord-display" className="font-mono truncate">
            {nextChordLabel}
          </span>
          <SkipForward className="w-3.5 h-3.5 shrink-0 text-slate-500" aria-hidden="true" />
        </div>
      </div>
    </footer>
  );
};
