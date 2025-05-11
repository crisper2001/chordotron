import * as AppState from './state.js';

export function playFrequencies(frequencies, noteHeldDuration, startTime, adsr, currentOscillatorType, combinedGainValue, type = 'chord') {
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
        gainNode.gain.linearRampToValueAtTime(combinedGainValue, startTime + attack);
        
        const sustainStartTime = startTime + attack + decay;
        const sustainLevelAbsolute = combinedGainValue * sustain;
        gainNode.gain.linearRampToValueAtTime(sustainLevelAbsolute, sustainStartTime);
        
        const releaseStartTime = startTime + noteHeldDuration;
        if (releaseStartTime > sustainStartTime) {
            gainNode.gain.setValueAtTime(sustainLevelAbsolute, releaseStartTime);
        }
        gainNode.gain.linearRampToValueAtTime(0, releaseStartTime + release);
        
        oscillator.connect(gainNode);
        gainNode.connect(AppState.audioCtx.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + totalSoundDuration);
        currentActiveOscillators.push({ oscillator, gainNode, stopTime: startTime + totalSoundDuration, type });
    });
    AppState.setActiveOscillators([...AppState.activeOscillators, ...currentActiveOscillators]);
}
