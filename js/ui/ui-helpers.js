import * as DomElements from '../dom/dom-elements.js';
import * as Constants from '../config/constants.js';
import * as AppState from '../config/state.js';
import { stopPlayback } from '../audio/playback-scheduler.js';
import * as MusicTheory from '../utils/music-theory.js';
import * as ADSRVisualizer from './adsr-visualizer.js';

function clearInputErrorStates() {
}

export function setControlsDisabled(disabled) {
    DomElements.mainControlsFieldset.disabled = disabled;
    if (DomElements.appActionsFieldset) DomElements.appActionsFieldset.disabled = disabled;
    if (DomElements.parametersControlsFieldset) DomElements.parametersControlsFieldset.disabled = disabled;

    if (DomElements.recordButton) {
        // If main controls are disabled (e.g., sequence playing),
        // record button is disabled UNLESS already recording (to allow stopping).
        DomElements.recordButton.disabled = disabled && !AppState.isRecording;
    }

    if (DomElements.downloadRecordingButton) {
        if (disabled) { // If overall controls are disabled
            DomElements.downloadRecordingButton.disabled = true;
        } else { // Overall controls enabled, decide based on recording state
            const hasChunks = AppState.recordedAudioChunks.length > 0;
            DomElements.downloadRecordingButton.disabled = AppState.isRecording || !hasChunks;
        }
    }


    if (!disabled) {
        DomElements.timingParametersGroup.classList.remove('disabled-in-live-mode');
        DomElements.soundOptionsGroup.classList.remove('disabled-in-live-mode');
        if (DomElements.masterGainSlider) DomElements.masterGainSlider.disabled = false;
        const masterGainLabel = document.querySelector('label[for="masterGain"]');
        if (masterGainLabel) masterGainLabel.classList.remove('disabled-text');
        if (DomElements.masterGainValueSpan) DomElements.masterGainValueSpan.classList.remove('disabled-text');
    }
}

export function updateLivePlayingControlsDisabled(isKeyDown) {
    DomElements.mainControlsFieldset.disabled = isKeyDown;

    if (DomElements.parametersControlsFieldset) {
        DomElements.parametersControlsFieldset.disabled = isKeyDown;
        if (isKeyDown) {
            DomElements.parametersControlsFieldset.classList.add('live-playing-active');
        } else {
            DomElements.parametersControlsFieldset.classList.remove('live-playing-active');
        }
    }

    if (DomElements.masterGainSlider) {
        DomElements.masterGainSlider.disabled = false; 
        const masterGainLabel = document.querySelector('label[for="masterGain"]');
        if (masterGainLabel) masterGainLabel.classList.remove('disabled-text');
        if (DomElements.masterGainValueSpan) DomElements.masterGainValueSpan.classList.remove('disabled-text');
    }

    const actionButtons = [
        DomElements.restoreDefaultsButton,
        DomElements.loadSettingsButton,
        DomElements.saveSettingsButton,
        DomElements.helpButton,
        // DomElements.downloadRecordingButton // Handled by updateRecordButtonUI
    ];

    actionButtons.forEach(button => {
        if (button) {
            button.disabled = isKeyDown;
        }
    });
    
    // Record and Download buttons are managed by updateRecordButtonUI based on AppState.isRecording
    // but their general enabled/disabled state due to keydown needs to be considered.
    if (DomElements.recordButton) {
        if (isKeyDown) { // If a key is down for live playing
            DomElements.recordButton.disabled = !AppState.isRecording; // Can only stop recording, not start
        } else {
            // When keys are up, record button state is determined by updateRecordButtonUI.
            // updateRecordButtonUI is called after this function in relevant flows (mode switch, keyup).
        }
    }
    if (DomElements.downloadRecordingButton) {
        if (isKeyDown) {
             DomElements.downloadRecordingButton.disabled = true;
        } else {
            // updateRecordButtonUI handles this
        }
    }
    // It's better to call updateRecordButtonUI after this function if mode changes or key is released.
}

export function updateUIModeVisuals(mode) {
    DomElements.chordNameInputArea.style.display = mode === 'chords' ? 'flex' : 'none';
    DomElements.scaleDegreeInputArea.style.display = mode === 'degrees' ? 'flex' : 'none';
    DomElements.livePlayingInputArea.style.display = mode === 'livePlaying' ? 'flex' : 'none';

    const isLivePlayingMode = mode === 'livePlaying';

    DomElements.timingParametersGroup.classList.toggle('disabled-in-live-mode', isLivePlayingMode);
    DomElements.soundOptionsGroup.classList.toggle('disabled-in-live-mode', isLivePlayingMode); // This also affects Metronome Vol
    DomElements.playbackFooter.classList.toggle('disabled-for-live-playing', isLivePlayingMode);


    if (DomElements.parametersControlsFieldset) {
        DomElements.parametersControlsFieldset.classList.remove('live-playing-active');
    }

    if (isLivePlayingMode) {
        if (AppState.sequencePlaying) stopPlayback(true);
        DomElements.prevChordDisplay.innerHTML = "⏮️ --";
        DomElements.nextChordDisplay.innerHTML = "-- ⏭️";
        if (DomElements.beatIndicatorContainer) DomElements.beatIndicatorContainer.innerHTML = "";
        if (DomElements.currentChordDisplay) DomElements.currentChordDisplay.innerHTML = "🎹 Ready";
        updateLivePlayingControlsDisabled(false); // Reset general disabled states
        // Master gain should always be controllable if its group isn't fully disabled
        if (DomElements.masterGainSlider) DomElements.masterGainSlider.disabled = false;
        const masterGainLabel = document.querySelector('label[for="masterGain"]');
        if (masterGainLabel) masterGainLabel.classList.remove('disabled-text');
        if (DomElements.masterGainValueSpan) DomElements.masterGainValueSpan.classList.remove('disabled-text');

    } else { // Chord or Degree mode
        updateBeatIndicatorsVisibility(getBeatsPerMeasure());
        if (!AppState.sequencePlaying) {
            DomElements.prevChordDisplay.innerHTML = "⏮️ Prev: --";
            DomElements.currentChordDisplay.innerHTML = "🎶 Playing: --";
            DomElements.nextChordDisplay.innerHTML = "Next: -- ⏭️";
        }
        setControlsDisabled(AppState.sequencePlaying); // Set general disabled states
    }
    updateRecordButtonUI(AppState.isRecording); // Update record button and duration display for all modes
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
            if (((currentMode === 'chords' || currentMode === 'degrees') && AppState.sequencePlaying) || isLivePlayingAndKeyHeld) {
                DomElements.recordButton.disabled = true; 
            }
            else {
                DomElements.recordButton.disabled = false; 
            }
        }
    }
    if (DomElements.downloadRecordingButton) {
        const hasChunks = AppState.recordedAudioChunks.length > 0;
        DomElements.downloadRecordingButton.disabled = isRecording || !hasChunks || isLivePlayingAndKeyHeld;
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

    const clampedStartMidi = Math.max(Constants.MIDI_C2, Math.min(startMidi, Constants.MIDI_C5));
    if (clampedStartMidi !== startMidi && DomElements.rangeStartNoteSlider.value !== String(clampedStartMidi)) {
        DomElements.rangeStartNoteSlider.value = clampedStartMidi;
    }
    const finalStartMidi = parseInt(DomElements.rangeStartNoteSlider.value, 10);
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
        case 2: return 2;
        case 4: return 1;
        case 8: return 0.5;
        case 16: return 0.25;
        default: return 1;
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
        if (Constants.DISPLAY_SYMBOL_MAP) {
            for (const key in Constants.DISPLAY_SYMBOL_MAP) {
                if (tempName.includes(key)) {
                }
            }
        }
        tempName = tempName.replace(/h7/g, 'ø7');
        tempName = tempName.replace(/(?<![A-Ga-g])o7/g, '°7');
        tempName = tempName.replace(/(?<![A-Ga-g])o(?!n)(?!r)(?!c)/g, '°');
        return tempName;
    };

    const parts = displayChordName.split('/');
    let mainPart = parts[0];
    const bassPart = parts.length > 1 ? normalizeDisplayNoteName(parts[1]) : null;

    const rootMatch = mainPart.match(/^([A-Ga-g][#b]?)(.*)$/);
    if (rootMatch) {
        const rootDisplay = normalizeDisplayNoteName(rootMatch[1]);
        let qualityDisplay = rootMatch[2];

        if (qualityDisplay === 'M') {
            qualityDisplay = '';
        } else if (qualityDisplay === 'm') {
        } else {
            qualityDisplay = qualityDisplay
                .replace(/MAJ7/ig, 'maj7')
                .replace(/MIN7/ig, 'min7')
                .replace(/MAJOR/ig, '')
                .replace(/MINOR/ig, 'm')
                .replace(/MAJ(?!7)/ig, '')
                .replace(/MIN(?!7)/ig, 'm')
                .replace(/DIMINISHED/ig, 'dim')
                .replace(/DIM/ig, 'dim')
                .replace(/AUGMENTED/ig, 'aug')
                .replace(/AUG/ig, 'aug')
                .replace(/SUSPENDED/ig, 'sus')
                .replace(/SUS/ig, 'sus');

            if (qualityDisplay.toLowerCase() === 'maj') {
                qualityDisplay = '';
            }
            else if (qualityDisplay.toLowerCase() === 'min') {
                qualityDisplay = 'm';
            }
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
            if (chordObject.bassNoteName && chordObject.wasSlashPlayed === false) {
                displayName = chordObject.originalInputToken.split('/')[0].replace(/\(\d+\)$/, '');
            } else {
                displayName = chordObject.originalInputToken.replace(/\(\d+\)$/, '');
            }
        } else if (chordObject.name && chordObject.name !== '?') {
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

    const currentChordObject = chordsArray[currentIndex];
    DomElements.currentChordDisplay.innerHTML = `🎶 Playing: ${formatNameForUI(currentChordObject)}`;

    if (currentIndex > 0 && chordsArray[currentIndex - 1]) {
        const prevChordObject = chordsArray[currentIndex - 1];
        DomElements.prevChordDisplay.innerHTML = `⏮️ Prev: ${formatNameForUI(prevChordObject)}`;
    } else if (DomElements.loopToggle.checked && chordsArray.length > 1 && currentChordObject) {
        const prevChordObject = chordsArray[chordsArray.length - 1];
        DomElements.prevChordDisplay.innerHTML = `⏮️ Prev: ${formatNameForUI(prevChordObject)}`;
    } else {
        DomElements.prevChordDisplay.innerHTML = "⏮️ Prev: --";
    }

    if (currentIndex < chordsArray.length - 1 && chordsArray[currentIndex + 1]) {
        const nextChordObject = chordsArray[currentIndex + 1];
        DomElements.nextChordDisplay.innerHTML = `Next: ${formatNameForUI(nextChordObject)} ⏭️`;
    } else if (DomElements.loopToggle.checked && chordsArray.length > 1 && currentChordObject) {
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
    DomElements.attackSlider.value = settings.attack;
    DomElements.decaySlider.value = settings.decay;
    DomElements.sustainSlider.value = settings.sustain;
    DomElements.releaseSlider.value = settings.release;
    DomElements.timeSignatureSelect.value = settings.timeSignature;
    DomElements.oscillatorTypeEl.value = settings.oscillatorType;
    DomElements.metronomeVolumeSlider.value = settings.metronomeVolume;
    DomElements.masterGainSlider.value = settings.masterGain ?? 0.5;
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

    const currentLength = parseInt(DomElements.rangeLengthSlider.value, 10);
    DomElements.rangeStartNoteSlider.max = Constants.MIDI_B5 - (currentLength - 1);
    if (parseInt(DomElements.rangeStartNoteSlider.value, 10) > parseInt(DomElements.rangeStartNoteSlider.max, 10)) {
        DomElements.rangeStartNoteSlider.value = DomElements.rangeStartNoteSlider.max;
    }

    updatePitchRangeDisplay();

    const modeToSelect = settings.inputMode || "chords";
    document.querySelector(`input[name="inputMode"][value="${modeToSelect}"]`).checked = true;


    setupSliderListeners();

    updateKnobValueSpan(DomElements.attackSlider, DomElements.attackValueSpan);
    updateKnobValueSpan(DomElements.decaySlider, DomElements.decayValueSpan);
    updateKnobValueSpan(DomElements.sustainSlider, DomElements.sustainValueSpan);
    updateKnobValueSpan(DomElements.releaseSlider, DomElements.releaseValueSpan);
    updateKnobValueSpan(DomElements.synthGainSlider, DomElements.synthGainValueSpan);

    updateUIModeVisuals(modeToSelect);


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
