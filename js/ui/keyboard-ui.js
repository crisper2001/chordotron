import * as DomElements from '../dom/dom-elements.js';
import * as MusicTheory from '../utils/music-theory.js';
import { ALL_NOTE_NAMES, SEMITONES_IN_OCTAVE, MIDI_B5 } from '../config/constants.js';

let keyElementsMap = {};
let currentlyActiveMidiNotes = [];
let currentRangeHighlighted = { min: null, max: null };

const DEFAULT_NUM_OCTAVES_DISPLAY = 4;
const DEFAULT_START_OCTAVE_DISPLAY = 2;

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
    const numWhiteKeys = numOctaves * 7;
    const whiteKeyWidth = 100 / numWhiteKeys;

    for (let i = 0; i < numOctaves * SEMITONES_IN_OCTAVE; i++) {
        const midiNote = startMidiNote + i;
        if (midiNote > MIDI_B5 + 1) break;

        const noteIndexInOctave = midiNote % SEMITONES_IN_OCTAVE;
        const noteName = ALL_NOTE_NAMES[noteIndexInOctave];
        const octave = Math.floor(midiNote / SEMITONES_IN_OCTAVE) - 1;

        const key = document.createElement('div');
        key.classList.add('piano-key');
        key.dataset.midiNote = midiNote;
        key.dataset.noteName = `${noteName}${octave}`;

        if (BLACK_KEY_INFO[noteIndexInOctave]) {
            key.classList.add('black-key');
            key.style.width = `${whiteKeyWidth * BLACK_KEY_INFO[noteIndexInOctave].widthFactor}%`;
            key.style.left = `${(whiteKeyIndex - 1) * whiteKeyWidth + (whiteKeyWidth * BLACK_KEY_INFO[noteIndexInOctave].offsetFactor)}%`;
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
        generateKeyboard(
            DomElements.pianoKeyboardContainer,
            DEFAULT_NUM_OCTAVES_DISPLAY,
            DEFAULT_START_OCTAVE_DISPLAY
        );
        clearKeyboardRangeHighlight();
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
    clearKeyboardRangeHighlight();

    if (minMidi === null || maxMidi === null || minMidi > maxMidi) {
        currentRangeHighlighted = { min: null, max: null };
        return;
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
        if (keyElementsMap[midiNoteStr]) {
            keyElementsMap[midiNoteStr].classList.remove('in-range');
        }
    }
}
