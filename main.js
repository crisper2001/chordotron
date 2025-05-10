import * as DomElements from './dom-elements.js';
import * as AppState from './state.js';
import { defaultSettings } from './constants.js';
import * as UIHelpers from './ui-helpers.js';
import * as SettingsManager from './settings-manager.js';
import { startPlayback, stopPlayback } from './playback-scheduler.js';
import * as KeyboardUI from './keyboard-ui.js';

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
    }
});

DomElements.saveSettingsButton.addEventListener('click', SettingsManager.saveSettings);
DomElements.loadSettingsButton.addEventListener('click', () => DomElements.loadSettingsFile.click());
DomElements.loadSettingsFile.addEventListener('change', SettingsManager.loadSettings);

// Event listener for enableNoteRangeVoicingToggle REMOVED as toggle is removed

// --- DOMContentLoaded (Initial Setup) ---
document.addEventListener('DOMContentLoaded', () => {
    UIHelpers.applySettingsToUI(defaultSettings);
    DomElements.prevChordDisplay.textContent = "Prev: --";
    DomElements.currentChordDisplay.textContent = "Playing: --";
    DomElements.nextChordDisplay.textContent = "Next: --";

    KeyboardUI.initKeyboard();

    function initAudioContext() {
        if (AppState.audioCtx.state === 'suspended') {
            AppState.audioCtx.resume().catch(e => console.error("Error resuming AudioContext:", e));
        }
    }
    document.body.addEventListener('click', initAudioContext, { once: true });
    document.body.addEventListener('touchend', initAudioContext, { once: true });
});