// dom-elements.js
export const mainControlsFieldset = document.getElementById('mainControlsFieldset');
export const appActionsFieldset = document.getElementById('appActionsFieldset');
export const parametersControlsFieldset = document.getElementById('parametersControlsFieldset');
export const inputModeRadios = document.querySelectorAll('input[name="inputMode"]');
export const chordNameInputArea = document.getElementById('chordNameInputArea');
export const scaleDegreeInputArea = document.getElementById('scaleDegreeInputArea');
export const livePlayingInputArea = document.getElementById('livePlayingInputArea');
export const chordInputEl = document.getElementById('chordInput');
export const scaleDegreeInputEl = document.getElementById('scaleDegreeInput');

export const triggerChordInputs = Array.from(document.querySelectorAll('.trigger-chord-input'));

export const songKeySelect = document.getElementById('songKey');
export const keyModeSelect = document.getElementById('keyMode');
export const bpmSlider = document.getElementById('bpm');
export const bpmValueSpan = document.getElementById('bpmValue');
export const timeSignatureSelect = document.getElementById('timeSignature');
export const attackSlider = document.getElementById('attack');
export const attackValueSpan = document.getElementById('attackValue');
export const decaySlider = document.getElementById('decay');
export const decayValueSpan = document.getElementById('decayValue');
export const sustainSlider = document.getElementById('sustain');
export const sustainValueSpan = document.getElementById('sustainValue');
export const releaseSlider = document.getElementById('release');
export const releaseValueSpan = document.getElementById('releaseValue');
export const oscillatorTypeEl = document.getElementById('oscillatorType');
export const loopToggle = document.getElementById('loopToggle');
export const metronomeAudioToggle = document.getElementById('metronomeAudioToggle');
export const metronomeVolumeSlider = document.getElementById('metronomeVolume');
export const metronomeVolumeValueSpan = document.getElementById('metronomeVolumeValue');
export const playStopButton = document.getElementById('playStopButton');
export const currentChordDisplay = document.getElementById('currentChordDisplay');
export const prevChordDisplay = document.getElementById('prevChordDisplay');
export const nextChordDisplay = document.getElementById('nextChordDisplay');
export const beatIndicatorContainer = document.getElementById('beatIndicatorContainer');
export const restoreDefaultsButton = document.getElementById('restoreDefaultsButton');
export const saveSettingsButton = document.getElementById('saveSettingsButton');
export const loadSettingsFile = document.getElementById('loadSettingsFile');
export const loadSettingsButton = document.getElementById('loadSettingsButton');
export const recordButton = document.getElementById('recordButton');
export const downloadRecordingButton = document.getElementById('downloadRecordingButton');
export const recordingDurationDisplay = document.getElementById('recordingDurationDisplay');
export const exportMidiButton = document.getElementById('exportMidiButton'); // Added


export const rangeStartNoteSlider = document.getElementById('rangeStartNoteSlider');
export const rangeStartNoteValueSpan = document.getElementById('rangeStartNoteValue');
export const rangeLengthSlider = document.getElementById('rangeLengthSlider');
export const rangeLengthValueSpan = document.getElementById('rangeLengthValue');
export const currentRangeDisplaySpan = document.getElementById('currentRangeDisplay');

export const pianoKeyboardContainer = document.getElementById('pianoKeyboardContainer');

export const adsrCanvas = document.getElementById('adsrCanvas');

export const masterGainSlider = document.getElementById('masterGain');
export const masterGainValueSpan = document.getElementById('masterGainValue');

export const synthGainSlider = document.getElementById('synthGain');
export const synthGainValueSpan = document.getElementById('synthGainValue');

export const helpModalOverlay = document.getElementById('helpModalOverlay');
export const modalCloseButton = document.getElementById('modalCloseButton');
export const helpButton = document.getElementById('helpButton');

export const timingParametersGroup = document.getElementById('timingParametersGroup');
export const pitchRangeParametersGroup = document.getElementById('pitchRangeParametersGroup');
export const soundOptionsGroup = document.getElementById('soundOptionsGroup');
export const metronomeVolumeLabel = document.getElementById('metronomeVolumeLabel'); 
export const playbackFooter = document.getElementById('playbackFooter');
export const mainPlaybackWrapper = document.getElementById('mainPlaybackWrapper');
export const prevChordDisplayContainer = document.getElementById('prevChordDisplayContainer');
export const nextChordDisplayContainer = document.getElementById('nextChordDisplayContainer');
export const mainPlaybackControls = document.getElementById('mainPlaybackControls');
export const mainPlaybackInfo = document.getElementById('mainPlaybackInfo');
