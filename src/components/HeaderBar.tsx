import React, { useRef } from 'react';
import {
  Circle,
  Download,
  FileAudio,
  FilePlus2,
  FolderOpen,
  HelpCircle,
  Moon,
  Save,
  Square,
  Sun,
} from 'lucide-react';
import type { InputMode, ThemeMode } from '../types/chordotron';
import { formatDuration } from '../utils/music-theory';

interface HeaderBarProps {
  theme: ThemeMode;
  inputMode: InputMode;
  sequencePlaying: boolean;
  isLiveKeyHeld: boolean;
  isRecording: boolean;
  recordingSupported: boolean;
  hasRecordedAudio: boolean;
  liveRecordingSeconds: number;
  finalRecordingDuration: number | null;
  onToggleTheme: () => void;
  onNewSong: () => void;
  onLoadFile: (file: File) => void;
  onSaveFile: () => void;
  onExportMidi: () => void;
  onToggleRecord: () => void;
  onDownloadRecording: () => void;
  onOpenHelp: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  theme,
  inputMode,
  sequencePlaying,
  isLiveKeyHeld,
  isRecording,
  recordingSupported,
  hasRecordedAudio,
  liveRecordingSeconds,
  finalRecordingDuration,
  onToggleTheme,
  onNewSong,
  onLoadFile,
  onSaveFile,
  onExportMidi,
  onToggleRecord,
  onDownloadRecording,
  onOpenHelp,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const actionsLocked = sequencePlaying || isLiveKeyHeld;
  const isLiveMode = inputMode === 'livePlaying';

  const recordDisabled =
    !recordingSupported || (!isRecording && (sequencePlaying || isLiveKeyHeld));
  const downloadDisabled =
    isRecording || !hasRecordedAudio || sequencePlaying || isLiveKeyHeld;
  const exportMidiDisabled = actionsLocked || isLiveMode;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onLoadFile(file);
    }
    event.target.value = '';
  };

  const btnBase =
    'inline-flex items-center gap-1 lg:gap-1.5 px-2 lg:px-2.5 py-1 lg:py-1.5 text-[11px] lg:text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-white disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer';

  const renderNewButton = (extraClass = '') => (
    <button
      type="button"
      onClick={onNewSong}
      disabled={actionsLocked}
      title="Create a new song (resets settings) [N]"
      className={`${btnBase} ${extraClass}`}
    >
      <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
      <span>New</span>
    </button>
  );

  const renderThemeButton = (extraClass = '') => (
    <button
      type="button"
      onClick={onToggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`${btnBase} ${extraClass}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
      )}
      <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );

  const renderHelpButton = (extraClass = '') => (
    <button
      type="button"
      onClick={onOpenHelp}
      disabled={actionsLocked}
      title="Show help guide"
      className={`${btnBase} ${extraClass}`}
    >
      <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Help</span>
    </button>
  );

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md lg:bg-white dark:lg:bg-slate-900 lg:backdrop-blur-none border-b border-slate-200 dark:border-slate-800 max-lg:fixed max-lg:top-0 max-lg:left-0 max-lg:right-0 max-lg:z-30 max-lg:shadow-sm shrink-0">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-1.5 lg:py-2.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1.5 lg:gap-3">
        {/* Top Row on mobile (Title + New + Theme + Help); Left brand block on desktop */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-baseline gap-3 shrink-0">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap">
              Chordotron
            </h1>
            <span className="hidden md:inline text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Chord Progression Synthesizer
            </span>
          </div>

          <div className="flex items-center gap-1.5 lg:hidden">
            {renderNewButton()}
            {renderThemeButton()}
            {renderHelpButton()}
          </div>
        </div>

        {/* Action Strip: compact single-line scrollable strip on mobile, full wrapped bar on desktop */}
        <div className="flex flex-nowrap lg:flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto lg:overflow-visible pb-0.5 lg:pb-0">
          <div className="hidden lg:flex items-center">
            {renderNewButton()}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={actionsLocked}
            title="Load song settings from a JSON file [O]"
            className={btnBase}
          >
            <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Load</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Load song settings JSON file"
          />

          <button
            type="button"
            onClick={onSaveFile}
            disabled={actionsLocked}
            title="Save current song settings [S]"
            className={btnBase}
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Save</span>
          </button>

          <button
            type="button"
            onClick={onExportMidi}
            disabled={exportMidiDisabled}
            title={
              isLiveMode
                ? 'MIDI export is unavailable in Live Playing mode'
                : 'Export progression to MIDI file'
            }
            className={btnBase}
          >
            <FileAudio className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export MIDI</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 hidden sm:block shrink-0" aria-hidden="true" />

          <button
            type="button"
            onClick={onToggleRecord}
            disabled={recordDisabled}
            title={isRecording ? 'Stop audio recording [R]' : 'Record audio output [R]'}
            className={`inline-flex items-center gap-1 lg:gap-1.5 px-2 lg:px-2.5 py-1 lg:py-1.5 text-[11px] lg:text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
              isRecording
                ? 'bg-red-600 border-red-700 text-white hover:bg-red-700'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80'
            }`}
          >
            {isRecording ? (
              <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 fill-red-600 dark:fill-red-400" aria-hidden="true" />
            )}
            <span>{isRecording ? 'Stop Rec' : 'Record'}</span>
          </button>

          <button
            type="button"
            onClick={onDownloadRecording}
            disabled={downloadDisabled}
            title="Download last recorded audio"
            className={btnBase}
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download Rec</span>
          </button>

          {(isRecording || (hasRecordedAudio && finalRecordingDuration !== null)) && (
            <span
              data-testid="recording-duration"
              className="font-mono tabular-nums text-[11px] lg:text-xs text-slate-600 dark:text-slate-300 px-1.5 whitespace-nowrap shrink-0"
            >
              {isRecording
                ? `Rec ${formatDuration(liveRecordingSeconds)}`
                : `Length ${formatDuration(finalRecordingDuration)}`}
            </span>
          )}

          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" aria-hidden="true" />
            {renderThemeButton()}
            {renderHelpButton()}
          </div>
        </div>
      </div>
    </header>
  );
};
