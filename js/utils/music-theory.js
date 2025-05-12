import * as Constants from '../config/constants.js';

const DEBUG_VOICING = false;

function normalizeNoteName(noteName) {
    if (!noteName || typeof noteName !== 'string' || noteName.length === 0) {
        return null;
    }
    let root = noteName.charAt(0).toUpperCase();
    let accidental = '';
    if (noteName.length > 1) {
        const accCandidate = noteName.substring(1);
        if (accCandidate === '##' || accCandidate === 'bb') {
            accidental = accCandidate;
        } else if (accCandidate === '#' || accCandidate === 'b') {
            accidental = accCandidate;
        } else if (accCandidate.length === 1 && (accCandidate.toLowerCase() === '#' || accCandidate.toLowerCase() === 'b') ) {
            accidental = accCandidate.toLowerCase() === '#' ? '#' : 'b';
        }
    }

    let normalized = root + accidental;

    if (Constants.NOTE_NAMES_MAP[normalized] !== undefined) return normalized;

    let finalRoot = noteName.charAt(0).toUpperCase();
    let finalAcc = "";
    if (noteName.length > 1) {
        let tempAcc = noteName.substring(1);
        const lowerTempAcc = tempAcc.toLowerCase();
        if (tempAcc === '#' || tempAcc === 'b' || tempAcc === '##' || tempAcc === 'bb') {
            finalAcc = tempAcc;
        } else if (lowerTempAcc === '#' || lowerTempAcc === 'b' || lowerTempAcc === '##' || lowerTempAcc === 'bb') {
           finalAcc = tempAcc;
           if (Constants.NOTE_NAMES_MAP[finalRoot + finalAcc] === undefined) {
                if (Constants.NOTE_NAMES_MAP[finalRoot + tempAcc.toLowerCase()] !== undefined) {
                    finalAcc = tempAcc.toLowerCase();
                }
           }
        }
    }
    let checkName = finalRoot + finalAcc;
    if (Constants.NOTE_NAMES_MAP[checkName] !== undefined) return checkName;

    if (noteName.length === 2) {
        let simpleCheck = noteName.charAt(0).toUpperCase() + noteName.charAt(1).toLowerCase();
        if (Constants.NOTE_NAMES_MAP[simpleCheck] !== undefined) return simpleCheck;
        let sharpCheck = noteName.charAt(0).toUpperCase() + '#';
        if (noteName.charAt(1).toLowerCase() === 's' && Constants.NOTE_NAMES_MAP[sharpCheck] !== undefined) return sharpCheck;
    }

    if (noteName.length === 1 && root >= 'A' && root <= 'G') {
        if (Constants.NOTE_NAMES_MAP[root] !== undefined) return root;
    }

    return null;
}

function getNoteFrequencyAbsolute(noteName, octave) {
    const normalizedForLookup = normalizeNoteName(noteName);
    if (!normalizedForLookup || !(normalizedForLookup in Constants.NOTE_NAMES_MAP)) return 0;
    let semitonesFromA4 = Constants.NOTE_NAMES_MAP[normalizedForLookup] - Constants.NOTE_NAMES_MAP['A'];
    semitonesFromA4 += (octave - 4) * Constants.SEMITONES_IN_OCTAVE;
    return Constants.A4 * Math.pow(2, semitonesFromA4 / Constants.SEMITONES_IN_OCTAVE);
}

export function parseChordNameToFrequencies(chordName, referenceOctave) {
    let normalizedInputChordName = chordName.replace(/°/g, 'o').replace(/ø/g, 'h');
    const shorthandMatch = normalizedInputChordName.match(/^([A-Ga-g][#b]?)(h|o)$/i);
    if (shorthandMatch && !normalizedInputChordName.toLowerCase().endsWith('sus')) {
        const root = shorthandMatch[1]; const symbol = shorthandMatch[2].toLowerCase();
        if (symbol === 'h') normalizedInputChordName = root + 'h7';
        else if (symbol === 'o') normalizedInputChordName = root + 'o';
    }

    const match = normalizedInputChordName.match(/^([A-Ga-g][#b]?)(.*)$/);
    if (!match) return { frequencies: [], rootNoteName: null, bassNoteName: null };

    const rootNoteNameOnly = normalizeNoteName(match[1]);
    let quality = match[2];

    if (!rootNoteNameOnly || !(rootNoteNameOnly in Constants.NOTE_NAMES_MAP)) return { frequencies: [], rootNoteName: rootNoteNameOnly, bassNoteName: null };

    const rootFrequency = getNoteFrequencyAbsolute(rootNoteNameOnly, parseInt(referenceOctave));
    if (rootFrequency === 0) return { frequencies: [], rootNoteName: rootNoteNameOnly, bassNoteName: null };

    let intervals = Constants.CHORD_FORMULAS[quality] || Constants.CHORD_FORMULAS[quality.toLowerCase()];

    if (!intervals) {
        if (quality.toUpperCase() === 'M') intervals = Constants.CHORD_FORMULAS[''];
    }

    if (!intervals) {
        let modifiedQuality = quality;
        modifiedQuality = modifiedQuality.replace(/^maj/i, 'M').replace(/^min/i, 'm');
        intervals = Constants.CHORD_FORMULAS[modifiedQuality] || Constants.CHORD_FORMULAS[modifiedQuality.toLowerCase()];
    }

    if (!intervals) return { frequencies: [rootFrequency], rootNoteName: rootNoteNameOnly, bassNoteName: null };
    if (intervals.length === 0 && quality) return { frequencies: [rootFrequency], rootNoteName: rootNoteNameOnly, bassNoteName: null };

    const frequencies = intervals.map(interval => rootFrequency * Math.pow(2, interval / Constants.SEMITONES_IN_OCTAVE));
    return { frequencies, rootNoteName: rootNoteNameOnly, bassNoteName: null };
}

export function getNoteNameFromDegree(keyRootNoteName, keyMode, degreeNumber, accidental = 0) {
    const normalizedKeyRoot = normalizeNoteName(keyRootNoteName);
    if (!normalizedKeyRoot) return null;

    const rootNotePitchClass = Constants.NOTE_NAMES_MAP[normalizedKeyRoot];
     if (rootNotePitchClass === undefined) return null;

    const scaleIntervals = Constants.SCALE_INTERVAL_MAP[keyMode] || Constants.SCALE_INTERVAL_MAP['ionian'];
    if (!scaleIntervals || degreeNumber < 1 || degreeNumber > scaleIntervals.length) {
        return null;
    }
    const interval = scaleIntervals[degreeNumber - 1];
    let noteIndex = (rootNotePitchClass + interval + accidental) % Constants.SEMITONES_IN_OCTAVE;
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
            parsedChords.push({ name: '?', beats: defaultBeatsPerChord, originalInputToken: token, error: true, comment: `Could not determine root for ${degreeText}` });
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
    const chordRegex = /^([A-Ga-g][#b]?)([A-Za-z0-9#bø°+susmMdimaugincl^()]*?)(?:\/([A-Ga-g][#b]?))?(?:\((\d+)\))?$/i;

    for (const token of tokens) {
        if (!token) continue;
        const match = token.match(chordRegex);

        if (match) {
            const rootPart = match[1];
            const qualityPart = match[2] || "";
            const mainChordNamePart = rootPart + qualityPart;
            let parsedBassNote = match[3] ? normalizeNoteName(match[3]) : null;
            const beatsString = match[4];

            let beats = defaultBeatsPerChord;
            if (beatsString !== undefined) {
                beats = parseInt(beatsString, 10);
            }

            parsedChords.push({ name: mainChordNamePart, bassNoteName: parsedBassNote, beats: beats, originalInputToken: token });
        } else {
             parsedChords.push({ name: '?', beats: defaultBeatsPerChord, originalInputToken: token, error: true });
        }
    }
    return parsedChords;
}

export function noteNameToMidi(noteNameWithOctave) {
    const match = noteNameWithOctave.match(/^([A-Ga-g][#b]?)([0-8])$/i);
    if (!match) return null;

    let notePartForMap = normalizeNoteName(match[1]);
    const octavePart = parseInt(match[2], 10);

    if (!notePartForMap) {
        const upperNote = match[1].toUpperCase();
        if (upperNote === 'CB') return Constants.NOTE_NAMES_MAP['B'] + (octavePart - 1) * Constants.SEMITONES_IN_OCTAVE + 12;
        if (upperNote === 'E#') return Constants.NOTE_NAMES_MAP['F'] + octavePart * Constants.SEMITONES_IN_OCTAVE + 12;
        if (upperNote === 'B#') return Constants.NOTE_NAMES_MAP['C'] + (octavePart + 1) * Constants.SEMITONES_IN_OCTAVE + 12;
        return null;
    }

    if (!(notePartForMap in Constants.NOTE_NAMES_MAP)) {
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
        console.log(`  voiceChordCore: initialFreqs=${initialFrequencies}, root=${chordRootNoteName}, min=${minMidi}, max=${maxMidi}`);
    }

    if (!initialFrequencies || initialFrequencies.length === 0) {
        return [];
    }

    let minMidiConstrained = minMidi;
    let maxMidiConstrained = maxMidi;
    if (minMidi === null || maxMidi === null || minMidi > maxMidi) {
        minMidiConstrained = 24;
        maxMidiConstrained = 96;
    }

    const initialMidiNotesUnsorted = initialFrequencies.map(freq => frequencyToMidi(freq));
    const normalizedChordRootForCore = chordRootNoteName ? normalizeNoteName(chordRootNoteName) : null;

    if (!normalizedChordRootForCore || !(normalizedChordRootForCore in Constants.NOTE_NAMES_MAP)) {
        if (DEBUG_VOICING) console.log("  voiceChordCore: Root unknown/invalid, using simplified pitch class placement.");
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
        if (DEBUG_VOICING) console.log(`  voiceChordCore (simplified): Result MIDI [${uniqueResult}]`);
        return uniqueResult;
    }

    const initialMidiNotes = initialMidiNotesUnsorted.sort((a, b) => a - b);

    if (initialMidiNotes.length === 0 || initialMidiNotes.every(n => n === 0)) {
        return [];
    }

    const rootPitchClass = Constants.NOTE_NAMES_MAP[normalizedChordRootForCore];
    const initialRootMidiGuess = initialMidiNotes.find(note => (note % 12) === rootPitchClass) || initialMidiNotes[0];

    let anchoredRootMidi = minMidiConstrained - (minMidiConstrained % 12) + rootPitchClass;
    if (anchoredRootMidi < minMidiConstrained) anchoredRootMidi += Constants.SEMITONES_IN_OCTAVE;

    while (anchoredRootMidi > maxMidiConstrained && (anchoredRootMidi - Constants.SEMITONES_IN_OCTAVE >= minMidiConstrained)) {
        anchoredRootMidi -= Constants.SEMITONES_IN_OCTAVE;
    }

     if (anchoredRootMidi < minMidiConstrained || anchoredRootMidi > maxMidiConstrained) {
         if (DEBUG_VOICING) console.log(`  voiceChordCore: Anchored root ${anchoredRootMidi} initially outside range [${minMidiConstrained}-${maxMidiConstrained}]. Searching...`);
        let foundRootInRange = false;
        for (let oct = -1; oct < 9; oct++) {
            const testRoot = rootPitchClass + (oct * Constants.SEMITONES_IN_OCTAVE) + 12;
            if (testRoot >= minMidiConstrained && testRoot <= maxMidiConstrained) {
                anchoredRootMidi = testRoot;
                foundRootInRange = true;
                if (DEBUG_VOICING) console.log(`  voiceChordCore: Found root in range: ${anchoredRootMidi}`);
                break;
            }
        }
        if (!foundRootInRange) {
             if (DEBUG_VOICING) console.log(`  voiceChordCore: Could not find root pitch class ${rootPitchClass} in range [${minMidiConstrained}-${maxMidiConstrained}]. Voicing might fail.`);
             return [];
        }
    }
    if (DEBUG_VOICING) console.log(`  voiceChordCore: Anchored root MIDI: ${anchoredRootMidi}`);

    const tempVoicedNotes = [];
    for (const currentInitialMidi of initialMidiNotes) {
        if (currentInitialMidi === 0) continue;
        const intervalFromInitialRoot = currentInitialMidi - initialRootMidiGuess;
        let targetVoicedMidi = anchoredRootMidi + intervalFromInitialRoot;

        while (targetVoicedMidi > maxMidiConstrained && (targetVoicedMidi - Constants.SEMITONES_IN_OCTAVE >= minMidiConstrained)) {
            targetVoicedMidi -= Constants.SEMITONES_IN_OCTAVE;
        }
        while (targetVoicedMidi < minMidiConstrained && (targetVoicedMidi + Constants.SEMITONES_IN_OCTAVE <= maxMidiConstrained)) {
            targetVoicedMidi += Constants.SEMITONES_IN_OCTAVE;
        }

        if (targetVoicedMidi >= minMidiConstrained && targetVoicedMidi <= maxMidiConstrained) {
            tempVoicedNotes.push(targetVoicedMidi);
        } else {
             if (DEBUG_VOICING) console.log(`  voiceChordCore: Note with interval ${intervalFromInitialRoot} (${targetVoicedMidi}) fell outside range [${minMidiConstrained}-${maxMidiConstrained}]`);
        }
    }

    const uniqueSortedVoicedMidi = [...new Set(tempVoicedNotes)].sort((a, b) => a - b);
    if (DEBUG_VOICING) console.log(`  voiceChordCore: Result MIDI [${uniqueSortedVoicedMidi}]`);
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
    if (DEBUG_VOICING) {
        console.log(`--- voiceFrequenciesInRange START ---`);        console.log(`Inputs: initialFreqs=${initialMainChordFrequencies}, root=${mainChordRootName}, min=${userMinMidi}, max=${userMaxMidi}, bass=${bassNoteNameFromSlash}`);    }

    let playedMidiNotes = [];
    let playedAsSlash = false;
    let minMainChordNotesForSlashSuccess = 1;

    if (!initialMainChordFrequencies || initialMainChordFrequencies.length === 0) {
        if (bassNoteNameFromSlash) {
            const normalizedBass = normalizeNoteName(bassNoteNameFromSlash);
            if (normalizedBass) {
                if (DEBUG_VOICING) console.log(`No main chord freqs, attempting to find bass note: ${normalizedBass}`);
                const bassMidi = findLowestMidiInstanceInRange(normalizedBass, userMinMidi, userMaxMidi);
                if (bassMidi !== null) {
                    return { frequencies: [midiToFrequency(bassMidi)], playedAsSlash: true };
                }
            }
        }
        return { frequencies: [], playedAsSlash: false };
    }

    if (initialMainChordFrequencies.length >= 3) {
        minMainChordNotesForSlashSuccess = 2;
    } else if (initialMainChordFrequencies.length === 0) {
        minMainChordNotesForSlashSuccess = 0;
    }

    const normalizedMainChordRoot = mainChordRootName ? normalizeNoteName(mainChordRootName) : null;
    const normalizedBassNoteFromSlash = bassNoteNameFromSlash ? normalizeNoteName(bassNoteNameFromSlash) : null;

    if (normalizedBassNoteFromSlash) {
        if (DEBUG_VOICING) console.log(`Slash chord requested. Bass note: ${normalizedBassNoteFromSlash}`);
        const bassMidiToBePlayed = findLowestMidiInstanceInRange(normalizedBassNoteFromSlash, userMinMidi, userMaxMidi);
        if (DEBUG_VOICING) console.log(`Lowest MIDI for bass note ${normalizedBassNoteFromSlash} in range [${userMinMidi}-${userMaxMidi}]: ${bassMidiToBePlayed}`);

        if (bassMidiToBePlayed !== null) {
            let mainChordVoicedAboveBass = [];
            let attempt1Success = false;

            if (bassMidiToBePlayed < userMaxMidi) {
                 mainChordVoicedAboveBass = voiceChordCore(
                    initialMainChordFrequencies,
                    normalizedMainChordRoot,
                    bassMidiToBePlayed + 1,
                    userMaxMidi
                );

                let mainChordRootIsPresentInVoicing = false;
                if (normalizedMainChordRoot && Constants.NOTE_NAMES_MAP[normalizedMainChordRoot] !== undefined) {
                    const mainChordRootPitchClass = Constants.NOTE_NAMES_MAP[normalizedMainChordRoot];
                    mainChordRootIsPresentInVoicing = mainChordVoicedAboveBass.some(noteMidi => (noteMidi % 12) === mainChordRootPitchClass);
                } else if (initialMainChordFrequencies.length > 0 && !normalizedMainChordRoot) {
                    const inferredRootPitchClass = frequencyToMidi(initialMainChordFrequencies.sort((a,b) => a-b)[0]) % 12;
                    mainChordRootIsPresentInVoicing = mainChordVoicedAboveBass.some(noteMidi => (noteMidi % 12) === inferredRootPitchClass);
                } else {
                     mainChordRootIsPresentInVoicing = true;
                }

                if (mainChordVoicedAboveBass.length >= minMainChordNotesForSlashSuccess && mainChordRootIsPresentInVoicing) {
                    attempt1Success = true;
                    if (DEBUG_VOICING) console.log(`Slash success (Attempt 1): Voiced main chord above bass: [${mainChordVoicedAboveBass}]`);
                    playedMidiNotes.push(bassMidiToBePlayed);
                    playedMidiNotes.push(...mainChordVoicedAboveBass);
                    playedAsSlash = true;
                }
            } else {
                 if (DEBUG_VOICING) console.log(`Skipping Attempt 1: Bass note ${bassMidiToBePlayed} is at the top of the range ${userMaxMidi}. No room above.`);
            }

            if (!attempt1Success) {
                if (DEBUG_VOICING) console.log(`Slash fallback: Voicing main chord normally in range [${userMinMidi}-${userMaxMidi}] and combining with bass.`);
                const mainChordVoicedNormally = voiceChordCore(
                    initialMainChordFrequencies,
                    normalizedMainChordRoot,
                    userMinMidi,
                    userMaxMidi
                );
                if (DEBUG_VOICING) console.log(`Normal voicing result: [${mainChordVoicedNormally}]`);

                playedMidiNotes.push(bassMidiToBePlayed);
                if (mainChordVoicedNormally.length > 0) {
                    playedMidiNotes.push(...mainChordVoicedNormally);
                } else {
                    if (DEBUG_VOICING) console.log(`Normal voicing failed to produce notes.`);
                }
                playedAsSlash = true;
            }
        } else {
            if (DEBUG_VOICING) console.log(`Slash failed: Bass note ${normalizedBassNoteFromSlash} not found in range. Voicing main chord normally.`);
            const mainChordVoicedNormally = voiceChordCore(
                initialMainChordFrequencies,
                normalizedMainChordRoot,
                userMinMidi,
                userMaxMidi
            );
            if (DEBUG_VOICING) console.log(`Normal voicing result: [${mainChordVoicedNormally}]`);
            playedMidiNotes.push(...mainChordVoicedNormally);
            playedAsSlash = false;
        }
    } else {
        if (DEBUG_VOICING) console.log(`Not a slash chord. Voicing main chord normally in range [${userMinMidi}-${userMaxMidi}]`);
        const mainChordVoicedNormally = voiceChordCore(
            initialMainChordFrequencies,
            normalizedMainChordRoot,
            userMinMidi,
            userMaxMidi
        );
        if (DEBUG_VOICING) console.log(`Normal voicing result: [${mainChordVoicedNormally}]`);
        playedMidiNotes.push(...mainChordVoicedNormally);
        playedAsSlash = false;
    }

    const finalUniqueSortedMidi = [...new Set(playedMidiNotes)].sort((a, b) => a - b);
    if (DEBUG_VOICING) {
        console.log(`Final MIDI notes: [${finalUniqueSortedMidi}], Played as Slash: ${playedAsSlash && (normalizedBassNoteFromSlash != null)}`);
        console.log(`--- voiceFrequenciesInRange END ---`);
    }
    return {
        frequencies: finalUniqueSortedMidi.map(midi => midiToFrequency(midi)),
        playedAsSlash: playedAsSlash && (normalizedBassNoteFromSlash != null)
    };
}
