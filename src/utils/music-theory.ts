import {
  A4,
  ALL_NOTE_NAMES,
  CHORD_FORMULAS,
  DIATONIC_CHORD_QUALITIES,
  MIDI_A0,
  MIDI_C8,
  NOTE_NAMES_MAP,
  ROMAN_NUMERAL_MAP,
  SCALE_INTERVAL_MAP,
  SEMITONES_IN_OCTAVE,
} from '../config/constants';
import type { ParsedChordToken, VoicedChord } from '../types/chordotron';

export const REFERENCE_OCTAVE_FOR_PARSING = 2;

export function normalizeNoteName(noteName: string | null | undefined): string | null {
  if (!noteName || typeof noteName !== 'string' || noteName.length === 0) {
    return null;
  }

  const root = noteName.charAt(0).toUpperCase();
  let accidental = '';

  if (noteName.length > 1) {
    const accCandidate = noteName.substring(1);
    if (accCandidate === '##' || accCandidate === 'bb' || accCandidate === '#' || accCandidate === 'b') {
      accidental = accCandidate;
    } else if (accCandidate.length === 1 && (accCandidate.toLowerCase() === '#' || accCandidate.toLowerCase() === 'b')) {
      accidental = accCandidate.toLowerCase() === '#' ? '#' : 'b';
    }
  }

  const normalized = root + accidental;
  if (NOTE_NAMES_MAP[normalized] !== undefined) return normalized;

  const finalRoot = noteName.charAt(0).toUpperCase();
  let finalAcc = '';
  if (noteName.length > 1) {
    const tempAcc = noteName.substring(1);
    const lowerTempAcc = tempAcc.toLowerCase();
    if (tempAcc === '#' || tempAcc === 'b' || tempAcc === '##' || tempAcc === 'bb') {
      finalAcc = tempAcc;
    } else if (lowerTempAcc === '#' || lowerTempAcc === 'b' || lowerTempAcc === '##' || lowerTempAcc === 'bb') {
      finalAcc = tempAcc;
      if (NOTE_NAMES_MAP[finalRoot + finalAcc] === undefined && NOTE_NAMES_MAP[finalRoot + lowerTempAcc] !== undefined) {
        finalAcc = lowerTempAcc;
      }
    }
  }

  const checkName = finalRoot + finalAcc;
  if (NOTE_NAMES_MAP[checkName] !== undefined) return checkName;

  if (noteName.length === 2) {
    const simpleCheck = noteName.charAt(0).toUpperCase() + noteName.charAt(1).toLowerCase();
    if (NOTE_NAMES_MAP[simpleCheck] !== undefined) return simpleCheck;
    const sharpCheck = `${noteName.charAt(0).toUpperCase()}#`;
    if (noteName.charAt(1).toLowerCase() === 's' && NOTE_NAMES_MAP[sharpCheck] !== undefined) return sharpCheck;
  }

  if (noteName.length === 1 && root >= 'A' && root <= 'G') {
    if (NOTE_NAMES_MAP[root] !== undefined) return root;
  }

  return null;
}

export function getNoteFrequencyAbsolute(noteName: string, octave: number): number {
  const normalizedForLookup = normalizeNoteName(noteName);
  if (!normalizedForLookup || !(normalizedForLookup in NOTE_NAMES_MAP)) return 0;
  let semitonesFromA4 = NOTE_NAMES_MAP[normalizedForLookup] - NOTE_NAMES_MAP['A'];
  semitonesFromA4 += (octave - 4) * SEMITONES_IN_OCTAVE;
  return A4 * Math.pow(2, semitonesFromA4 / SEMITONES_IN_OCTAVE);
}

export function parseChordNameToFrequencies(
  chordName: string,
  referenceOctave: number = REFERENCE_OCTAVE_FOR_PARSING
): { frequencies: number[]; rootNoteName: string | null; bassNoteName: string | null } {
  let normalizedInputChordName = chordName.replace(/°/g, 'o').replace(/ø/g, 'h');
  const shorthandMatch = normalizedInputChordName.match(/^([A-Ga-g][#b]?)(h|o)$/i);
  if (shorthandMatch && !normalizedInputChordName.toLowerCase().endsWith('sus')) {
    const root = shorthandMatch[1];
    const symbol = shorthandMatch[2].toLowerCase();
    if (symbol === 'h') normalizedInputChordName = `${root}h7`;
    else if (symbol === 'o') normalizedInputChordName = `${root}o`;
  }

  const match = normalizedInputChordName.match(/^([A-Ga-g][#b]?)(.*)$/);
  if (!match) return { frequencies: [], rootNoteName: null, bassNoteName: null };

  const rootNoteNameOnly = normalizeNoteName(match[1]);
  const quality = match[2];

  if (!rootNoteNameOnly || !(rootNoteNameOnly in NOTE_NAMES_MAP)) {
    return { frequencies: [], rootNoteName: rootNoteNameOnly, bassNoteName: null };
  }

  const rootFrequency = getNoteFrequencyAbsolute(rootNoteNameOnly, referenceOctave);
  if (rootFrequency === 0) {
    return { frequencies: [], rootNoteName: rootNoteNameOnly, bassNoteName: null };
  }

  let intervals = CHORD_FORMULAS[quality] || CHORD_FORMULAS[quality.toLowerCase()];

  if (!intervals && quality.toUpperCase() === 'M') {
    intervals = CHORD_FORMULAS[''];
  }

  if (!intervals) {
    const modifiedQuality = quality.replace(/^maj/i, 'M').replace(/^min/i, 'm');
    intervals = CHORD_FORMULAS[modifiedQuality] || CHORD_FORMULAS[modifiedQuality.toLowerCase()];
  }

  if (!intervals) return { frequencies: [rootFrequency], rootNoteName: rootNoteNameOnly, bassNoteName: null };
  if (intervals.length === 0 && quality) return { frequencies: [rootFrequency], rootNoteName: rootNoteNameOnly, bassNoteName: null };

  const frequencies = intervals.map((interval) => rootFrequency * Math.pow(2, interval / SEMITONES_IN_OCTAVE));
  return { frequencies, rootNoteName: rootNoteNameOnly, bassNoteName: null };
}

export function getNoteNameFromDegree(
  keyRootNoteName: string,
  keyMode: string,
  degreeNumber: number,
  accidental = 0
): string | null {
  const normalizedKeyRoot = normalizeNoteName(keyRootNoteName);
  if (!normalizedKeyRoot) return null;

  const rootNotePitchClass = NOTE_NAMES_MAP[normalizedKeyRoot];
  if (rootNotePitchClass === undefined) return null;

  const scaleIntervals = SCALE_INTERVAL_MAP[keyMode] || SCALE_INTERVAL_MAP['ionian'];
  if (!scaleIntervals || degreeNumber < 1 || degreeNumber > scaleIntervals.length) {
    return null;
  }

  const interval = scaleIntervals[degreeNumber - 1];
  let noteIndex = (rootNotePitchClass + interval + accidental) % SEMITONES_IN_OCTAVE;
  if (noteIndex < 0) noteIndex += SEMITONES_IN_OCTAVE;
  return ALL_NOTE_NAMES[noteIndex];
}

export function getDefaultChordQualityForDegree(degreeNumber: number, keyMode: string): string {
  const modeQualities = DIATONIC_CHORD_QUALITIES[keyMode] || DIATONIC_CHORD_QUALITIES['ionian'];
  return modeQualities[degreeNumber] || '';
}

export function parseScaleDegreeString(
  degreeString: string,
  songKey: string,
  keyMode: string,
  defaultBeatsPerChord: number
): ParsedChordToken[] {
  const tokens = degreeString.trim().split(/\s+/);
  const parsedChords: ParsedChordToken[] = [];
  const degreeRegex =
    /^(b|#)?(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i|[1-7])([A-Za-z0-9#bø°+susMmMdimaugincl^]*)(?:\/(b|#)?(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i|[1-7]))?(?:\((\d+)\))?$/;

  for (const token of tokens) {
    if (!token) continue;
    const match = token.match(degreeRegex);
    if (!match) {
      parsedChords.push({ name: '?', bassNoteName: null, beats: defaultBeatsPerChord, originalInputToken: token, error: true });
      continue;
    }

    const accidentalText = match[1];
    const degreeText = match[2];
    let qualityText = match[3] || '';
    const slashAccidentalText = match[4];
    const slashDegreeText = match[5];
    const beatsString = match[6];

    let beats = defaultBeatsPerChord;
    if (beatsString !== undefined) {
      beats = Math.max(1, parseInt(beatsString, 10));
    }

    const degreeNumber = ROMAN_NUMERAL_MAP[degreeText] || parseInt(degreeText, 10);
    let accidentalValue = 0;
    if (accidentalText === 'b') accidentalValue = -1;
    else if (accidentalText === '#') accidentalValue = 1;

    const chordRootName = getNoteNameFromDegree(songKey, keyMode, degreeNumber, accidentalValue);
    if (!chordRootName) {
      parsedChords.push({
        name: '?',
        bassNoteName: null,
        beats: defaultBeatsPerChord,
        originalInputToken: token,
        error: true,
        comment: `Could not determine root for ${degreeText}`,
      });
      continue;
    }

    if (!qualityText) qualityText = getDefaultChordQualityForDegree(degreeNumber, keyMode);

    let bassNoteName: string | null = null;
    if (slashDegreeText) {
      const slashDegreeNumber = ROMAN_NUMERAL_MAP[slashDegreeText] || parseInt(slashDegreeText, 10);
      let slashAccidentalValue = 0;
      if (slashAccidentalText === 'b') slashAccidentalValue = -1;
      else if (slashAccidentalText === '#') slashAccidentalValue = 1;
      bassNoteName = getNoteNameFromDegree(songKey, keyMode, slashDegreeNumber, slashAccidentalValue);
    }

    parsedChords.push({
      name: chordRootName + qualityText,
      bassNoteName,
      beats,
      originalInputToken: token,
    });
  }

  return parsedChords;
}

export function parseDirectChordString(chordString: string, defaultBeatsPerChord: number): ParsedChordToken[] {
  const tokens = chordString.trim().split(/\s+/);
  const parsedChords: ParsedChordToken[] = [];
  const chordRegex = /^([A-Ga-g][#b]?)([A-Za-z0-9#bø°+susmMdimaugincl^()]*?)(?:\/([A-Ga-g][#b]?))?(?:\((\d+)\))?$/i;

  for (const token of tokens) {
    if (!token) continue;
    const match = token.match(chordRegex);

    if (match) {
      const rootPart = match[1];
      const qualityPart = match[2] || '';
      const mainChordNamePart = rootPart + qualityPart;
      const parsedBassNote = match[3] ? normalizeNoteName(match[3]) : null;
      const beatsString = match[4];

      let beats = defaultBeatsPerChord;
      if (beatsString !== undefined) {
        beats = Math.max(1, parseInt(beatsString, 10));
      }

      parsedChords.push({
        name: mainChordNamePart,
        bassNoteName: parsedBassNote,
        beats,
        originalInputToken: token,
      });
    } else {
      parsedChords.push({
        name: '?',
        bassNoteName: null,
        beats: defaultBeatsPerChord,
        originalInputToken: token,
        error: true,
      });
    }
  }

  return parsedChords;
}

export function noteNameToMidi(noteNameWithOctave: string): number | null {
  const match = noteNameWithOctave.match(/^([A-Ga-g][#b]?)([0-8])$/i);
  if (!match) return null;

  const notePartForMap = normalizeNoteName(match[1]);
  const octavePart = parseInt(match[2], 10);

  if (!notePartForMap) {
    const upperNote = match[1].toUpperCase();
    if (upperNote === 'CB') return NOTE_NAMES_MAP['B'] + (octavePart - 1) * SEMITONES_IN_OCTAVE + 12;
    if (upperNote === 'E#') return NOTE_NAMES_MAP['F'] + octavePart * SEMITONES_IN_OCTAVE + 12;
    if (upperNote === 'B#') return NOTE_NAMES_MAP['C'] + (octavePart + 1) * SEMITONES_IN_OCTAVE + 12;
    return null;
  }

  if (!(notePartForMap in NOTE_NAMES_MAP)) {
    return null;
  }
  return NOTE_NAMES_MAP[notePartForMap] + octavePart * SEMITONES_IN_OCTAVE + 12;
}

export function midiToNoteNameWithOctave(midiNote: number): string | null {
  if (midiNote < 0 || midiNote > 127) return null;
  const noteIndex = midiNote % SEMITONES_IN_OCTAVE;
  const octave = Math.floor(midiNote / SEMITONES_IN_OCTAVE) - 1;
  const noteName = ALL_NOTE_NAMES[noteIndex];
  return `${noteName}${octave}`;
}

export function midiToFrequency(midiNote: number): number {
  return A4 * Math.pow(2, (midiNote - 69) / SEMITONES_IN_OCTAVE);
}

export function frequencyToMidi(frequency: number): number {
  if (frequency <= 0) return 0;
  const midiNote = SEMITONES_IN_OCTAVE * Math.log2(frequency / A4) + 69;
  return Math.round(midiNote);
}

function voiceChordCore(
  initialFrequencies: number[],
  chordRootNoteName: string | null,
  minMidi: number | null,
  maxMidi: number | null
): number[] {
  if (!initialFrequencies || initialFrequencies.length === 0) {
    return [];
  }

  let minMidiConstrained = minMidi;
  let maxMidiConstrained = maxMidi;
  if (minMidiConstrained === null || maxMidiConstrained === null || minMidiConstrained > maxMidiConstrained) {
    minMidiConstrained = 24;
    maxMidiConstrained = 96;
  }

  const initialMidiNotesUnsorted = initialFrequencies.map((freq) => frequencyToMidi(freq));
  const normalizedChordRootForCore = chordRootNoteName ? normalizeNoteName(chordRootNoteName) : null;

  if (!normalizedChordRootForCore || !(normalizedChordRootForCore in NOTE_NAMES_MAP)) {
    const originalMidiNotesSimple = [...initialMidiNotesUnsorted].sort((a, b) => a - b);
    const voicedMidiNotesSimple: number[] = [];
    for (const originalMidi of originalMidiNotesSimple) {
      if (originalMidi === 0) continue;
      const pitchClass = originalMidi % 12;
      let currentVoicedNote = minMidiConstrained - (minMidiConstrained % 12) + pitchClass;
      if (currentVoicedNote < minMidiConstrained) currentVoicedNote += 12;

      while (currentVoicedNote > maxMidiConstrained && currentVoicedNote - 12 >= minMidiConstrained) {
        currentVoicedNote -= 12;
      }
      while (currentVoicedNote < minMidiConstrained && currentVoicedNote + 12 <= maxMidiConstrained) {
        currentVoicedNote += 12;
      }

      if (currentVoicedNote >= minMidiConstrained && currentVoicedNote <= maxMidiConstrained) {
        voicedMidiNotesSimple.push(currentVoicedNote);
      }
    }
    return [...new Set(voicedMidiNotesSimple)].sort((a, b) => a - b);
  }

  const initialMidiNotes = [...initialMidiNotesUnsorted].sort((a, b) => a - b);
  if (initialMidiNotes.length === 0 || initialMidiNotes.every((n) => n === 0)) {
    return [];
  }

  const rootPitchClass = NOTE_NAMES_MAP[normalizedChordRootForCore];
  const initialRootMidiGuess = initialMidiNotes.find((note) => note % 12 === rootPitchClass) ?? initialMidiNotes[0];

  let anchoredRootMidi = minMidiConstrained - (minMidiConstrained % 12) + rootPitchClass;
  if (anchoredRootMidi < minMidiConstrained) anchoredRootMidi += SEMITONES_IN_OCTAVE;

  while (anchoredRootMidi > maxMidiConstrained && anchoredRootMidi - SEMITONES_IN_OCTAVE >= minMidiConstrained) {
    anchoredRootMidi -= SEMITONES_IN_OCTAVE;
  }

  if (anchoredRootMidi < minMidiConstrained || anchoredRootMidi > maxMidiConstrained) {
    let foundRootInRange = false;
    for (let oct = -1; oct < 9; oct++) {
      const testRoot = rootPitchClass + oct * SEMITONES_IN_OCTAVE + 12;
      if (testRoot >= minMidiConstrained && testRoot <= maxMidiConstrained) {
        anchoredRootMidi = testRoot;
        foundRootInRange = true;
        break;
      }
    }
    if (!foundRootInRange) {
      return [];
    }
  }

  const tempVoicedNotes: number[] = [];
  for (const currentInitialMidi of initialMidiNotes) {
    if (currentInitialMidi === 0) continue;
    const intervalFromInitialRoot = currentInitialMidi - initialRootMidiGuess;
    let targetVoicedMidi = anchoredRootMidi + intervalFromInitialRoot;

    while (targetVoicedMidi > maxMidiConstrained && targetVoicedMidi - SEMITONES_IN_OCTAVE >= minMidiConstrained) {
      targetVoicedMidi -= SEMITONES_IN_OCTAVE;
    }
    while (targetVoicedMidi < minMidiConstrained && targetVoicedMidi + SEMITONES_IN_OCTAVE <= maxMidiConstrained) {
      targetVoicedMidi += SEMITONES_IN_OCTAVE;
    }

    if (targetVoicedMidi >= minMidiConstrained && targetVoicedMidi <= maxMidiConstrained) {
      tempVoicedNotes.push(targetVoicedMidi);
    }
  }

  return [...new Set(tempVoicedNotes)].sort((a, b) => a - b);
}

function findLowestMidiInstanceInRange(noteName: string, minMidi: number, maxMidi: number): number | null {
  const normalizedNoteForFind = normalizeNoteName(noteName);
  if (!normalizedNoteForFind || !(normalizedNoteForFind in NOTE_NAMES_MAP)) {
    return null;
  }
  const pitchClass = NOTE_NAMES_MAP[normalizedNoteForFind];

  for (let octave = -1; octave < 9; octave++) {
    const midiNote = pitchClass + octave * SEMITONES_IN_OCTAVE + 12;
    if (midiNote >= minMidi && midiNote <= maxMidi) {
      return midiNote;
    }
    if (midiNote > maxMidi && octave > 1) break;
  }
  return null;
}

export function voiceFrequenciesInRange(
  initialMainChordFrequencies: number[],
  mainChordRootName: string | null,
  userMinMidi: number | null,
  userMaxMidi: number | null,
  bassNoteNameFromSlash: string | null = null
): { frequencies: number[]; playedAsSlash: boolean } {
  const effectiveMin = userMinMidi ?? 24;
  const effectiveMax = userMaxMidi ?? 96;
  const playedMidiNotes: number[] = [];
  let playedAsSlash = false;
  let minMainChordNotesForSlashSuccess = 1;

  if (!initialMainChordFrequencies || initialMainChordFrequencies.length === 0) {
    if (bassNoteNameFromSlash) {
      const normalizedBass = normalizeNoteName(bassNoteNameFromSlash);
      if (normalizedBass) {
        const bassMidi = findLowestMidiInstanceInRange(normalizedBass, effectiveMin, effectiveMax);
        if (bassMidi !== null) {
          return { frequencies: [midiToFrequency(bassMidi)], playedAsSlash: true };
        }
      }
    }
    return { frequencies: [], playedAsSlash: false };
  }

  if (initialMainChordFrequencies.length >= 3) {
    minMainChordNotesForSlashSuccess = 2;
  }

  const normalizedMainChordRoot = mainChordRootName ? normalizeNoteName(mainChordRootName) : null;
  const normalizedBassNoteFromSlash = bassNoteNameFromSlash ? normalizeNoteName(bassNoteNameFromSlash) : null;

  if (normalizedBassNoteFromSlash) {
    const bassMidiToBePlayed = findLowestMidiInstanceInRange(normalizedBassNoteFromSlash, effectiveMin, effectiveMax);

    if (bassMidiToBePlayed !== null) {
      let attempt1Success = false;

      if (bassMidiToBePlayed < effectiveMax) {
        const mainChordVoicedAboveBass = voiceChordCore(
          initialMainChordFrequencies,
          normalizedMainChordRoot,
          bassMidiToBePlayed + 1,
          effectiveMax
        );

        let mainChordRootIsPresentInVoicing = false;
        if (normalizedMainChordRoot && NOTE_NAMES_MAP[normalizedMainChordRoot] !== undefined) {
          const mainChordRootPitchClass = NOTE_NAMES_MAP[normalizedMainChordRoot];
          mainChordRootIsPresentInVoicing = mainChordVoicedAboveBass.some(
            (noteMidi) => noteMidi % 12 === mainChordRootPitchClass
          );
        } else if (initialMainChordFrequencies.length > 0 && !normalizedMainChordRoot) {
          const inferredRootPitchClass =
            frequencyToMidi([...initialMainChordFrequencies].sort((a, b) => a - b)[0]) % 12;
          mainChordRootIsPresentInVoicing = mainChordVoicedAboveBass.some(
            (noteMidi) => noteMidi % 12 === inferredRootPitchClass
          );
        } else {
          mainChordRootIsPresentInVoicing = true;
        }

        if (mainChordVoicedAboveBass.length >= minMainChordNotesForSlashSuccess && mainChordRootIsPresentInVoicing) {
          attempt1Success = true;
          playedMidiNotes.push(bassMidiToBePlayed, ...mainChordVoicedAboveBass);
          playedAsSlash = true;
        }
      }

      if (!attempt1Success) {
        const mainChordVoicedNormally = voiceChordCore(
          initialMainChordFrequencies,
          normalizedMainChordRoot,
          userMinMidi,
          userMaxMidi
        );
        playedMidiNotes.push(bassMidiToBePlayed, ...mainChordVoicedNormally);
        playedAsSlash = true;
      }
    } else {
      const mainChordVoicedNormally = voiceChordCore(
        initialMainChordFrequencies,
        normalizedMainChordRoot,
        userMinMidi,
        userMaxMidi
      );
      playedMidiNotes.push(...mainChordVoicedNormally);
      playedAsSlash = false;
    }
  } else {
    const mainChordVoicedNormally = voiceChordCore(
      initialMainChordFrequencies,
      normalizedMainChordRoot,
      userMinMidi,
      userMaxMidi
    );
    playedMidiNotes.push(...mainChordVoicedNormally);
    playedAsSlash = false;
  }

  const finalUniqueSortedMidi = [...new Set(playedMidiNotes)].sort((a, b) => a - b);
  return {
    frequencies: finalUniqueSortedMidi.map((midi) => midiToFrequency(midi)),
    playedAsSlash: playedAsSlash && normalizedBassNoteFromSlash != null,
  };
}

export function isPitchRangeValid(minMidiTarget: number, rangeLength: number): boolean {
  const maxMidiTarget = minMidiTarget + rangeLength - 1;
  return !(
    minMidiTarget < MIDI_A0 ||
    maxMidiTarget > MIDI_C8 ||
    minMidiTarget >= maxMidiTarget ||
    rangeLength < SEMITONES_IN_OCTAVE
  );
}

export function voiceProgression(
  parsedChords: ParsedChordToken[],
  minMidiTarget: number,
  rangeLength: number
): VoicedChord[] {
  const maxMidiTarget = minMidiTarget + rangeLength - 1;
  const rangeValid = isPitchRangeValid(minMidiTarget, rangeLength);
  const currentMinMidi = rangeValid ? minMidiTarget : null;
  const currentMaxMidi = rangeValid ? maxMidiTarget : null;

  return parsedChords.map((chordObj) => {
    const { frequencies: initialFrequencies, rootNoteName } = parseChordNameToFrequencies(
      chordObj.name,
      REFERENCE_OCTAVE_FOR_PARSING
    );
    const voicingResult = voiceFrequenciesInRange(
      initialFrequencies,
      rootNoteName,
      currentMinMidi,
      currentMaxMidi,
      chordObj.bassNoteName
    );
    return {
      ...chordObj,
      frequencies: voicingResult.frequencies,
      wasSlashPlayed: voicingResult.playedAsSlash,
    };
  });
}

export function getBeatsPerMeasure(timeSignatureString: string): number {
  const num = parseInt(timeSignatureString.split('/')[0], 10);
  return Number.isFinite(num) && num > 0 ? num : 4;
}

export function getBeatDurationFactorForTimeSignature(timeSignatureString: string): number {
  const denominator = parseInt(timeSignatureString.split('/')[1], 10);
  switch (denominator) {
    case 2:
      return 2;
    case 4:
      return 1;
    case 8:
      return 0.5;
    case 16:
      return 0.25;
    default:
      return 1;
  }
}

export function normalizeDisplayNoteName(noteNameStr: string | null | undefined): string {
  if (!noteNameStr || typeof noteNameStr !== 'string' || noteNameStr.length === 0) {
    return '';
  }
  const root = noteNameStr.charAt(0).toUpperCase();
  let accidental = '';
  if (noteNameStr.length > 1) {
    const accCandidate = noteNameStr.substring(1);
    if (accCandidate === '#' || accCandidate === 'b' || accCandidate === '##' || accCandidate === 'bb') {
      accidental = accCandidate;
    }
  }
  return root + accidental;
}

export function formatChordForDisplay(chordNameToFormat: string | null | undefined): string {
  if (!chordNameToFormat || typeof chordNameToFormat !== 'string') return '--';

  const replaceQualitySymbols = (quality: string): string => {
    let temp = quality;
    temp = temp.replace(/^m7b5\b/g, 'ø7');
    temp = temp.replace(/^h7\b/g, 'ø7');
    temp = temp.replace(/^(o7|dim7)\b/g, '°7');
    temp = temp.replace(/^(o|dim)(?![\w#b])/g, '°');
    return temp;
  };

  const parts = chordNameToFormat.split('/');
  let mainPart = parts[0];
  const bassPart = parts.length > 1 ? normalizeDisplayNoteName(parts[1]) : null;

  const rootMatch = mainPart.match(/^([A-Ga-g][#b]?)(.*)$/);
  if (rootMatch) {
    const rootDisplay = normalizeDisplayNoteName(rootMatch[1]);
    let qualityDisplay = rootMatch[2];

    if (qualityDisplay === 'M' || qualityDisplay.toLowerCase() === 'maj') {
      qualityDisplay = '';
    } else if (qualityDisplay.toLowerCase() === 'min') {
      qualityDisplay = 'm';
    } else {
      qualityDisplay = qualityDisplay
        .replace(/MAJ7/gi, 'maj7')
        .replace(/MIN7/gi, 'm7')
        .replace(/MAJOR/gi, '')
        .replace(/MINOR/gi, 'm')
        .replace(/MAJ(?!7)/gi, '')
        .replace(/MIN(?!7)/gi, 'm')
        .replace(/DIMINISHED/gi, 'dim')
        .replace(/AUGMENTED/gi, 'aug')
        .replace(/SUSPENDED/gi, 'sus');
    }
    mainPart = rootDisplay + replaceQualitySymbols(qualityDisplay);
  }

  let finalDisplayName = mainPart;
  if (bassPart) {
    finalDisplayName += `/${normalizeDisplayNoteName(bassPart)}`;
  }

  return finalDisplayName;
}

export function formatChordObjectForUI(chordObject: VoicedChord | ParsedChordToken | null | undefined): string {
  if (!chordObject) return '--';
  let displayName = '';
  const looksLikeScaleDegree = Boolean(
    chordObject.originalInputToken &&
      /^(b|#)?[IVXLCDMivxlcdm1-7]/i.test(chordObject.originalInputToken.trim().split('/')[0])
  );

  if (chordObject.originalInputToken && !looksLikeScaleDegree && !chordObject.error) {
    const originalWithoutBeats = chordObject.originalInputToken.replace(/\(\d+\)$/, '');
    if (
      chordObject.bassNoteName &&
      'wasSlashPlayed' in chordObject &&
      !chordObject.wasSlashPlayed &&
      originalWithoutBeats.includes('/')
    ) {
      displayName = originalWithoutBeats.split('/')[0];
    } else {
      displayName = originalWithoutBeats;
    }
  } else if (chordObject.name && chordObject.name !== '?') {
    const mainChordMatch = chordObject.name.match(/^([A-Ga-g][#b]?)(.*)$/);
    if (mainChordMatch) {
      const root = normalizeDisplayNoteName(mainChordMatch[1]);
      const quality = mainChordMatch[2];
      displayName = root + quality;
      if (chordObject.bassNoteName && 'wasSlashPlayed' in chordObject && chordObject.wasSlashPlayed) {
        displayName += `/${normalizeDisplayNoteName(chordObject.bassNoteName)}`;
      }
    } else {
      displayName = chordObject.name;
      if (chordObject.bassNoteName && 'wasSlashPlayed' in chordObject && chordObject.wasSlashPlayed) {
        displayName += `/${normalizeDisplayNoteName(chordObject.bassNoteName)}`;
      }
    }
  } else {
    displayName = chordObject.originalInputToken || '--';
  }
  return formatChordForDisplay(displayName);
}

export function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null || totalSeconds < 0 || !Number.isFinite(totalSeconds)) return '--:--.-';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenths = Math.floor((totalSeconds * 10) % 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}

export function calculateTapBpm(
  tapTimestampsMs: number[],
  minBpm = 30,
  maxBpm = 300,
  maxGapMs = 2000
): number | null {
  if (!tapTimestampsMs || tapTimestampsMs.length < 2) return null;

  // Keep only the contiguous sequence of taps where gaps are <= maxGapMs
  const recent: number[] = [tapTimestampsMs[tapTimestampsMs.length - 1]];
  for (let i = tapTimestampsMs.length - 2; i >= 0; i--) {
    if (recent[0] - tapTimestampsMs[i] > maxGapMs) break;
    recent.unshift(tapTimestampsMs[i]);
    if (recent.length >= 7) break;
  }

  if (recent.length < 2) return null;

  let totalInterval = 0;
  for (let i = 1; i < recent.length; i++) {
    totalInterval += recent[i] - recent[i - 1];
  }
  const avgIntervalMs = totalInterval / (recent.length - 1);
  if (avgIntervalMs <= 0) return null;

  const rawBpm = Math.round(60000 / avgIntervalMs);
  return Math.max(minBpm, Math.min(maxBpm, rawBpm));
}

export function formatCutoffHz(hz: number): string {
  if (hz >= 1000) {
    return `${(hz / 1000).toFixed(1)} kHz`;
  }
  return `${Math.round(hz)} Hz`;
}
