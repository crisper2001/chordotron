import * as DomElements from './dom-elements.js';
import * as MusicTheory from './music-theory.js';
import { ALL_NOTE_NAMES, SEMITONES_IN_OCTAVE } from './constants.js';

let keyElementsMap = {}; 
let currentlyActiveMidiNotes = [];
let currentRangeHighlighted = { min: null, max: null };

const DEFAULT_NUM_OCTAVES = 3;
const DEFAULT_START_OCTAVE = 3; 

const BLACK_KEY_INFO = {
    1: { name: 'C#', offsetFactor: 0.60, widthFactor: 0.7 },
    3: { name: 'D#', offsetFactor: 0.60, widthFactor: 0.7 },
    6: { name: 'F#', offsetFactor: 0.65, widthFactor: 0.7 },
    8: { name: 'G#', offsetFactor: 0.60, widthFactor: 0.7 },
    10: { name: 'A#', offsetFactor: 0.60, widthFactor: 0.7 }
};

function generateKeyboard(container, numOctaves, startOctaveNum) {
    container.innerHTML = '';
    keyElementsMap = {};
    currentlyActiveMidiNotes = [];
    currentRangeHighlighted = { min: null, max: null };


    const startMidiNote = MusicTheory.noteNameToMidi(`C${startOctaveNum}`);
    if (startMidiNote === null) {
        console.error("Invalid start octave for keyboard generation:", startOctaveNum);
        return;
    }

    let whiteKeyIndex = 0;
    const whiteKeyWidth = 100 / (numOctaves * 7); 

    for (let i = 0; i < numOctaves * SEMITONES_IN_OCTAVE; i++) {
        const midiNote = startMidiNote + i;
        const noteIndexInOctave = midiNote % SEMITONES_IN_OCTAVE;
        const noteName = ALL_NOTE_NAMES[noteIndexInOctave];
        const octave = Math.floor(midiNote / SEMITONES_IN_OCTAVE) -1; 
        
        const key = document.createElement('div');
        key.classList.add('piano-key');
        key.dataset.midiNote = midiNote;
        key.dataset.noteName = `${noteName}${octave}`;

        if (BLACK_KEY_INFO[noteIndexInOctave]) { 
            key.classList.add('black-key');
            key.style.width = `${whiteKeyWidth * BLACK_KEY_INFO[noteIndexInOctave].widthFactor}%`;
            key.style.left = `${(whiteKeyIndex -1) * whiteKeyWidth + (whiteKeyWidth * BLACK_KEY_INFO[noteIndexInOctave].offsetFactor)}%`;
        } else { 
            key.classList.add('white-key');
            key.style.width = `${whiteKeyWidth}%`;
            key.style.left = `${whiteKeyIndex * whiteKeyWidth}%`;
            whiteKeyIndex++;
        }
        container.appendChild(key);
        keyElementsMap[midiNote] = key;
    }
}

export function initKeyboard() {
    if (DomElements.pianoKeyboardContainer) {
        generateKeyboard(DomElements.pianoKeyboardContainer, DEFAULT_NUM_OCTAVES, DEFAULT_START_OCTAVE);
        clearKeyboardRangeHighlight(); // Ensure no range highlight initially
    }
}

export function highlightChordOnKeyboard(midiNotesToHighlight) {
    currentlyActiveMidiNotes.forEach(midiNote => {
        if (keyElementsMap[midiNote]) {
            keyElementsMap[midiNote].classList.remove('active');
        }
    });
    currentlyActiveMidiNotes = [];

    if (midiNotesToHighlight && midiNotesToHighlight.length > 0) {
        midiNotesToHighlight.forEach(midiNote => {
            if (keyElementsMap[midiNote]) {
                keyElementsMap[midiNote].classList.add('active');
                currentlyActiveMidiNotes.push(midiNote);
            }
        });
    }
}

export function clearKeyboardHighlights() {
    currentlyActiveMidiNotes.forEach(midiNote => {
        if (keyElementsMap[midiNote]) {
            keyElementsMap[midiNote].classList.remove('active');
        }
    });
    currentlyActiveMidiNotes = [];
}

export function highlightRangeOnKeyboard(minMidi, maxMidi) {
    clearKeyboardRangeHighlight(); // Clear previous range highlight first

    if (minMidi === null || maxMidi === null || minMidi > maxMidi) {
        currentRangeHighlighted = { min: null, max: null };
        return; // Invalid or no range to highlight
    }
    
    currentRangeHighlighted = { min: minMidi, max: maxMidi };

    for (const midiNoteStr in keyElementsMap) {
        const midiNote = parseInt(midiNoteStr, 10);
        const keyElement = keyElementsMap[midiNote];
        if (midiNote >= minMidi && midiNote <= maxMidi) {
            keyElement.classList.add('in-range');
        }
    }
}

export function clearKeyboardRangeHighlight() {
    currentRangeHighlighted = { min: null, max: null };
    for (const midiNoteStr in keyElementsMap) {
        keyElementsMap[midiNoteStr].classList.remove('in-range');
    }
}