import * as AppState from '../config/state.js';
import * as DomElements from '../dom/dom-elements.js';

function createSoundSource(freq, startTime, adsr, noteHeldDuration, oscillatorType, targetGainValue) {
    if (freq <= 0) return null;

    const oscillator = AppState.audioCtx.createOscillator();
    const gainNode = AppState.audioCtx.createGain();

    oscillator.type = oscillatorType;
    oscillator.frequency.setValueAtTime(freq, startTime);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(targetGainValue, startTime + adsr.attack);

    const sustainStartTime = startTime + adsr.attack + adsr.decay;
    const sustainLevelAbsolute = targetGainValue * adsr.sustain;
    gainNode.gain.linearRampToValueAtTime(sustainLevelAbsolute, sustainStartTime);

    if (noteHeldDuration !== Infinity) {
        const releasePhaseStartTime = startTime + noteHeldDuration;
        if (releasePhaseStartTime > sustainStartTime) {
            gainNode.gain.setValueAtTime(sustainLevelAbsolute, releasePhaseStartTime);
        }
        gainNode.gain.linearRampToValueAtTime(0, releasePhaseStartTime + adsr.release);
    }

    oscillator.connect(gainNode);
    gainNode.connect(AppState.audioCtx.destination);

    oscillator.start(startTime);

    const theoreticalEndTime = (noteHeldDuration === Infinity)
        ? Infinity
        : startTime + noteHeldDuration + adsr.release;

    return { oscillator, gainNode, theoreticalEndTime };
}

export function playTimedFrequencies(frequencies, noteHeldDuration, startTime, adsr, currentOscillatorType, combinedGainValue, type = 'chord') {
    const newActiveOscillators = [];

    frequencies.forEach(freq => {
        const soundSource = createSoundSource(freq, startTime, adsr, noteHeldDuration, currentOscillatorType, combinedGainValue);
        if (soundSource) {
            soundSource.oscillator.stop(soundSource.theoreticalEndTime);
            newActiveOscillators.push({ 
                oscillator: soundSource.oscillator, 
                gainNode: soundSource.gainNode, 
                stopTime: soundSource.theoreticalEndTime, 
                type 
            });
        }
    });
    AppState.setActiveOscillators([...AppState.activeOscillators, ...newActiveOscillators]);
}

export function startLiveFrequencies(frequencies, startTime, adsr, currentOscillatorType, combinedGainValue, keyIdentifier) {
    if (AppState.livePlayingAudioNodes[keyIdentifier]) {
        stopLiveFrequencies(keyIdentifier, 0.01); 
    }

    const newNodesForKey = [];
    frequencies.forEach(freq => {
        const soundSource = createSoundSource(freq, startTime, adsr, Infinity, currentOscillatorType, combinedGainValue);
        if (soundSource) {
            newNodesForKey.push({
                oscillator: soundSource.oscillator,
                gainNode: soundSource.gainNode,
                keyIdentifier: keyIdentifier, 
                type: 'livePlaying'
            });
        }
    });

    AppState.livePlayingAudioNodes[keyIdentifier] = newNodesForKey;
}

export function stopLiveFrequencies(keyIdentifier, customReleaseTime) {
    const nodesToStop = AppState.livePlayingAudioNodes[keyIdentifier];
    if (!nodesToStop || nodesToStop.length === 0) {
        return;
    }

    const releaseTime = customReleaseTime !== undefined 
        ? customReleaseTime 
        : Math.max(0.01, parseFloat(DomElements.releaseSlider.value)); 

    const now = AppState.audioCtx.currentTime;

    nodesToStop.forEach(({ oscillator, gainNode }) => {
        try {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now); 
            gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);
            oscillator.stop(now + releaseTime + 0.01); 
        } catch (e) {
        }
    });

    delete AppState.livePlayingAudioNodes[keyIdentifier]; 
}
