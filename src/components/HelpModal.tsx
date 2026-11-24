import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close help dialog"
          className="absolute top-4 right-4 p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <h2
          id="help-modal-title"
          className="text-xl font-bold text-slate-900 dark:text-slate-50 pb-3 mb-4 border-b border-slate-200 dark:border-slate-800"
        >
          Chordotron Guide
        </h2>

        <div className="space-y-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <section>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5">1. Input Modes</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Chord Names:</strong> Enter standard chord notation separated by spaces, such as{' '}
                <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">E(8) C#m(8) A(8) B(8)</code>.
                Optional beat counts go in parentheses, and slash chords like{' '}
                <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">G/B</code> are supported.
              </li>
              <li>
                <strong>Scale Degrees:</strong> Enter Roman numerals relative to your chosen Song Key and Mode, e.g.{' '}
                <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">I(2) V(2) vi(2) iii(2) IV(2)</code>.
              </li>
              <li>
                <strong>Live Playing:</strong> Assign up to 12 chords to slots <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">1</code> through{' '}
                <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">=</code>. Hold the matching key on your keyboard or hold the key pad button to sustain the chord.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5">2. Timing, Instruments & Synth</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>BPM, Tap Tempo & Direct Input:</strong> Drag sliders, click any numeric readout to type exact values directly, or click <strong>Tap Tempo</strong> repeatedly to match your beat.
              </li>
              <li>
                <strong>Instruments & Synth:</strong> Choose built-in instruments (Acoustic Piano, Electric Piano, Drawbar Organ, Warm Synth Pad, Chamber Strings, Nylon Pluck, Synth Brass, Crystal Bell, or Raw Synth) and sculpt waveform, ADSR envelope, filter type/cutoff/resonance/envelope, unison detune, and sub-oscillator mix.
              </li>
              <li>
                <strong>Arpeggiator:</strong> Turn on the Arpeggiator to step through chord notes with Up, Down, Up-Down, Down-Up, Random, or Chord Pulse patterns at synced note divisions across 1–3 octaves.
              </li>
              <li>
                <strong>Effects Rack & BPM Sync:</strong> Toggle and customize Reverb, Delay, Chorus, Flanger, Phaser, Vibrato, and Tremolo in real time, with optional <strong>Sync</strong> to lock Delay time or modulation LFO rates to project BPM divisions.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5">3. Export, Recording & Theme</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Selection Playback & Looping:</strong> Highlight chords in the input box—or toggle <strong>Select Range</strong> (or Shift+Click) on the Visual Sequencer timeline—to audition or export just that range. Turn on <strong>Loop</strong> to repeat the selected chords continuously.
              </li>
              <li>
                <strong>Export MIDI & Record:</strong> Download standard <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">.mid</code> files or capture live audio recordings including effects.
              </li>
              <li>
                <strong>Dark / Light Mode:</strong> Toggle the theme button in the top bar; your preference is saved automatically.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5">4. Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div><code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Space</code> Play / Stop</div>
              <div><code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">L</code> Toggle Loop</div>
              <div><code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">M</code> Toggle Metronome</div>
              <div><code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">R</code> Toggle Recording</div>
              <div><code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">N</code> New Song (Reset)</div>
              <div><code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">O</code> Load Settings</div>
              <div><code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">S</code> Save Settings</div>
              <div><code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">1</code>–<code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">=</code> Hold Live Chords</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
