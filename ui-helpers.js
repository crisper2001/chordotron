import * as DomElements from './dom-elements.js';
import * as Constants from './constants.js';
import * as AppState from './state.js';
import { stopPlayback } from './playback-scheduler.js';
import * as MusicTheory from './music-theory.js';
import * as ADSRVisualizer from './adsr-visualizer.js';

function clearInputErrorStates() {
    // Not currently used for sliders
}

export function setControlsDisabled(disabled) {
    DomElements.mainControlsFieldset.disabled = disabled;
    if (DomElements.appActionsFieldset) DomElements.appActionsFieldset.disabled = disabled;
    if (DomElements.parametersControlsFieldset) DomElements.parametersControlsFieldset.disabled = disabled;
}

export function setupSliderListeners() {
    const sliders = [
        { el: DomElements.bpmSlider, span: DomElements.bpmValueSpan, isFloat: false },
        { el: DomElements.metronomeVolumeSlider, span: DomElements.metronomeVolumeValueSpan, isFloat: true },
        { el: DomElements.masterGainSlider, span: DomElements.masterGainValueSpan, isFloat: true },
        // ADSR and Synth Gain knob text spans are updated directly in updateADSRVisualizerFromSliders or applySettingsToUI
    ];
    sliders.forEach(({el, span, isFloat}) => {
        if (!el) return; 
        if (span) span.textContent = parseFloat(el.value).toFixed(isFloat ? 2 : 0);
        el.addEventListener('input', (event) => {
            if (span) span.textContent = parseFloat(event.target.value).toFixed(isFloat ? 2 : 0);
        });
    });
}

export function updatePitchRangeDisplay() {
    const startMidi = parseInt(DomElements.rangeStartNoteSlider.value, 10);
    const length = parseInt(DomElements.rangeLengthSlider.value, 10);
    
    const clampedStartMidi = Math.max(Constants.MIDI_C2, Math.min(startMidi, Constants.MIDI_C5));
     if (clampedStartMidi !== startMidi && DomElements.rangeStartNoteSlider.value !== String(clampedStartMidi) ) {
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

    for (let i = 0; i < beatsPerMeasure; i++) {
        const indicator = document.createElement('div');
        indicator.classList.add('beat-indicator');
        indicator.id = `beatIndicator${i + 1}`;
        DomElements.beatIndicatorContainer.appendChild(indicator);
    }
}

export function formatChordForDisplay(chordNameToFormat) {
    let displayChordName = chordNameToFormat;
    let internalName = chordNameToFormat.replace(/°/g, 'o').replace(/ø/g, 'h');

    const shorthandHMatch = internalName.match(/^([A-Ga-g][#b]?)(h)$/);
    if (shorthandHMatch && !internalName.endsWith('sus')) {
        internalName = shorthandHMatch[1] + 'h7';
    }

    const match = internalName.match(/^([A-Ga-g][#b]?)(.*)$/);
    if (match) {
        const root = match[1];
        let quality = match[2];

        if (Constants.DISPLAY_SYMBOL_MAP[quality]) {
            quality = Constants.DISPLAY_SYMBOL_MAP[quality];
        } else {
            if (quality.includes('o') && !quality.match(/no|so|lo|co|do|ao/i) && !quality.endsWith('sus')) {
                 quality = quality.replace(/o(?!sus)/g, '°');
            }
             if (quality.includes('h') && !quality.match(/sh|th|ch|ph|rh|nh/i) && !quality.endsWith('sus')) {
                quality = quality.replace(/h(?!sus)/g, 'ø');
            }
        }
        displayChordName = root + quality;
    }
    return displayChordName;
}

export function updateChordContextDisplay(currentIndex, chordsArray) {
    const currentChordObject = chordsArray[currentIndex];
    if (currentChordObject) {
        const displayCurrent = formatChordForDisplay(currentChordObject.name);
        DomElements.currentChordDisplay.innerHTML = `🎶 Playing: ${displayCurrent}`;
    } else {
        DomElements.currentChordDisplay.innerHTML = "🎶 Playing: --";
    }

    if (currentIndex > 0 && chordsArray[currentIndex - 1]) {
        const prevChordObject = chordsArray[currentIndex - 1];
        const displayPrev = formatChordForDisplay(prevChordObject.name);
        DomElements.prevChordDisplay.innerHTML = `⏮️ Prev: ${displayPrev}`;
    } else if (DomElements.loopToggle.checked && chordsArray.length > 1 && currentChordObject) {
        const prevChordObject = chordsArray[chordsArray.length - 1];
        const displayPrev = formatChordForDisplay(prevChordObject.name);
        DomElements.prevChordDisplay.innerHTML = `⏮️ Prev: ${displayPrev}`;
    } else {
        DomElements.prevChordDisplay.innerHTML = "⏮️ Prev: --";
    }

    if (currentIndex < chordsArray.length - 1 && chordsArray[currentIndex + 1]) {
        const nextChordObject = chordsArray[currentIndex + 1];
        const displayNext = formatChordForDisplay(nextChordObject.name);
        DomElements.nextChordDisplay.innerHTML = `Next: ${displayNext} ⏭️`;
    } else if (DomElements.loopToggle.checked && chordsArray.length > 1 && currentChordObject) {
        const nextChordObject = chordsArray[0];
        const displayNext = formatChordForDisplay(nextChordObject.name);
        DomElements.nextChordDisplay.innerHTML = `Next: ${displayNext} ⏭️`;
    } else {
        DomElements.nextChordDisplay.innerHTML = "Next: ⏭️ --";
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
    DomElements.synthGainSlider.value = settings.synthGain ?? 0.5;
    DomElements.loopToggle.checked = settings.loopToggle;
    DomElements.metronomeAudioToggle.checked = settings.metronomeAudioToggle;
    DomElements.chordInputEl.value = settings.chordInput;
    DomElements.scaleDegreeInputEl.value = settings.scaleDegreeInput;
    DomElements.songKeySelect.value = settings.songKey;
    DomElements.keyModeSelect.value = settings.keyMode;
    
    DomElements.rangeStartNoteSlider.value = settings.rangeStartMidi ?? Constants.DEFAULT_MIN_MIDI_RANGE_START;
    DomElements.rangeLengthSlider.value = settings.rangeLength ?? Constants.DEFAULT_RANGE_LENGTH;
    
    const currentLength = parseInt(DomElements.rangeLengthSlider.value, 10);
    DomElements.rangeStartNoteSlider.max = Constants.MIDI_B5 - (currentLength - 1);
    if (parseInt(DomElements.rangeStartNoteSlider.value, 10) > parseInt(DomElements.rangeStartNoteSlider.max, 10) ) {
        DomElements.rangeStartNoteSlider.value = DomElements.rangeStartNoteSlider.max;
    }

    updatePitchRangeDisplay();

    const modeToSelect = settings.inputMode || "chords";
    document.querySelector(`input[name="inputMode"][value="${modeToSelect}"]`).checked = true;
    DomElements.chordNameInputArea.style.display = modeToSelect === 'chords' ? 'block' : 'none';
    DomElements.scaleDegreeInputArea.style.display = modeToSelect === 'degrees' ? 'block' : 'none';

    setupSliderListeners(); // Sets up general slider text spans
    
    // Manually update ADSR and Synth Gain knob value spans
    updateKnobValueSpan(DomElements.attackSlider, DomElements.attackValueSpan);
    updateKnobValueSpan(DomElements.decaySlider, DomElements.decayValueSpan);
    updateKnobValueSpan(DomElements.sustainSlider, DomElements.sustainValueSpan);
    updateKnobValueSpan(DomElements.releaseSlider, DomElements.releaseValueSpan);
    updateKnobValueSpan(DomElements.synthGainSlider, DomElements.synthGainValueSpan);

    updateBeatIndicatorsVisibility(getBeatsPerMeasure());

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

    if (!AppState.sequencePlaying) {
        DomElements.prevChordDisplay.innerHTML = "⏮️ Prev: --";
        DomElements.currentChordDisplay.innerHTML = "🎶 Playing: --";
        DomElements.nextChordDisplay.innerHTML = "Next: ⏭️ --";
    }
}