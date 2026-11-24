import { MIDI_C8 } from '../config/constants';
import type { ArpRate, ArpeggiatorSettings } from '../types/chordotron';
import { frequencyToMidi } from './music-theory';

export interface ArpStepEvent {
  frequencies: number[];
  startTime: number;
  durationSec: number;
}

export function getArpStepDurationSec(bpm: number, rate: ArpRate): number {
  const safeBpm = Math.max(20, Math.min(400, bpm || 120));
  const quarterSec = 60 / safeBpm;
  switch (rate) {
    case '1/4':
      return quarterSec;
    case '1/8':
      return quarterSec / 2;
    case '1/8T':
      return quarterSec / 3;
    case '1/16':
      return quarterSec / 4;
    default:
      return quarterSec / 2;
  }
}

export function getArpStepBeatFraction(rate: ArpRate): number {
  switch (rate) {
    case '1/4':
      return 1;
    case '1/8':
      return 0.5;
    case '1/8T':
      return 1 / 3;
    case '1/16':
      return 0.25;
    default:
      return 0.5;
  }
}

export function expandArpNotes(baseFrequencies: number[], octaves: number): number[] {
  if (!baseFrequencies || baseFrequencies.length === 0) return [];
  const sortedBase = [...baseFrequencies]
    .filter((f) => Number.isFinite(f) && f > 0)
    .sort((a, b) => a - b);
  if (sortedBase.length === 0) return [];

  const safeOctaves = Math.max(1, Math.min(3, Math.round(octaves || 1)));
  const expanded: number[] = [];

  for (let oct = 0; oct < safeOctaves; oct++) {
    const multiplier = Math.pow(2, oct);
    for (const freq of sortedBase) {
      const candidate = freq * multiplier;
      if (frequencyToMidi(candidate) <= MIDI_C8) {
        expanded.push(candidate);
      }
    }
  }

  return expanded.length > 0 ? expanded : sortedBase;
}

export function buildArpStepFrequencies(
  baseFrequencies: number[],
  settings: ArpeggiatorSettings,
  stepIndex: number,
  rng: () => number = Math.random
): number[] {
  const pool = expandArpNotes(baseFrequencies, settings.octaves);
  if (pool.length === 0) return [];

  if (settings.pattern === 'chord') {
    return pool;
  }

  const n = pool.length;
  if (n === 1) return [pool[0]];

  const safeStep = Math.max(0, Math.floor(stepIndex));

  switch (settings.pattern) {
    case 'up':
      return [pool[safeStep % n]];

    case 'down':
      return [pool[n - 1 - (safeStep % n)]];

    case 'upDown': {
      // [0, 1, ..., n-1, n-2, ..., 1] -> period = 2*(n-1)
      const period = (n - 1) * 2;
      const pos = safeStep % period;
      const idx = pos < n ? pos : period - pos;
      return [pool[idx]];
    }

    case 'downUp': {
      // [n-1, n-2, ..., 0, 1, ..., n-2] -> period = 2*(n-1)
      const period = (n - 1) * 2;
      const pos = safeStep % period;
      const idx = pos < n ? n - 1 - pos : pos - (n - 1);
      return [pool[idx]];
    }

    case 'random': {
      const randVal = Math.max(0, Math.min(0.999999, rng()));
      const idx = Math.floor(randVal * n);
      return [pool[idx]];
    }

    default:
      return [pool[safeStep % n]];
  }
}

export function generateArpEventsForChord(
  baseFrequencies: number[],
  chordStartTime: number,
  chordDurationSec: number,
  bpm: number,
  settings: ArpeggiatorSettings,
  rng: () => number = Math.random
): ArpStepEvent[] {
  if (!baseFrequencies || baseFrequencies.length === 0 || chordDurationSec <= 0) {
    return [];
  }

  const stepDuration = getArpStepDurationSec(bpm, settings.rate);
  if (stepDuration <= 0) return [];

  const gate = Math.max(0.15, Math.min(1.0, settings.gate));
  const events: ArpStepEvent[] = [];
  let stepIndex = 0;

  while (stepIndex * stepDuration < chordDurationSec - 0.005) {
    const offset = stepIndex * stepDuration;
    const remaining = chordDurationSec - offset;
    const noteDur = Math.max(0.03, Math.min(stepDuration * gate, remaining));
    const freqs = buildArpStepFrequencies(baseFrequencies, settings, stepIndex, rng);

    if (freqs.length > 0) {
      events.push({
        frequencies: freqs,
        startTime: chordStartTime + offset,
        durationSec: noteDur,
      });
    }

    stepIndex += 1;
    if (stepIndex > 512) break;
  }

  return events;
}
