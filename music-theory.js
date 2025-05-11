import * as Constants from './constants.js';

const DEBUG_VOICING = false; 

function normalizeNoteName(noteName) {
    if (!noteName || typeof noteName !== 'string' || noteName.length === 0) {
        return null;
    }
    let root = noteName.charAt(0).toUpperCase();
    // Accidental can be #, b, ##, bb. Keep them as they are if valid, otherwise ''.
    let accidental = '';
    if (noteName.length > 1) {
        const accCandidate = noteName.substring(1);
        if (accCandidate === '#' || accCandidate === 'b' || accCandidate === '##' || accCandidate === 'bb') {
            accidental = accCandidate;
        } else if (accCandidate.length === 1 && (accCandidate.toLowerCase() === '#' || accCandidate.toLowerCase() === 'b') ) {
            // handles c# or cb -> C# or Cb
            accidental = accCandidate.toLowerCase() === '#' ? '#' : 'b';
        }
    }
    // For map lookup, we prefer 'C#' over 'Db' if both are possible for a pitch class,
    // but Constants.NOTE_NAMES_MAP handles aliases.
    // The main thing is consistent first letter uppercase.
    // ALL_NOTE_NAMES uses C, C#, D ...
    // NOTE_NAMES_MAP uses C:0, C#:1, Db:1 ...
    // So, if we get 'db', it should become 'Db' for map key. If 'c#', it becomes 'C#'.
    if (accidental.length > 0 && accidental !== accidental.toLowerCase() && accidental !== accidental.toUpperCase()){ // mixed case like 'Db'
         // no change needed if already e.g. Db, Gb
    } else if (accidental.length > 0) {
        accidental = accidental.toLowerCase(); // force b or # to lowercase if not already
        if (accidental === 'b' || accidental === '#') {
            // standard
        } else { // clear invalid accidentals like 'bm' in 'Cbm'
            accidental = '';
        }
    }


    let normalized = root + accidental;
    // Final check against known map keys for common enharmonics if not directly found
    if (Constants.NOTE_NAMES_MAP[normalized]) return normalized;
    if (normalized.endsWith('b') && Constants.NOTE_NAMES_MAP[normalized.replace('b', '#').slice(0, -1) + '#']) { // Gb -> F# if Gb not in map
        // This kind of specific enharmonic mapping should ideally be in NOTE_NAMES_MAP itself if needed for output canonicalization.
        // For input normalization, ensuring it matches *a* key in NOTE_NAMES_MAP is sufficient.
    }
     // Simpler: just ensure first letter is cap, rest is what it was if # or b
    let finalRoot = noteName.charAt(0).toUpperCase();
    let finalAcc = "";
    if (noteName.length > 1) {
        let tempAcc = noteName.substring(1);
        if (tempAcc === '#' || tempAcc === 'b' || tempAcc.toLowerCase() === '#' || tempAcc.toLowerCase() === 'b') {
            finalAcc = tempAcc; // Keep original #/b casing if it's just that
        }
    }
    return finalRoot + finalAcc;

}


function getNoteFrequencyAbsolute(noteName, octave) {
    const normalizedForLookup = normalizeNoteName(noteName); // Use normalized name for map lookup
    if (!normalizedForLookup || !(normalizedForLookup in Constants.NOTE_NAMES_MAP)) return 0;
    let semitonesFromA4 = Constants.NOTE_NAMES_MAP[normalizedForLookup] - Constants.NOTE_NAMES_MAP['A'];
    semitonesFromA4 += (octave - 4) * Constants.SEMITONES_IN_OCTAVE;
    return Constants.A4 * Math.pow(2, semitonesFromA4 / Constants.SEMITONES_IN_OCTAVE);
}

export function parseChordNameToFrequencies(chordName, referenceOctave) {
    let normalizedInputChordName = chordName.replace(/°/g, 'o').replace(/ø/g, 'h');
    const shorthandMatch = normalizedInputChordName.match(/^([A-Ga-g][#b]?)(h|o)$/i); // case insensitive for root
    if (shorthandMatch && !normalizedInputChordName.toLowerCase().endsWith('sus')) {
        const root = shorthandMatch[1]; const symbol = shorthandMatch[2].toLowerCase();
        if (symbol === 'h') normalizedInputChordName = root + 'h7'; // quality part is case sensitive for formulas
        else if (symbol === 'o') normalizedInputChordName = root + 'o';
    }
    
    // Regex to capture root (group 1) and quality (group 2)
    // Root can be A-G, optionally followed by # or b. Quality is everything else.
    const match = normalizedInputChordName.match(/^([A-Ga-g][#b]?)(.*)$/);
    if (!match) return { frequencies: [], rootNoteName: null };

    const rootNoteNameOnly = normalizeNoteName(match[1]); 
    let quality = match[2]; // Quality part is kept as is initially for formula matching

    if (!rootNoteNameOnly || !(rootNoteNameOnly in Constants.NOTE_NAMES_MAP)) return { frequencies: [], rootNoteName: rootNoteNameOnly };

    const rootFrequency = getNoteFrequencyAbsolute(rootNoteNameOnly, parseInt(referenceOctave));
    if (rootFrequency === 0) return { frequencies: [], rootNoteName: rootNoteNameOnly };

    // Try matching quality as is, then lowercase (formulas are mostly lowercase)
    let intervals = Constants.CHORD_FORMULAS[quality] || Constants.CHORD_FORMULAS[quality.toLowerCase()];
    
    if (!intervals) { // If still no match, and quality is just "M", try common major alias
        if (quality.toUpperCase() === 'M') intervals = Constants.CHORD_FORMULAS['']; // Major triad
    }

    if (!intervals) return { frequencies: [rootFrequency], rootNoteName: rootNoteNameOnly };
    if (intervals.length === 0 && quality) return { frequencies: [rootFrequency], rootNoteName: rootNoteNameOnly }; // For 'R' or '1'
    
    const frequencies = intervals.map(interval => rootFrequency * Math.pow(2, interval / Constants.SEMITONES_IN_OCTAVE));
    return { frequencies, rootNoteName: rootNoteNameOnly };
}

export function getNoteNameFromDegree(keyRootNoteName, keyMode, degreeNumber, accidental = 0) {
    const normalizedKeyRoot = normalizeNoteName(keyRootNoteName);
    if (!normalizedKeyRoot) return null;

    const rootNoteIndex = Constants.ALL_NOTE_NAMES.indexOf(normalizedKeyRoot); // ALL_NOTE_NAMES are like 'C', 'C#'
    if (rootNoteIndex === -1) return null;
    
    const scaleIntervals = Constants.SCALE_INTERVAL_MAP[keyMode] || Constants.SCALE_INTERVAL_MAP['ionian'];
    if (!scaleIntervals || degreeNumber < 1 || degreeNumber > 7) {
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
    const degreeRegex = /^(b|#)?(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i|[1-7])([A-Za-z0-9#bø°+susMmMdimaugincl]*)(?:\/(b|#)?(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i|[1-7]))?(?:\((\d+)\))?$/;

    for (const token of tokens) {
        if (!token) continue; const match = token.match(degreeRegex);
        if (!match) { console.warn(`Could not parse degree token: ${token}`); parsedChords.push({ name: '?', beats: defaultBeatsPerChord, originalInputToken: token, error: true }); continue; }
        const accidentalText = match[1]; const degreeText = match[2]; let qualityText = match[3] || '';
        const slashAccidentalText = match[4]; const slashDegreeText = match[5];
        const beats = match[6] ? parseInt(match[6], 10) : defaultBeatsPerChord;
        let degreeNumber = Constants.ROMAN_NUMERAL_MAP[degreeText] || parseInt(degreeText, 10);
        let accidentalValue = 0;
        if (accidentalText === 'b') accidentalValue = -1; else if (accidentalText === '#') accidentalValue = 1;
        
        const chordRootName = getNoteNameFromDegree(songKey, keyMode, degreeNumber, accidentalValue); 
        if (!chordRootName) continue; 
        
        if (!qualityText) qualityText = getDefaultChordQualityForDegree(degreeNumber, keyMode);
        // qualityText is directly used for CHORD_FORMULAS, which are mostly lowercase or specific symbols
        // No specific casing change here, assuming formulas handle variants or it's pre-processed.

        let bassNoteName = null;
        if (slashDegreeText) {
            let slashDegreeNumber = Constants.ROMAN_NUMERAL_MAP[slashDegreeText] || parseInt(slashDegreeText, 10);
            let slashAccidentalValue = 0;
            if (slashAccidentalText === 'b') slashAccidentalValue = -1;
            else if (slashAccidentalText === '#') slashAccidentalValue = 1;
            bassNoteName = getNoteNameFromDegree(songKey, keyMode, slashDegreeNumber, slashAccidentalValue); 
        }

        parsedChords.push({ name: chordRootName + qualityText, bassNoteName, beats, originalInputToken: token });
    }
    return parsedChords;
}

export function parseDirectChordString(chordString, defaultBeatsPerChord) {
    const tokens = chordString.trim().split(/\s+/); const parsedChords = [];
    // Regex is case-insensitive due to /i flag.
    const chordRegex = /^([A-Ga-g][#b]?(?:sus4|sus2|sus|maj7|m7|dim7|dim|aug|h7|o7|h|o|mM7|add9|add2|6\/9|[Mm]|[Mm][aA][jJ]|[Mm][iI][nN]|[Dd][iI][mM]|[Aa][uU][gG]|[0-9#b()ø°+susno3Mbhicl]*))(?:\/([A-Ga-g][#b]?))?(?:\((\d+)\))?$/i;

    for (const token of tokens) {
        if (!token) continue; const match = token.match(chordRegex);
        if (match) {
            // match[1] is main chord part (e.g., Cmaj7, gm, F#)
            // match[2] is bass note part (e.g., G, bb)
            // match[3] is beats
            const mainChordNamePart = match[1]; // Casing as entered, will be normalized by parseChordNameToFrequencies's root part
            let parsedBassNote = match[2] ? normalizeNoteName(match[2]) : null; 
            const beatsPart = match[3] ? parseInt(match[3], 10) : defaultBeatsPerChord;
            
            parsedChords.push({ name: mainChordNamePart, bassNoteName: parsedBassNote, beats: beatsPart, originalInputToken: token });
        } else {
             console.warn(`Could not parse direct chord token: ${token}`); parsedChords.push({ name: '?', beats: defaultBeatsPerChord, originalInputToken: token, error: true });
        }
    }
    return parsedChords;
}

export function noteNameToMidi(noteNameWithOctave) {
    const match = noteNameWithOctave.match(/^([A-Ga-g][#b]?)([0-9])$/i); // Make regex case insensitive for note part
    if (!match) return null;
    
    let notePartForMap = normalizeNoteName(match[1]); // Normalize the note part (e.g. c# -> C#, gb -> Gb)
    const octavePart = parseInt(match[2], 10);
    
    // Special handling for enharmonics not directly in NOTE_NAMES_MAP but valid MIDI notes
    // These checks should use normalized notePartForMap if they are intended for map keys
    let tempNormalizedUpper = match[1].toUpperCase(); // For CB, E#, B# checks specifically
    if (tempNormalizedUpper === 'CB') return Constants.NOTE_NAMES_MAP['B'] + (octavePart - 1) * Constants.SEMITONES_IN_OCTAVE + 12;
    else if (tempNormalizedUpper === 'E#') return Constants.NOTE_NAMES_MAP['F'] + octavePart * Constants.SEMITONES_IN_OCTAVE + 12;
    else if (tempNormalizedUpper === 'B#') return Constants.NOTE_NAMES_MAP['C'] + (octavePart + 1) * Constants.SEMITONES_IN_OCTAVE + 12;
    
    if (!notePartForMap || !(notePartForMap in Constants.NOTE_NAMES_MAP)) { 
        return null;
    }
    return Constants.NOTE_NAMES_MAP[notePartForMap] + octavePart * Constants.SEMITONES_IN_OCTAVE + 12;
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

function voiceChordCore(initialFrequencies, chordRootNoteName, userMinMidi, userMaxMidi) {
    if (!initialFrequencies || initialFrequencies.length === 0) return [];

    let minMidi = userMinMidi; let maxMidi = userMaxMidi;
    if (userMinMidi === null || userMaxMidi === null || userMinMidi > userMaxMidi) {
        minMidi = 24; 
        maxMidi = 96; 
    }
    
    const initialMidiNotesUnsorted = initialFrequencies.map(freq => frequencyToMidi(freq));

    const normalizedChordRootForCore = chordRootNoteName ? normalizeNoteName(chordRootNoteName) : null;

    if (!normalizedChordRootForCore || !(normalizedChordRootForCore in Constants.NOTE_NAMES_MAP)) {
        const originalMidiNotesSimple = initialMidiNotesUnsorted.sort((a, b) => a - b);
        const voicedMidiNotesSimple = [];
        for (const originalMidi of originalMidiNotesSimple) {
            if (originalMidi === 0) continue;
            const pitchClass = originalMidi % 12;
            let currentVoicedNote = minMidi - (minMidi % 12) + pitchClass;
            if (currentVoicedNote < minMidi) currentVoicedNote += 12;
            
            while (currentVoicedNote > maxMidi && currentVoicedNote - 12 >= minMidi) currentVoicedNote -=12; 
            while (currentVoicedNote < minMidi && currentVoicedNote + 12 <= maxMidi) currentVoicedNote += 12; 
            
            if (currentVoicedNote >= minMidi && currentVoicedNote <= maxMidi) {
                 voicedMidiNotesSimple.push(currentVoicedNote);
            } 
        }        
        const uniqueResult = [...new Set(voicedMidiNotesSimple)].sort((a, b) => a - b);
        return uniqueResult;
    }

    const initialMidiNotes = initialMidiNotesUnsorted.sort((a, b) => a - b);
    if (initialMidiNotes.length === 0 || initialMidiNotes.every(n => n === 0)) {
        return [];
    }
    
    const rootPitchClass = Constants.NOTE_NAMES_MAP[normalizedChordRootForCore];
    const initialRootMidiGuess = initialMidiNotes.find(note => (note % 12) === rootPitchClass) || initialMidiNotes[0];

    let anchoredRootMidi = minMidi - (minMidi % 12) + rootPitchClass;
    if (anchoredRootMidi < minMidi) anchoredRootMidi += Constants.SEMITONES_IN_OCTAVE;
    
    while (anchoredRootMidi > maxMidi && (anchoredRootMidi - Constants.SEMITONES_IN_OCTAVE >= minMidi)) {
        anchoredRootMidi -= Constants.SEMITONES_IN_OCTAVE;
    }
     if (anchoredRootMidi > maxMidi) {
        let foundRootInRange = false;
        for (let oct = -1; oct < 9; oct++) {
            const testRoot = rootPitchClass + (oct * 12) + 12;
            if (testRoot >= minMidi && testRoot <= maxMidi) {
                anchoredRootMidi = testRoot;
                foundRootInRange = true;
                break;
            }
        }
    }
    
    const tempVoicedNotes = [];
    for (const currentInitialMidi of initialMidiNotes) {
        if (currentInitialMidi === 0) continue;
        const intervalFromInitialRoot = currentInitialMidi - initialRootMidiGuess;
        let targetVoicedMidi = anchoredRootMidi + intervalFromInitialRoot;

        while (targetVoicedMidi > maxMidi && (targetVoicedMidi - Constants.SEMITONES_IN_OCTAVE >= minMidi)) {
            targetVoicedMidi -= Constants.SEMITONES_IN_OCTAVE;
        }
        while (targetVoicedMidi < minMidi && (targetVoicedMidi + Constants.SEMITONES_IN_OCTAVE <= maxMidi)) {
            targetVoicedMidi += Constants.SEMITONES_IN_OCTAVE;
        }
        
        if (targetVoicedMidi >= minMidi && targetVoicedMidi <= maxMidi) {
            tempVoicedNotes.push(targetVoicedMidi);
        } 
    }
    
    const uniqueSortedVoicedMidi = [...new Set(tempVoicedNotes)].sort((a, b) => a - b);
    return uniqueSortedVoicedMidi;
}

function findLowestMidiInstanceInRange(noteName, minMidi, maxMidi) {
    const normalizedNoteForFind = normalizeNoteName(noteName); 
    if (!normalizedNoteForFind || !(normalizedNoteForFind in Constants.NOTE_NAMES_MAP)) {
        return null;
    }
    const pitchClass = Constants.NOTE_NAMES_MAP[normalizedNoteForFind];

    for (let octave = -1; octave < 9; octave++) {
        const midiNote = pitchClass + (octave * Constants.SEMITONES_IN_OCTAVE) + 12;
        if (midiNote >= minMidi && midiNote <= maxMidi) {
            return midiNote;
        }
        if (midiNote > maxMidi && octave > 1) break; 
    }
    return null;
}


export function voiceFrequenciesInRange(initialMainChordFrequencies, mainChordRootName, userMinMidi, userMaxMidi, bassNoteNameFromSlash = null) {
    let playedMidiNotes = [];
    let playedAsSlash = false; 
    let minMainChordNotesForSlashSuccess = 1; 

    if (initialMainChordFrequencies.length >= 3) { 
        minMainChordNotesForSlashSuccess = 2;
    } else if (initialMainChordFrequencies.length === 0) { 
        minMainChordNotesForSlashSuccess = 0; 
    }

    const normalizedMainChordRoot = mainChordRootName ? normalizeNoteName(mainChordRootName) : null;
    const normalizedBassNoteFromSlash = bassNoteNameFromSlash ? normalizeNoteName(bassNoteNameFromSlash) : null;

    if (normalizedBassNoteFromSlash) {
        const bassMidiToBePlayed = findLowestMidiInstanceInRange(normalizedBassNoteFromSlash, userMinMidi, userMaxMidi);

        if (bassMidiToBePlayed !== null) {
            const mainChordVoicedWithBass = voiceChordCore(
                initialMainChordFrequencies,
                normalizedMainChordRoot,
                bassMidiToBePlayed, 
                userMaxMidi
            );

            if (mainChordVoicedWithBass.length >= minMainChordNotesForSlashSuccess) {
                playedMidiNotes.push(bassMidiToBePlayed);
                playedMidiNotes.push(...mainChordVoicedWithBass);
                playedAsSlash = true; 
            } else {
                const mainChordVoicedNormally = voiceChordCore(
                    initialMainChordFrequencies,
                    normalizedMainChordRoot,
                    userMinMidi,
                    userMaxMidi
                );
                playedMidiNotes.push(...mainChordVoicedNormally);
            }
        } else {
            const mainChordVoicedNormally = voiceChordCore(
                initialMainChordFrequencies,
                normalizedMainChordRoot,
                userMinMidi,
                userMaxMidi
            );
            playedMidiNotes.push(...mainChordVoicedNormally);
        }
    } else {
        const mainChordVoicedNormally = voiceChordCore(
            initialMainChordFrequencies,
            normalizedMainChordRoot,
            userMinMidi,
            userMaxMidi
        );
        playedMidiNotes.push(...mainChordVoicedNormally);
    }

    const finalUniqueSortedMidi = [...new Set(playedMidiNotes)].sort((a, b) => a - b);
    return { 
        frequencies: finalUniqueSortedMidi.map(midi => midiToFrequency(midi)),
        playedAsSlash: playedAsSlash && (normalizedBassNoteFromSlash != null) 
    };
}