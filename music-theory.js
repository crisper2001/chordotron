import * as Constants from './constants.js';

const DEBUG_VOICING = false; 
// const DEBUG_DURATION_PARSING = false; // No longer needed

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
    const degreeRegex = /^(b|#)?(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i|[1-7])([A-Za-z0-9#bø°+susMmMdimaugincl^]*)(?:\/(b|#)?(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i|[1-7]))?(?:\((\d+)\))?$/;
    
    for (const token of tokens) {
        if (!token) continue; 
        const match = token.match(degreeRegex);
        if (!match) { 
            console.warn(`Could not parse degree token: ${token}`); 
            parsedChords.push({ name: '?', beats: defaultBeatsPerChord, originalInputToken: token, error: true }); 
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
            beats = parseInt(beatsString, 10);
        }
        
        let degreeNumber = Constants.ROMAN_NUMERAL_MAP[degreeText] || parseInt(degreeText, 10);
        let accidentalValue = 0;
        if (accidentalText === 'b') accidentalValue = -1; else if (accidentalText === '#') accidentalValue = 1;
        
        const chordRootName = getNoteNameFromDegree(songKey, keyMode, degreeNumber, accidentalValue); 
        if (!chordRootName) {
            continue;
        }
        
        if (!qualityText) qualityText = getDefaultChordQualityForDegree(degreeNumber, keyMode);

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
    const chordRegex = /^([A-Ga-g][#b]?(?:sus4|sus2|sus|maj7|m7|dim7|dim|aug|h7|o7|h|o|mM7|add9|add2|6\/9|[Mm]|[Mm][aA][jJ]|[Mm][iI][nN]|[Dd][iI][mM]|[Aa][uU][gG]|[0-9#bø°+susno3Mbhicl^]*))(?:\/([A-Ga-g][#b]?))?(?:\((\d+)\))?$/i;
    
    for (const token of tokens) {
        if (!token) continue; 
        const match = token.match(chordRegex);
        
        if (match) {
            const mainChordNamePart = match[1]; 
            let parsedBassNote = match[2] ? normalizeNoteName(match[2]) : null; 
            const beatsString = match[3]; 

            let beats = defaultBeatsPerChord;
            if (beatsString !== undefined) { 
                beats = parseInt(beatsString, 10);
            }
            
            parsedChords.push({ name: mainChordNamePart, bassNoteName: parsedBassNote, beats: beats, originalInputToken: token });
        } else {
             console.warn(`Could not parse direct chord token: ${token}`); 
             parsedChords.push({ name: '?', beats: defaultBeatsPerChord, originalInputToken: token, error: true });
        }
    }
    return parsedChords;
}

export function noteNameToMidi(noteNameWithOctave) {
    const match = noteNameWithOctave.match(/^([A-Ga-g][#b]?)([0-9])$/i); // Make regex case insensitive for note part
    if (!match) return null;
    
    let notePartForMap = normalizeNoteName(match[1]); // Normalize the note part (e.g. c# -> C#, gb -> Gb)
    const octavePart = parseInt(match[2], 10);
    
    let tempNormalizedUpper = match[1].toUpperCase(); 
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

function voiceChordCore(initialFrequencies, chordRootNoteName, minMidi, maxMidi) {
    if (DEBUG_VOICING) {
        console.log('[VOICING_CORE] Called with:',
            '\n  Initial Frequencies:', initialFrequencies.map(f => frequencyToMidi(f) + '(' + midiToNoteNameWithOctave(frequencyToMidi(f)) + ')').join(', '),
            `(${initialFrequencies.length} notes)`,
            '\n  Chord Root Name:', chordRootNoteName,
            '\n  Min MIDI:', minMidi, `(${midiToNoteNameWithOctave(minMidi)})`,
            '\n  Max MIDI:', maxMidi, `(${midiToNoteNameWithOctave(maxMidi)})`
        );
    }

    if (!initialFrequencies || initialFrequencies.length === 0) {
        if (DEBUG_VOICING) console.log('[VOICING_CORE] No initial frequencies, returning [].');
        return [];
    }

    let minMidiConstrained = minMidi;
    let maxMidiConstrained = maxMidi;
    if (minMidi === null || maxMidi === null || minMidi > maxMidi) {
        if (DEBUG_VOICING) console.log('[VOICING_CORE] Invalid min/max MIDI, using default 24-96.');
        minMidiConstrained = 24; 
        maxMidiConstrained = 96; 
    }
    
    const initialMidiNotesUnsorted = initialFrequencies.map(freq => frequencyToMidi(freq));
    const normalizedChordRootForCore = chordRootNoteName ? normalizeNoteName(chordRootNoteName) : null;

    if (!normalizedChordRootForCore || !(normalizedChordRootForCore in Constants.NOTE_NAMES_MAP)) {
        if (DEBUG_VOICING) console.log('[VOICING_CORE] Invalid or no chordRootNoteName. Using simple pitch class placement.');
        const originalMidiNotesSimple = initialMidiNotesUnsorted.sort((a, b) => a - b);
        const voicedMidiNotesSimple = [];
        for (const originalMidi of originalMidiNotesSimple) {
            if (originalMidi === 0) continue;
            const pitchClass = originalMidi % 12;
            let currentVoicedNote = minMidiConstrained - (minMidiConstrained % 12) + pitchClass;
            if (currentVoicedNote < minMidiConstrained) currentVoicedNote += 12;
            
            while (currentVoicedNote > maxMidiConstrained && currentVoicedNote - 12 >= minMidiConstrained) currentVoicedNote -=12; 
            while (currentVoicedNote < minMidiConstrained && currentVoicedNote + 12 <= maxMidiConstrained) currentVoicedNote += 12; 
            
            if (currentVoicedNote >= minMidiConstrained && currentVoicedNote <= maxMidiConstrained) {
                 voicedMidiNotesSimple.push(currentVoicedNote);
            } 
        }        
        const uniqueResult = [...new Set(voicedMidiNotesSimple)].sort((a, b) => a - b);
        if (DEBUG_VOICING) console.log('[VOICING_CORE] Simple placement result:', uniqueResult.map(n => `${n}(${midiToNoteNameWithOctave(n)})`).join(', '));
        return uniqueResult;
    }

    const initialMidiNotes = initialMidiNotesUnsorted.sort((a, b) => a - b);
    if (DEBUG_VOICING) console.log('[VOICING_CORE] Sorted initial MIDI notes:', initialMidiNotes.map(n => `${n}(${midiToNoteNameWithOctave(n)})`).join(', '));
    
    if (initialMidiNotes.length === 0 || initialMidiNotes.every(n => n === 0)) {
        if (DEBUG_VOICING) console.log('[VOICING_CORE] All initial MIDI notes are 0 or empty array, returning [].');
        return [];
    }
    
    const rootPitchClass = Constants.NOTE_NAMES_MAP[normalizedChordRootForCore];
    const initialRootMidiGuess = initialMidiNotes.find(note => (note % 12) === rootPitchClass) || initialMidiNotes[0];
    if (DEBUG_VOICING) console.log(`[VOICING_CORE] Root Pitch Class: ${rootPitchClass}, Initial Root MIDI Guess: ${initialRootMidiGuess} (${midiToNoteNameWithOctave(initialRootMidiGuess)})`);


    let anchoredRootMidi = minMidiConstrained - (minMidiConstrained % 12) + rootPitchClass;
    if (anchoredRootMidi < minMidiConstrained) anchoredRootMidi += Constants.SEMITONES_IN_OCTAVE;
    if (DEBUG_VOICING) console.log(`[VOICING_CORE] Anchored Root MIDI (initial calc): ${anchoredRootMidi} (${midiToNoteNameWithOctave(anchoredRootMidi)})`);
    
    while (anchoredRootMidi > maxMidiConstrained && (anchoredRootMidi - Constants.SEMITONES_IN_OCTAVE >= minMidiConstrained)) {
        anchoredRootMidi -= Constants.SEMITONES_IN_OCTAVE;
        if (DEBUG_VOICING) console.log(`[VOICING_CORE] Anchored Root MIDI (shifted down): ${anchoredRootMidi} (${midiToNoteNameWithOctave(anchoredRootMidi)})`);
    }

     if (anchoredRootMidi < minMidiConstrained || anchoredRootMidi > maxMidiConstrained) {
        if (DEBUG_VOICING) console.log(`[VOICING_CORE] Anchored Root ${anchoredRootMidi} (${midiToNoteNameWithOctave(anchoredRootMidi)}) is OUTSIDE range [${minMidiConstrained}-${maxMidiConstrained}]. Attempting fallback search for root in range.`);
        let foundRootInRange = false;
        for (let oct = -1; oct < 9; oct++) { 
            const testRoot = rootPitchClass + (oct * Constants.SEMITONES_IN_OCTAVE) + 12; 
            if (testRoot >= minMidiConstrained && testRoot <= maxMidiConstrained) {
                anchoredRootMidi = testRoot;
                foundRootInRange = true;
                if (DEBUG_VOICING) console.log(`[VOICING_CORE] Fallback: Found root in range: ${anchoredRootMidi} (${midiToNoteNameWithOctave(anchoredRootMidi)})`);
                break;
            }
        }
        if (!foundRootInRange) {
            if (DEBUG_VOICING) console.warn(`[VOICING_CORE] Fallback: Could not find any instance of root ${normalizedChordRootForCore} (PC: ${rootPitchClass}) in range [${minMidiConstrained}-${maxMidiConstrained}]. Voicing may be empty or unusual.`);
        }
    }
    if (DEBUG_VOICING) console.log(`[VOICING_CORE] Final Anchored Root MIDI: ${anchoredRootMidi} (${midiToNoteNameWithOctave(anchoredRootMidi)})`);
    
    const tempVoicedNotes = [];
    for (const currentInitialMidi of initialMidiNotes) {
        if (currentInitialMidi === 0) continue;
        const intervalFromInitialRoot = currentInitialMidi - initialRootMidiGuess;
        let targetVoicedMidi = anchoredRootMidi + intervalFromInitialRoot;
        if (DEBUG_VOICING) console.log(`[VOICING_CORE]   Note ${currentInitialMidi} (${midiToNoteNameWithOctave(currentInitialMidi)}): Interval from initial root: ${intervalFromInitialRoot}, Target MIDI (pre-adjust): ${targetVoicedMidi} (${midiToNoteNameWithOctave(targetVoicedMidi)})`);

        while (targetVoicedMidi > maxMidiConstrained && (targetVoicedMidi - Constants.SEMITONES_IN_OCTAVE >= minMidiConstrained)) {
            targetVoicedMidi -= Constants.SEMITONES_IN_OCTAVE;
            if (DEBUG_VOICING) console.log(`[VOICING_CORE]     Shifted down: ${targetVoicedMidi} (${midiToNoteNameWithOctave(targetVoicedMidi)})`);
        }
        while (targetVoicedMidi < minMidiConstrained && (targetVoicedMidi + Constants.SEMITONES_IN_OCTAVE <= maxMidiConstrained)) {
            targetVoicedMidi += Constants.SEMITONES_IN_OCTAVE;
            if (DEBUG_VOICING) console.log(`[VOICING_CORE]     Shifted up: ${targetVoicedMidi} (${midiToNoteNameWithOctave(targetVoicedMidi)})`);
        }
        
        if (targetVoicedMidi >= minMidiConstrained && targetVoicedMidi <= maxMidiConstrained) {
            tempVoicedNotes.push(targetVoicedMidi);
            if (DEBUG_VOICING) console.log(`[VOICING_CORE]     Added to voiced notes: ${targetVoicedMidi} (${midiToNoteNameWithOctave(targetVoicedMidi)})`);
        } else {
            if (DEBUG_VOICING) console.log(`[VOICING_CORE]     Note ${targetVoicedMidi} (${midiToNoteNameWithOctave(targetVoicedMidi)}) is OUT of range [${minMidiConstrained}-${maxMidiConstrained}], not added.`);
        }
    }
    
    if (DEBUG_VOICING) console.log('[VOICING_CORE] Temp voiced notes (pre-unique/sort):', tempVoicedNotes.map(n => `${n}(${midiToNoteNameWithOctave(n)})`).join(', '));
    const uniqueSortedVoicedMidi = [...new Set(tempVoicedNotes)].sort((a, b) => a - b);
    if (DEBUG_VOICING) console.log('[VOICING_CORE] Returning unique sorted MIDI:', uniqueSortedVoicedMidi.map(n => `${n}(${midiToNoteNameWithOctave(n)})`).join(', '));
    return uniqueSortedVoicedMidi;
}

function findLowestMidiInstanceInRange(noteName, minMidi, maxMidi) {
    const normalizedNoteForFind = normalizeNoteName(noteName); 
    if (!normalizedNoteForFind || !(normalizedNoteForFind in Constants.NOTE_NAMES_MAP)) {
        if (DEBUG_VOICING) console.log(`[FIND_LOWEST_MIDI] Invalid note name: ${noteName}`);
        return null;
    }
    const pitchClass = Constants.NOTE_NAMES_MAP[normalizedNoteForFind];

    for (let octave = -1; octave < 9; octave++) { 
        const midiNote = pitchClass + (octave * Constants.SEMITONES_IN_OCTAVE) + 12; 
        if (midiNote >= minMidi && midiNote <= maxMidi) {
            if (DEBUG_VOICING) console.log(`[FIND_LOWEST_MIDI] Found ${noteName} (PC: ${pitchClass}) as MIDI ${midiNote} (${midiToNoteNameWithOctave(midiNote)}) in range [${minMidi}-${maxMidi}]`);
            return midiNote;
        }
        if (midiNote > maxMidi && octave > 1) break; 
    }
    if (DEBUG_VOICING) console.log(`[FIND_LOWEST_MIDI] Did not find ${noteName} (PC: ${pitchClass}) in range [${minMidi}-${maxMidi}]`);
    return null;
}


export function voiceFrequenciesInRange(initialMainChordFrequencies, mainChordRootName, userMinMidi, userMaxMidi, bassNoteNameFromSlash = null) {
    if (DEBUG_VOICING) {
        console.log('\n--- [VOICE_RANGE_START] ---');
        console.log('[VOICE_RANGE] Initial Call:',
            `\n  Main Chord Freqs (MIDI): ${initialMainChordFrequencies.map(f => frequencyToMidi(f) + '('+midiToNoteNameWithOctave(frequencyToMidi(f))+')').join(', ')} (${initialMainChordFrequencies.length} notes)`,
            '\n  Main Chord Root:', mainChordRootName,
            '\n  User Min MIDI:', userMinMidi, `(${midiToNoteNameWithOctave(userMinMidi)})`,
            '\n  User Max MIDI:', userMaxMidi, `(${midiToNoteNameWithOctave(userMaxMidi)})`,
            '\n  Slash Bass Name:', bassNoteNameFromSlash
        );
    }

    let playedMidiNotes = [];
    let playedAsSlash = false; 
    let minMainChordNotesForSlashSuccess = 1; 

    if (initialMainChordFrequencies.length >= 3) { 
        minMainChordNotesForSlashSuccess = 2; 
    } else if (initialMainChordFrequencies.length === 0) { 
        minMainChordNotesForSlashSuccess = 0; 
    }
    if (DEBUG_VOICING) console.log(`[VOICE_RANGE] Min main chord notes for slash success: ${minMainChordNotesForSlashSuccess}`);


    const normalizedMainChordRoot = mainChordRootName ? normalizeNoteName(mainChordRootName) : null;
    const normalizedBassNoteFromSlash = bassNoteNameFromSlash ? normalizeNoteName(bassNoteNameFromSlash) : null;
    if (DEBUG_VOICING) console.log(`[VOICE_RANGE] Normalized Main Root: ${normalizedMainChordRoot}, Normalized Slash Bass: ${normalizedBassNoteFromSlash}`);

    if (normalizedBassNoteFromSlash) {
        const bassMidiToBePlayed = findLowestMidiInstanceInRange(normalizedBassNoteFromSlash, userMinMidi, userMaxMidi);
        if (DEBUG_VOICING) console.log(`[VOICE_RANGE] Slash Bass MIDI to be played (if found): ${bassMidiToBePlayed} (${bassMidiToBePlayed !== null ? midiToNoteNameWithOctave(bassMidiToBePlayed) : 'N/A'})`);

        if (bassMidiToBePlayed !== null) {
            if (DEBUG_VOICING) console.log(`[VOICE_RANGE] Attempting to voice main chord above slash bass. Range for main chord: [${bassMidiToBePlayed}-${userMaxMidi}]`);
            const mainChordVoicedWithBass = voiceChordCore(
                initialMainChordFrequencies,
                normalizedMainChordRoot,
                bassMidiToBePlayed, 
                userMaxMidi
            );
            if (DEBUG_VOICING) console.log('[VOICE_RANGE] Main chord notes voiced with slash bass:', mainChordVoicedWithBass.map(n => `${n}(${midiToNoteNameWithOctave(n)})`).join(', '), `(Count: ${mainChordVoicedWithBass.length})`);

            let mainChordRootIsPresentInVoicing = false;
            if (normalizedMainChordRoot && Constants.NOTE_NAMES_MAP[normalizedMainChordRoot] !== undefined) {
                const mainChordRootPitchClass = Constants.NOTE_NAMES_MAP[normalizedMainChordRoot];
                mainChordRootIsPresentInVoicing = mainChordVoicedWithBass.some(noteMidi => (noteMidi % 12) === mainChordRootPitchClass);
                if (DEBUG_VOICING) console.log(`[VOICE_RANGE] Main chord root (${normalizedMainChordRoot} - PC: ${mainChordRootPitchClass}) present in slash voicing: ${mainChordRootIsPresentInVoicing}`);
            } else if (initialMainChordFrequencies.length > 0 && !normalizedMainChordRoot) {
                const inferredRootPitchClass = frequencyToMidi(initialMainChordFrequencies.sort((a,b) => a-b)[0]) % 12;
                mainChordRootIsPresentInVoicing = mainChordVoicedWithBass.some(noteMidi => (noteMidi % 12) === inferredRootPitchClass);
                if (DEBUG_VOICING) console.log(`[VOICE_RANGE] Main chord root (inferred PC: ${inferredRootPitchClass}) present in slash voicing: ${mainChordRootIsPresentInVoicing}`);
            } else {
                 if (DEBUG_VOICING) console.log(`[VOICE_RANGE] Could not determine main chord root for presence check.`);
                 mainChordRootIsPresentInVoicing = true; 
            }


            if (mainChordVoicedWithBass.length >= minMainChordNotesForSlashSuccess && mainChordRootIsPresentInVoicing) {
                if (DEBUG_VOICING) console.log(`[VOICE_RANGE] Slash chord voicing SUCCESSFUL (notes: ${mainChordVoicedWithBass.length} >= ${minMainChordNotesForSlashSuccess} AND main root present: ${mainChordRootIsPresentInVoicing}).`);
                playedMidiNotes.push(bassMidiToBePlayed);
                playedMidiNotes.push(...mainChordVoicedWithBass);
                playedAsSlash = true; 
            } else {
                if (DEBUG_VOICING) console.warn(`[VOICE_RANGE] Slash chord voicing FAILED (notes: ${mainChordVoicedWithBass.length} vs ${minMainChordNotesForSlashSuccess}, root present: ${mainChordRootIsPresentInVoicing}). Reverting to normal voicing for main chord in original range [${userMinMidi}-${userMaxMidi}].`);
                const mainChordVoicedNormally = voiceChordCore(
                    initialMainChordFrequencies,
                    normalizedMainChordRoot,
                    userMinMidi,
                    userMaxMidi
                );
                if (DEBUG_VOICING) console.log('[VOICE_RANGE] Reverted normal voicing result:', mainChordVoicedNormally.map(n => `${n}(${midiToNoteNameWithOctave(n)})`).join(', '));
                playedMidiNotes.push(...mainChordVoicedNormally);
            }
        } else {
            if (DEBUG_VOICING) console.warn(`[VOICE_RANGE] Slash bass note '${normalizedBassNoteFromSlash}' NOT FOUND in range [${userMinMidi}-${userMaxMidi}]. Voicing main chord normally.`);
            const mainChordVoicedNormally = voiceChordCore(
                initialMainChordFrequencies,
                normalizedMainChordRoot,
                userMinMidi,
                userMaxMidi
            );
            if (DEBUG_VOICING) console.log('[VOICE_RANGE] Normal voicing result (due to no slash bass):', mainChordVoicedNormally.map(n => `${n}(${midiToNoteNameWithOctave(n)})`).join(', '));
            playedMidiNotes.push(...mainChordVoicedNormally);
        }
    } else {
        if (DEBUG_VOICING) console.log('[VOICE_RANGE] No slash bass specified. Voicing main chord normally.');
        const mainChordVoicedNormally = voiceChordCore(
            initialMainChordFrequencies,
            normalizedMainChordRoot,
            userMinMidi,
            userMaxMidi
        );
        if (DEBUG_VOICING) console.log('[VOICE_RANGE] Normal voicing result:', mainChordVoicedNormally.map(n => `${n}(${midiToNoteNameWithOctave(n)})`).join(', '));
        playedMidiNotes.push(...mainChordVoicedNormally);
    }

    const finalUniqueSortedMidi = [...new Set(playedMidiNotes)].sort((a, b) => a - b);
    if (DEBUG_VOICING) {
        console.log('[VOICE_RANGE] Final unique sorted MIDI notes:', finalUniqueSortedMidi.map(n => `${n}(${midiToNoteNameWithOctave(n)})`).join(', '));
        console.log('[VOICE_RANGE] Played as Slash:', playedAsSlash);
        console.log('--- [VOICE_RANGE_END] ---\n');
    }
    return { 
        frequencies: finalUniqueSortedMidi.map(midi => midiToFrequency(midi)),
        playedAsSlash: playedAsSlash && (normalizedBassNoteFromSlash != null) 
    };
}