import * as DomElements from './dom-elements.js';
import { applySettingsToUI } from './ui-helpers.js'; 

export function collectCurrentSettings() {
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
        console.log('Settings saved successfully to:', handle.name);
        return true;
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('User cancelled the save file picker.');
        } else if (err.name === 'SecurityError') {
            console.error('Security error with file picker. Ensure you are on HTTPS or localhost, and permissions are granted.', err);
            alert('Could not save: A security error occurred. This feature usually requires HTTPS or localhost.');
        } else {
            console.error('Error saving settings with picker:', err);
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
    console.log('Settings downloaded as:', fileName);
}

export async function saveSettings() {
    const defaultFileName = "chordPlayerSettings.json";
    const currentSettings = collectCurrentSettings();
    const settingsJSON = JSON.stringify(currentSettings, null, 2);

    const supportsPicker = typeof window.showSaveFilePicker === 'function';

    if (supportsPicker) {
        console.log('Attempting to save with File System Access API.');
        await saveWithPicker(settingsJSON, defaultFileName);
    } else {
        console.warn('File System Access API (showSaveFilePicker) not supported or enabled. Falling back to download method.');
        saveWithPromptAndDownload(settingsJSON, defaultFileName);
    }
}

export function loadSettings(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const settings = JSON.parse(e.target.result);
            applySettingsToUI(settings); 
        } catch (error) {
            console.error("Error loading settings:", error);
            alert("Failed to load settings.");
        }
    };
    reader.onerror = (e) => {
        console.error("Error reading file:", e);
        alert("Error reading file.");
    };
    reader.readAsText(file);
    event.target.value = null; 
}
