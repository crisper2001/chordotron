import * as DomElements from './dom-elements.js';
import * as AppState from './state.js';
import * as Constants from './constants.js'; // For default values
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
        UIHelpers.applySettingsToUI(Constants.defaultSettings); // Use imported defaultSettings
        updateKeyboardRangeFromSliders(); // Explicitly update after restoring
    }
});

DomElements.saveSettingsButton.addEventListener('click', SettingsManager.saveSettings);
DomElements.loadSettingsButton.addEventListener('click', () => DomElements.loadSettingsFile.click());
DomElements.loadSettingsFile.addEventListener('change', (event) => {
    SettingsManager.loadSettings(event);
    setTimeout(updateKeyboardRangeFromSliders, 50); // Ensure UIHelpers.applySettingsToUI has finished
});


function updateKeyboardRangeFromSliders() {
    const startMidi = parseInt(DomElements.rangeStartNoteSlider.value, 10);
    const length = parseInt(DomElements.rangeLengthSlider.value, 10);
    const endMidi = startMidi + length - 1;

    // Adjust max of start slider dynamically to prevent invalid combinations
    DomElements.rangeStartNoteSlider.max = Constants.MIDI_C8 - (length - 1);
    // If current startMidi is now too high, adjust it
    if (startMidi > parseInt(DomElements.rangeStartNoteSlider.max, 10)) {
        DomElements.rangeStartNoteSlider.value = DomElements.rangeStartNoteSlider.max;
        // Recalculate startMidi and endMidi if it was adjusted
        const adjustedStartMidi = parseInt(DomElements.rangeStartNoteSlider.value, 10);
        UIHelpers.updatePitchRangeDisplay(); // Update text display for sliders
        KeyboardUI.highlightRangeOnKeyboard(adjustedStartMidi, adjustedStartMidi + length - 1);
        return; // Exit after adjustment and update
    }


    UIHelpers.updatePitchRangeDisplay(); // Update text display for sliders
    KeyboardUI.highlightRangeOnKeyboard(startMidi, endMidi);
}

if (DomElements.rangeStartNoteSlider) {
    DomElements.rangeStartNoteSlider.addEventListener('input', updateKeyboardRangeFromSliders);
}
if (DomElements.rangeLengthSlider) {
    DomElements.rangeLengthSlider.addEventListener('input', updateKeyboardRangeFromSliders);
}


// --- DOMContentLoaded (Initial Setup) ---
document.addEventListener('DOMContentLoaded', () => {
    UIHelpers.applySettingsToUI(Constants.defaultSettings); // Use imported defaultSettings
    DomElements.prevChordDisplay.textContent = "Prev: --";
    DomElements.currentChordDisplay.textContent = "Playing: --";
    DomElements.nextChordDisplay.textContent = "Next: --";

    KeyboardUI.initKeyboard();
    updateKeyboardRangeFromSliders(); // Initial range highlight

    function initAudioContext() {
        if (AppState.audioCtx.state === 'suspended') {
            AppState.audioCtx.resume().catch(e => console.error("Error resuming AudioContext:", e));
        }
    }
    document.body.addEventListener('click', initAudioContext, { once: true });
    document.body.addEventListener('touchend', initAudioContext, { once: true });
});