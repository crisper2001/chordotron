import * as DomElements from './dom-elements.js';
import * as MusicTheory from './music-theory.js';
import { ALL_NOTE_NAMES, SEMITONES_IN_OCTAVE } from './constants.js';

let keyElementsMap = {}; // Stores { midiNote: keyElement }
let currentlyActiveMidiNotes = [];

// --- Keyboard Configuration ---
const DEFAULT_NUM_OCTAVES = 3;
const DEFAULT_START_OCTAVE = 3; // C3

// Relative positions and sizes for black keys, helps with layout.
// These are % of the white key width for offsets.
const BLACK_KEY_INFO = {
    1: { name: 'C#', offsetFactor: 0.60, widthFactor: 0.7 },  // C# / Db
    3: { name: 'D#', offsetFactor: 0.60, widthFactor: 0.7 },  // D# / Eb
    6: { name: 'F#', offsetFactor: 0.65, widthFactor: 0.7 },  // F# / Gb
    8: { name: 'G#', offsetFactor: 0.60, widthFactor: 0.7 },  // G# / Ab
    10: { name: 'A#', offsetFactor: 0.60, widthFactor: 0.7 } // A# / Bb
};


function generateKeyboard(container, numOctaves, startOctaveNum) {
    container.innerHTML = ''; // Clear previous keyboard
    keyElementsMap = {};
    currentlyActiveMidiNotes = [];

    const startMidiNote = MusicTheory.noteNameToMidi(`C${startOctaveNum}`);
    if (startMidiNote === null) {
        console.error("Invalid start octave for keyboard generation:", startOctaveNum);
        return;
    }

    let whiteKeyIndex = 0;
    const whiteKeyWidth = 100 / (numOctaves * 7); // Percentage width for each white key

    for (let i = 0; i < numOctaves * SEMITONES_IN_OCTAVE; i++) {
        const midiNote = startMidiNote + i;
        const noteIndexInOctave = midiNote % SEMITONES_IN_OCTAVE;
        const noteName = ALL_NOTE_NAMES[noteIndexInOctave];
        const octave = Math.floor(midiNote / SEMITONES_IN_OCTAVE) -1; // Correct octave display for C0=MIDI 12 convention
        
        const key = document.createElement('div');
        key.classList.add('piano-key');
        key.dataset.midiNote = midiNote;
        key.dataset.noteName = `${noteName}${octave}`;
        // key.title = `${noteName}${octave} (MIDI: ${midiNote})`; // Optional: for tooltips

        if (BLACK_KEY_INFO[noteIndexInOctave]) { // It's a black key
            key.classList.add('black-key');
            key.style.width = `${whiteKeyWidth * BLACK_KEY_INFO[noteIndexInOctave].widthFactor}%`;
            key.style.left = `${(whiteKeyIndex -1) * whiteKeyWidth + (whiteKeyWidth * BLACK_KEY_INFO[noteIndexInOctave].offsetFactor)}%`;
            // No height style here, assuming CSS handles it. Black keys are shorter.
        } else { // It's a white key
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
    }
}

export function highlightChordOnKeyboard(midiNotesToHighlight) {
    // Clear previously active keys
    currentlyActiveMidiNotes.forEach(midiNote => {
        if (keyElementsMap[midiNote]) {
            keyElementsMap[midiNote].classList.remove('active');
        }
    });
    currentlyActiveMidiNotes = [];

    // Activate new keys
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