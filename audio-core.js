import * as AppState from './state.js';

// gainMultiplier now represents the combined (synthGain * masterGain) or (metronomeAdj * masterGain)
export function playFrequencies(frequencies, noteHeldDuration, startTime, adsr, currentOscillatorType, combinedGainValue) {
    const { attack, decay, sustain, release } = adsr;
    const totalSoundDuration = noteHeldDuration + release;
    const currentActiveOscillators = [];

    frequencies.forEach(freq => {
        if (freq <= 0) return;
        const oscillator = AppState.audioCtx.createOscillator();
        const gainNode = AppState.audioCtx.createGain();
        oscillator.type = currentOscillatorType;
        oscillator.frequency.setValueAtTime(freq, startTime);

        // ADSR envelope is now shaped relative to the combinedGainValue
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(combinedGainValue, startTime + attack); // Peak is combinedGainValue
        
        const sustainStartTime = startTime + attack + decay;
        const sustainLevelAbsolute = combinedGainValue * sustain; // Sustain level relative to combinedGainValue
        gainNode.gain.linearRampToValueAtTime(sustainLevelAbsolute, sustainStartTime);
        
        const releaseStartTime = startTime + noteHeldDuration;
        if (releaseStartTime > sustainStartTime) {
            // Ensure sustain level is held until release starts
            gainNode.gain.setValueAtTime(sustainLevelAbsolute, releaseStartTime); 
        }
        gainNode.gain.linearRampToValueAtTime(0, releaseStartTime + release);
        
        oscillator.connect(gainNode);
        gainNode.connect(AppState.audioCtx.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + totalSoundDuration);
        currentActiveOscillators.push({ oscillator, gainNode, stopTime: startTime + totalSoundDuration });
    });
    AppState.setActiveOscillators([...AppState.activeOscillators, ...currentActiveOscillators]);
}