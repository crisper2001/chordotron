import React from 'react';
import { Keyboard, Music2, SlidersHorizontal } from 'lucide-react';
import {
  KEY_MODE_OPTIONS,
  LIVE_PLAYING_KEYS,
  SONG_KEY_OPTIONS,
} from '../config/constants';
import type { InputMode, KeyModeKind } from '../types/chordotron';

interface InputSectionProps {
  inputMode: InputMode;
  chordInput: string;
  scaleDegreeInput: string;
  songKey: string;
  keyMode: KeyModeKind;
  livePlayingChords: string[];
  activeLiveKeys: Set<string>;
  disabled: boolean;
  selectionCount: number;
  chordTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  degreeTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChangeInputMode: (mode: InputMode) => void;
  onChangeChordInput: (value: string) => void;
  onChangeScaleDegreeInput: (value: string) => void;
  onChangeSongKey: (value: string) => void;
  onChangeKeyMode: (value: KeyModeKind) => void;
  onChangeLiveChord: (index: number, value: string) => void;
  onTriggerLivePadDown: (keyChar: string) => void;
  onTriggerLivePadUp: (keyChar: string) => void;
  onTextSelectionChange: (mode: 'chords' | 'degrees', selectionStart: number, selectionEnd: number) => void;
  onClearSelection: () => void;
}

const CHORD_EXAMPLES = [
  { label: 'Pop I-vi-IV-V', value: 'Cmaj7(4) Am7(4) Fmaj7(4) G7(4)' },
  { label: 'Jazz ii-V-I', value: 'Dm9(4) G13(4) Cmaj9(8)' },
  { label: 'Slash Walkdown', value: 'E(4) B/D#(4) C#m7(4) A(4)' },
];

const DEGREE_EXAMPLES = [
  { label: 'Canon', value: 'I(2) V(2) vi(2) iii(2) IV(2) I(2) IV(2) V(2)' },
  { label: 'Jazz Turnaround', value: 'ii7(4) V7(4) Imaj7(4) VI7(4)' },
];

export const InputSection: React.FC<InputSectionProps> = ({
  inputMode,
  chordInput,
  scaleDegreeInput,
  songKey,
  keyMode,
  livePlayingChords,
  activeLiveKeys,
  disabled,
  selectionCount,
  chordTextareaRef,
  degreeTextareaRef,
  onChangeInputMode,
  onChangeChordInput,
  onChangeScaleDegreeInput,
  onChangeSongKey,
  onChangeKeyMode,
  onChangeLiveChord,
  onTriggerLivePadDown,
  onTriggerLivePadUp,
  onTextSelectionChange,
  onClearSelection,
}) => {
  return (
    <section
      aria-labelledby="input-section-heading"
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex-1 flex flex-col min-h-0 ${
        disabled ? 'opacity-65' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <h2 id="input-section-heading" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Input
        </h2>
        {inputMode === 'livePlaying' ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Hold keys 1–= or pad buttons
          </span>
        ) : selectionCount > 0 ? (
          <div className="flex items-center gap-1.5">
            <span
              data-testid="input-selection-badge"
              className="text-[11px] font-mono font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded px-1.5 py-0.5"
            >
              {selectionCount} {selectionCount === 1 ? 'chord' : 'chords'} selected
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={onClearSelection}
              className="text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Highlight text or timeline to play selection
          </span>
        )}
      </div>

      {/* Mode Segmented Selector */}
      <div
        role="radiogroup"
        aria-label="Input mode"
        className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-md mb-3 shrink-0"
      >
        <button
          type="button"
          role="radio"
          aria-checked={inputMode === 'chords'}
          disabled={disabled}
          onClick={() => onChangeInputMode('chords')}
          className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed ${
            inputMode === 'chords'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Music2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Chord Names</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={inputMode === 'degrees'}
          disabled={disabled}
          onClick={() => onChangeInputMode('degrees')}
          className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed ${
            inputMode === 'degrees'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Scale Degrees</span>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={inputMode === 'livePlaying'}
          disabled={disabled}
          onClick={() => onChangeInputMode('livePlaying')}
          className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed ${
            inputMode === 'livePlaying'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Keyboard className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Live Playing</span>
        </button>
      </div>

      {/* Chord Names Mode */}
      {inputMode === 'chords' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 shrink-0">
            <label htmlFor="chordInput" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Chords
            </label>
            <div className="flex flex-wrap items-center gap-1">
              {CHORD_EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChangeChordInput(ex.value)}
                  className="px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            ref={chordTextareaRef}
            id="chordInput"
            disabled={disabled}
            value={chordInput}
            onChange={(e) => onChangeChordInput(e.target.value)}
            onSelect={(e) =>
              onTextSelectionChange(
                'chords',
                e.currentTarget.selectionStart ?? 0,
                e.currentTarget.selectionEnd ?? 0
              )
            }
            onMouseUp={(e) =>
              onTextSelectionChange(
                'chords',
                e.currentTarget.selectionStart ?? 0,
                e.currentTarget.selectionEnd ?? 0
              )
            }
            onKeyUp={(e) =>
              onTextSelectionChange(
                'chords',
                e.currentTarget.selectionStart ?? 0,
                e.currentTarget.selectionEnd ?? 0
              )
            }
            placeholder="e.g. E(8) C#m(8) A(8) B(8) or Cmaj7 G/B Am7 F"
            className="w-full flex-1 min-h-[140px] p-3 font-mono text-sm leading-relaxed text-slate-900 dark:text-slate-100 bg-slate-50/60 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 dark:focus:border-blue-400 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500"
          />
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            Optional beat counts in parentheses: <code className="font-mono text-slate-700 dark:text-slate-300">G/B(2)</code>. Supports extensions & slash bass.
          </p>
        </div>
      )}

      {/* Scale Degrees Mode */}
      {inputMode === 'degrees' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="grid grid-cols-2 gap-3 mb-3 shrink-0">
            <div>
              <label htmlFor="songKey" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Song Key
              </label>
              <select
                id="songKey"
                disabled={disabled}
                value={songKey}
                onChange={(e) => onChangeSongKey(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 disabled:bg-slate-100 dark:disabled:bg-slate-800"
              >
                {SONG_KEY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="keyMode" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mode
              </label>
              <select
                id="keyMode"
                disabled={disabled}
                value={keyMode}
                onChange={(e) => onChangeKeyMode(e.target.value as KeyModeKind)}
                className="w-full px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 disabled:bg-slate-100 dark:disabled:bg-slate-800"
              >
                {KEY_MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 shrink-0">
            <label htmlFor="scaleDegreeInput" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Degrees
            </label>
            <div className="flex flex-wrap items-center gap-1">
              {DEGREE_EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChangeScaleDegreeInput(ex.value)}
                  className="px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            ref={degreeTextareaRef}
            id="scaleDegreeInput"
            disabled={disabled}
            value={scaleDegreeInput}
            onChange={(e) => onChangeScaleDegreeInput(e.target.value)}
            onSelect={(e) =>
              onTextSelectionChange(
                'degrees',
                e.currentTarget.selectionStart ?? 0,
                e.currentTarget.selectionEnd ?? 0
              )
            }
            onMouseUp={(e) =>
              onTextSelectionChange(
                'degrees',
                e.currentTarget.selectionStart ?? 0,
                e.currentTarget.selectionEnd ?? 0
              )
            }
            onKeyUp={(e) =>
              onTextSelectionChange(
                'degrees',
                e.currentTarget.selectionStart ?? 0,
                e.currentTarget.selectionEnd ?? 0
              )
            }
            placeholder="e.g. I(2) V(2) vi(2) iii(2) IV(2) I(2) IV(2) V(2)"
            className="w-full flex-1 min-h-[120px] p-3 font-mono text-sm leading-relaxed text-slate-900 dark:text-slate-100 bg-slate-50/60 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 dark:focus:border-blue-400 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500"
          />
        </div>
      )}

      {/* Live Playing Mode */}
      {inputMode === 'livePlaying' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2 overflow-y-auto pr-0.5">
            {LIVE_PLAYING_KEYS.map((keyChar, index) => {
              const isActive = activeLiveKeys.has(keyChar);
              const chordValue = livePlayingChords[index] ?? '';
              return (
                <div
                  key={keyChar}
                  className={`flex items-center gap-1.5 p-1.5 rounded-md border transition-colors ${
                    isActive
                      ? 'border-blue-600 dark:border-blue-400 bg-blue-50/70 dark:bg-blue-950/50'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60'
                  }`}
                >
                  <button
                    type="button"
                    aria-label={`Trigger slot ${index + 1} (Key ${keyChar}): ${chordValue || 'empty'}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      onTriggerLivePadDown(keyChar);
                    }}
                    onPointerUp={() => onTriggerLivePadUp(keyChar)}
                    onPointerLeave={() => {
                      if (isActive) onTriggerLivePadUp(keyChar);
                    }}
                    onPointerCancel={() => {
                      if (isActive) onTriggerLivePadUp(keyChar);
                    }}
                    title={`Hold or press key "${keyChar}" to play`}
                    className={`w-7 h-7 shrink-0 rounded font-mono text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer select-none ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-300'
                    }`}
                  >
                    {keyChar}
                  </button>
                  <input
                    type="text"
                    aria-label={`Live chord slot ${index + 1} (Key ${keyChar})`}
                    value={chordValue}
                    disabled={disabled}
                    placeholder="Chord"
                    onChange={(e) => onChangeLiveChord(index, e.target.value)}
                    className="w-full min-w-0 px-2 py-1 text-xs font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            Assign chords to slots 1–= and hold the corresponding key (or click-hold the key pad) to perform live.
          </p>
        </div>
      )}
    </section>
  );
};
