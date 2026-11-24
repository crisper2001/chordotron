import React, { useMemo } from 'react';
import { ALL_NOTE_NAMES, MIDI_B5, MIDI_C2, SEMITONES_IN_OCTAVE } from '../config/constants';

interface PianoKeyboardProps {
  activeMidiNotes: number[];
  rangeMinMidi: number | null;
  rangeMaxMidi: number | null;
  onNotePress?: (midiNote: number) => void;
  onNoteRelease?: (midiNote: number) => void;
}

interface KeyDescriptor {
  midiNote: number;
  noteName: string;
  octave: number;
  isBlack: boolean;
  leftPercent: number;
  widthPercent: number;
}

const BLACK_KEY_INFO: Record<number, { offsetFactor: number; widthFactor: number }> = {
  1: { offsetFactor: 0.6, widthFactor: 0.7 },
  3: { offsetFactor: 0.6, widthFactor: 0.7 },
  6: { offsetFactor: 0.65, widthFactor: 0.7 },
  8: { offsetFactor: 0.6, widthFactor: 0.7 },
  10: { offsetFactor: 0.6, widthFactor: 0.7 },
};

const NUM_OCTAVES = 4; // C2 to B5 (48 semitones)

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  activeMidiNotes,
  rangeMinMidi,
  rangeMaxMidi,
  onNotePress,
  onNoteRelease,
}) => {
  const keys = useMemo<KeyDescriptor[]>(() => {
    const list: KeyDescriptor[] = [];
    const numWhiteKeys = NUM_OCTAVES * 7;
    const whiteKeyWidth = 100 / numWhiteKeys;
    let whiteKeyIndex = 0;

    for (let i = 0; i < NUM_OCTAVES * SEMITONES_IN_OCTAVE; i++) {
      const midiNote = MIDI_C2 + i;
      if (midiNote > MIDI_B5) break;
      const noteIndexInOctave = midiNote % SEMITONES_IN_OCTAVE;
      const noteName = ALL_NOTE_NAMES[noteIndexInOctave];
      const octave = Math.floor(midiNote / SEMITONES_IN_OCTAVE) - 1;
      const blackInfo = BLACK_KEY_INFO[noteIndexInOctave];

      if (blackInfo) {
        list.push({
          midiNote,
          noteName,
          octave,
          isBlack: true,
          widthPercent: whiteKeyWidth * blackInfo.widthFactor,
          leftPercent:
            (whiteKeyIndex - 1) * whiteKeyWidth + whiteKeyWidth * blackInfo.offsetFactor,
        });
      } else {
        list.push({
          midiNote,
          noteName,
          octave,
          isBlack: false,
          widthPercent: whiteKeyWidth,
          leftPercent: whiteKeyIndex * whiteKeyWidth,
        });
        whiteKeyIndex += 1;
      }
    }
    return list;
  }, []);

  const activeSet = useMemo(() => new Set(activeMidiNotes), [activeMidiNotes]);

  return (
    <section
      aria-label="Piano keyboard visualizer"
      className="bg-slate-200/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-b border-slate-300 dark:border-slate-800 px-2 sm:px-6 py-1 sm:py-1.5 shrink-0"
    >
      <div
        data-testid="piano-keyboard"
        className="relative w-full max-w-[1040px] mx-auto h-[52px] sm:h-[72px] bg-slate-800 dark:bg-slate-950 rounded overflow-hidden shadow-inner border border-slate-400 dark:border-slate-700 select-none"
      >
        {keys.map((key) => {
          const isActive = activeSet.has(key.midiNote);
          const inRange =
            rangeMinMidi !== null &&
            rangeMaxMidi !== null &&
            key.midiNote >= rangeMinMidi &&
            key.midiNote <= rangeMaxMidi;

          let bgClass = '';
          if (key.isBlack) {
            if (isActive) {
              bgClass = 'bg-blue-600 border-blue-800';
            } else if (inRange) {
              bgClass = 'bg-slate-600 border-slate-800 dark:bg-slate-700 dark:border-slate-900';
            } else {
              bgClass = 'bg-slate-900 border-slate-950 dark:bg-slate-950 dark:border-black';
            }
          } else {
            if (isActive) {
              bgClass = 'bg-blue-400 border-slate-500';
            } else if (inRange) {
              bgClass = 'bg-blue-50 border-slate-400 dark:bg-blue-100/90 dark:border-slate-500';
            } else {
              bgClass = 'bg-slate-50 border-slate-400 dark:bg-slate-300 dark:border-slate-500';
            }
          }

          return (
            <button
              key={key.midiNote}
              type="button"
              data-midi={key.midiNote}
              data-active={isActive ? 'true' : 'false'}
              data-in-range={inRange ? 'true' : 'false'}
              aria-label={`${key.noteName}${key.octave}`}
              onPointerDown={(e) => {
                e.preventDefault();
                onNotePress?.(key.midiNote);
              }}
              onPointerUp={() => onNoteRelease?.(key.midiNote)}
              onPointerLeave={() => onNoteRelease?.(key.midiNote)}
              onPointerCancel={() => onNoteRelease?.(key.midiNote)}
              style={{
                left: `${key.leftPercent}%`,
                width: `${key.widthPercent}%`,
              }}
              className={`absolute top-0 border-r border-b transition-colors duration-75 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                key.isBlack ? 'h-[60%] z-10 rounded-b-[2px] border-l shadow-sm' : 'h-full z-0 flex items-end justify-center pb-1'
              } ${bgClass}`}
            >
              {!key.isBlack && key.noteName === 'C' && (
                <span
                  className={`font-mono text-[10px] leading-none pointer-events-none ${
                    isActive ? 'text-white font-semibold' : 'text-slate-600'
                  }`}
                >
                  C{key.octave}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
