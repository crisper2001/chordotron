import * as AppState from './state.js';

export function playFrequencies(frequencies, noteHeldDuration, startTime, adsr, currentOscillatorType, gainMultiplier = 0.3) {
    const { attack, decay, sustain, release } = adsr;
    const totalSoundDuration = noteHeldDuration + release;
    const currentActiveOscillators = [];

    frequencies.forEach(freq => {
        if (freq <= 0) return;
        const oscillator = AppState.audioCtx.createOscillator();
        const gainNode = AppState.audioCtx.createGain();
        oscillator.type = currentOscillatorType;
        oscillator.frequency.setValueAtTime(freq, startTime);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(gainMultiplier, startTime + attack);
        const sustainStartTime = startTime + attack + decay;
        gainNode.gain.linearRampToValueAtTime(gainMultiplier * sustain, sustainStartTime);
        const releaseStartTime = startTime + noteHeldDuration;
        if (releaseStartTime > sustainStartTime) gainNode.gain.setValueAtTime(gainMultiplier * sustain, releaseStartTime);
        gainNode.gain.linearRampToValueAtTime(0, releaseStartTime + release);
        oscillator.connect(gainNode);
        gainNode.connect(AppState.audioCtx.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + totalSoundDuration);
        currentActiveOscillators.push({ oscillator, gainNode, stopTime: startTime + totalSoundDuration });
    });
    AppState.setActiveOscillators([...AppState.activeOscillators, ...currentActiveOscillators]);
}