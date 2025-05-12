import * as DomElements from './dom/dom-elements.js';
import * as AppState from './config/state.js';
import * as Constants from './config/constants.js';
import * as UIHelpers from './ui/ui-helpers.js';
import * as SettingsManager from './utils/settings-manager.js';
import { startPlayback, stopPlayback } from './audio/playback-scheduler.js';
import * as KeyboardUI from './ui/keyboard-ui.js';
import * as MusicTheory from './utils/music-theory.js';
import * as ADSRVisualizer from './ui/adsr-visualizer.js';
import * as AudioCore from './audio/audio-core.js';
import { initHelpGuideModalLogic } from './ui/modal-handler.js';

const REFERENCE_OCTAVE_FOR_LIVE_PLAYING = 2;

function attachAutosaveListeners() {
    const elementsToAutosave = [
        DomElements.bpmSlider, DomElements.attackSlider, DomElements.decaySlider,
        DomElements.sustainSlider, DomElements.releaseSlider, DomElements.timeSignatureSelect,
        DomElements.oscillatorTypeEl, DomElements.metronomeVolumeSlider, DomElements.loopToggle,
        DomElements.metronomeAudioToggle, DomElements.chordInputEl, DomElements.scaleDegreeInputEl,
        DomElements.songKeySelect, DomElements.keyModeSelect, DomElements.rangeStartNoteSlider,
        DomElements.rangeLengthSlider, DomElements.masterGainSlider, DomElements.synthGainSlider,
        ...DomElements.triggerChordInputs
    ];

    elementsToAutosave.forEach(element => {
        if (element) {
            const eventType = (element.type === 'range' || element.tagName === 'TEXTAREA' || element.classList.contains('trigger-chord-input')) ? 'input' : 'change';
            element.addEventListener(eventType, SettingsManager.autosaveCurrentSettings);
        }
    });

    DomElements.inputModeRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            UIHelpers.updateUIModeVisuals(event.target.value);
            SettingsManager.autosaveCurrentSettings();
        });
    });
}

DomElements.playStopButton.addEventListener('click', () => {
    const currentInputMode = document.querySelector('input[name="inputMode"]:checked').value;
    if (currentInputMode === 'livePlaying') return;

    if (AppState.sequencePlaying) {
        stopPlayback(true);
    } else {
        startPlayback();
    }
});

DomElements.timeSignatureSelect.addEventListener('input', () => {
    const currentInputMode = document.querySelector('input[name="inputMode"]:checked').value;
    if (currentInputMode === 'livePlaying') return;
    if (!AppState.sequencePlaying) {
        const beats = UIHelpers.getBeatsPerMeasure();
        UIHelpers.updateBeatIndicatorsVisibility(beats);
    }
});

document.addEventListener('keydown', (event) => {
    if (event.target.tagName === 'TEXTAREA' || event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
        return;
    }
    const currentInputMode = document.querySelector('input[name="inputMode"]:checked').value;

    if (currentInputMode === 'livePlaying') {
        if (Constants.KEY_TO_LIVE_PLAYING_INDEX_MAP.hasOwnProperty(event.key)) {
            event.preventDefault();
            if (!AppState.activeLiveKeys.has(event.key)) {

                AppState.activeLiveKeys.forEach(existingKey => {
                    AudioCore.stopLiveFrequencies(existingKey);
                });
                AppState.activeLiveKeys.clear();

                AppState.activeLiveKeys.add(event.key);
                UIHelpers.updateLivePlayingControlsDisabled(true);
                const triggerIndex = Constants.KEY_TO_LIVE_PLAYING_INDEX_MAP[event.key];
                const chordString = DomElements.triggerChordInputs[triggerIndex].value;
                if (chordString && chordString.trim() !== "") {
                    playLiveChord(chordString, event.key);
                }
            }
        }
        return;
    }

    switch (event.key.toLowerCase()) {
        case ' ':
            event.preventDefault();
            DomElements.playStopButton.click();
            break;
        case 'l':
            event.preventDefault();
            if (DomElements.loopToggle) {
                DomElements.loopToggle.checked = !DomElements.loopToggle.checked;
                DomElements.loopToggle.dispatchEvent(new Event('change'));
            }
            break;
        case 'm':
            event.preventDefault();
            if (DomElements.metronomeAudioToggle) {
                DomElements.metronomeAudioToggle.checked = !DomElements.metronomeAudioToggle.checked;
                DomElements.metronomeAudioToggle.dispatchEvent(new Event('change'));
            }
            break;
        case 'n':
            event.preventDefault();
            if (DomElements.restoreDefaultsButton) {
                DomElements.restoreDefaultsButton.click();
            }
            break;
        case 'o':
            event.preventDefault();
            if (DomElements.loadSettingsButton) {
                DomElements.loadSettingsButton.click();
            }
            break;
        case 'r':
            event.preventDefault();
            if (DomElements.recordButton) {
                DomElements.recordButton.click();
            }
            break;
        case 's':
            event.preventDefault();
            if (DomElements.saveSettingsButton) {
                DomElements.saveSettingsButton.click();
            }
            break;
    }
});

document.addEventListener('keyup', (event) => {
    const currentInputMode = document.querySelector('input[name="inputMode"]:checked').value;
    if (currentInputMode === 'livePlaying') {
        if (Constants.KEY_TO_LIVE_PLAYING_INDEX_MAP.hasOwnProperty(event.key)) {
            event.preventDefault();
            if (AppState.activeLiveKeys.has(event.key)) {
                AudioCore.stopLiveFrequencies(event.key);
                AppState.activeLiveKeys.delete(event.key);
                if (AppState.activeLiveKeys.size === 0) {
                    KeyboardUI.clearKeyboardHighlights();
                    UIHelpers.updateChordContextDisplay(null, null);
                    UIHelpers.updateLivePlayingControlsDisabled(false);
                    UIHelpers.updateRecordButtonUI(AppState.isRecording);
                }
            }
        }
    }
});

function playLiveChord(chordString, keyIdentifier) {
    if (AppState.audioCtx.state === 'suspended') {
        AppState.audioCtx.resume().catch(e => { });
    }

    let mainChordPart = chordString;
    let bassNoteString = null;
    const slashMatch = chordString.match(/^(.*)\/([A-Ga-g][#b]?)$/);

    if (slashMatch && slashMatch[1] && slashMatch[2]) {
        mainChordPart = slashMatch[1];
        bassNoteString = slashMatch[2];
    }

    const { frequencies: initialFrequencies, rootNoteName } = MusicTheory.parseChordNameToFrequencies(mainChordPart, REFERENCE_OCTAVE_FOR_LIVE_PLAYING);

    const minMidiTarget = parseInt(DomElements.rangeStartNoteSlider.value, 10);
    const rangeLength = parseInt(DomElements.rangeLengthSlider.value, 10);
    const maxMidiTarget = minMidiTarget + rangeLength - 1;

    const voicingResult = MusicTheory.voiceFrequenciesInRange(
        initialFrequencies,
        rootNoteName,
        minMidiTarget,
        maxMidiTarget,
        bassNoteString
    );

    if (voicingResult.frequencies && voicingResult.frequencies.length > 0) {
        const currentSynthGain = parseFloat(DomElements.synthGainSlider.value);
        const currentADSR = {
            attack: Math.max(0.01, parseFloat(DomElements.attackSlider.value)),
            decay: Math.max(0.01, parseFloat(DomElements.decaySlider.value)),
            sustain: parseFloat(DomElements.sustainSlider.value),
            release: Math.max(0.01, parseFloat(DomElements.releaseSlider.value))
        };
        const currentOscillatorType = DomElements.oscillatorTypeEl.value;

        AudioCore.startLiveFrequencies(
            voicingResult.frequencies,
            AppState.audioCtx.currentTime,
            currentADSR,
            currentOscillatorType,
            currentSynthGain,
            keyIdentifier
        );

        UIHelpers.updateChordContextDisplay(null, [{ name: chordString }]);
        const midiNotesToHighlight = voicingResult.frequencies.map(freq => MusicTheory.frequencyToMidi(freq));
        KeyboardUI.highlightChordOnKeyboard(midiNotesToHighlight);

    } else {
        UIHelpers.updateChordContextDisplay(null, [{ name: chordString + " (err)" }]);
        KeyboardUI.clearKeyboardHighlights();
    }
}

DomElements.restoreDefaultsButton.addEventListener('click', () => {
    if (confirm("Are you sure you want to start a new song and reset all settings to their defaults? This will also clear your autosaved project.")) {
        if (AppState.isRecording) stopAudioRecording();
        SettingsManager.clearAutosavedSettings();
        UIHelpers.applySettingsToUI(Constants.defaultSettings);
        updateKeyboardRangeFromSliders();
        updateADSRVisualizerFromSliders();
        UIHelpers.updateUIModeVisuals(Constants.defaultSettings.inputMode);
        SettingsManager.autosaveCurrentSettings();
    }
});

DomElements.saveSettingsButton.addEventListener('click', SettingsManager.saveSettingsToFile);
DomElements.loadSettingsButton.addEventListener('click', () => DomElements.loadSettingsFile.click());
DomElements.loadSettingsFile.addEventListener('change', (event) => {
    if (AppState.isRecording) stopAudioRecording();
    SettingsManager.loadSettingsFromFile(event);
    setTimeout(() => {
        updateKeyboardRangeFromSliders();
        updateADSRVisualizerFromSliders();
        const currentMode = document.querySelector('input[name="inputMode"]:checked').value;
        UIHelpers.updateUIModeVisuals(currentMode);
    }, 50);
});

function updateKeyboardRangeFromSliders() {
    let startMidi = parseInt(DomElements.rangeStartNoteSlider.value, 10);
    const length = parseInt(DomElements.rangeLengthSlider.value, 10);

    const sliderMin = Constants.MIDI_C2;
    const sliderMax = Constants.MIDI_B5 - (length - 1);

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

DomElements.masterGainSlider.addEventListener('input', (event) => {
    if (AppState.masterGainNode) {
        AppState.masterGainNode.gain.setValueAtTime(parseFloat(event.target.value), AppState.audioCtx.currentTime);
    }
    if (DomElements.masterGainValueSpan) DomElements.masterGainValueSpan.textContent = parseFloat(event.target.value).toFixed(2);
});


DomElements.metronomeAudioToggle.addEventListener('change', (event) => {
    const currentInputMode = document.querySelector('input[name="inputMode"]:checked').value;
    if (currentInputMode === 'livePlaying') return;
    if (!AppState.sequencePlaying) return;

    if (!event.target.checked) {
        const now = AppState.audioCtx.currentTime;

        AppState.activeOscillators.forEach(activeSound => {
            if (activeSound.type === 'metronome') {
                try {
                    activeSound.gainNode.gain.cancelScheduledValues(now);
                    activeSound.gainNode.gain.linearRampToValueAtTime(0, now + 0.02);
                } catch (e) {
                }
            }
        });
    }
});

function startAudioRecording() {
    if (!AppState.audioRecordStreamDestination) {
        console.error("Audio record stream destination not initialized.");
        alert("Recording setup error. Cannot start recording.");
        return;
    }
    if (AppState.audioCtx.state === 'suspended') {
        AppState.audioCtx.resume().catch(e => { });
    }

    AppState.setRecordedAudioChunks([]);
    try {
        const options = { mimeType: 'audio/webm;codecs=opus' };
        let mediaRecorderInstance;
        if (MediaRecorder.isTypeSupported(options.mimeType)) {
            mediaRecorderInstance = new MediaRecorder(AppState.audioRecordStreamDestination.stream, options);
        } else {
            mediaRecorderInstance = new MediaRecorder(AppState.audioRecordStreamDestination.stream);
        }
        AppState.setMediaRecorder(mediaRecorderInstance);
    } catch (e) {
        console.error("Error creating MediaRecorder:", e);
        alert("Could not create MediaRecorder. Your browser might not support it or the MIME type.");
        return;
    }

    AppState.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            AppState.recordedAudioChunks.push(event.data);
        }
    };
    AppState.mediaRecorder.onstop = () => {
        UIHelpers.updateRecordButtonUI(false);
        if (AppState.recordedAudioChunks.length > 0) {
            // Handled by updateRecordButtonUI
        }
    };
    AppState.mediaRecorder.start();
    AppState.setIsRecording(true);
    UIHelpers.updateRecordButtonUI(true);
}

function stopAudioRecording() {
    if (AppState.mediaRecorder && AppState.mediaRecorder.state !== "inactive") {
        AppState.mediaRecorder.stop();
    }
    AppState.setIsRecording(false);
}

DomElements.recordButton.addEventListener('click', () => {
    if (AppState.isRecording) {
        stopAudioRecording();
    } else {
        startAudioRecording();
    }
});

DomElements.downloadRecordingButton.addEventListener('click', () => {
    if (AppState.recordedAudioChunks.length === 0) {
        alert("No audio recorded or recording is empty.");
        return;
    }
    const mimeType = (AppState.mediaRecorder && AppState.mediaRecorder.mimeType) ? AppState.mediaRecorder.mimeType : 'audio/webm';
    const fileExtension = mimeType.includes('wav') ? '.wav' : '.webm';

    const blob = new Blob(AppState.recordedAudioChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    a.download = `chordotron-recording-${timestamp}${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    UIHelpers.updateRecordButtonUI(AppState.isRecording);
});


document.addEventListener('DOMContentLoaded', () => {
    AppState.masterGainNode.connect(AppState.audioCtx.destination);
    if (AppState.audioCtx.createMediaStreamDestination) {
        AppState.setAudioRecordStreamDestination(AppState.audioCtx.createMediaStreamDestination());
        if (AppState.audioRecordStreamDestination) {
            AppState.masterGainNode.connect(AppState.audioRecordStreamDestination);
        }
    } else {
        console.warn("MediaStreamDestinationNode not supported. Recording will not be available.");
        DomElements.recordButton.disabled = true;
        DomElements.recordButton.title = "Recording not supported by your browser.";
    }


    const initialLength = parseInt(DomElements.rangeLengthSlider.value, 10);
    DomElements.rangeStartNoteSlider.max = Constants.MIDI_B5 - (initialLength - 1);

    const loadedFromAutosave = SettingsManager.loadAutosavedSettings();
    if (!loadedFromAutosave) {
        UIHelpers.applySettingsToUI(Constants.defaultSettings);
    } else {
        UIHelpers.applySettingsToUI(SettingsManager.collectCurrentSettings());
    }

    const currentInputMode = document.querySelector('input[name="inputMode"]:checked').value;
    UIHelpers.updateUIModeVisuals(currentInputMode);

    if (!loadedFromAutosave) {
        SettingsManager.autosaveCurrentSettings();
    }

    KeyboardUI.initKeyboard();
    updateKeyboardRangeFromSliders();

    ADSRVisualizer.initADSRVisualizer();
    updateADSRVisualizerFromSliders();

    initHelpGuideModalLogic();
    attachAutosaveListeners();
    UIHelpers.setupSliderListeners();


    if (DomElements.masterGainSlider && AppState.masterGainNode) {
        AppState.masterGainNode.gain.value = parseFloat(DomElements.masterGainSlider.value);
    }


    function initAudioContext() {
        if (AppState.audioCtx.state === 'suspended') {
            AppState.audioCtx.resume().catch(e => { });
        }
    }
    document.body.addEventListener('click', initAudioContext, { once: true });
    document.body.addEventListener('touchend', initAudioContext, { once: true });
});
