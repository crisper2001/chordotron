import type { BpmSyncDivision } from '../types/chordotron';

export interface BpmSyncDivisionOption {
  value: BpmSyncDivision;
  label: string;
  beats: number;
}

export const BPM_SYNC_DIVISION_OPTIONS: BpmSyncDivisionOption[] = [
  { value: '4/1', label: '4/1 (4 Bars)', beats: 16 },
  { value: '2/1', label: '2/1 (2 Bars)', beats: 8 },
  { value: '1/1', label: '1/1 (1 Bar)', beats: 4 },
  { value: '1/2.', label: '1/2.', beats: 3 },
  { value: '1/2', label: '1/2', beats: 2 },
  { value: '1/4.', label: '1/4.', beats: 1.5 },
  { value: '1/4', label: '1/4', beats: 1 },
  { value: '1/8.', label: '1/8.', beats: 0.75 },
  { value: '1/8', label: '1/8', beats: 0.5 },
  { value: '1/8T', label: '1/8T', beats: 1 / 3 },
  { value: '1/16', label: '1/16', beats: 0.25 },
];

export const DELAY_SYNC_DIVISIONS: BpmSyncDivisionOption[] = BPM_SYNC_DIVISION_OPTIONS.filter(
  (opt) => opt.beats <= 4
);

export const LFO_SYNC_DIVISIONS: BpmSyncDivisionOption[] = BPM_SYNC_DIVISION_OPTIONS;

const DIVISION_BEATS_MAP: Record<BpmSyncDivision, number> = BPM_SYNC_DIVISION_OPTIONS.reduce(
  (acc, item) => {
    acc[item.value] = item.beats;
    return acc;
  },
  {} as Record<BpmSyncDivision, number>
);

export function isValidBpmSyncDivision(value: unknown): value is BpmSyncDivision {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(DIVISION_BEATS_MAP, value);
}

export function getDivisionBeats(division: BpmSyncDivision): number {
  return DIVISION_BEATS_MAP[division] ?? 1;
}

/**
 * Converts BPM + musical note division into delay time in seconds,
 * clamped safely inside the Web Audio DelayNode capacity (0.03s..1.80s).
 */
export function bpmToDelaySeconds(bpm: number, division: BpmSyncDivision): number {
  const safeBpm = Number.isFinite(bpm) ? Math.max(30, Math.min(300, bpm)) : 120;
  const beats = getDivisionBeats(division);
  const seconds = (60 / safeBpm) * beats;
  return Math.max(0.03, Math.min(1.8, seconds));
}

/**
 * Converts BPM + musical note division into LFO cycle rate in Hz,
 * where one LFO cycle spans `division` beats.
 */
export function bpmToLfoHz(bpm: number, division: BpmSyncDivision): number {
  const safeBpm = Number.isFinite(bpm) ? Math.max(30, Math.min(300, bpm)) : 120;
  const beats = getDivisionBeats(division);
  const hz = safeBpm / 60 / beats;
  return Math.max(0.05, Math.min(16.0, hz));
}
