import * as AppState from './state.js';
import * as DomElements from './dom-elements.js';
import * as MusicTheory from './music-theory.js';
import * as AudioCore from './audio-core.js';
import * as UIHelpers from './ui-helpers.js';
import * as KeyboardUI from './keyboard-ui.js';

const REFERENCE_OCTAVE_FOR_PARSING = 2;

function createMetronomeTick(time, isDownbeat) {
    const tickHeldDuration = 0.05;
    const adsrTick = { attack: 0.005, decay: 0.03, sustain: 0.1, release: 0.06 };
    const frequency = isDownbeat ? 1200 : 1000;
    const volume = parseFloat(DomElements.metronomeVolumeSlider.value);
    
    const beatsPerMeasure = UIHelpers.getBeatsPerMeasure();
    const visualBeatIndex = AppState.currentBeatInSequenceForVisualMetronome % beatsPerMeasure;

    const visualChangeTime = (time - AppState.audioCtx.currentTime) * 1000 - 10;

    setTimeout(() => {
        if (!AppState.sequencePlaying || !DomElements.beatIndicatorContainer) return;
        const indicators = DomElements.beatIndicatorContainer.children;
        for (let i = 0; i < indicators.length; i++) {
            indicators[i].classList.remove('active', 'downbeat');
        }
        if (indicators[visualBeatIndex]) {
            indicators[visualBeatIndex].classList.add('active');
            if (isDownbeat) indicators[visualBeatIndex].classList.add('downbeat');
        }
    }, Math.max(0, visualChangeTime));


    if (DomElements.metronomeAudioToggle.checked && volume > 0) {
        AudioCore.playFrequencies([frequency], tickHeldDuration, time, adsrTick, 'sine', volume);
    }
    AppState.setCurrentBeatInSequenceForVisualMetronome(AppState.currentBeatInSequenceForVisualMetronome + 1);
}

function scheduleChord(chordObject, bpm, adsr, scheduleTime, currentOscillatorType, currentIndex, allChords, timeSignature) {
    const quarterNoteDuration = 60 / bpm;
    const timeSigBeatFactor = UIHelpers.getBeatDurationFactorForTimeSignature(timeSignature);
    const actualSingleBeatDuration = quarterNoteDuration * timeSigBeatFactor;

    const noteHeldDuration = chordObject.beats * actualSingleBeatDuration;
    const frequencies = chordObject.frequencies;

    if (frequencies && frequencies.length > 0) {
        AudioCore.playFrequencies(frequencies, noteHeldDuration, scheduleTime, adsr, currentOscillatorType);
    }
    
    const displayDelay = (scheduleTime - AppState.audioCtx.currentTime) * 1000;
    setTimeout(() => {
        if (AppState.sequencePlaying) {
            UIHelpers.updateChordContextDisplay(currentIndex, allChords);
            if (frequencies && frequencies.length > 0) {
                const midiNotesToHighlight = frequencies.map(freq => MusicTheory.frequencyToMidi(freq));
                KeyboardUI.highlightChordOnKeyboard(midiNotesToHighlight);
            } else {
                KeyboardUI.clearKeyboardHighlights();
            }
        }
    }, Math.max(0, displayDelay - 20));

    return noteHeldDuration;
}


function scheduleNextEvent() {
    if (!AppState.sequencePlaying) return;

    AppState.setCurrentChordIndex(AppState.currentChordIndex + 1);

    if (AppState.currentChordIndex >= AppState.originalChords.length) {
        if (DomElements.loopToggle.checked) {
            AppState.setCurrentChordIndex(0);
            AppState.setCurrentBeatInSequenceForVisualMetronome(0);
        } else {
            const currentADSR = {
                release: Math.max(0.01, parseFloat(DomElements.releaseSlider.value))
            };
            const lastSoundTheoreticalEndTime = AppState.nextEventTime + currentADSR.release;
            const uiResetDelay = (lastSoundTheoreticalEndTime - AppState.audioCtx.currentTime + 0.2) * 1000;

            AppState.setCurrentSchedulerTimeoutId(setTimeout(() => {
                if (AppState.sequencePlaying) stopPlayback(true); 
            }, Math.max(0, uiResetDelay)));
            return;
        }
    }

    const chordToPlay = AppState.originalChords[AppState.currentChordIndex];
    const chordStartTime = AppState.nextEventTime;
    const currentBPM = parseFloat(DomElements.bpmSlider.value);
    const currentOscillatorType = DomElements.oscillatorTypeEl.value;
    const currentTimeSignature = DomElements.timeSignatureSelect.value;
    const currentADSR = {
        attack: Math.max(0.01, parseFloat(DomElements.attackSlider.value)),
        decay: Math.max(0.01, parseFloat(DomElements.decaySlider.value)),
        sustain: parseFloat(DomElements.sustainSlider.value),
        release: Math.max(0.01, parseFloat(DomElements.releaseSlider.value))
    };

    const quarterNoteDuration = 60 / currentBPM;
    const timeSigBeatFactor = UIHelpers.getBeatDurationFactorForTimeSignature(currentTimeSignature);
    const actualSingleBeatDuration = quarterNoteDuration * timeSigBeatFactor;
    
    const beatsPerMeasureForMetronome = UIHelpers.getBeatsPerMeasure();
    for (let i = 0; i < chordToPlay.beats; i++) {
        const tickTime = chordStartTime + (i * actualSingleBeatDuration);
        const isDownbeat = (AppState.currentBeatInSequenceForVisualMetronome % beatsPerMeasureForMetronome === 0);
        createMetronomeTick(tickTime, isDownbeat);
    }
    
    const durationOfThisChordSlot = scheduleChord(
        chordToPlay, currentBPM, currentADSR, chordStartTime,
        currentOscillatorType,
        AppState.currentChordIndex, AppState.originalChords,
        currentTimeSignature
    );

    AppState.setNextEventTime(AppState.nextEventTime + durationOfThisChordSlot);

    const timeUntilNextEventMs = (AppState.nextEventTime - AppState.audioCtx.currentTime) * 1000;
    AppState.setCurrentSchedulerTimeoutId(setTimeout(scheduleNextEvent, Math.max(0, timeUntilNextEventMs - 50)));
}

function setInputErrorState(inputElement, isError) {
    if (isError) {
        inputElement.classList.add('input-error');
    } else {
        inputElement.classList.remove('input-error');
    }
}

export function startPlayback() {
    if (AppState.audioCtx.state === 'suspended') {
        AppState.audioCtx.resume().catch(e => console.error("Error resuming AudioContext:", e));
    }

    // Clear previous error states
    setInputErrorState(DomElements.minNoteVoicingInput, false);
    setInputErrorState(DomElements.maxNoteVoicingInput, false);

    const defaultBeatsPerChord = UIHelpers.getBeatsPerMeasure();
    const selectedInputMode = document.querySelector('input[name="inputMode"]:checked').value;
    const currentKeyModeVal = DomElements.keyModeSelect.value;
    let parsedChords;

    if (selectedInputMode === 'chords') {
        parsedChords = MusicTheory.parseDirectChordString(DomElements.chordInputEl.value, defaultBeatsPerChord);
    } else {
        const currentSongKey = DomElements.songKeySelect.value;
        parsedChords = MusicTheory.parseScaleDegreeString(DomElements.scaleDegreeInputEl.value, currentSongKey, currentKeyModeVal, defaultBeatsPerChord);
    }

    const minNoteStr = DomElements.minNoteVoicingInput.value;
    const maxNoteStr = DomElements.maxNoteVoicingInput.value;
    let minMidiTarget = MusicTheory.noteNameToMidi(minNoteStr);
    let maxMidiTarget = MusicTheory.noteNameToMidi(maxNoteStr);
    let rangeIsValid = true;

    if (minMidiTarget === null) {
        setInputErrorState(DomElements.minNoteVoicingInput, true);
        rangeIsValid = false;
    }
    if (maxMidiTarget === null) {
        setInputErrorState(DomElements.maxNoteVoicingInput, true);
        rangeIsValid = false;
    }
    if (minMidiTarget !== null && maxMidiTarget !== null && minMidiTarget >= maxMidiTarget) {
        setInputErrorState(DomElements.minNoteVoicingInput, true);
        setInputErrorState(DomElements.maxNoteVoicingInput, true);
        rangeIsValid = false;
        console.warn(`Min note (${minNoteStr}) must be less than Max note (${maxNoteStr}).`);
    }
    
    const finalChords = parsedChords.map(chordObj => {
        const { frequencies: initialFrequencies, rootNoteName } = MusicTheory.parseChordNameToFrequencies(chordObj.name, REFERENCE_OCTAVE_FOR_PARSING);
        
        // Pass nulls if range is invalid, voiceFrequenciesInMidiRange will use defaults
        const currentMinMidi = rangeIsValid ? minMidiTarget : null;
        const currentMaxMidi = rangeIsValid ? maxMidiTarget : null;

        let voicedFrequencies = MusicTheory.voiceFrequenciesInMidiRange(initialFrequencies, rootNoteName, currentMinMidi, currentMaxMidi);
        
        return { ...chordObj, frequencies: voicedFrequencies };
    });
    AppState.setOriginalChords(finalChords);

    if (AppState.originalChords.length === 0 || AppState.originalChords.every(c => !c.frequencies || c.frequencies.length === 0) ) {
        DomElements.currentChordDisplay.textContent = "No valid chords to play.";
        if (!rangeIsValid && AppState.originalChords.length > 0) { // If chords exist but range was bad
             DomElements.currentChordDisplay.textContent += " (Check note range inputs)";
        }
        KeyboardUI.clearKeyboardHighlights();
        return;
    }
    
    AppState.setSequencePlaying(true);
    DomElements.playStopButton.textContent = "Stop";
    DomElements.playStopButton.classList.add('playing');
    UIHelpers.setControlsDisabled(true);
    
    AppState.setCurrentChordIndex(-1); 
    AppState.setCurrentBeatInSequenceForVisualMetronome(0);
    const beatsPerMeasureForVisuals = UIHelpers.getBeatsPerMeasure();
    UIHelpers.updateBeatIndicatorsVisibility(beatsPerMeasureForVisuals);

    DomElements.prevChordDisplay.textContent = "Prev: --";
    DomElements.nextChordDisplay.textContent = "Next: --";
    DomElements.currentChordDisplay.textContent = "Playing: --";
    KeyboardUI.clearKeyboardHighlights();

    AppState.setNextEventTime(AppState.audioCtx.currentTime + 0.1); 

    scheduleNextEvent();
}

export function stopPlayback(clearDisplay = true) {
    AppState.setSequencePlaying(false);
    if (AppState.currentSchedulerTimeoutId) {
        clearTimeout(AppState.currentSchedulerTimeoutId);
        AppState.setCurrentSchedulerTimeoutId(null);
    }

    const now = AppState.audioCtx.currentTime;
    AppState.activeOscillators.forEach(({ oscillator, gainNode }) => {
        try {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now); 
            gainNode.gain.linearRampToValueAtTime(0, now + 0.05);
            oscillator.stop(now + 0.06);
        } catch (e) { /* ignore */ }
    });
    AppState.setActiveOscillators([]);

    if (clearDisplay) {
        DomElements.currentChordDisplay.textContent = "Stopped.";
        DomElements.prevChordDisplay.textContent = "Prev: --";
        DomElements.nextChordDisplay.textContent = "Next: --";
        UIHelpers.updateBeatIndicatorsVisibility(UIHelpers.getBeatsPerMeasure());
        KeyboardUI.clearKeyboardHighlights();
        // Don't clear error states here, let them persist until next play attempt or settings load
    }
    DomElements.playStopButton.textContent = "Play";
    DomElements.playStopButton.classList.remove('playing');
    UIHelpers.setControlsDisabled(false);
}