import * as DomElements from '../dom/dom-elements.js';
import * as Constants from '../config/constants.js';
import * as AppState from '../config/state.js';
import { stopPlayback } from '../audio/playback-scheduler.js';
import * as MusicTheory from '../utils/music-theory.js';
import * as ADSRVisualizer from './adsr-visualizer.js';

function clearInputErrorStates() {
    // Placeholder if needed in the future
}

export function setControlsDisabled(disabled) {
    DomElements.mainControlsFieldset.disabled = disabled;
    // appActionsFieldset contains New, Load, Save, Export MIDI, Record, Download, Help
    // If overall 'disabled' (e.g. sequence playing), the whole fieldset is disabled.
    if (DomElements.appActionsFieldset) DomElements.appActionsFieldset.disabled = disabled;
    if (DomElements.parametersControlsFieldset) DomElements.parametersControlsFieldset.disabled = disabled;

    // Individual button overrides IF the fieldset itself is NOT disabled by the 'disabled' flag.
    if (!disabled) { // If the fieldsets are generally enabled
        const currentInputMode = document.querySelector('input[name="inputMode"]:checked').value;
        if (DomElements.exportMidiButton) {
            DomElements.exportMidiButton.disabled = (currentInputMode === 'livePlaying');
        }
    } else { // If fieldsets are disabled (e.g. sequence playing), ensure these buttons are also marked disabled
         if (DomElements.exportMidiButton) DomElements.exportMidiButton.disabled = true;
    }

    // Record button is special: can be enabled to STOP recording even if other controls are 'disabled'.
    if (DomElements.recordButton) {
        DomElements.recordButton.disabled = disabled && !AppState.isRecording;
    }
    // Download button logic
    if (DomElements.downloadRecordingButton) {
        const hasChunks = AppState.recordedAudioChunks.length > 0;
        // Disabled if:
        // 1. Currently recording
        // 2. No chunks available
        // 3. Overall controls are disabled (e.g. sequence playing) AND not currently recording (if recording, it's handled by recordButton state)
        let downloadDisabled = AppState.isRecording || !hasChunks;
        if (disabled && !AppState.isRecording) { // If overall controls disabled and not recording, definitely disable download
            downloadDisabled = true;
        }
        DomElements.downloadRecordingButton.disabled = downloadDisabled;
    }

    if (!disabled) { // Re-enable parts that might have been specifically disabled for other reasons if overall 'disabled' is false
        const currentInputModeCheck = document.querySelector('input[name="inputMode"]:checked').value;
        if (currentInputModeCheck !== 'livePlaying') {
            DomElements.timingParametersGroup.classList.remove('disabled-in-live-mode');
            DomElements.soundOptionsGroup.classList.remove('disabled-in-live-mode');
            if (DomElements.masterGainSlider) DomElements.masterGainSlider.disabled = false;
            const masterGainLabel = document.querySelector('label[for="masterGain"]');
            if (masterGainLabel) masterGainLabel.classList.remove('disabled-text');
            if (DomElements.masterGainValueSpan) DomElements.masterGainValueSpan.classList.remove('disabled-text');
        }
    }
}

export function updateLivePlayingControlsDisabled(isKeyDown) {
    DomElements.mainControlsFieldset.disabled = isKeyDown; // Input textareas
    if (DomElements.appActionsFieldset) DomElements.appActionsFieldset.disabled = isKeyDown; // Disables New, Load, Save, Export MIDI, Help

    if (DomElements.parametersControlsFieldset) {
        DomElements.parametersControlsFieldset.disabled = isKeyDown;
        if (isKeyDown) {
            DomElements.parametersControlsFieldset.classList.add('live-playing-active');
        } else {
            DomElements.parametersControlsFieldset.classList.remove('live-playing-active');
        }
    }

    // Master gain should always be controllable unless parametersControlsFieldset is hard disabled
    if (DomElements.masterGainSlider) {
        DomElements.masterGainSlider.disabled = isKeyDown && DomElements.parametersControlsFieldset.disabled;
        const masterGainLabel = document.querySelector('label[for="masterGain"]');
        if (masterGainLabel) masterGainLabel.classList.toggle('disabled-text', DomElements.masterGainSlider.disabled);
        if (DomElements.masterGainValueSpan) DomElements.masterGainValueSpan.classList.toggle('disabled-text', DomElements.masterGainSlider.disabled);
    }
    
    // Record and Download buttons specific handling during live key press
    if (DomElements.recordButton) {
        if (isKeyDown) { 
            DomElements.recordButton.disabled = !AppState.isRecording; // Can only stop recording
        } else {
            // When keys are up, record button state is determined by updateRecordButtonUI called later.
        }
    }
    if (DomElements.downloadRecordingButton) {
        if (isKeyDown) {
             DomElements.downloadRecordingButton.disabled = true;
        } else {
            // updateRecordButtonUI handles this
        }
    }
    // Ensure updateRecordButtonUI is called after this if mode changes or key is released.
}

export function updateUIModeVisuals(mode) {
    DomElements.chordNameInputArea.style.display = mode === 'chords' ? 'flex' : 'none';
    DomElements.scaleDegreeInputArea.style.display = mode === 'degrees' ? 'flex' : 'none';
    DomElements.livePlayingInputArea.style.display = mode === 'livePlaying' ? 'flex' : 'none';

    const isLivePlayingMode = mode === 'livePlaying';

    DomElements.timingParametersGroup.classList.toggle('disabled-in-live-mode', isLivePlayingMode);
    DomElements.soundOptionsGroup.classList.toggle('disabled-in-live-mode', isLivePlayingMode); 
    DomElements.playbackFooter.classList.toggle('disabled-for-live-playing', isLivePlayingMode);

    if (DomElements.exportMidiButton) { 
        DomElements.exportMidiButton.disabled = isLivePlayingMode;
    }

    if (DomElements.parametersControlsFieldset) {
        DomElements.parametersControlsFieldset.classList.remove('live-playing-active');
    }

    if (isLivePlayingMode) {
        if (AppState.sequencePlaying) stopPlayback(true);
        DomElements.prevChordDisplay.innerHTML = "⏮️ --";
        DomElements.nextChordDisplay.innerHTML = "-- ⏭️";
        if (DomElements.beatIndicatorContainer) DomElements.beatIndicatorContainer.innerHTML = "";
        if (DomElements.currentChordDisplay) DomElements.currentChordDisplay.innerHTML = "🎹 Ready";
        updateLivePlayingControlsDisabled(false); 
        // Ensure master gain is controllable (unless its group is fully disabled by live-playing-active logic)
        if (DomElements.masterGainSlider) {
            DomElements.masterGainSlider.disabled = false; 
            const masterGainLabel = document.querySelector('label[for="masterGain"]');
            if (masterGainLabel) masterGainLabel.classList.remove('disabled-text');
            if (DomElements.masterGainValueSpan) DomElements.masterGainValueSpan.classList.remove('disabled-text');
        }
    } else { // Chord or Degree mode
        updateBeatIndicatorsVisibility(getBeatsPerMeasure());
        if (!AppState.sequencePlaying) {
            DomElements.prevChordDisplay.innerHTML = "⏮️ Prev: --";
            DomElements.currentChordDisplay.innerHTML = "🎶 Playing: --";
            DomElements.nextChordDisplay.innerHTML = "Next: -- ⏭️";
        }
        // setControlsDisabled handles disabling appActionsFieldset (and thus exportMidiButton)
        // if AppState.sequencePlaying is true.
        // If sequencePlaying is false, appActionsFieldset will be enabled,
        // and exportMidiButton will be enabled (since isLivePlayingMode is false here, checked by setControlsDisabled internal logic).
        setControlsDisabled(AppState.sequencePlaying);
    }
    updateRecordButtonUI(AppState.isRecording); 
}

export function formatDuration(totalSeconds) {
    if (totalSeconds === null || totalSeconds < 0) return "--:--.-";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const tenths = Math.floor((totalSeconds * 10) % 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}

export function updateRecordButtonUI(isRecording) {
    const currentMode = document.querySelector('input[name="inputMode"]:checked').value;
    const isLivePlayingAndKeyHeld = currentMode === 'livePlaying' && AppState.activeLiveKeys.size > 0;
    const isSequencePlayingNonLive = (currentMode === 'chords' || currentMode === 'degrees') && AppState.sequencePlaying;


    if (DomElements.recordButton) {
        if (isRecording) {
            DomElements.recordButton.textContent = '⏹️ Stop Rec';
            DomElements.recordButton.classList.add('recording');
            DomElements.recordButton.title = "Stop audio recording";
            DomElements.recordButton.disabled = false; // Always allow stopping if recording
        } else {
            DomElements.recordButton.textContent = '⏺️ Record';
            DomElements.recordButton.classList.remove('recording');
            DomElements.recordButton.title = "Record audio output";
            // Disable record button if sequence is playing (non-live modes)
            // or if a live key is currently held down.
            DomElements.recordButton.disabled = isSequencePlayingNonLive || isLivePlayingAndKeyHeld;
        }
    }
    if (DomElements.downloadRecordingButton) {
        const hasChunks = AppState.recordedAudioChunks.length > 0;
        DomElements.downloadRecordingButton.disabled = isRecording || !hasChunks || isLivePlayingAndKeyHeld || isSequencePlayingNonLive;
    }

    if (DomElements.recordingDurationDisplay) {
        if (isRecording) {
            DomElements.recordingDurationDisplay.style.display = 'inline-block';
            const currentDuration = AppState.recordingStartTime ? (Date.now() - AppState.recordingStartTime) / 1000 : 0;
            DomElements.recordingDurationDisplay.textContent = `Rec: ${formatDuration(currentDuration)}`;
        } else { // Not recording
            if (AppState.recordedAudioChunks.length > 0 && AppState.finalRecordingDuration !== null) {
                DomElements.recordingDurationDisplay.style.display = 'inline-block';
                DomElements.recordingDurationDisplay.textContent = `Length: ${formatDuration(AppState.finalRecordingDuration)}`;
            } else {
                DomElements.recordingDurationDisplay.style.display = 'none';
                DomElements.recordingDurationDisplay.textContent = '';
            }
        }
    }
}


export function setupSliderListeners() {
    const sliders = [
        { el: DomElements.bpmSlider, span: DomElements.bpmValueSpan, isFloat: false },
        { el: DomElements.metronomeVolumeSlider, span: DomElements.metronomeVolumeValueSpan, isFloat: true },
    ];
    sliders.forEach(({ el, span, isFloat }) => {
        if (!el) return;
        if (span) span.textContent = parseFloat(el.value).toFixed(isFloat ? 2 : 0);
        el.addEventListener('input', (event) => {
            if (span) span.textContent = parseFloat(event.target.value).toFixed(isFloat ? 2 : 0);
        });
    });
    if (DomElements.masterGainSlider && DomElements.masterGainValueSpan) {
        DomElements.masterGainValueSpan.textContent = parseFloat(DomElements.masterGainSlider.value).toFixed(2);
    }
}

export function updatePitchRangeDisplay() {
    const startMidi = parseInt(DomElements.rangeStartNoteSlider.value, 10);
    const length = parseInt(DomElements.rangeLengthSlider.value, 10);

    // This clamping might be too aggressive or redundant if slider min/max are well-managed
    // const clampedStartMidi = Math.max(Constants.MIDI_C2, Math.min(startMidi, Constants.MIDI_C5));
    // if (clampedStartMidi !== startMidi && DomElements.rangeStartNoteSlider.value !== String(clampedStartMidi)) {
    //     DomElements.rangeStartNoteSlider.value = clampedStartMidi;
    // }
    const finalStartMidi = parseInt(DomElements.rangeStartNoteSlider.value, 10); // Read after potential adjustment by slider max
    const endMidi = finalStartMidi + length - 1;

    const startNoteName = MusicTheory.midiToNoteNameWithOctave(finalStartMidi) || 'N/A';
    const endNoteName = MusicTheory.midiToNoteNameWithOctave(endMidi) || 'N/A';

    if (DomElements.rangeStartNoteValueSpan) DomElements.rangeStartNoteValueSpan.textContent = startNoteName;
    if (DomElements.rangeLengthValueSpan) DomElements.rangeLengthValueSpan.textContent = length;
    if (DomElements.currentRangeDisplaySpan) DomElements.currentRangeDisplaySpan.textContent = `${startNoteName} - ${endNoteName}`;
}

export function getBeatsPerMeasure() {
    const timeSig = DomElements.timeSignatureSelect.value;
    return parseInt(timeSig.split('/')[0], 10);
}

export function getBeatDurationFactorForTimeSignature(timeSignatureString) {
    const denominator = parseInt(timeSignatureString.split('/')[1], 10);
    switch (denominator) {
        case 2: return 2;   // Beat is a half note (2 quarter notes)
        case 4: return 1;   // Beat is a quarter note
        case 8: return 0.5; // Beat is an eighth note (0.5 quarter notes)
        case 16: return 0.25;// Beat is a sixteenth note (0.25 quarter notes)
        default: return 1;  // Default to quarter note if time signature is unusual
    }
}

export function updateBeatIndicatorsVisibility(beatsPerMeasure) {
    if (!DomElements.beatIndicatorContainer) return;
    DomElements.beatIndicatorContainer.innerHTML = '';
    const currentInputMode = document.querySelector('input[name="inputMode"]:checked').value;
    if (currentInputMode === 'livePlaying') return;

    for (let i = 0; i < beatsPerMeasure; i++) {
        const indicator = document.createElement('div');
        indicator.classList.add('beat-indicator');
        indicator.id = `beatIndicator${i + 1}`;
        DomElements.beatIndicatorContainer.appendChild(indicator);
    }
}

function normalizeDisplayNoteName(noteNameStr) {
    if (!noteNameStr || typeof noteNameStr !== 'string' || noteNameStr.length === 0) {
        return "";
    }
    let root = noteNameStr.charAt(0).toUpperCase();
    let accidental = "";
    if (noteNameStr.length > 1) {
        const accCandidate = noteNameStr.substring(1);
        if (accCandidate === '#' || accCandidate === 'b') {
            accidental = accCandidate;
        } else if (accCandidate.length === 2 && (accCandidate === '##' || accCandidate === 'bb')) {
            accidental = accCandidate;
        }
    }
    return root + accidental;
}

export function formatChordForDisplay(chordNameToFormat) {
    if (!chordNameToFormat || typeof chordNameToFormat !== 'string') return "--";

    let displayChordName = chordNameToFormat;

    const replaceSymbols = (name) => {
        let tempName = name;
        // Enhanced replacement to avoid partial matches like 'ghost' -> 'gh°st'
        tempName = tempName.replace(/\bm7b5\b/g, 'ø7'); // Minor 7 flat 5 often shown as half-diminished
        tempName = tempName.replace(/\bh7\b/g, 'ø7'); 
        
        // Match 'o' or 'dim' followed by 7 or not, ensuring it's not part of a word
        tempName = tempName.replace(/\bo7\b|\bdim7\b/g, '°7');
        tempName = tempName.replace(/\bo\b(?![\w#b])|\bdim\b(?![\w#b])/g, '°'); // 'o' or 'dim' not followed by more letters/symbols

        return tempName;
    };

    const parts = displayChordName.split('/');
    let mainPart = parts[0];
    const bassPart = parts.length > 1 ? normalizeDisplayNoteName(parts[1]) : null;

    const rootMatch = mainPart.match(/^([A-Ga-g][#b]?)(.*)$/);
    if (rootMatch) {
        const rootDisplay = normalizeDisplayNoteName(rootMatch[1]);
        let qualityDisplay = rootMatch[2];

        // Normalize common quality variations before symbol replacement
        if (qualityDisplay.toUpperCase() === 'M' || qualityDisplay.toLowerCase() === 'maj') {
            qualityDisplay = ''; // Major is often just the root
        } else if (qualityDisplay.toLowerCase() === 'min') {
            qualityDisplay = 'm';
        } else {
            qualityDisplay = qualityDisplay
                .replace(/MAJ7/ig, 'maj7')
                .replace(/MIN7/ig, 'm7') // Ensure m7 for min7
                .replace(/MAJOR/ig, '')
                .replace(/MINOR/ig, 'm')
                .replace(/MAJ(?!7)/ig, '')
                .replace(/MIN(?!7)/ig, 'm')
                .replace(/DIMINISHED/ig, 'dim')
                .replace(/AUGMENTED/ig, 'aug')
                .replace(/SUSPENDED/ig, 'sus');
            // No specific replacement for DIM/AUG/SUS here, rely on replaceSymbols or original input.
        }
        mainPart = rootDisplay + qualityDisplay;
    }

    let finalDisplayName = replaceSymbols(mainPart);
    if (bassPart) {
        finalDisplayName += "/" + normalizeDisplayNoteName(bassPart);
    }

    return finalDisplayName;
}

export function updateChordContextDisplay(currentIndex, chordsArray) {
    const currentInputMode = document.querySelector('input[name="inputMode"]:checked').value;
    if (currentInputMode === 'livePlaying') {
        if (AppState.activeLiveKeys.size === 0) {
            DomElements.currentChordDisplay.innerHTML = "🎹 Ready";
        } else {
            if (chordsArray && chordsArray.length > 0 && chordsArray[0]) {
                DomElements.currentChordDisplay.innerHTML = `🎹 ${formatChordForDisplay(chordsArray[0].name)}`;
            } else {
                DomElements.currentChordDisplay.innerHTML = "🎹 ---";
            }
        }
        DomElements.prevChordDisplay.innerHTML = "⏮️ --";
        DomElements.nextChordDisplay.innerHTML = "-- ⏭️";
        return;
    }

    const formatNameForUI = (chordObject) => {
        if (!chordObject) return "--";
        let displayName = "";

        const looksLikeScaleDegree = chordObject.originalInputToken && /^(b|#)?[IVXLCDMivxlcdm1-7]/i.test(chordObject.originalInputToken.trim().split('/')[0]);

        if (chordObject.originalInputToken && !looksLikeScaleDegree && !chordObject.error) {
            // For direct chord input, prefer original token (without beats)
            // but handle slash chords correctly based on whether they were actually played as slash
            const originalWithoutBeats = chordObject.originalInputToken.replace(/\(\d+\)$/, '');
            if (chordObject.bassNoteName && !chordObject.wasSlashPlayed && originalWithoutBeats.includes('/')) {
                // Original had a slash, but it wasn't played (e.g., bass note out of range)
                // Display only the main part of the original token
                displayName = originalWithoutBeats.split('/')[0];
            } else {
                displayName = originalWithoutBeats;
            }
        } else if (chordObject.name && chordObject.name !== '?') {
            // For scale degrees or if original token was an error/not preferred
            const mainChordMatch = chordObject.name.match(/^([A-Ga-g][#b]?)(.*)$/);
            if (mainChordMatch) {
                const root = normalizeDisplayNoteName(mainChordMatch[1]);
                const quality = mainChordMatch[2];
                displayName = root + quality;

                if (chordObject.bassNoteName && chordObject.wasSlashPlayed === true) {
                    displayName += "/" + normalizeDisplayNoteName(chordObject.bassNoteName);
                }
            } else {
                displayName = chordObject.name;
                if (chordObject.bassNoteName && chordObject.wasSlashPlayed === true) {
                    displayName += "/" + normalizeDisplayNoteName(chordObject.bassNoteName);
                }
            }
        } else {
            displayName = chordObject.originalInputToken || "--";
        }
        return formatChordForDisplay(displayName);
    };

    const currentChordObject = (chordsArray && currentIndex >= 0 && currentIndex < chordsArray.length) ? chordsArray[currentIndex] : null;
    DomElements.currentChordDisplay.innerHTML = `🎶 Playing: ${formatNameForUI(currentChordObject)}`;

    if (currentIndex > 0 && chordsArray[currentIndex - 1]) {
        const prevChordObject = chordsArray[currentIndex - 1];
        DomElements.prevChordDisplay.innerHTML = `⏮️ Prev: ${formatNameForUI(prevChordObject)}`;
    } else if (DomElements.loopToggle.checked && chordsArray && chordsArray.length > 1 && currentChordObject) {
        const prevChordObject = chordsArray[chordsArray.length - 1];
        DomElements.prevChordDisplay.innerHTML = `⏮️ Prev: ${formatNameForUI(prevChordObject)}`;
    } else {
        DomElements.prevChordDisplay.innerHTML = "⏮️ Prev: --";
    }

    if (currentIndex >=0 && currentIndex < chordsArray.length - 1 && chordsArray[currentIndex + 1]) {
        const nextChordObject = chordsArray[currentIndex + 1];
        DomElements.nextChordDisplay.innerHTML = `Next: ${formatNameForUI(nextChordObject)} ⏭️`;
    } else if (DomElements.loopToggle.checked && chordsArray && chordsArray.length > 1 && currentChordObject) {
        const nextChordObject = chordsArray[0];
        DomElements.nextChordDisplay.innerHTML = `Next: ${formatNameForUI(nextChordObject)} ⏭️`;
    } else {
        DomElements.nextChordDisplay.innerHTML = "Next: -- ⏭️";
    }
}

function updateKnobValueSpan(sliderElement, spanElement) {
    if (sliderElement && spanElement) {
        spanElement.textContent = parseFloat(sliderElement.value).toFixed(2);
    }
}

export function applySettingsToUI(settings) {
    if (AppState.sequencePlaying) stopPlayback(true);

    clearInputErrorStates();

    DomElements.bpmSlider.value = settings.bpm;
    if (DomElements.bpmValueSpan) DomElements.bpmValueSpan.textContent = settings.bpm;
    DomElements.attackSlider.value = settings.attack;
    DomElements.decaySlider.value = settings.decay;
    DomElements.sustainSlider.value = settings.sustain;
    DomElements.releaseSlider.value = settings.release;
    DomElements.timeSignatureSelect.value = settings.timeSignature;
    DomElements.oscillatorTypeEl.value = settings.oscillatorType;
    DomElements.metronomeVolumeSlider.value = settings.metronomeVolume;
    if (DomElements.metronomeVolumeValueSpan) DomElements.metronomeVolumeValueSpan.textContent = parseFloat(settings.metronomeVolume).toFixed(2);
    
    DomElements.masterGainSlider.value = settings.masterGain ?? 0.5;
    if (DomElements.masterGainValueSpan) DomElements.masterGainValueSpan.textContent = parseFloat(DomElements.masterGainSlider.value).toFixed(2);
    if (AppState.masterGainNode) AppState.masterGainNode.gain.value = parseFloat(DomElements.masterGainSlider.value);

    DomElements.synthGainSlider.value = settings.synthGain ?? 0.5;
    DomElements.loopToggle.checked = settings.loopToggle;
    DomElements.metronomeAudioToggle.checked = settings.metronomeAudioToggle;
    DomElements.chordInputEl.value = settings.chordInput;
    DomElements.scaleDegreeInputEl.value = settings.scaleDegreeInput;
    DomElements.songKeySelect.value = settings.songKey;
    DomElements.keyModeSelect.value = settings.keyMode;

    DomElements.rangeStartNoteSlider.value = settings.rangeStartMidi ?? Constants.DEFAULT_MIN_MIDI_RANGE_START;
    DomElements.rangeLengthSlider.value = settings.rangeLength ?? Constants.DEFAULT_RANGE_LENGTH;

    if (settings.livePlayingChords && DomElements.triggerChordInputs.length === settings.livePlayingChords.length) {
        settings.livePlayingChords.forEach((chord, index) => {
            if (DomElements.triggerChordInputs[index]) {
                DomElements.triggerChordInputs[index].value = chord;
            }
        });
    }

    // Update slider max for rangeStart based on length (must be done before updatePitchRangeDisplay)
    const currentLength = parseInt(DomElements.rangeLengthSlider.value, 10);
    DomElements.rangeStartNoteSlider.max = Constants.MIDI_B5 - (currentLength - 1);
    if (parseInt(DomElements.rangeStartNoteSlider.value, 10) > parseInt(DomElements.rangeStartNoteSlider.max, 10)) {
        DomElements.rangeStartNoteSlider.value = DomElements.rangeStartNoteSlider.max;
    }

    updatePitchRangeDisplay(); // Updates spans for range sliders and current range display

    const modeToSelect = settings.inputMode || "chords";
    document.querySelector(`input[name="inputMode"][value="${modeToSelect}"]`).checked = true;


    // setupSliderListeners(); // No, this adds listeners. We just need to set values and update spans.
    // Spans for BPM, Metronome Vol, Master Gain, Range are handled above or by updatePitchRangeDisplay.

    updateKnobValueSpan(DomElements.attackSlider, DomElements.attackValueSpan);
    updateKnobValueSpan(DomElements.decaySlider, DomElements.decayValueSpan);
    updateKnobValueSpan(DomElements.sustainSlider, DomElements.sustainValueSpan);
    updateKnobValueSpan(DomElements.releaseSlider, DomElements.releaseValueSpan);
    updateKnobValueSpan(DomElements.synthGainSlider, DomElements.synthGainValueSpan);

    updateUIModeVisuals(modeToSelect); // This will call setControlsDisabled and updateBeatIndicators


    if (!AppState.sequencePlaying && modeToSelect !== "livePlaying") {
        DomElements.prevChordDisplay.innerHTML = "⏮️ Prev: --";
        DomElements.currentChordDisplay.innerHTML = "🎶 Playing: --";
        DomElements.nextChordDisplay.innerHTML = "Next: -- ⏭️";
    }

    if (DomElements.adsrCanvas) {
        const adsrSettings = {
            attack: parseFloat(DomElements.attackSlider.value),
            decay: parseFloat(DomElements.decaySlider.value),
            sustain: parseFloat(DomElements.sustainSlider.value),
            release: parseFloat(DomElements.releaseSlider.value)
        };
        const currentSynthGain = parseFloat(DomElements.synthGainSlider.value);
        ADSRVisualizer.drawADSRGraph(adsrSettings, currentSynthGain);
    }
}
