import * as DomElements from './dom-elements.js';
import * as AppState from './state.js';
import * as Constants from './constants.js';
import * as UIHelpers from './ui-helpers.js';
import * as SettingsManager from './settings-manager.js';
import { startPlayback, stopPlayback } from './playback-scheduler.js';
import * as KeyboardUI from './keyboard-ui.js';
import * as MusicTheory from './music-theory.js';

// --- Event Listeners ---
DomElements.inputModeRadios.forEach(radio => {
    radio.addEventListener('change', (event) => {
        DomElements.chordNameInputArea.style.display = event.target.value === 'chords' ? 'block' : 'none';
        DomElements.scaleDegreeInputArea.style.display = event.target.value === 'degrees' ? 'block' : 'none';
    });
});

DomElements.playStopButton.addEventListener('click', () => {
    if (AppState.sequencePlaying) {
        stopPlayback(true);
    } else {
        startPlayback();
    }
});

DomElements.timeSignatureSelect.addEventListener('input', () => {
    if (!AppState.sequencePlaying) {
        const beats = UIHelpers.getBeatsPerMeasure();
        UIHelpers.updateBeatIndicatorsVisibility(beats);
    }
});

document.addEventListener('keydown', (event) => {
    if (event.target.tagName === 'TEXTAREA' || event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
        return;
    }
    if (event.code === 'Space') {
        event.preventDefault();
        DomElements.playStopButton.click();
    }
});

DomElements.restoreDefaultsButton.addEventListener('click', () => {
    if (confirm("Are you sure you want to restore all settings to their defaults?")) {
        UIHelpers.applySettingsToUI(Constants.defaultSettings);
        updateKeyboardRangeFromSliders();
    }
});

DomElements.saveSettingsButton.addEventListener('click', SettingsManager.saveSettings);
DomElements.loadSettingsButton.addEventListener('click', () => DomElements.loadSettingsFile.click());
DomElements.loadSettingsFile.addEventListener('change', (event) => {
    SettingsManager.loadSettings(event);
    setTimeout(updateKeyboardRangeFromSliders, 50);
});

function updateKeyboardRangeFromSliders() {
    let startMidi = parseInt(DomElements.rangeStartNoteSlider.value, 10);
    const length = parseInt(DomElements.rangeLengthSlider.value, 10);
    
    // Hardcoded min/max for the start slider (C2 to C5-ish, ensuring range fits within B5)
    const sliderMin = Constants.MIDI_C2; // 36
    const sliderMax = Constants.MIDI_B5 - (length -1); // Max start so that range ends at B5 or lower
                                                       // e.g. B5 - (12-1) = 83 - 11 = 72 (C5)
                                                       // e.g. B5 - (24-1) = 83 - 23 = 60 (C4)
    
    // Dynamically set the max attribute of the start slider based on current length
    DomElements.rangeStartNoteSlider.max = sliderMax;

    // Clamp startMidi to the (potentially new) dynamic max of the slider
    if (startMidi > sliderMax) {
        startMidi = sliderMax;
        DomElements.rangeStartNoteSlider.value = startMidi;
    }
    // And ensure it doesn't go below its hardcoded min
    if (startMidi < sliderMin) {
        startMidi = sliderMin;
        DomElements.rangeStartNoteSlider.value = startMidi;
    }
    
    const endMidi = startMidi + length - 1;

    UIHelpers.updatePitchRangeDisplay();
    KeyboardUI.highlightRangeOnKeyboard(startMidi, endMidi);
}

if (DomElements.rangeStartNoteSlider) {
    DomElements.rangeStartNoteSlider.addEventListener('input', updateKeyboardRangeFromSliders);
}
if (DomElements.rangeLengthSlider) {
    DomElements.rangeLengthSlider.addEventListener('input', updateKeyboardRangeFromSliders);
}

document.addEventListener('DOMContentLoaded', () => {
    // Set initial max for rangeStartNoteSlider based on default length
    const initialLength = parseInt(DomElements.rangeLengthSlider.value, 10);
    DomElements.rangeStartNoteSlider.max = Constants.MIDI_B5 - (initialLength - 1);

    UIHelpers.applySettingsToUI(Constants.defaultSettings);
    DomElements.prevChordDisplay.textContent = "Prev: --";
    DomElements.currentChordDisplay.textContent = "Playing: --";
    DomElements.nextChordDisplay.textContent = "Next: --";

    KeyboardUI.initKeyboard(); // This will now generate C2-B5
    updateKeyboardRangeFromSliders(); // Highlight default range C2-B3

    function initAudioContext() {
        if (AppState.audioCtx.state === 'suspended') {
            AppState.audioCtx.resume().catch(e => console.error("Error resuming AudioContext:", e));
        }
    }
    document.body.addEventListener('click', initAudioContext, { once: true });
    document.body.addEventListener('touchend', initAudioContext, { once: true });
});