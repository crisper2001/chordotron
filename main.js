import * as DomElements from './dom-elements.js';
import * as AppState from './state.js';
import { defaultSettings } from './constants.js';
import * as UIHelpers from './ui-helpers.js';
import * as SettingsManager from './settings-manager.js';
import { startPlayback, stopPlayback } from './playback-scheduler.js';
import * as KeyboardUI from './keyboard-ui.js';
import * as MusicTheory from './music-theory.js'; // <<< ADDED for noteNameToMidi

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
        UIHelpers.applySettingsToUI(defaultSettings);
        // After applying defaults, update keyboard range display
        updateKeyboardRangeFromInputs();
    }
});

DomElements.saveSettingsButton.addEventListener('click', SettingsManager.saveSettings);
DomElements.loadSettingsButton.addEventListener('click', () => DomElements.loadSettingsFile.click());
DomElements.loadSettingsFile.addEventListener('change', (event) => {
    SettingsManager.loadSettings(event);
    // After loading settings, update keyboard range display (settingsManager calls applySettingsToUI which should also trigger it)
    // setTimeout is a bit of a hack to ensure applySettingsToUI has finished updating DOM values
    setTimeout(updateKeyboardRangeFromInputs, 50);
});


// --- Function to update keyboard range based on input fields ---
function updateKeyboardRangeFromInputs() {
    const minNoteStr = DomElements.minNoteVoicingInput.value;
    const maxNoteStr = DomElements.maxNoteVoicingInput.value;
    const minMidi = MusicTheory.noteNameToMidi(minNoteStr);
    const maxMidi = MusicTheory.noteNameToMidi(maxNoteStr);

    // Clear previous input error visuals before re-validating
    DomElements.minNoteVoicingInput.classList.remove('input-error');
    DomElements.maxNoteVoicingInput.classList.remove('input-error');

    let isValidRange = true;
    if (minMidi === null) {
        DomElements.minNoteVoicingInput.classList.add('input-error');
        isValidRange = false;
    }
    if (maxMidi === null) {
        DomElements.maxNoteVoicingInput.classList.add('input-error');
        isValidRange = false;
    }
    if (minMidi !== null && maxMidi !== null && minMidi >= maxMidi) {
        DomElements.minNoteVoicingInput.classList.add('input-error');
        DomElements.maxNoteVoicingInput.classList.add('input-error');
        isValidRange = false;
    }

    if (isValidRange) {
        KeyboardUI.highlightRangeOnKeyboard(minMidi, maxMidi);
    } else {
        KeyboardUI.clearKeyboardRangeHighlight();
    }
}

// Add event listeners to Min/Max Note inputs to update keyboard range dynamically
if (DomElements.minNoteVoicingInput) {
    DomElements.minNoteVoicingInput.addEventListener('change', updateKeyboardRangeFromInputs);
    DomElements.minNoteVoicingInput.addEventListener('input', updateKeyboardRangeFromInputs); // More immediate
}
if (DomElements.maxNoteVoicingInput) {
    DomElements.maxNoteVoicingInput.addEventListener('change', updateKeyboardRangeFromInputs);
    DomElements.maxNoteVoicingInput.addEventListener('input', updateKeyboardRangeFromInputs); // More immediate
}


// --- DOMContentLoaded (Initial Setup) ---
document.addEventListener('DOMContentLoaded', () => {
    UIHelpers.applySettingsToUI(defaultSettings);
    DomElements.prevChordDisplay.textContent = "Prev: --";
    DomElements.currentChordDisplay.textContent = "Playing: --";
    DomElements.nextChordDisplay.textContent = "Next: --";

    KeyboardUI.initKeyboard();
    updateKeyboardRangeFromInputs(); // Initial range highlight based on default settings

    function initAudioContext() {
        if (AppState.audioCtx.state === 'suspended') {
            AppState.audioCtx.resume().catch(e => console.error("Error resuming AudioContext:", e));
        }
    }
    document.body.addEventListener('click', initAudioContext, { once: true });
    document.body.addEventListener('touchend', initAudioContext, { once: true });
});