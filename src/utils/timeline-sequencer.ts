import type { InputMode, KeyModeKind, ParsedChordToken } from '../types/chordotron';
import {
  formatChordObjectForUI,
  getBeatDurationFactorForTimeSignature,
  getBeatsPerMeasure,
  parseDirectChordString,
  parseScaleDegreeString,
} from './music-theory';

export interface TimelineChordBlock {
  index: number;
  displayName: string;
  originalToken: string;
  beats: number;
  startBeat: number;
  endBeat: number;
  startBar: number;
  beatInBar: number;
  spansMultipleBars: boolean;
  error: boolean;
  parsedToken: ParsedChordToken;
}

export interface TimelineBarMarker {
  barNumber: number;
  startBeat: number;
  endBeat: number;
}

export interface TimelineLayout {
  items: TimelineChordBlock[];
  bars: TimelineBarMarker[];
  beatsPerMeasure: number;
  totalBeats: number;
  totalBars: number;
  gridBeats: number;
  totalDurationSec: number;
}

export function buildTimelineLayout(
  parsedChords: ParsedChordToken[],
  timeSignature: string,
  bpm: number
): TimelineLayout {
  const beatsPerMeasure = Math.max(1, getBeatsPerMeasure(timeSignature));
  const items: TimelineChordBlock[] = [];

  let cursorBeat = 0;
  for (let i = 0; i < parsedChords.length; i++) {
    const token = parsedChords[i];
    const beats = Math.max(1, token.beats || beatsPerMeasure);
    const startBeat = cursorBeat;
    const endBeat = startBeat + beats;
    const startBar = Math.floor(startBeat / beatsPerMeasure) + 1;
    const endBar = Math.floor((endBeat - 1) / beatsPerMeasure) + 1;
    const beatInBar = (startBeat % beatsPerMeasure) + 1;

    items.push({
      index: i,
      displayName: token.error ? token.originalInputToken || '?' : formatChordObjectForUI(token),
      originalToken: token.originalInputToken,
      beats,
      startBeat,
      endBeat,
      startBar,
      beatInBar,
      spansMultipleBars: endBar > startBar,
      error: Boolean(token.error),
      parsedToken: token,
    });

    cursorBeat = endBeat;
  }

  const totalBeats = cursorBeat;
  const totalBars = Math.max(1, Math.ceil(totalBeats / beatsPerMeasure));
  const gridBeats = totalBars * beatsPerMeasure;

  const bars: TimelineBarMarker[] = [];
  for (let b = 0; b < totalBars; b++) {
    bars.push({
      barNumber: b + 1,
      startBeat: b * beatsPerMeasure,
      endBeat: (b + 1) * beatsPerMeasure,
    });
  }

  const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
  const beatDurationSec = (60 / safeBpm) * getBeatDurationFactorForTimeSignature(timeSignature);
  const totalDurationSec = totalBeats * beatDurationSec;

  return {
    items,
    bars,
    beatsPerMeasure,
    totalBeats,
    totalBars,
    gridBeats,
    totalDurationSec,
  };
}

export function parseTimelineInput(
  inputMode: InputMode,
  chordInput: string,
  scaleDegreeInput: string,
  songKey: string,
  keyMode: KeyModeKind,
  timeSignature: string,
  bpm: number
): TimelineLayout {
  const beatsPerMeasure = getBeatsPerMeasure(timeSignature);
  if (inputMode === 'livePlaying') {
    return buildTimelineLayout([], timeSignature, bpm);
  }
  const parsed =
    inputMode === 'chords'
      ? parseDirectChordString(chordInput, beatsPerMeasure)
      : parseScaleDegreeString(scaleDegreeInput, songKey, keyMode, beatsPerMeasure);
  return buildTimelineLayout(parsed, timeSignature, bpm);
}
