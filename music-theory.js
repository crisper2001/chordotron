import * as Constants from './constants.js';

function getNoteFrequencyAbsolute(noteName, octave) {
    if (!(noteName in Constants.NOTE_NAMES_MAP)) return 0;
    let semitonesFromA4 = Constants.NOTE_NAMES_MAP[noteName] - Constants.NOTE_NAMES_MAP['A'];
    semitonesFromA4 += (octave - 4) * Constants.SEMITONES_IN_OCTAVE;
    return Constants.A4 * Math.pow(2, semitonesFromA4 / Constants.SEMITONES_IN_OCTAVE);
}

export function parseChordNameToFrequencies(chordName, referenceOctave) {
    let normalizedChordName = chordName.replace(/°/g, 'o').replace(/ø/g, 'h');
    const shorthandMatch = normalizedChordName.match(/^([A-Ga-g][#b]?)(h|o)$/);
    if (shorthandMatch && !normalizedChordName.endsWith('sus')) {
        const root = shorthandMatch[1]; const symbol = shorthandMatch[2];
        if (symbol === 'h') normalizedChordName = root + 'h7';
    }
    const match = normalizedChordName.match(/^([A-Ga-g][#b]?)(.*)$/);
    if (!match) return { frequencies: [], rootNoteName: null };

    const rootNoteNameOnly = match[1].charAt(0).toUpperCase() + match[1].slice(1).replace(/[0-9]/g, ''); // e.g. C, F#
    let quality = match[2];

    if (!(rootNoteNameOnly in Constants.NOTE_NAMES_MAP)) return { frequencies: [], rootNoteName: rootNoteNameOnly };

    const rootFrequency = getNoteFrequencyAbsolute(rootNoteNameOnly, parseInt(referenceOctave));
    if (rootFrequency === 0) return { frequencies: [], rootNoteName: rootNoteNameOnly };

    let intervals = Constants.CHORD_FORMULAS[quality] || Constants.CHORD_FORMULAS[quality.toLowerCase()];
    if (!intervals) return { frequencies: [rootFrequency], rootNoteName: rootNoteNameOnly };
    if (intervals.length === 0 && quality) return { frequencies: [rootFrequency], rootNoteName: rootNoteNameOnly };
    
    const frequencies = intervals.map(interval => rootFrequency * Math.pow(2, interval / Constants.SEMITONES_IN_OCTAVE));
    return { frequencies, rootNoteName: rootNoteNameOnly };
}

export function getNoteNameFromDegree(keyRootNoteName, keyMode, degreeNumber, accidental = 0) {
    const rootNoteIndex = Constants.ALL_NOTE_NAMES.indexOf(keyRootNoteName.toUpperCase());
    if (rootNoteIndex === -1) return null;
    const scaleIntervals = Constants.SCALE_INTERVAL_MAP[keyMode] || Constants.SCALE_INTERVAL_MAP['ionian'];
    if (!scaleIntervals || degreeNumber < 1 || degreeNumber > 7) {
        console.warn("Invalid degree number or mode for getNoteNameFromDegree:", degreeNumber, keyMode);
        return null;
    }
    const interval = scaleIntervals[degreeNumber - 1];
    let noteIndex = (rootNoteIndex + interval + accidental) % Constants.SEMITONES_IN_OCTAVE;
    if (noteIndex < 0) noteIndex += Constants.SEMITONES_IN_OCTAVE;
    return Constants.ALL_NOTE_NAMES[noteIndex];
}

export function getDefaultChordQualityForDegree(degreeNumber, keyMode) {
    const modeQualities = Constants.DIATONIC_CHORD_QUALITIES[keyMode] || Constants.DIATONIC_CHORD_QUALITIES['ionian'];
    let quality = modeQualities[degreeNumber] || '';
    return quality;
}

export function parseScaleDegreeString(degreeString, songKey, keyMode, defaultBeatsPerChord) {
    const tokens = degreeString.trim().split(/\s+/); const parsedChords = [];
    const degreeRegex = /^(b|#)?(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i|[1-7])([A-Za-z0-9#bø°+]*)(?:\((\d+)\))?$/;
    for (const token of tokens) {
        if (!token) continue; const match = token.match(degreeRegex);
        if (!match) { console.warn(`Could not parse degree token: ${token}`); continue; }
        const accidentalText = match[1]; const degreeText = match[2];
        let qualityText = match[3] || ''; const beats = match[4] ? parseInt(match[4], 10) : defaultBeatsPerChord;
        let degreeNumber = Constants.ROMAN_NUMERAL_MAP[degreeText] || parseInt(degreeText, 10);
        let accidentalValue = 0;
        if (accidentalText === 'b') accidentalValue = -1; else if (accidentalText === '#') accidentalValue = 1;
        const chordRootName = getNoteNameFromDegree(songKey, keyMode, degreeNumber, accidentalValue);
        if (!chordRootName) continue; if (!qualityText) qualityText = getDefaultChordQualityForDegree(degreeNumber, keyMode);
        qualityText = qualityText.replace(/°/g, 'o').replace(/ø/g, 'h');
        if (qualityText === 'h' && !Constants.CHORD_FORMULAS['h']) qualityText = 'h7';
        parsedChords.push({ name: chordRootName + qualityText, beats, originalInputToken: token });
    }
    return parsedChords;
}

export function parseDirectChordString(chordString, defaultBeatsPerChord) {
    const tokens = chordString.trim().split(/\s+/); const parsedChords = [];
    const chordRegex = /^(\S+?)(?:\((\d+)\))?$/;
    for (const token of tokens) {
        if (!token) continue; const match = token.match(chordRegex);
        if (match) parsedChords.push({ name: match[1], beats: match[2] ? parseInt(match[2], 10) : defaultBeatsPerChord, originalInputToken: token });
        else console.warn(`Could not parse direct chord token: ${token}`);
    }
    return parsedChords;
}

export function noteNameToMidi(noteNameWithOctave) {
    const match = noteNameWithOctave.toUpperCase().match(/^([A-G][#B]?)([0-9])$/);
    if (!match) {
        // console.warn(`Invalid note format for MIDI conversion: ${noteNameWithOctave}`);
        return null;
    }

    let notePart = match[1];
    const octavePart = parseInt(match[2], 10);

    if (notePart === 'DB') notePart = 'C#'; else if (notePart === 'EB') notePart = 'D#';
    else if (notePart === 'FB') notePart = 'E';  else if (notePart === 'GB') notePart = 'F#';
    else if (notePart === 'AB') notePart = 'G#'; else if (notePart === 'BB') notePart = 'A#';
    
    if (match[1] === 'CB') { 
         return Constants.NOTE_NAMES_MAP['B'] + (octavePart - 1) * Constants.SEMITONES_IN_OCTAVE + 12;
    } else if (match[1] === 'E#') { 
        return Constants.NOTE_NAMES_MAP['F'] + octavePart * Constants.SEMITONES_IN_OCTAVE + 12;
    } else if (match[1] === 'B#') { 
        return Constants.NOTE_NAMES_MAP['C'] + (octavePart + 1) * Constants.SEMITONES_IN_OCTAVE + 12;
    }

    if (!(notePart in Constants.NOTE_NAMES_MAP)) {
        // console.warn(`Invalid note name for MIDI conversion: ${match[1]}`);
        return null;
    }
    const midiNote = Constants.NOTE_NAMES_MAP[notePart] + octavePart * Constants.SEMITONES_IN_OCTAVE + 12;
    return midiNote;
}

export function midiToNoteNameWithOctave(midiNote) { 
    if (midiNote < 0 || midiNote > 127) return null;
    const noteIndex = midiNote % Constants.SEMITONES_IN_OCTAVE;
    const octave = Math.floor(midiNote / Constants.SEMITONES_IN_OCTAVE) -1; 
    const noteName = Constants.ALL_NOTE_NAMES[noteIndex];
    return noteName + octave;
}

export function midiToFrequency(midiNote) {
    return Constants.A4 * Math.pow(2, (midiNote - 69) / Constants.SEMITONES_IN_OCTAVE);
}

export function frequencyToMidi(frequency) {
    if (frequency <= 0) return 0;
    const midiNote = Constants.SEMITONES_IN_OCTAVE * Math.log2(frequency / Constants.A4) + 69;
    return Math.round(midiNote);
}

export function voiceFrequenciesInMidiRange(initialFrequencies, chordRootNoteName, userMinMidi, userMaxMidi) {
    if (!initialFrequencies || initialFrequencies.length === 0) return [];

    let minMidi = userMinMidi;
    let maxMidi = userMaxMidi;

    // Default to a wide sensible range if user range is invalid
    if (userMinMidi === null || userMaxMidi === null || userMinMidi >= userMaxMidi) {
        minMidi = 24; // C1
        maxMidi = 96; // C7
        // console.warn(`Invalid user MIDI range or no range provided. Defaulting to C1-C7 for chord ${chordRootNoteName}.`);
    }
    if (!chordRootNoteName || !(chordRootNoteName in Constants.NOTE_NAMES_MAP)) {
        // If no valid root, fall back to simpler voicing (lowest pitch class in range for each note)
        // console.warn(`No valid root note for ${chordRootNoteName}. Using simpler voicing.`);
        const originalMidiNotesSimple = initialFrequencies.map(freq => frequencyToMidi(freq)).sort((a, b) => a - b);
        const voicedMidiNotesSimple = [];
        for (const originalMidi of originalMidiNotesSimple) {
            if (originalMidi === 0) continue;
            const pitchClass = originalMidi % 12;
            let currentVoicedNote = minMidi - (minMidi % 12) + pitchClass;
            if (currentVoicedNote < minMidi) currentVoicedNote += 12;
            
            while (currentVoicedNote > maxMidi && currentVoicedNote - 12 >= 0) currentVoicedNote -=12; // Try to bring down if too high
            if (currentVoicedNote < minMidi && currentVoicedNote + 12 <= maxMidi) currentVoicedNote += 12; // Try to bring up if too low after adjustment
            if (currentVoicedNote < minMidi) { // If still too low, force to minMidi's pitch class or above
                 let forced = minMidi - (minMidi % 12) + pitchClass;
                 if (forced < minMidi) forced += 12;
                 currentVoicedNote = forced;
            }


            voicedMidiNotesSimple.push(currentVoicedNote);
        }
        return [...new Set(voicedMidiNotesSimple)].sort((a, b) => a - b).map(midi => midiToFrequency(midi));
    }


    const initialMidiNotes = initialFrequencies.map(freq => frequencyToMidi(freq)).sort((a, b) => a - b);
    if (initialMidiNotes.length === 0 || initialMidiNotes.every(n => n === 0)) return [];
    
    const rootPitchClass = Constants.NOTE_NAMES_MAP[chordRootNoteName];
    const initialRootMidiGuess = initialMidiNotes.find(note => (note % 12) === rootPitchClass) || initialMidiNotes[0];

    // 1. Anchor the Root Note
    let anchoredRootMidi = minMidi - (minMidi % 12) + rootPitchClass;
    if (anchoredRootMidi < minMidi) {
        anchoredRootMidi += Constants.SEMITONES_IN_OCTAVE;
    }
    // If anchored root is still above maxMidi, try to lower it by octaves.
    while (anchoredRootMidi > maxMidi && (anchoredRootMidi - Constants.SEMITONES_IN_OCTAVE >= minMidi)) {
        anchoredRootMidi -= Constants.SEMITONES_IN_OCTAVE;
    }
    // If it's impossible to fit the root (e.g. C5 root in C2-C3 range after adjustments),
    // this means the range is very restrictive. For now, we'll let it be, subsequent notes might also struggle.
    // A more robust solution might shift the entire target range or use a different strategy.


    const voicedMidiNotes = [];
    const tempVoicedNotes = [];

    for (const currentInitialMidi of initialMidiNotes) {
        if (currentInitialMidi === 0) continue;

        const intervalFromInitialRoot = currentInitialMidi - initialRootMidiGuess;
        let targetVoicedMidi = anchoredRootMidi + intervalFromInitialRoot;

        // Adjust octave to fit within [minMidi, maxMidi]
        while (targetVoicedMidi > maxMidi && (targetVoicedMidi - Constants.SEMITONES_IN_OCTAVE >= minMidi)) {
            targetVoicedMidi -= Constants.SEMITONES_IN_OCTAVE;
        }
        while (targetVoicedMidi < minMidi && (targetVoicedMidi + Constants.SEMITONES_IN_OCTAVE <= maxMidi)) {
            targetVoicedMidi += Constants.SEMITONES_IN_OCTAVE;
        }

        // Final check: if still outside, try to force it to the closest edge
        if (targetVoicedMidi < minMidi) {
            let forced = minMidi - (minMidi % 12) + (targetVoicedMidi % 12);
            if (forced < minMidi) forced += 12;
            targetVoicedMidi = forced; // This might push it above maxMidi if range is small
        }
        if (targetVoicedMidi > maxMidi) {
             let forced = maxMidi - (maxMidi % 12) + (targetVoicedMidi % 12);
             if (forced > maxMidi) forced -= 12;
             targetVoicedMidi = forced; // This might push it below minMidi
        }
        // One last check for very narrow ranges
        if (targetVoicedMidi < minMidi) targetVoicedMidi = minMidi;
        if (targetVoicedMidi > maxMidi) targetVoicedMidi = maxMidi;


        tempVoicedNotes.push(targetVoicedMidi);
    }

    // Remove duplicates and sort
    const uniqueSortedVoicedMidi = [...new Set(tempVoicedNotes)].sort((a, b) => a - b);
    
    // Ensure minimum number of notes if possible (e.g. at least root, or root+third if range allows)
    // This part can get complex. For now, let's rely on the Set to handle dense voicings.
    // If after voicing, we have fewer notes than expected (e.g. due to very narrow range collapsing intervals),
    // it might be acceptable or indicate a need for even more advanced logic (e.g. dropping non-essential tones).

    return uniqueSortedVoicedMidi.map(midi => midiToFrequency(midi));
}