import * as DomElements from '../dom/dom-elements.js';
import { applySettingsToUI } from '../ui/ui-helpers.js';
import * as Constants from '../config/constants.js';

const AUTOSAVE_KEY = 'chordotronAutosaveData_v2';

export function collectCurrentSettings() {
    const livePlayingChords = DomElements.triggerChordInputs.map(input => input.value);
    return {
        bpm: parseFloat(DomElements.bpmSlider.value),
        attack: parseFloat(DomElements.attackSlider.value),
        decay: parseFloat(DomElements.decaySlider.value),
        sustain: parseFloat(DomElements.sustainSlider.value),
        release: parseFloat(DomElements.releaseSlider.value),
        timeSignature: DomElements.timeSignatureSelect.value,
        oscillatorType: DomElements.oscillatorTypeEl.value,
        metronomeVolume: parseFloat(DomElements.metronomeVolumeSlider.value),
        loopToggle: DomElements.loopToggle.checked,
        metronomeAudioToggle: DomElements.metronomeAudioToggle.checked,
        inputMode: document.querySelector('input[name="inputMode"]:checked').value,
        chordInput: DomElements.chordInputEl.value,
        scaleDegreeInput: DomElements.scaleDegreeInputEl.value,
        livePlayingChords: livePlayingChords,
        songKey: DomElements.songKeySelect.value,
        keyMode: DomElements.keyModeSelect.value,
        rangeStartMidi: parseInt(DomElements.rangeStartNoteSlider.value, 10),
        rangeLength: parseInt(DomElements.rangeLengthSlider.value, 10),
        masterGain: parseFloat(DomElements.masterGainSlider.value),
        synthGain: parseFloat(DomElements.synthGainSlider.value)
    };
}

async function saveWithPicker(settingsJSON, suggestedName) {
    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: suggestedName,
            types: [{
                description: 'JSON Files',
                accept: { 'application/json': ['.json'] },
            }],
        });
        const writable = await handle.createWritable();
        await writable.write(settingsJSON);
        await writable.close();
        autosaveCurrentSettings();
        return true;
    } catch (err) {
        if (err.name === 'AbortError') {
        } else if (err.name === 'SecurityError') {
            alert('Could not save: A security error occurred. This feature usually requires HTTPS or localhost.');
        } else {
            alert(`Could not save settings using the file picker: ${err.message}`);
        }
        return false;
    }
}

function saveWithPromptAndDownload(settingsJSON, defaultFileName) {
    let fileName = prompt("Enter a file name for your settings (e.g., mySongSettings):", defaultFileName);
    if (fileName === null) return;
    if (fileName.trim() === "") fileName = defaultFileName;
    if (!fileName.toLowerCase().endsWith(".json")) fileName += ".json";
    fileName = fileName.replace(/[^a-z0-9._-\s]/gi, '_').replace(/\s+/g, '_');

    const blob = new Blob([settingsJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    autosaveCurrentSettings();
}

export async function saveSettingsToFile() {
    const defaultFileName = "chordotronSettings.json";
    const currentSettings = collectCurrentSettings();
    const settingsJSON = JSON.stringify(currentSettings, null, 2);

    const supportsPicker = typeof window.showSaveFilePicker === 'function';

    if (supportsPicker) {
        await saveWithPicker(settingsJSON, defaultFileName);
    } else {
        saveWithPromptAndDownload(settingsJSON, defaultFileName);
    }
}

export function loadSettingsFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const settings = JSON.parse(e.target.result);
            const completeSettings = { ...Constants.defaultSettings, ...settings };
            if (!completeSettings.livePlayingChords || completeSettings.livePlayingChords.length !== Constants.LIVE_PLAYING_KEYS.length) {
                completeSettings.livePlayingChords = Array(Constants.LIVE_PLAYING_KEYS.length).fill("");
            }
            applySettingsToUI(completeSettings);
            autosaveCurrentSettings(); 
        } catch (error) {
            alert("Failed to load settings from file.");
        }
    };
    reader.onerror = (e) => {
        alert("Error reading file.");
    };
    reader.readAsText(file);
    event.target.value = null;
}

export function autosaveCurrentSettings() {
    try {
        const currentSettings = collectCurrentSettings();
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(currentSettings));
    } catch (e) {
    }
}

export function loadAutosavedSettings() {
    try {
        const savedSettingsJSON = localStorage.getItem(AUTOSAVE_KEY);
        if (savedSettingsJSON) {
            const savedSettings = JSON.parse(savedSettingsJSON);
            const completeSettings = { ...Constants.defaultSettings, ...savedSettings };
             if (!completeSettings.livePlayingChords || completeSettings.livePlayingChords.length !== Constants.LIVE_PLAYING_KEYS.length) {
                completeSettings.livePlayingChords = Array(Constants.LIVE_PLAYING_KEYS.length).fill("");
            }
            applySettingsToUI(completeSettings);
            return true; 
        }
    } catch (e) {
        localStorage.removeItem(AUTOSAVE_KEY); 
    }
    return false; 
}

export function clearAutosavedSettings() {
    try {
        localStorage.removeItem(AUTOSAVE_KEY);
    } catch (e) {
    }
}
