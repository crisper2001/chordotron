import * as DomElements from './dom-elements.js';
import * as AppState from './state.js';
import * as Constants from './constants.js';
import * as UIHelpers from './ui-helpers.js';
import * as SettingsManager from './settings-manager.js';
import { startPlayback, stopPlayback } from './playback-scheduler.js';
import * as KeyboardUI from './keyboard-ui.js';
import * as MusicTheory from './music-theory.js';
import * as ADSRVisualizer from './adsr-visualizer.js'; // <<< ADDED

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
        updateADSRVisualizerFromSliders(); // <<< ADDED
    }
});

DomElements.saveSettingsButton.addEventListener('click', SettingsManager.saveSettings);
DomElements.loadSettingsButton.addEventListener('click', () => DomElements.loadSettingsFile.click());
DomElements.loadSettingsFile.addEventListener('change', (event) => {
    SettingsManager.loadSettings(event);
    // applySettingsToUI will trigger ADSR update via sliderListeners,
    // but a direct call after a timeout ensures it if applySettingsToUI is refactored.
    setTimeout(() => {
        updateKeyboardRangeFromSliders();
        updateADSRVisualizerFromSliders(); // <<< ADDED
    }, 50);
});

function updateKeyboardRangeFromSliders() {
    let startMidi = parseInt(DomElements.rangeStartNoteSlider.value, 10);
    const length = parseInt(DomElements.rangeLengthSlider.value, 10);
    
    const sliderMin = Constants.MIDI_C2;
    const sliderMax = Constants.MIDI_B5 - (length -1);
    
    DomElements.rangeStartNoteSlider.max = sliderMax;

    if (startMidi > sliderMax) {
        startMidi = sliderMax;
        DomElements.rangeStartNoteSlider.value = startMidi;
    }
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

// --- ADSR Visualizer Update Function and Listeners ---
function updateADSRVisualizerFromSliders() {
    if (!DomElements.adsrCanvas) return; // Guard if canvas isn't ready/found
    const adsrSettings = {
        attack: parseFloat(DomElements.attackSlider.value),
        decay: parseFloat(DomElements.decaySlider.value),
        sustain: parseFloat(DomElements.sustainSlider.value),
        release: parseFloat(DomElements.releaseSlider.value)
    };
    ADSRVisualizer.drawADSRGraph(adsrSettings);
}

[DomElements.attackSlider, DomElements.decaySlider, DomElements.sustainSlider, DomElements.releaseSlider].forEach(slider => {
    if (slider) {
        slider.addEventListener('input', updateADSRVisualizerFromSliders);
    }
});


document.addEventListener('DOMContentLoaded', () => {
    const initialLength = parseInt(DomElements.rangeLengthSlider.value, 10);
    DomElements.rangeStartNoteSlider.max = Constants.MIDI_B5 - (initialLength - 1);

    UIHelpers.applySettingsToUI(Constants.defaultSettings);
    DomElements.prevChordDisplay.textContent = "Prev: --";
    DomElements.currentChordDisplay.textContent = "Playing: --";
    DomElements.nextChordDisplay.textContent = "Next: --";

    KeyboardUI.initKeyboard();
    updateKeyboardRangeFromSliders();

    ADSRVisualizer.initADSRVisualizer(); // <<< ADDED: Initialize ADSR visualizer
    updateADSRVisualizerFromSliders(); // <<< ADDED: Initial draw based on default slider values

    function initAudioContext() {
        if (AppState.audioCtx.state === 'suspended') {
            AppState.audioCtx.resume().catch(e => console.error("Error resuming AudioContext:", e));
        }
    }
    document.body.addEventListener('click', initAudioContext, { once: true });
    document.body.addEventListener('touchend', initAudioContext, { once: true });
});