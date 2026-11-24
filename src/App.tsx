import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ChordotronAudioEngine } from './audio/audio-engine';
import { ConfirmDialog } from './components/ConfirmDialog';
import { HeaderBar } from './components/HeaderBar';
import { HelpModal } from './components/HelpModal';
import { InputSection } from './components/InputSection';
import { PianoKeyboard } from './components/PianoKeyboard';
import { PlaybackFooter } from './components/PlaybackFooter';
import { SettingsSection } from './components/SettingsSection';
import { VisualSequencer } from './components/VisualSequencer';
import {
  INSTRUMENT_PRESETS,
  KEY_TO_LIVE_PLAYING_INDEX_MAP,
  MIDI_B5,
  MIDI_C2,
  defaultSettings,
} from './config/constants';
import type {
  AppNotice,
  ArpeggiatorSettings,
  ChordotronSettings,
  EffectKey,
  InputMode,
  InstrumentPreset,
  KeyModeKind,
  ParsedChordToken,
  SynthEffectsSettings,
} from './types/chordotron';
import {
  type ChordSelectionRange,
  resolveTokenRangeFromTextSelection,
  sliceProgressionForSelection,
} from './utils/chord-selection';
import { exportProgressionToMidiBlob } from './utils/midi-writer';
import {
  calculateTapBpm,
  formatChordForDisplay,
  formatChordObjectForUI,
  frequencyToMidi,
  getBeatsPerMeasure,
  isPitchRangeValid,
  parseChordNameToFrequencies,
  parseDirectChordString,
  parseScaleDegreeString,
  voiceFrequenciesInRange,
  voiceProgression,
} from './utils/music-theory';
import {
  autosaveSettings,
  clearAutosavedSettings,
  createBlankResetSettings,
  loadAutosavedSettings,
  sanitizeSettings,
} from './utils/settings-persistence';

const REFERENCE_OCTAVE_FOR_LIVE_PLAYING = 2;

export default function App() {
  const [settings, setSettings] = useState<ChordotronSettings>(() => {
    const saved = loadAutosavedSettings();
    return saved ?? { ...defaultSettings };
  });

  const settingsRef = useRef<ChordotronSettings>(settings);
  settingsRef.current = settings;

  const tapTimestampsRef = useRef<number[]>([]);

  const [sequencePlaying, setSequencePlaying] = useState(false);
  const [isSelectionPlayback, setIsSelectionPlayback] = useState(false);
  const [selectedRange, setSelectedRange] = useState<ChordSelectionRange | null>(null);
  const [selectionStartBeatOffset, setSelectionStartBeatOffset] = useState(0);
  const [activeChordIndex, setActiveChordIndex] = useState<number | null>(null);
  const [activeSequenceBeat, setActiveSequenceBeat] = useState<number | null>(null);
  const [activeMidiNotes, setActiveMidiNotes] = useState<number[]>([]);
  const [activeLiveKeys, setActiveLiveKeys] = useState<Set<string>>(new Set());

  const [prevChordLabel, setPrevChordLabel] = useState('Prev: --');
  const [currentChordLabel, setCurrentChordLabel] = useState('Playing: --');
  const [nextChordLabel, setNextChordLabel] = useState('Next: --');
  const [activeBeatIndex, setActiveBeatIndex] = useState<number | null>(null);
  const [isDownbeatActive, setIsDownbeatActive] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordedMimeType, setRecordedMimeType] = useState('audio/webm');
  const [recordingStartTimeMs, setRecordingStartTimeMs] = useState<number | null>(null);
  const [liveRecordingSeconds, setLiveRecordingSeconds] = useState(0);
  const [finalRecordingDuration, setFinalRecordingDuration] = useState<number | null>(null);

  const [helpOpen, setHelpOpen] = useState(false);
  const [confirmNewOpen, setConfirmNewOpen] = useState(false);
  const [notice, setNotice] = useState<AppNotice | null>(null);

  const chordTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const degreeTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const audioEngineRef = useRef<ChordotronAudioEngine | null>(null);
  if (!audioEngineRef.current) {
    audioEngineRef.current = new ChordotronAudioEngine(() => settingsRef.current);
  }

  const showNotice = useCallback((type: AppNotice['type'], message: string) => {
    setNotice({ id: Date.now(), type, message });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(id);
  }, [notice]);

  useEffect(() => {
    return () => {
      audioEngineRef.current?.dispose();
    };
  }, []);

  // Sync theme class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  // Sync autosave, master gain, and effects rack (including BPM-synced FX)
  useEffect(() => {
    autosaveSettings(settings);
    audioEngineRef.current?.setMasterGain(settings.masterGain);
    audioEngineRef.current?.updateEffects(settings.effects, settings.bpm);
  }, [settings]);

  useEffect(() => {
    if (!isRecording || recordingStartTimeMs === null) return;
    const interval = window.setInterval(() => {
      setLiveRecordingSeconds((Date.now() - recordingStartTimeMs) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [isRecording, recordingStartTimeMs]);

  const updateSetting = useCallback(
    <K extends keyof ChordotronSettings>(key: K, value: ChordotronSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSelectInstrument = useCallback((presetValue: InstrumentPreset) => {
    const profile = INSTRUMENT_PRESETS.find((p) => p.value === presetValue);
    if (!profile) return;
    setSettings((prev) => ({
      ...prev,
      instrumentPreset: profile.value,
      oscillatorType: profile.oscillatorType,
      attack: profile.attack,
      decay: profile.decay,
      sustain: profile.sustain,
      release: profile.release,
      filterType: profile.filterType,
      filterCutoff: profile.filterCutoff,
      filterResonance: profile.filterResonance,
      filterEnvAmount: profile.filterEnvAmount,
      detuneCents: profile.detuneCents,
      subOscMix: profile.subOscMix,
    }));
  }, []);

  const handleUpdateEffect = useCallback(
    <K extends EffectKey>(effectKey: K, patch: Partial<SynthEffectsSettings[K]>) => {
      setSettings((prev) => ({
        ...prev,
        effects: {
          ...prev.effects,
          [effectKey]: {
            ...prev.effects[effectKey],
            ...patch,
          },
        },
      }));
    },
    []
  );

  const handleUpdateArpeggiator = useCallback((patch: Partial<ArpeggiatorSettings>) => {
    setSettings((prev) => ({
      ...prev,
      arpeggiator: {
        ...prev.arpeggiator,
        ...patch,
      },
    }));
  }, []);

  const handleTapTempo = useCallback(() => {
    const now = Date.now();
    const prevTaps = tapTimestampsRef.current;
    const lastTap = prevTaps[prevTaps.length - 1];
    const nextTaps =
      lastTap !== undefined && now - lastTap > 2000 ? [now] : [...prevTaps.slice(-6), now];
    tapTimestampsRef.current = nextTaps;
    const computedBpm = calculateTapBpm(nextTaps);
    if (computedBpm !== null) {
      setSettings((prev) => ({ ...prev, bpm: computedBpm }));
    }
  }, []);

  const updatePitchRange = useCallback((rawStart: number, rawLength: number) => {
    const length = Math.max(12, Math.min(24, rawLength));
    const maxStart = MIDI_B5 - (length - 1);
    const start = Math.max(MIDI_C2, Math.min(rawStart, maxStart));
    setSettings((prev) => ({
      ...prev,
      rangeStartMidi: start,
      rangeLength: length,
    }));
  }, []);

  const stopPlayback = useCallback((clearDisplay = true) => {
    audioEngineRef.current?.stopSequence();
    setSequencePlaying(false);
    setIsSelectionPlayback(false);
    setActiveChordIndex(null);
    setActiveSequenceBeat(null);
    setActiveLiveKeys(new Set());
    if (clearDisplay) {
      setActiveMidiNotes([]);
      setActiveBeatIndex(null);
      setIsDownbeatActive(false);
      if (settingsRef.current.inputMode === 'livePlaying') {
        setCurrentChordLabel('Ready');
        setPrevChordLabel('--');
        setNextChordLabel('--');
      } else {
        setCurrentChordLabel('Stopped');
        setPrevChordLabel('Prev: --');
        setNextChordLabel('Next: --');
      }
    }
  }, []);

  const resolveActiveSelectionRange = useCallback(
    (mode: InputMode, sourceString: string): ChordSelectionRange | null => {
      if (selectedRange) return selectedRange;
      if (mode === 'livePlaying') return null;
      const textarea = mode === 'chords' ? chordTextareaRef.current : degreeTextareaRef.current;
      if (!textarea) return null;
      return resolveTokenRangeFromTextSelection(
        sourceString,
        textarea.selectionStart ?? 0,
        textarea.selectionEnd ?? 0
      );
    },
    [selectedRange]
  );

  const handleTextSelectionChange = useCallback(
    (mode: 'chords' | 'degrees', selectionStart: number, selectionEnd: number) => {
      if (settingsRef.current.inputMode !== mode) return;
      const text =
        mode === 'chords' ? settingsRef.current.chordInput : settingsRef.current.scaleDegreeInput;
      if (selectionEnd > selectionStart) {
        const nextRange = resolveTokenRangeFromTextSelection(text, selectionStart, selectionEnd);
        setSelectedRange(nextRange);
      } else {
        setSelectedRange(null);
      }
    },
    []
  );

  const startPlayback = useCallback(() => {
    const s = settingsRef.current;
    if (s.inputMode === 'livePlaying') return;

    const defaultBeats = getBeatsPerMeasure(s.timeSignature);
    const fullText = s.inputMode === 'chords' ? s.chordInput : s.scaleDegreeInput;
    const allParsed =
      s.inputMode === 'chords'
        ? parseDirectChordString(fullText, defaultBeats)
        : parseScaleDegreeString(fullText, s.songKey, s.keyMode, defaultBeats);

    const activeRange = resolveActiveSelectionRange(s.inputMode, fullText);
    const sliced = sliceProgressionForSelection(allParsed, activeRange);
    const isSelection = sliced.normalizedRange !== null;
    const voicedChords = voiceProgression(sliced.items, s.rangeStartMidi, s.rangeLength);

    if (voicedChords.length === 0 || voicedChords.every((c) => !c.frequencies || c.frequencies.length === 0)) {
      setCurrentChordLabel('No valid chords');
      setActiveMidiNotes([]);
      showNotice('warning', 'Enter at least one valid chord before starting playback.');
      return;
    }

    setSequencePlaying(true);
    setIsSelectionPlayback(isSelection);
    setSelectionStartBeatOffset(sliced.startBeatOffset);
    setActiveChordIndex(null);
    setActiveSequenceBeat(null);
    setPrevChordLabel('Prev: --');
    setCurrentChordLabel('Playing: --');
    setNextChordLabel('Next: --');
    setActiveBeatIndex(null);
    setIsDownbeatActive(false);
    setActiveMidiNotes([]);

    audioEngineRef.current?.startSequence(voicedChords, isSelection, {
      onChordChange: (idx, allChords, midiNotes) => {
        setActiveChordIndex(idx);
        const currentObj = allChords[idx];
        setCurrentChordLabel(`Playing: ${formatChordObjectForUI(currentObj)}`);

        const loopOn = settingsRef.current.loopToggle;
        if (idx > 0 && allChords[idx - 1]) {
          setPrevChordLabel(`Prev: ${formatChordObjectForUI(allChords[idx - 1])}`);
        } else if (loopOn && allChords.length > 1 && currentObj) {
          setPrevChordLabel(`Prev: ${formatChordObjectForUI(allChords[allChords.length - 1])}`);
        } else {
          setPrevChordLabel('Prev: --');
        }

        if (idx >= 0 && idx < allChords.length - 1 && allChords[idx + 1]) {
          setNextChordLabel(`Next: ${formatChordObjectForUI(allChords[idx + 1])}`);
        } else if (loopOn && allChords.length > 1 && currentObj) {
          setNextChordLabel(`Next: ${formatChordObjectForUI(allChords[0])}`);
        } else {
          setNextChordLabel('Next: --');
        }

        setActiveMidiNotes(midiNotes);
      },
      onActiveNotesChange: (midiNotes) => {
        setActiveMidiNotes(midiNotes);
      },
      onBeatTick: (beatIdx, downbeat, seqBeatIdx) => {
        setActiveBeatIndex(beatIdx);
        setIsDownbeatActive(downbeat);
        setActiveSequenceBeat(seqBeatIdx);
      },
      onPlaybackComplete: () => {
        setSequencePlaying(false);
        setIsSelectionPlayback(false);
        setActiveChordIndex(null);
        setActiveSequenceBeat(null);
        setActiveMidiNotes([]);
        setActiveBeatIndex(null);
        setIsDownbeatActive(false);
        setCurrentChordLabel('Stopped');
        setPrevChordLabel('Prev: --');
        setNextChordLabel('Next: --');
      },
    });
  }, [resolveActiveSelectionRange, showNotice]);

  const handleTogglePlayStop = useCallback(() => {
    if (sequencePlaying) {
      stopPlayback(true);
    } else {
      startPlayback();
    }
  }, [sequencePlaying, startPlayback, stopPlayback]);

  const handleChangeInputMode = useCallback(
    (newMode: InputMode) => {
      if (sequencePlaying) {
        stopPlayback(true);
      }
      audioEngineRef.current?.stopAllLiveChords();
      setSelectedRange(null);
      setActiveLiveKeys(new Set());
      setActiveMidiNotes([]);
      setActiveBeatIndex(null);
      setIsDownbeatActive(false);

      if (newMode === 'livePlaying') {
        setCurrentChordLabel('Ready');
        setPrevChordLabel('--');
        setNextChordLabel('--');
      } else {
        setCurrentChordLabel('Playing: --');
        setPrevChordLabel('Prev: --');
        setNextChordLabel('Next: --');
      }
      updateSetting('inputMode', newMode);
    },
    [sequencePlaying, stopPlayback, updateSetting]
  );

  const playLiveChordForKey = useCallback((chordString: string, keyChar: string) => {
    const trimmed = chordString.trim();
    if (!trimmed) {
      setCurrentChordLabel('Ready');
      setActiveMidiNotes([]);
      return;
    }

    let mainChordPart = trimmed;
    let bassNoteString: string | null = null;
    const slashMatch = trimmed.match(/^(.*)\/([A-Ga-g][#b]?)$/);
    if (slashMatch && slashMatch[1] && slashMatch[2]) {
      mainChordPart = slashMatch[1];
      bassNoteString = slashMatch[2];
    }

    const s = settingsRef.current;
    const { frequencies: initialFrequencies, rootNoteName } = parseChordNameToFrequencies(
      mainChordPart,
      REFERENCE_OCTAVE_FOR_LIVE_PLAYING
    );
    const maxMidiTarget = s.rangeStartMidi + s.rangeLength - 1;
    const voicingResult = voiceFrequenciesInRange(
      initialFrequencies,
      rootNoteName,
      s.rangeStartMidi,
      maxMidiTarget,
      bassNoteString
    );

    if (voicingResult.frequencies.length > 0) {
      audioEngineRef.current?.startLiveChord(
        voicingResult.frequencies,
        keyChar,
        {
          attack: Math.max(0.01, s.attack),
          decay: 0,
          sustain: 1.0,
          release: Math.max(0.01, s.release),
        },
        s.oscillatorType,
        s.synthGain,
        (arpMidiNotes) => {
          setActiveMidiNotes(arpMidiNotes);
        }
      );
      setCurrentChordLabel(formatChordForDisplay(trimmed));
      if (!s.arpeggiator.enabled) {
        setActiveMidiNotes(voicingResult.frequencies.map((f) => frequencyToMidi(f)));
      }
    } else {
      setCurrentChordLabel(`${trimmed} (err)`);
      setActiveMidiNotes([]);
    }
  }, []);

  const triggerLivePadDown = useCallback(
    (keyChar: string) => {
      if (settingsRef.current.inputMode !== 'livePlaying') return;
      const idx = KEY_TO_LIVE_PLAYING_INDEX_MAP[keyChar];
      if (idx === undefined) return;

      setActiveLiveKeys((prev) => {
        prev.forEach((existing) => {
          if (existing !== keyChar) {
            audioEngineRef.current?.stopLiveChord(existing);
          }
        });
        return new Set([keyChar]);
      });

      const chordStr = settingsRef.current.livePlayingChords[idx] ?? '';
      if (chordStr.trim()) {
        playLiveChordForKey(chordStr, keyChar);
      }
    },
    [playLiveChordForKey]
  );

  const triggerLivePadUp = useCallback((keyChar: string) => {
    if (settingsRef.current.inputMode !== 'livePlaying') return;
    audioEngineRef.current?.stopLiveChord(keyChar);
    setActiveLiveKeys((prev) => {
      if (!prev.has(keyChar)) return prev;
      const next = new Set(prev);
      next.delete(keyChar);
      if (next.size === 0) {
        setActiveMidiNotes([]);
        setCurrentChordLabel('Ready');
      }
      return next;
    });
  }, []);

  const handlePreviewTimelineChordDown = useCallback((token: ParsedChordToken, index: number) => {
    const s = settingsRef.current;
    const voiced = voiceProgression([token], s.rangeStartMidi, s.rangeLength)[0];
    if (!voiced || voiced.frequencies.length === 0) return;

    audioEngineRef.current?.startLiveChord(
      voiced.frequencies,
      `timeline-${index}`,
      {
        attack: Math.max(0.01, s.attack),
        decay: Math.max(0.01, s.decay),
        sustain: s.sustain,
        release: Math.max(0.015, s.release),
      },
      s.oscillatorType,
      s.synthGain,
      (arpMidiNotes) => {
        setActiveMidiNotes(arpMidiNotes);
      }
    );

    if (!s.arpeggiator.enabled) {
      setActiveMidiNotes(voiced.frequencies.map((f) => frequencyToMidi(f)));
    }
  }, []);

  const handlePreviewTimelineChordUp = useCallback((index: number) => {
    audioEngineRef.current?.stopLiveChord(`timeline-${index}`);
    setActiveMidiNotes([]);
  }, []);

  const handleToggleMetronome = useCallback(() => {
    setSettings((prev) => {
      const nextChecked = !prev.metronomeAudioToggle;
      if (!nextChecked && sequencePlaying) {
        audioEngineRef.current?.silenceMetronome();
      }
      return { ...prev, metronomeAudioToggle: nextChecked };
    });
  }, [sequencePlaying]);

  const handleToggleRecord = useCallback(() => {
    if (isRecording) {
      audioEngineRef.current?.stopRecording();
      return;
    }

    audioEngineRef.current?.startRecording({
      onStart: (startTimeMs) => {
        setIsRecording(true);
        setRecordingStartTimeMs(startTimeMs);
        setLiveRecordingSeconds(0);
        setFinalRecordingDuration(null);
        setRecordedChunks([]);
      },
      onStop: (chunks, mimeType, finalDurationSec) => {
        setIsRecording(false);
        setRecordingStartTimeMs(null);
        setRecordedChunks(chunks);
        setRecordedMimeType(mimeType);
        setFinalRecordingDuration(finalDurationSec);
      },
      onError: (msg) => {
        setIsRecording(false);
        setRecordingStartTimeMs(null);
        showNotice('error', msg);
      },
    });
  }, [isRecording, showNotice]);

  const handleDownloadRecording = useCallback(() => {
    if (recordedChunks.length === 0) {
      showNotice('warning', 'No recorded audio available to download.');
      return;
    }
    const ext = recordedMimeType.includes('wav')
      ? '.wav'
      : recordedMimeType.includes('opus') || recordedMimeType.includes('webm')
        ? '.webm'
        : '.aud';
    const blob = new Blob(recordedChunks, { type: recordedMimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(
      now.getMinutes()
    ).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    a.href = url;
    a.download = `chordotron-recording-${ts}${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [recordedChunks, recordedMimeType, showNotice]);

  const handleSaveSettingsFile = useCallback(() => {
    const json = JSON.stringify(settingsRef.current, null, 2);
    const defaultFileName = 'chordotronSettings.json';
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotice('info', 'Settings downloaded as chordotronSettings.json.');
  }, [showNotice]);

  const handleLoadSettingsFile = useCallback(
    (file: File) => {
      if (isRecording) audioEngineRef.current?.stopRecording();
      if (sequencePlaying) stopPlayback(true);
      setRecordedChunks([]);
      setFinalRecordingDuration(null);
      setRecordingStartTimeMs(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(String(e.target?.result ?? '{}')) as Partial<ChordotronSettings>;
          const loaded = sanitizeSettings(parsed);
          setSettings(loaded);
          if (loaded.inputMode === 'livePlaying') {
            setCurrentChordLabel('Ready');
            setPrevChordLabel('--');
            setNextChordLabel('--');
          } else {
            setCurrentChordLabel('Playing: --');
            setPrevChordLabel('Prev: --');
            setNextChordLabel('Next: --');
          }
          showNotice('info', `Loaded settings from ${file.name}.`);
        } catch {
          showNotice('error', 'Failed to parse JSON settings file.');
        }
      };
      reader.onerror = () => {
        showNotice('error', 'Error reading settings file.');
      };
      reader.readAsText(file);
    },
    [isRecording, sequencePlaying, stopPlayback, showNotice]
  );

  const handleExportMidi = useCallback(() => {
    const s = settingsRef.current;
    if (s.inputMode === 'livePlaying') {
      showNotice('warning', 'MIDI export is not available in Live Playing mode.');
      return;
    }
    if (sequencePlaying) {
      showNotice('warning', 'Stop playback before exporting MIDI.');
      return;
    }

    const defaultBeats = getBeatsPerMeasure(s.timeSignature);
    const fullText = s.inputMode === 'chords' ? s.chordInput : s.scaleDegreeInput;

    if (!fullText.trim()) {
      showNotice('warning', 'No chords to export. Enter chords in the input area first.');
      return;
    }

    const allParsed: ParsedChordToken[] =
      s.inputMode === 'chords'
        ? parseDirectChordString(fullText, defaultBeats)
        : parseScaleDegreeString(fullText, s.songKey, s.keyMode, defaultBeats);

    const activeRange = resolveActiveSelectionRange(s.inputMode, fullText);
    const parsedChords = sliceProgressionForSelection(allParsed, activeRange).items;

    const validParsed = parsedChords.filter((c) => !c.error);
    const skippedErrors = parsedChords.length - validParsed.length;

    if (validParsed.length === 0) {
      showNotice('error', 'No valid chords found to export.');
      return;
    }

    const voicedChords = voiceProgression(validParsed, s.rangeStartMidi, s.rangeLength).filter(
      (vc) => vc.frequencies.length > 0
    );

    if (voicedChords.length === 0) {
      showNotice('error', 'No notes could be voiced within the current pitch range.');
      return;
    }

    const blob = exportProgressionToMidiBlob(voicedChords, s.bpm, s.timeSignature, s.arpeggiator);
    const suggestedName = 'chordotron-export.mid';

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotice(
      skippedErrors > 0 ? 'warning' : 'info',
      skippedErrors > 0
        ? `Downloaded ${suggestedName} (${skippedErrors} unrecognized token skipped).`
        : `Downloaded ${suggestedName}.`
    );
  }, [resolveActiveSelectionRange, sequencePlaying, showNotice]);

  const handleConfirmNewSong = useCallback(() => {
    if (isRecording) audioEngineRef.current?.stopRecording();
    if (sequencePlaying) stopPlayback(true);
    clearAutosavedSettings();
    const blank = createBlankResetSettings(settingsRef.current.theme);
    setSettings(blank);
    setSelectedRange(null);
    setRecordedChunks([]);
    setFinalRecordingDuration(null);
    setRecordingStartTimeMs(null);
    setActiveMidiNotes([]);
    setPrevChordLabel('Prev: --');
    setCurrentChordLabel('Playing: --');
    setNextChordLabel('Next: --');
    setConfirmNewOpen(false);
    showNotice('info', 'Started a new song with blank inputs and default settings.');
  }, [isRecording, sequencePlaying, stopPlayback, showNotice]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (helpOpen || confirmNewOpen) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'TEXTAREA' ||
          target.tagName === 'INPUT' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      const mode = settingsRef.current.inputMode;
      if (mode === 'livePlaying') {
        if (Object.prototype.hasOwnProperty.call(KEY_TO_LIVE_PLAYING_INDEX_MAP, event.key) && !event.repeat) {
          event.preventDefault();
          triggerLivePadDown(event.key);
        }
        return;
      }

      switch (event.key.toLowerCase()) {
        case ' ':
          event.preventDefault();
          handleTogglePlayStop();
          break;
        case 'l':
          event.preventDefault();
          setSettings((prev) => ({ ...prev, loopToggle: !prev.loopToggle }));
          break;
        case 'm':
          event.preventDefault();
          handleToggleMetronome();
          break;
        case 'r':
          event.preventDefault();
          if (!sequencePlaying) handleToggleRecord();
          break;
        case 'n':
          event.preventDefault();
          if (!sequencePlaying) setConfirmNewOpen(true);
          break;
        case 's':
          event.preventDefault();
          if (!sequencePlaying) handleSaveSettingsFile();
          break;
        case 'o':
          event.preventDefault();
          if (!sequencePlaying) {
            const fileInput = document.querySelector<HTMLInputElement>(
              'input[aria-label="Load song settings JSON file"]'
            );
            fileInput?.click();
          }
          break;
        case 'escape':
          if (!sequencePlaying && selectedRange) {
            event.preventDefault();
            setSelectedRange(null);
          }
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (settingsRef.current.inputMode === 'livePlaying') {
        if (Object.prototype.hasOwnProperty.call(KEY_TO_LIVE_PLAYING_INDEX_MAP, event.key)) {
          event.preventDefault();
          triggerLivePadUp(event.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    confirmNewOpen,
    handleSaveSettingsFile,
    handleToggleMetronome,
    handleTogglePlayStop,
    handleToggleRecord,
    helpOpen,
    selectedRange,
    sequencePlaying,
    triggerLivePadDown,
    triggerLivePadUp,
  ]);

  const isLiveKeyHeld = activeLiveKeys.size > 0;
  const selectionCount = useMemo(() => {
    if (!selectedRange || settings.inputMode === 'livePlaying') return 0;
    return Math.abs(selectedRange.endIndex - selectedRange.startIndex) + 1;
  }, [selectedRange, settings.inputMode]);
  const beatsPerMeasure = useMemo(
    () => getBeatsPerMeasure(settings.timeSignature),
    [settings.timeSignature]
  );

  const rangeBounds = useMemo(() => {
    const valid = isPitchRangeValid(settings.rangeStartMidi, settings.rangeLength);
    if (!valid) return { min: null, max: null };
    return {
      min: settings.rangeStartMidi,
      max: settings.rangeStartMidi + settings.rangeLength - 1,
    };
  }, [settings.rangeStartMidi, settings.rangeLength]);

  return (
    <div
      data-app-state={sequencePlaying ? 'playing' : isLiveKeyHeld ? 'live-active' : 'idle'}
      data-theme={settings.theme}
      onPointerDown={() => audioEngineRef.current?.resumeIfNeeded()}
      className="min-h-screen lg:h-screen flex flex-col bg-[#ECEFF3] dark:bg-slate-950 text-slate-900 dark:text-slate-100 lg:overflow-hidden"
    >
      <HeaderBar
        theme={settings.theme}
        inputMode={settings.inputMode}
        sequencePlaying={sequencePlaying}
        isLiveKeyHeld={isLiveKeyHeld}
        isRecording={isRecording}
        recordingSupported={audioEngineRef.current.isRecordingSupported()}
        hasRecordedAudio={recordedChunks.length > 0}
        liveRecordingSeconds={liveRecordingSeconds}
        finalRecordingDuration={finalRecordingDuration}
        onToggleTheme={() =>
          updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')
        }
        onNewSong={() => setConfirmNewOpen(true)}
        onLoadFile={handleLoadSettingsFile}
        onSaveFile={handleSaveSettingsFile}
        onExportMidi={handleExportMidi}
        onToggleRecord={handleToggleRecord}
        onDownloadRecording={handleDownloadRecording}
        onOpenHelp={() => setHelpOpen(true)}
      />

      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pt-[82px] lg:pt-2 pb-[154px] lg:pb-2">
        {notice && (
          <div
            role="status"
            aria-live="polite"
            className="max-w-[1440px] mx-auto mb-2 shrink-0"
          >
            <div
              className={`px-3 py-2 rounded-md border text-xs flex items-center justify-between gap-2 ${
                notice.type === 'error'
                  ? 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                  : notice.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    : 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {notice.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                ) : notice.type === 'warning' ? (
                  <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                )}
                <span>{notice.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label="Dismiss message"
                className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        <div className="max-w-[1440px] mx-auto lg:h-full grid grid-cols-1 lg:grid-cols-[minmax(320px,0.78fr)_1.22fr] lg:grid-rows-[minmax(0,1fr)_auto] gap-3 items-stretch">
          <div className="lg:col-start-1 lg:row-start-1 min-h-0 flex flex-col">
            <InputSection
              inputMode={settings.inputMode}
              chordInput={settings.chordInput}
              scaleDegreeInput={settings.scaleDegreeInput}
              songKey={settings.songKey}
              keyMode={settings.keyMode}
              livePlayingChords={settings.livePlayingChords}
              activeLiveKeys={activeLiveKeys}
              disabled={sequencePlaying || isLiveKeyHeld}
              selectionCount={selectionCount}
              chordTextareaRef={chordTextareaRef}
              degreeTextareaRef={degreeTextareaRef}
              onChangeInputMode={handleChangeInputMode}
              onChangeChordInput={(v) => {
                setSelectedRange(null);
                updateSetting('chordInput', v);
              }}
              onChangeScaleDegreeInput={(v) => {
                setSelectedRange(null);
                updateSetting('scaleDegreeInput', v);
              }}
              onChangeSongKey={(v) => updateSetting('songKey', v)}
              onChangeKeyMode={(v: KeyModeKind) => updateSetting('keyMode', v)}
              onChangeLiveChord={(idx, val) => {
                setSettings((prev) => {
                  const updated = [...prev.livePlayingChords];
                  updated[idx] = val;
                  return { ...prev, livePlayingChords: updated };
                });
              }}
              onTriggerLivePadDown={triggerLivePadDown}
              onTriggerLivePadUp={triggerLivePadUp}
              onTextSelectionChange={handleTextSelectionChange}
              onClearSelection={() => setSelectedRange(null)}
            />
          </div>

          <div className="lg:col-span-2 lg:row-start-2 min-w-0">
            <VisualSequencer
              inputMode={settings.inputMode}
              chordInput={settings.chordInput}
              scaleDegreeInput={settings.scaleDegreeInput}
              songKey={settings.songKey}
              keyMode={settings.keyMode}
              timeSignature={settings.timeSignature}
              bpm={settings.bpm}
              sequencePlaying={sequencePlaying}
              isSelectionPlayback={isSelectionPlayback}
              selectedRange={selectedRange}
              selectionStartBeatOffset={selectionStartBeatOffset}
              activeChordIndex={activeChordIndex}
              activeSequenceBeat={activeSequenceBeat}
              onSelectRange={setSelectedRange}
              onPreviewChordDown={handlePreviewTimelineChordDown}
              onPreviewChordUp={handlePreviewTimelineChordUp}
            />
          </div>

          <div className="lg:col-start-2 lg:row-start-1 min-h-0 flex flex-col">
            <SettingsSection
              settings={settings}
              sequencePlaying={sequencePlaying}
              isLiveKeyHeld={isLiveKeyHeld}
              onUpdateSettings={updateSetting}
              onSelectInstrument={handleSelectInstrument}
              onUpdatePitchRange={updatePitchRange}
              onTapTempo={handleTapTempo}
              onUpdateEffect={handleUpdateEffect}
              onUpdateArpeggiator={handleUpdateArpeggiator}
            />
          </div>
        </div>
      </main>

      <div
        data-testid="bottom-dock"
        className="max-lg:fixed max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:z-30 max-lg:shadow-[0_-4px_18px_rgba(15,23,42,0.18)] dark:max-lg:shadow-[0_-4px_20px_rgba(0,0,0,0.45)] shrink-0"
      >
        <PianoKeyboard
          activeMidiNotes={activeMidiNotes}
          rangeMinMidi={rangeBounds.min}
          rangeMaxMidi={rangeBounds.max}
          onNotePress={(midi) => {
            if (sequencePlaying) return;
            audioEngineRef.current?.startAuditionNote(midi);
            setActiveMidiNotes((prev) => (prev.includes(midi) ? prev : [...prev, midi]));
          }}
          onNoteRelease={(midi) => {
            if (sequencePlaying) return;
            audioEngineRef.current?.stopAuditionNote(midi);
            setActiveMidiNotes((prev) => prev.filter((n) => n !== midi));
          }}
        />

        <PlaybackFooter
          inputMode={settings.inputMode}
          sequencePlaying={sequencePlaying}
          loopEnabled={settings.loopToggle}
          metronomeEnabled={settings.metronomeAudioToggle}
          selectionCount={selectionCount}
          prevChordLabel={prevChordLabel}
          currentChordLabel={currentChordLabel}
          nextChordLabel={nextChordLabel}
          beatsPerMeasure={beatsPerMeasure}
          activeBeatIndex={activeBeatIndex}
          isDownbeatActive={isDownbeatActive}
          onTogglePlayStop={handleTogglePlayStop}
          onToggleLoop={() => updateSetting('loopToggle', !settings.loopToggle)}
          onToggleMetronome={handleToggleMetronome}
        />
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <ConfirmDialog
        open={confirmNewOpen}
        title="Start a new song?"
        message="This will clear your chord inputs and reset all synth, timing, and pitch range settings back to their defaults."
        confirmLabel="Reset Settings"
        cancelLabel="Keep Working"
        onConfirm={handleConfirmNewSong}
        onCancel={() => setConfirmNewOpen(false)}
      />
    </div>
  );
}
