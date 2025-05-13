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
import * as MidiWriter from './utils/midi-writer.js';

const REFERENCE_OCTAVE_FOR_PARSING = 2; // Used for initial parsing before voicing
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
        if (Constants.KEY_TO_LIVE_PLAYING_INDEX_MAP.hasOwnProperty(event.key) && !event.repeat) { // Added !event.repeat
            event.preventDefault();

            // Stop any other currently playing live keys
            AppState.activeLiveKeys.forEach(existingKey => {
                if (existingKey !== event.key) {
                    AudioCore.stopLiveFrequencies(existingKey); // Natural release for previously held notes
                }
            });
            AppState.activeLiveKeys.clear(); // Clear all keys from the set

            // Now, add the new key and play it
            AppState.activeLiveKeys.add(event.key);
            UIHelpers.updateLivePlayingControlsDisabled(true);
            UIHelpers.updateRecordButtonUI(AppState.isRecording);

            const triggerIndex = Constants.KEY_TO_LIVE_PLAYING_INDEX_MAP[event.key];
            const chordString = DomElements.triggerChordInputs[triggerIndex].value;
            if (chordString && chordString.trim() !== "") {
                playLiveChord(chordString, event.key);
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
                DomElements.loopToggle.dispatchEvent(new Event('change')); // Triggers autosave
            }
            break;
        case 'm':
            event.preventDefault();
            if (DomElements.metronomeAudioToggle) {
                DomElements.metronomeAudioToggle.checked = !DomElements.metronomeAudioToggle.checked;
                DomElements.metronomeAudioToggle.dispatchEvent(new Event('change')); // Triggers autosave
            }
            break;
        case 'n':
            event.preventDefault();
            if (DomElements.restoreDefaultsButton && !DomElements.restoreDefaultsButton.disabled) {
                DomElements.restoreDefaultsButton.click();
            }
            break;
        case 'o':
            event.preventDefault();
            if (DomElements.loadSettingsButton && !DomElements.loadSettingsButton.disabled) {
                DomElements.loadSettingsButton.click();
            }
            break;
        case 'r':
            event.preventDefault();
            if (DomElements.recordButton && !DomElements.recordButton.disabled) {
                DomElements.recordButton.click();
            }
            break;
        case 's':
            event.preventDefault();
            if (DomElements.saveSettingsButton && !DomElements.saveSettingsButton.disabled) {
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
                AudioCore.stopLiveFrequencies(event.key); // Uses UI release slider value by default
                AppState.activeLiveKeys.delete(event.key);
                if (AppState.activeLiveKeys.size === 0) {
                    KeyboardUI.clearKeyboardHighlights();
                    UIHelpers.updateChordContextDisplay(null, null); // Reset live display
                    UIHelpers.updateLivePlayingControlsDisabled(false); // Re-enable controls
                    UIHelpers.updateRecordButtonUI(AppState.isRecording); // Update record button
                }
            }
        }
    }
});

function playLiveChord(chordString, keyIdentifier) {
    if (AppState.audioCtx.state === 'suspended') {
        AppState.audioCtx.resume().catch(e => console.error("Audio context resume failed", e));
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
        const currentADSR = { // ADSR for live playing should be quick attack, no decay to sustain, and release from slider
            attack: Math.max(0.01, parseFloat(DomElements.attackSlider.value)),
            decay: 0, // For live hold, decay effectively doesn't happen before release
            sustain: 1.0, // Full sustain level relative to targetGainValue
            release: Math.max(0.01, parseFloat(DomElements.releaseSlider.value)) // Release is handled by stopLiveFrequencies
        };
        const currentOscillatorType = DomElements.oscillatorTypeEl.value;

        AudioCore.startLiveFrequencies(
            voicingResult.frequencies,
            AppState.audioCtx.currentTime,
            currentADSR, // This ADSR is for the 'noteOn' part
            currentOscillatorType,
            currentSynthGain,
            keyIdentifier
        );

        UIHelpers.updateChordContextDisplay(null, [{ name: chordString }]); // Display the played chord
        const midiNotesToHighlight = voicingResult.frequencies.map(freq => MusicTheory.frequencyToMidi(freq));
        KeyboardUI.highlightChordOnKeyboard(midiNotesToHighlight);

    } else {
        UIHelpers.updateChordContextDisplay(null, [{ name: chordString + " (err)" }]);
        KeyboardUI.clearKeyboardHighlights();
    }
}

DomElements.restoreDefaultsButton.addEventListener('click', () => {
    if (confirm("Are you sure you want to start a new song and reset all settings to their defaults? This will also clear your autosaved project.")) {
        if (AppState.isRecording) stopAudioRecording(); // Ensure recording is stopped
        
        SettingsManager.clearAutosavedSettings();
        AppState.setRecordedAudioChunks([]);
        AppState.setFinalRecordingDuration(null);
        AppState.setRecordingStartTime(null);
        if(AppState.recordingDurationUpdaterId) clearInterval(AppState.recordingDurationUpdaterId);
        AppState.setRecordingDurationUpdaterId(null);


        UIHelpers.applySettingsToUI(Constants.defaultSettings); // This now also updates slider max and calls updatePitchRangeDisplay
        // updateKeyboardRangeFromSliders(); // Called by applySettingsToUI via updatePitchRangeDisplay if needed
        // updateADSRVisualizerFromSliders(); // Called by applySettingsToUI
        // UIHelpers.updateUIModeVisuals(Constants.defaultSettings.inputMode); // Called by applySettingsToUI
        SettingsManager.autosaveCurrentSettings();
        UIHelpers.updateRecordButtonUI(false); // Ensure record UI is reset
    }
});

DomElements.saveSettingsButton.addEventListener('click', SettingsManager.saveSettingsToFile);
DomElements.loadSettingsButton.addEventListener('click', () => DomElements.loadSettingsFile.click());
DomElements.loadSettingsFile.addEventListener('change', (event) => {
    if (AppState.isRecording) stopAudioRecording();

    AppState.setRecordedAudioChunks([]);
    AppState.setFinalRecordingDuration(null);
    AppState.setRecordingStartTime(null);
    if(AppState.recordingDurationUpdaterId) clearInterval(AppState.recordingDurationUpdaterId);
    AppState.setRecordingDurationUpdaterId(null);


    SettingsManager.loadSettingsFromFile(event); // This calls applySettingsToUI
    // applySettingsToUI handles updating keyboard range, ADSR viz, and UI mode visuals.
    // Timeout might still be good if applySettingsToUI has async aspects or relies on DOM fully updating.
    setTimeout(() => {
        // These should be correctly set by applySettingsToUI via its internal calls
        // updateKeyboardRangeFromSliders(); 
        // updateADSRVisualizerFromSliders();
        const currentMode = document.querySelector('input[name="inputMode"]:checked').value;
        UIHelpers.updateUIModeVisuals(currentMode); // Re-affirm visuals for the loaded mode
        UIHelpers.updateRecordButtonUI(false); // Ensure record UI is reset
    }, 50); 
});


async function handleMidiExport() {
    const currentInputMode = document.querySelector('input[name="inputMode"]:checked').value;
    if (currentInputMode === 'livePlaying') {
        alert("MIDI export is not available in Live Playing mode.");
        return;
    }
    if (AppState.sequencePlaying) {
        alert("Please stop playback before exporting MIDI.");
        return;
    }

    const bpm = parseFloat(DomElements.bpmSlider.value);
    const timeSignature = DomElements.timeSignatureSelect.value;
    const defaultBeatsPerChord = UIHelpers.getBeatsPerMeasure(); 

    let chordSourceString;
    let activeTextarea;

    if (currentInputMode === 'chords') {
        activeTextarea = DomElements.chordInputEl;
    } else { // degrees
        activeTextarea = DomElements.scaleDegreeInputEl;
    }

    const selectionStart = activeTextarea.selectionStart;
    const selectionEnd = activeTextarea.selectionEnd;

    if (selectionStart !== selectionEnd && selectionEnd > selectionStart) {
        chordSourceString = activeTextarea.value.substring(selectionStart, selectionEnd);
    } else {
        chordSourceString = activeTextarea.value;
    }
    
    if (!chordSourceString.trim()) {
        alert("No chords to export. Please enter some chords in the active input area.");
        return;
    }

    let parsedChords;
    if (currentInputMode === 'chords') {
        parsedChords = MusicTheory.parseDirectChordString(chordSourceString, defaultBeatsPerChord);
    } else { // degrees
        const currentSongKey = DomElements.songKeySelect.value;
        const currentKeyModeVal = DomElements.keyModeSelect.value;
        parsedChords = MusicTheory.parseScaleDegreeString(chordSourceString, currentSongKey, currentKeyModeVal, defaultBeatsPerChord);
    }

    const erroredChords = parsedChords.filter(c => c.error);
    if (erroredChords.length > 0) {
        if (!confirm(`Warning: ${erroredChords.length} chord(s) could not be parsed (e.g., "${erroredChords[0].originalInputToken}") and will be skipped in the MIDI export. Continue?`)) {
            return;
        }
        parsedChords = parsedChords.filter(c => !c.error);
    }
    
    if (parsedChords.length === 0) {
        alert("No valid chords found to export after parsing.");
        return;
    }
    
    const minMidiTarget = parseInt(DomElements.rangeStartNoteSlider.value, 10);
    const rangeLength = parseInt(DomElements.rangeLengthSlider.value, 10);
    const maxMidiTarget = minMidiTarget + rangeLength - 1;
    
    let rangeIsValid = true;
    if (minMidiTarget < Constants.MIDI_A0 || 
        maxMidiTarget > Constants.MIDI_C8 || 
        minMidiTarget >= maxMidiTarget ||
        rangeLength < Constants.SEMITONES_IN_OCTAVE) {
        rangeIsValid = false; 
        console.warn("Pitch range for MIDI export is invalid or too small. Voicing will use a default broad range.");
    }

    const voicedChords = parsedChords.map(chordObj => {
        const { frequencies: initialFrequencies, rootNoteName } = MusicTheory.parseChordNameToFrequencies(chordObj.name, REFERENCE_OCTAVE_FOR_PARSING);
        
        const currentMinMidi = rangeIsValid ? minMidiTarget : null; // Pass null if range invalid for wider voicing
        const currentMaxMidi = rangeIsValid ? maxMidiTarget : null;
        
        const voicingResult = MusicTheory.voiceFrequenciesInRange(
            initialFrequencies, 
            rootNoteName, 
            currentMinMidi, 
            currentMaxMidi, 
            chordObj.bassNoteName 
        );

        return { 
            ...chordObj, 
            frequencies: voicingResult.frequencies 
        };
    });

    const nonEmptyVoicedChords = voicedChords.filter(vc => vc.frequencies && vc.frequencies.length > 0);
    if (nonEmptyVoicedChords.length === 0) {
        alert("No notes could be voiced for the MIDI export within the current pitch range or due to chord errors. Adjust range or chords.");
        return;
    }
    if (nonEmptyVoicedChords.length < voicedChords.length) {
        alert(`Warning: ${voicedChords.length - nonEmptyVoicedChords.length} chord(s) resulted in no playable notes after voicing (e.g., due to pitch range constraints) and will be silent in the MIDI export.`);
    }

    const suggestedFileNameStem = "chordotron-export";
    const midiBlob = MidiWriter.exportProgressionToMidi(nonEmptyVoicedChords, bpm, timeSignature, suggestedFileNameStem);

    if (!midiBlob) {
        alert("Failed to generate MIDI data.");
        return;
    }

    try {
        if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: `${suggestedFileNameStem}.mid`,
                types: [{
                    description: 'MIDI Files',
                    accept: { 'audio/midi': ['.mid', '.midi'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(midiBlob);
            await writable.close();
        } else {
            let fileNameFromPrompt = prompt("Enter a file name for your MIDI export (e.g., my_song):", suggestedFileNameStem);
            if (fileNameFromPrompt === null) return; 
            if (fileNameFromPrompt.trim() === "") fileNameFromPrompt = suggestedFileNameStem;
            if (!fileNameFromPrompt.toLowerCase().endsWith(".mid") && !fileNameFromPrompt.toLowerCase().endsWith(".midi")) {
                fileNameFromPrompt += ".mid";
            }
            fileNameFromPrompt = fileNameFromPrompt.replace(/[^a-z0-9._-\s]/gi, '_').replace(/\s+/g, '_');

            const url = URL.createObjectURL(midiBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileNameFromPrompt;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            // User cancelled the file picker
        } else {
            console.error("Error saving MIDI file:", err);
            alert(`Could not save MIDI file: ${err.message}`);
        }
    }
}

if (DomElements.exportMidiButton) {
    DomElements.exportMidiButton.addEventListener('click', handleMidiExport);
}


function updateKeyboardRangeFromSliders() {
    let startMidi = parseInt(DomElements.rangeStartNoteSlider.value, 10);
    const length = parseInt(DomElements.rangeLengthSlider.value, 10);

    const sliderMin = Constants.MIDI_C2; 
    const sliderMaxPossibleStart = Constants.MIDI_B5 - (length - 1); 

    DomElements.rangeStartNoteSlider.min = String(sliderMin); // Ensure min is C2
    DomElements.rangeStartNoteSlider.max = String(sliderMaxPossibleStart);


    if (startMidi > sliderMaxPossibleStart) {
        startMidi = sliderMaxPossibleStart;
        DomElements.rangeStartNoteSlider.value = String(startMidi);
    }
    if (startMidi < sliderMin) {
        startMidi = sliderMin;
        DomElements.rangeStartNoteSlider.value = String(startMidi);
    }
    
    const endMidi = startMidi + length - 1;

    UIHelpers.updatePitchRangeDisplay(); // This will read the possibly adjusted slider value
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

    if (!event.target.checked) { // If metronome is turned OFF while playing
        const now = AppState.audioCtx.currentTime;
        // Filter out metronome sounds and stop them
        AppState.activeOscillators = AppState.activeOscillators.filter(activeSound => {
            if (activeSound.type === 'metronome') {
                try {
                    activeSound.gainNode.gain.cancelScheduledValues(now);
                    activeSound.gainNode.gain.setValueAtTime(activeSound.gainNode.gain.value, now); // Hold current value
                    activeSound.gainNode.gain.linearRampToValueAtTime(0, now + 0.02); // Quick fade
                    activeSound.oscillator.stop(now + 0.03);
                } catch (e) {
                    // console.warn("Error stopping metronome sound:", e);
                }
                return false; // Remove from activeOscillators
            }
            return true; // Keep other sounds
        });
    }
});

function updateLiveRecordingDurationDisplay() {
    if (AppState.recordingStartTime && DomElements.recordingDurationDisplay) {
        const elapsedSeconds = (Date.now() - AppState.recordingStartTime) / 1000;
        DomElements.recordingDurationDisplay.textContent = `Rec: ${UIHelpers.formatDuration(elapsedSeconds)}`;
    }
}

function startAudioRecording() {
    if (!AppState.audioRecordStreamDestination) {
        console.error("Audio record stream destination not initialized.");
        alert("Recording setup error. Cannot start recording.");
        return;
    }
    if (AppState.audioCtx.state === 'suspended') {
        AppState.audioCtx.resume().catch(e => console.error("Audio context resume failed", e) );
    }

    AppState.setRecordedAudioChunks([]);
    try {
        const options = { mimeType: 'audio/webm;codecs=opus' };
        let mediaRecorderInstance;
        if (MediaRecorder.isTypeSupported(options.mimeType)) {
            mediaRecorderInstance = new MediaRecorder(AppState.audioRecordStreamDestination.stream, options);
        } else if (MediaRecorder.isTypeSupported('audio/wav')) { // Fallback to WAV if webm/opus not supported
            mediaRecorderInstance = new MediaRecorder(AppState.audioRecordStreamDestination.stream, { mimeType: 'audio/wav'});
        }
         else { // Further fallback
            mediaRecorderInstance = new MediaRecorder(AppState.audioRecordStreamDestination.stream);
        }
        AppState.setMediaRecorder(mediaRecorderInstance);
    } catch (e) {
        console.error("Error creating MediaRecorder:", e);
        alert("Could not create MediaRecorder. Your browser might not support it or the MIME type. Try WAV or Opus.");
        return;
    }

    AppState.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            AppState.recordedAudioChunks.push(event.data);
        }
    };
    AppState.mediaRecorder.onstop = () => {
        AppState.setIsRecording(false); // Ensure state is updated
        if (AppState.recordingStartTime) { // Calculate final duration if not already set by explicit stop
            const duration = (Date.now() - AppState.recordingStartTime) / 1000;
            AppState.setFinalRecordingDuration(duration);
            AppState.setRecordingStartTime(null);
        }
        if (AppState.recordingDurationUpdaterId) {
            clearInterval(AppState.recordingDurationUpdaterId);
            AppState.setRecordingDurationUpdaterId(null);
        }
        UIHelpers.updateRecordButtonUI(false); // Update UI to show final duration and button state
    };
    AppState.mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        alert(`Recording error: ${event.error.name} - ${event.error.message}`);
        stopAudioRecording(); // Attempt to clean up
    };

    try {
        AppState.mediaRecorder.start();
    } catch (e) {
        console.error("Error starting MediaRecorder:", e);
        alert(`Could not start recording: ${e.message}. Check microphone permissions or browser compatibility.`);
        AppState.setMediaRecorder(null); // Clear faulty recorder
        return;
    }

    AppState.setIsRecording(true);
    AppState.setRecordingStartTime(Date.now());
    AppState.setFinalRecordingDuration(null); // Reset final duration

    if (AppState.recordingDurationUpdaterId) {
        clearInterval(AppState.recordingDurationUpdaterId);
    }
    AppState.setRecordingDurationUpdaterId(setInterval(updateLiveRecordingDurationDisplay, 100)); 
    updateLiveRecordingDurationDisplay(); 
    UIHelpers.updateRecordButtonUI(true);
}

function stopAudioRecording() {
    if (AppState.mediaRecorder && AppState.mediaRecorder.state !== "inactive") {
        AppState.mediaRecorder.stop(); // This will trigger onstop handler eventually
    } else {
        // If recorder was already inactive or null, manually update state and UI
        AppState.setIsRecording(false);
        if (AppState.recordingDurationUpdaterId) {
            clearInterval(AppState.recordingDurationUpdaterId);
            AppState.setRecordingDurationUpdaterId(null);
        }
        if (AppState.recordingStartTime && AppState.finalRecordingDuration === null) { // If it was 'running' conceptually but recorder failed/stopped early
            const duration = (Date.now() - AppState.recordingStartTime) / 1000;
            AppState.setFinalRecordingDuration(duration);
        }
        AppState.setRecordingStartTime(null);
        UIHelpers.updateRecordButtonUI(false); // Ensure UI reflects stopped state
    }
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
    const fileExtension = mimeType.includes('wav') ? '.wav' : (mimeType.includes('opus') || mimeType.includes('webm') ? '.webm' : '.aud');


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
        if(DomElements.recordButton) {
            DomElements.recordButton.disabled = true;
            DomElements.recordButton.title = "Recording not supported by your browser.";
        }
        if (DomElements.downloadRecordingButton) DomElements.downloadRecordingButton.disabled = true;
    }

    AppState.setFinalRecordingDuration(null); 

    // const initialLength = parseInt(DomElements.rangeLengthSlider.value, 10); // applySettingsToUI handles this
    // DomElements.rangeStartNoteSlider.max = Constants.MIDI_B5 - (initialLength - 1);

    const loadedFromAutosave = SettingsManager.loadAutosavedSettings(); // Calls applySettingsToUI
    if (!loadedFromAutosave) {
        UIHelpers.applySettingsToUI(Constants.defaultSettings);
    } 
    // else {
    //     UIHelpers.applySettingsToUI(SettingsManager.collectCurrentSettings()); //This is redundant as loadAutosaved calls apply
    // }

    // const currentInputMode = document.querySelector('input[name="inputMode"]:checked').value; // Done by applySettingsToUI
    // UIHelpers.updateUIModeVisuals(currentInputMode);

    if (!loadedFromAutosave) { // Autosave defaults if no autosave was loaded
        SettingsManager.autosaveCurrentSettings();
    }

    KeyboardUI.initKeyboard();
    updateKeyboardRangeFromSliders(); // Call after settings are applied to set initial keyboard range display

    ADSRVisualizer.initADSRVisualizer(); // Calls drawADSRGraph with initial values from DOM
    // updateADSRVisualizerFromSliders(); // Called by initADSRVisualizer if canvas exists

    initHelpGuideModalLogic();
    attachAutosaveListeners();
    UIHelpers.setupSliderListeners(); // Sets up listeners for BPM, Metronome Vol (Master gain listener is separate)

    // Ensure master gain node reflects initial slider value from loaded/default settings
    if (DomElements.masterGainSlider && AppState.masterGainNode) {
        AppState.masterGainNode.gain.value = parseFloat(DomElements.masterGainSlider.value);
    }
    UIHelpers.updateRecordButtonUI(AppState.isRecording); // Set initial record button state

    function initAudioContext() {
        if (AppState.audioCtx.state === 'suspended') {
            AppState.audioCtx.resume().catch(e => console.error("Audio context resume failed on user interaction", e));
        }
    }
    document.body.addEventListener('click', initAudioContext, { once: true });
    document.body.addEventListener('touchend', initAudioContext, { once: true });
});
