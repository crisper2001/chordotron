import * as DomElements from './dom-elements.js';
import * as AppState from './state.js';
import * as Constants from './constants.js';
import * as UIHelpers from './ui-helpers.js';
import * as SettingsManager from './settings-manager.js';
import { startPlayback, stopPlayback } from './playback-scheduler.js';
import * as KeyboardUI from './keyboard-ui.js';
import * as MusicTheory from './music-theory.js';
import * as ADSRVisualizer from './adsr-visualizer.js';

const HELP_MODAL_SHOWN_KEY = 'chordotronHelpShown';

function attachAutosaveListeners() {
    const elementsToAutosave = [
        DomElements.bpmSlider, DomElements.attackSlider, DomElements.decaySlider,
        DomElements.sustainSlider, DomElements.releaseSlider, DomElements.timeSignatureSelect,
        DomElements.oscillatorTypeEl, DomElements.metronomeVolumeSlider, DomElements.loopToggle,
        DomElements.metronomeAudioToggle, DomElements.chordInputEl, DomElements.scaleDegreeInputEl,
        DomElements.songKeySelect, DomElements.keyModeSelect, DomElements.rangeStartNoteSlider,
        DomElements.rangeLengthSlider, DomElements.masterGainSlider, DomElements.synthGainSlider
    ];

    elementsToAutosave.forEach(element => {
        if (element) {
            const eventType = (element.type === 'range' || element.tagName === 'TEXTAREA') ? 'input' : 'change';
            element.addEventListener(eventType, SettingsManager.autosaveCurrentSettings);
        }
    });

    DomElements.inputModeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            DomElements.chordNameInputArea.style.display = radio.value === 'chords' ? 'block' : 'none';
            DomElements.scaleDegreeInputArea.style.display = radio.value === 'degrees' ? 'block' : 'none';
            SettingsManager.autosaveCurrentSettings();
        });
    });
}


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
    switch (event.key.toLowerCase()) {
        case 'p':
            event.preventDefault();
            DomElements.playStopButton.click();
            break;
        case 'l':
            event.preventDefault();
            if (DomElements.loopToggle) {
                DomElements.loopToggle.checked = !DomElements.loopToggle.checked;
                DomElements.loopToggle.dispatchEvent(new Event('change')); // Trigger change for autosave
            }
            break;
        case 'm':
            event.preventDefault();
            if (DomElements.metronomeAudioToggle) {
                DomElements.metronomeAudioToggle.checked = !DomElements.metronomeAudioToggle.checked;
                DomElements.metronomeAudioToggle.dispatchEvent(new Event('change')); // Trigger change for autosave & audio logic
            }
            break;
    }
});

DomElements.restoreDefaultsButton.addEventListener('click', () => {
    if (confirm("Are you sure you want to start a new song and reset all settings to their defaults? This will also clear your autosaved project.")) {
        SettingsManager.clearAutosavedSettings();
        UIHelpers.applySettingsToUI(Constants.defaultSettings);
        updateKeyboardRangeFromSliders();
        updateADSRVisualizerFromSliders();
        SettingsManager.autosaveCurrentSettings();
    }
});

DomElements.saveSettingsButton.addEventListener('click', SettingsManager.saveSettingsToFile);
DomElements.loadSettingsButton.addEventListener('click', () => DomElements.loadSettingsFile.click());
DomElements.loadSettingsFile.addEventListener('change', (event) => {
    SettingsManager.loadSettingsFromFile(event);
    setTimeout(() => {
        updateKeyboardRangeFromSliders();
        updateADSRVisualizerFromSliders();
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

function updateADSRKnobValue(sliderElement, spanElement) {
    if (spanElement && sliderElement) {
        spanElement.textContent = parseFloat(sliderElement.value).toFixed(2);
    }
}

function updateADSRVisualizerFromSliders() {
    if (!DomElements.adsrCanvas) return;
    
    updateADSRKnobValue(DomElements.attackSlider, DomElements.attackValueSpan);
    updateADSRKnobValue(DomElements.decaySlider, DomElements.decayValueSpan);
    updateADSRKnobValue(DomElements.sustainSlider, DomElements.sustainValueSpan);
    updateADSRKnobValue(DomElements.releaseSlider, DomElements.releaseValueSpan);
    updateADSRKnobValue(DomElements.synthGainSlider, DomElements.synthGainValueSpan);

    const adsrSettings = {
        attack: parseFloat(DomElements.attackSlider.value),
        decay: parseFloat(DomElements.decaySlider.value),
        sustain: parseFloat(DomElements.sustainSlider.value),
        release: parseFloat(DomElements.releaseSlider.value)
    };
    const currentSynthGain = parseFloat(DomElements.synthGainSlider.value); 
    ADSRVisualizer.drawADSRGraph(adsrSettings, currentSynthGain); 
}

[
    DomElements.attackSlider, 
    DomElements.decaySlider, 
    DomElements.sustainSlider, 
    DomElements.releaseSlider,
    DomElements.synthGainSlider
].forEach(slider => {
    if (slider) {
        slider.addEventListener('input', updateADSRVisualizerFromSliders);
    }
});

DomElements.metronomeAudioToggle.addEventListener('change', (event) => {
    if (!AppState.sequencePlaying) return;

    if (!event.target.checked) {
        const now = AppState.audioCtx.currentTime;
        
        AppState.activeOscillators.forEach(activeSound => {
            if (activeSound.type === 'metronome') {
                try {
                    activeSound.gainNode.gain.cancelScheduledValues(now);
                    activeSound.gainNode.gain.linearRampToValueAtTime(0, now + 0.02);
                } catch (e) {
                    console.warn("Could not immediately silence metronome sound:", e);
                }
            }
        });
    }
});

function openHelpModal() {
    if (DomElements.helpModalOverlay) {
        DomElements.helpModalOverlay.style.display = 'flex';
    }
}

function closeHelpModal() {
    if (DomElements.helpModalOverlay) {
        DomElements.helpModalOverlay.style.display = 'none';
    }
}

function initHelpGuideModalLogic() {
    if (DomElements.helpButton) {
        DomElements.helpButton.addEventListener('click', openHelpModal);
    }
    if (DomElements.modalCloseButton) {
        DomElements.modalCloseButton.addEventListener('click', closeHelpModal);
    }
    if (DomElements.helpModalOverlay) {
        DomElements.helpModalOverlay.addEventListener('click', (event) => {
            if (event.target === DomElements.helpModalOverlay) {
                closeHelpModal();
            }
        });
    }

    try {
        const helpShown = localStorage.getItem(HELP_MODAL_SHOWN_KEY);
        if (!helpShown) {
            openHelpModal();
            localStorage.setItem(HELP_MODAL_SHOWN_KEY, 'true');
        }
    } catch (e) {
        console.warn("Could not access localStorage for help modal status.", e);
        openHelpModal();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const initialLength = parseInt(DomElements.rangeLengthSlider.value, 10);
    DomElements.rangeStartNoteSlider.max = Constants.MIDI_B5 - (initialLength - 1);

    const loadedFromAutosave = SettingsManager.loadAutosavedSettings();
    if (!loadedFromAutosave) {
        UIHelpers.applySettingsToUI(Constants.defaultSettings);
        SettingsManager.autosaveCurrentSettings();
    }
    
    const currentInputMode = document.querySelector('input[name="inputMode"]:checked').value;
    DomElements.chordNameInputArea.style.display = currentInputMode === 'chords' ? 'block' : 'none';
    DomElements.scaleDegreeInputArea.style.display = currentInputMode === 'degrees' ? 'block' : 'none';

    DomElements.prevChordDisplay.innerHTML = "⏮️ Prev: --";
    DomElements.currentChordDisplay.innerHTML = "🎶 Playing: --";
    DomElements.nextChordDisplay.innerHTML = "Next: ⏭️ --";

    KeyboardUI.initKeyboard();
    updateKeyboardRangeFromSliders();

    ADSRVisualizer.initADSRVisualizer(); 
    updateADSRVisualizerFromSliders(); 

    initHelpGuideModalLogic(); 
    attachAutosaveListeners();

    function initAudioContext() {
        if (AppState.audioCtx.state === 'suspended') {
            AppState.audioCtx.resume().catch(e => console.error("Error resuming AudioContext:", e));
        }
    }
    document.body.addEventListener('click', initAudioContext, { once: true });
    document.body.addEventListener('touchend', initAudioContext, { once: true });
});
