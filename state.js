export const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
export let activeOscillators = [];
export let currentSchedulerTimeoutId = null;
export let sequencePlaying = false;
export let originalChords = []; // Will store { name, beats, originalInputToken, frequencies }
export let currentChordIndex = 0;
export let currentBeatInSequenceForVisualMetronome = 0;
export let nextEventTime = 0;

// Functions to update state (optional, but can be good practice)
export function setActiveOscillators(newOscillators) { activeOscillators = newOscillators; }
export function setCurrentSchedulerTimeoutId(id) { currentSchedulerTimeoutId = id; }
export function setSequencePlaying(playing) { sequencePlaying = playing; }
export function setOriginalChords(chords) { originalChords = chords; }
export function setCurrentChordIndex(index) { currentChordIndex = index; }
export function setCurrentBeatInSequenceForVisualMetronome(beat) { currentBeatInSequenceForVisualMetronome = beat; }
export function setNextEventTime(time) { nextEventTime = time; }