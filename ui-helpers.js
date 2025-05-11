import * as DomElements from './dom-elements.js';
import * as Constants from './constants.js';
import * as AppState from './state.js';
import { stopPlayback } from './playback-scheduler.js';
import * as MusicTheory from './music-theory.js';
import * as ADSRVisualizer from './adsr-visualizer.js';

function clearInputErrorStates() {
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

// Helper to normalize note name display: C, C#, Db etc.
function normalizeDisplayNoteName(noteNameStr) {
    if (!noteNameStr || typeof noteNameStr !== 'string' || noteNameStr.length === 0) {
        return "";
    }
    let root = noteNameStr.charAt(0).toUpperCase();
    let accidental = "";
    if (noteNameStr.length > 1) {
        // Keep original #/b if that's what it is, otherwise it's part of quality
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
    
    // Standardize symbols like 'o' to '°' after casing logic
    const replaceSymbols = (name) => {
        let tempName = name;
        // These replacements are simple string replacements.
        // More complex logic might be needed if qualities overlap with these symbols.
        if (Constants.DISPLAY_SYMBOL_MAP) { // Check if map exists
            for (const key in Constants.DISPLAY_SYMBOL_MAP) {
                // Use a regex to replace only if key is a standalone quality or part of a known pattern
                // This is tricky; for now, simple replacement.
                // Example: replace 'o7' with '°7', but not 'o' in 'dorian'
                 if (tempName.includes(key)) { // Basic check
                    // A more robust way would be to parse quality then map symbols
                 }
            }
        }
        // Specific common replacements if not covered by a generic map approach
        tempName = tempName.replace(/h7/g, 'ø7').replace(/ø7/g, 'ø7'); // ø7 to ensure it's not h7 again
        tempName = tempName.replace(/(?<![A-Ga-g])o7/g, '°7'); // dim7
        tempName = tempName.replace(/(?<![A-Ga-g])o(?!n)(?!r)(?!c)/g, '°'); // dim, avoid 'dorian', 'locrian' etc.
        return tempName;
    };
    
    const parts = displayChordName.split('/');
    let mainPart = parts[0];
    const bassPart = parts.length > 1 ? normalizeDisplayNoteName(parts[1]) : null;

    // Extract root and quality from mainPart
    const rootMatch = mainPart.match(/^([A-Ga-g][#b]?)(.*)$/);
    if (rootMatch) {
        const rootDisplay = normalizeDisplayNoteName(rootMatch[1]);
        let qualityDisplay = rootMatch[2];

        // Convert common quality text to lowercase, except for specific cases or symbols
        // e.g., MAJ7 -> maj7, MIN -> min, DIM -> dim, AUG -> aug
        // More complex qualities like add9, sus4, etc., should also be lowercased.
        // Numerals (7, 9, 11, 13) and alterations (#5, b9) usually stay as is.
        
        // A simple approach for common ones:
        qualityDisplay = qualityDisplay.replace(/MAJ7/ig, 'maj7')
                                      .replace(/MIN7/ig, 'min7')
                                      .replace(/DOM7/ig, '7') // Assuming DOM7 was a user error for 7
                                      .replace(/MAJ/ig, 'maj')
                                      .replace(/MIN/ig, 'min')
                                      .replace(/DIM/ig, 'dim')
                                      .replace(/AUG/ig, 'aug')
                                      .replace(/SUS/ig, 'sus');
        // M by itself for major, m for minor (common shorthand)
        if (qualityDisplay.toUpperCase() === 'M') qualityDisplay = ''; // Major triad implies no quality text or 'maj'
        else if (qualityDisplay === 'm') qualityDisplay = 'm'; // Explicitly minor

        mainPart = rootDisplay + qualityDisplay;
    }
    
    // Reconstruct and apply symbol replacements
    let finalDisplayName = replaceSymbols(mainPart);
    if (bassPart) {
        finalDisplayName += "/" + replaceSymbols(bassPart); // Bass note doesn't have quality typically
    }
    
    return finalDisplayName;
}


export function updateChordContextDisplay(currentIndex, chordsArray) {
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
            // Reconstruct from parsed name and bassNoteName, respecting wasSlashPlayed
            const mainChordMatch = chordObject.name.match(/^([A-Ga-g][#b]?)(.*)$/);
            if (mainChordMatch) {
                const root = normalizeDisplayNoteName(mainChordMatch[1]);
                const quality = mainChordMatch[2]; // Quality from chordObject.name
                displayName = root + quality;

                if (chordObject.bassNoteName && chordObject.wasSlashPlayed === true) {
                    displayName += "/" + normalizeDisplayNoteName(chordObject.bassNoteName);
                }
            } else { // Should not happen if name is valid
                displayName = chordObject.name;
                 if (chordObject.bassNoteName && chordObject.wasSlashPlayed === true) {
                    displayName += "/" + normalizeDisplayNoteName(chordObject.bassNoteName);
                }
            }
        } else {
            displayName = chordObject.originalInputToken || "--"; 
        }
        return formatChordForDisplay(displayName); // Apply final casing and symbol formatting
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

    setupSliderListeners();
    
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