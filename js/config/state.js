export const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
export let masterGainNode = audioCtx.createGain();
export let audioRecordStreamDestination = null;
export let mediaRecorder = null;
export let recordedAudioChunks = [];
export let isRecording = false;

export let activeOscillators = [];
export let currentSchedulerTimeoutId = null;
export let sequencePlaying = false;
export let originalChords = [];
export let currentChordIndex = 0;
export let currentBeatInSequenceForVisualMetronome = 0;
export let nextEventTime = 0;
export const livePlayingAudioNodes = {};
export const activeLiveKeys = new Set();

export let recordingStartTime = null;
export let finalRecordingDuration = null;
export let recordingDurationUpdaterId = null;

export function setActiveOscillators(newOscillators) { activeOscillators = newOscillators; }
export function setCurrentSchedulerTimeoutId(id) { currentSchedulerTimeoutId = id; }
export function setSequencePlaying(playing) { sequencePlaying = playing; }
export function setOriginalChords(chords) { originalChords = chords; }
export function setCurrentChordIndex(index) { currentChordIndex = index; }
export function setCurrentBeatInSequenceForVisualMetronome(beat) { currentBeatInSequenceForVisualMetronome = beat; }
export function setNextEventTime(time) { nextEventTime = time; }

export function setAudioRecordStreamDestination(dest) { audioRecordStreamDestination = dest; }
export function setMediaRecorder(recorder) { mediaRecorder = recorder; }
export function setRecordedAudioChunks(chunks) { recordedAudioChunks = chunks; }
export function setIsRecording(recordingStatus) { isRecording = recordingStatus; }
export function setRecordingStartTime(time) { recordingStartTime = time; }
export function setFinalRecordingDuration(duration) { finalRecordingDuration = duration; }
export function setRecordingDurationUpdaterId(id) { recordingDurationUpdaterId = id; }
