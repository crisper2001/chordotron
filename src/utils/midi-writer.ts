import type { ArpeggiatorSettings, VoicedChord } from '../types/chordotron';
import { buildArpStepFrequencies, getArpStepBeatFraction } from './arpeggiator';
import { frequencyToMidi, getBeatDurationFactorForTimeSignature } from './music-theory';

const PPQN = 480;

const EVENT_NOTE_OFF = 0x80;
const EVENT_NOTE_ON = 0x90;
const EVENT_META = 0xff;
const META_TEMPO = 0x51;
const META_TIME_SIGNATURE = 0x58;
const META_END_OF_TRACK = 0x2f;

interface MidiEvent {
  time: number;
  type: number;
  channel: number;
  param1?: number;
  param2?: number;
  metaType?: number;
  data?: number[];
}

function writeVarInt(value: number): number[] {
  if (value < 0) throw new Error('Cannot write negative variable-length integer.');
  if (value > 0x0fffffff) throw new Error('Cannot write variable-length integer greater than 0x0FFFFFFF.');
  let remaining = value;
  const buffer: number[] = [remaining & 0x7f];
  while ((remaining >>= 7)) {
    buffer.push((remaining & 0x7f) | 0x80);
  }
  buffer.reverse();
  return buffer;
}

function encodeEvent(event: MidiEvent): number[] {
  if (event.type === EVENT_NOTE_OFF || event.type === EVENT_NOTE_ON) {
    return [(event.type | event.channel) & 0xff, (event.param1 ?? 0) & 0x7f, (event.param2 ?? 0) & 0x7f];
  }
  if (event.type === EVENT_META) {
    const bytes = [event.type & 0xff, (event.metaType ?? 0) & 0xff];
    if (event.data && event.data.length > 0) {
      bytes.push(...writeVarInt(event.data.length), ...event.data.map((b) => b & 0xff));
    } else {
      bytes.push(0);
    }
    return bytes;
  }
  return [];
}

function denominatorToPowerOfTwo(denominator: number): number {
  switch (denominator) {
    case 1:
      return 0;
    case 2:
      return 1;
    case 4:
      return 2;
    case 8:
      return 3;
    case 16:
      return 4;
    default:
      return 2;
  }
}

export function buildMidiBytes(
  voicedChords: VoicedChord[],
  bpm: number,
  timeSignatureStr: string,
  arpeggiator?: ArpeggiatorSettings
): Uint8Array {
  if (!voicedChords || voicedChords.length === 0) {
    throw new Error('No chords to export.');
  }

  const events: MidiEvent[] = [];

  // Tempo meta event
  const safeBpm = Math.max(20, Math.min(400, bpm || 120));
  const mspqn = Math.round(60000000 / safeBpm);
  events.push({
    time: 0,
    type: EVENT_META,
    channel: 0,
    metaType: META_TEMPO,
    data: [(mspqn >> 16) & 0xff, (mspqn >> 8) & 0xff, mspqn & 0xff],
  });

  // Time signature meta event
  const [tsNumeratorRaw, tsDenominatorRaw] = timeSignatureStr.split('/').map(Number);
  const tsNumerator = Number.isFinite(tsNumeratorRaw) && tsNumeratorRaw > 0 ? tsNumeratorRaw : 4;
  const tsDenominator = Number.isFinite(tsDenominatorRaw) && tsDenominatorRaw > 0 ? tsDenominatorRaw : 4;
  events.push({
    time: 0,
    type: EVENT_META,
    channel: 0,
    metaType: META_TIME_SIGNATURE,
    data: [tsNumerator, denominatorToPowerOfTwo(tsDenominator), 24, 8],
  });

  let currentTimeTicks = 0;
  const timeSigBeatFactor = getBeatDurationFactorForTimeSignature(timeSignatureStr);

  for (const chord of voicedChords) {
    const durationTicks = Math.max(1, Math.round(chord.beats * timeSigBeatFactor * PPQN));

    if (arpeggiator?.enabled && chord.frequencies && chord.frequencies.length > 0) {
      const stepBeats = getArpStepBeatFraction(arpeggiator.rate);
      const stepTicks = Math.max(1, Math.round(stepBeats * PPQN));
      const gate = Math.max(0.15, Math.min(1.0, arpeggiator.gate));
      let offsetTicks = 0;
      let stepIdx = 0;

      while (offsetTicks < durationTicks - 4) {
        const remaining = durationTicks - offsetTicks;
        const noteTicks = Math.max(1, Math.min(Math.round(stepTicks * gate), remaining));
        const freqs = buildArpStepFrequencies(chord.frequencies, arpeggiator, stepIdx);
        const midiNotes = freqs
          .map((freq) => frequencyToMidi(freq))
          .filter((note) => note >= 0 && note <= 127);

        for (const note of midiNotes) {
          events.push({
            time: currentTimeTicks + offsetTicks,
            type: EVENT_NOTE_ON,
            channel: 0,
            param1: note,
            param2: 90,
          });
          events.push({
            time: currentTimeTicks + offsetTicks + noteTicks,
            type: EVENT_NOTE_OFF,
            channel: 0,
            param1: note,
            param2: 0,
          });
        }

        offsetTicks += stepTicks;
        stepIdx += 1;
      }
    } else {
      const midiNotes = chord.frequencies
        ? chord.frequencies.map((freq) => frequencyToMidi(freq)).filter((note) => note >= 0 && note <= 127)
        : [];

      for (const note of midiNotes) {
        events.push({
          time: currentTimeTicks,
          type: EVENT_NOTE_ON,
          channel: 0,
          param1: note,
          param2: 90,
        });
        events.push({
          time: currentTimeTicks + durationTicks,
          type: EVENT_NOTE_OFF,
          channel: 0,
          param1: note,
          param2: 0,
        });
      }
    }

    currentTimeTicks += durationTicks;
  }

  // Stable sort by time (with NOTE_OFF before NOTE_ON on identical ticks for clean re-triggering)
  events.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    if (a.type === EVENT_META && b.type !== EVENT_META) return -1;
    if (b.type === EVENT_META && a.type !== EVENT_META) return 1;
    if (a.type === EVENT_NOTE_OFF && b.type === EVENT_NOTE_ON) return -1;
    if (a.type === EVENT_NOTE_ON && b.type === EVENT_NOTE_OFF) return 1;
    return 0;
  });

  const trackBody: number[] = [];
  let lastTime = 0;
  for (const ev of events) {
    const delta = Math.max(0, ev.time - lastTime);
    trackBody.push(...writeVarInt(delta), ...encodeEvent(ev));
    lastTime = ev.time;
  }
  // End of track meta event
  trackBody.push(0x00, 0xff, META_END_OF_TRACK, 0x00);

  const trackLen = trackBody.length;
  const headerChunk = [
    0x4d, 0x54, 0x68, 0x64, // MThd
    0x00, 0x00, 0x00, 0x06, // header length 6
    0x00, 0x00,             // format 0 (single track)
    0x00, 0x01,             // 1 track
    (PPQN >> 8) & 0xff,
    PPQN & 0xff,
  ];
  const trackHeader = [
    0x4d, 0x54, 0x72, 0x6b, // MTrk
    (trackLen >> 24) & 0xff,
    (trackLen >> 16) & 0xff,
    (trackLen >> 8) & 0xff,
    trackLen & 0xff,
  ];

  return new Uint8Array([...headerChunk, ...trackHeader, ...trackBody]);
}

export function exportProgressionToMidiBlob(
  voicedChords: VoicedChord[],
  bpm: number,
  timeSignatureStr: string,
  arpeggiator?: ArpeggiatorSettings
): Blob {
  const bytes = buildMidiBytes(voicedChords, bpm, timeSignatureStr, arpeggiator);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: 'audio/midi' });
}
