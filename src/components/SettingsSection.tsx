import React from 'react';
import {
  FILTER_TYPE_OPTIONS,
  INSTRUMENT_PRESETS,
  MIDI_B5,
  MIDI_C2,
  OSCILLATOR_OPTIONS,
  TIME_SIGNATURE_OPTIONS,
} from '../config/constants';
import type {
  ArpeggiatorSettings,
  ChordotronSettings,
  EffectKey,
  FilterKind,
  InstrumentPreset,
  OscillatorKind,
  SynthEffectsSettings,
} from '../types/chordotron';
import { formatCutoffHz, midiToNoteNameWithOctave } from '../utils/music-theory';
import { AdsrVisualizer } from './AdsrVisualizer';
import { ArpeggiatorBar } from './ArpeggiatorBar';
import { EffectsRackPanel } from './EffectsRackPanel';
import { NumericReadoutInput } from './NumericReadoutInput';

interface SettingsSectionProps {
  settings: ChordotronSettings;
  sequencePlaying: boolean;
  isLiveKeyHeld: boolean;
  onUpdateSettings: <K extends keyof ChordotronSettings>(
    key: K,
    value: ChordotronSettings[K]
  ) => void;
  onSelectInstrument: (preset: InstrumentPreset) => void;
  onUpdatePitchRange: (startMidi: number, length: number) => void;
  onTapTempo: () => void;
  onUpdateEffect: <K extends EffectKey>(
    effectKey: K,
    patch: Partial<SynthEffectsSettings[K]>
  ) => void;
  onUpdateArpeggiator: (patch: Partial<ArpeggiatorSettings>) => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  settings,
  sequencePlaying,
  isLiveKeyHeld,
  onUpdateSettings,
  onSelectInstrument,
  onUpdatePitchRange,
  onTapTempo,
  onUpdateEffect,
  onUpdateArpeggiator,
}) => {
  const isLiveMode = settings.inputMode === 'livePlaying';
  const allLocked = sequencePlaying || isLiveKeyHeld;
  const timingDisabled = allLocked || isLiveMode;
  const metronomeDisabled = allLocked || isLiveMode;
  const synthDisabled = allLocked;
  const masterGainDisabled = sequencePlaying;

  const maxRangeStart = MIDI_B5 - (settings.rangeLength - 1);
  const clampedStartMidi = Math.max(MIDI_C2, Math.min(settings.rangeStartMidi, maxRangeStart));
  const endMidi = clampedStartMidi + settings.rangeLength - 1;
  const startNoteName = midiToNoteNameWithOctave(clampedStartMidi) ?? 'N/A';
  const endNoteName = midiToNoteNameWithOctave(endMidi) ?? 'N/A';

  return (
    <section
      aria-labelledby="settings-section-heading"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex-1 flex flex-col min-h-0"
    >
      <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <h2 id="settings-section-heading" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Settings
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {isLiveMode ? 'Timing & metronome inactive in Live mode' : 'Instrument, synth, effects & timing'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 flex-1 content-start overflow-y-auto pr-0.5">
        {/* 1. Timing */}
        <div
          className={`p-2.5 rounded-md border border-slate-200 dark:border-slate-700/80 bg-slate-50/40 dark:bg-slate-800/40 flex flex-col gap-1.5 ${
            timingDisabled ? 'opacity-50' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">Timing</h3>
            <button
              type="button"
              disabled={timingDisabled}
              onClick={onTapTempo}
              title="Tap rhythm repeatedly to set BPM"
              className="px-2.5 py-0.5 text-[11px] font-semibold rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/70 active:scale-95 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Tap Tempo
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 text-xs mb-1">
              <label htmlFor="bpm" className="font-medium text-slate-700 dark:text-slate-300">
                BPM
              </label>
              <NumericReadoutInput
                ariaLabel="BPM numeric value"
                testId="bpm-value"
                value={settings.bpm}
                min={30}
                max={300}
                step={1}
                decimals={0}
                disabled={timingDisabled}
                onCommit={(val) => onUpdateSettings('bpm', val)}
                className="w-16 text-xs"
              />
            </div>
            <input
              id="bpm"
              type="range"
              min={30}
              max={300}
              step={1}
              disabled={timingDisabled}
              value={settings.bpm}
              onChange={(e) => onUpdateSettings('bpm', parseInt(e.target.value, 10))}
              className="w-full studio-slider"
            />
          </div>

          <div>
            <label htmlFor="timeSignature" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Time Signature
            </label>
            <select
              id="timeSignature"
              disabled={timingDisabled}
              value={settings.timeSignature}
              onChange={(e) => onUpdateSettings('timeSignature', e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 disabled:bg-slate-100 dark:disabled:bg-slate-800"
            >
              {TIME_SIGNATURE_OPTIONS.map((ts) => (
                <option key={ts} value={ts}>
                  {ts}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. Pitch Range */}
        <div
          className={`p-2.5 rounded-md border border-slate-200 dark:border-slate-700/80 bg-slate-50/40 dark:bg-slate-800/40 flex flex-col gap-1.5 ${
            allLocked ? 'opacity-50' : ''
          }`}
        >
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100 pb-1 border-b border-slate-200 dark:border-slate-700">
            Pitch Range
          </h3>

          <div>
            <div className="flex items-center justify-between gap-2 text-xs mb-1">
              <label htmlFor="rangeStartNoteSlider" className="font-medium text-slate-700 dark:text-slate-300">
                Range Start
              </label>
              <div className="flex items-center gap-1.5">
                <span
                  data-testid="range-start-value"
                  className="font-mono tabular-nums font-semibold text-slate-600 dark:text-slate-300 text-[11px]"
                >
                  {startNoteName}
                </span>
                <NumericReadoutInput
                  ariaLabel="Range Start MIDI note number"
                  testId="range-start-midi-input"
                  value={clampedStartMidi}
                  min={MIDI_C2}
                  max={maxRangeStart}
                  step={1}
                  decimals={0}
                  disabled={allLocked}
                  onCommit={(val) => onUpdatePitchRange(val, settings.rangeLength)}
                  className="w-12"
                />
              </div>
            </div>
            <input
              id="rangeStartNoteSlider"
              type="range"
              min={MIDI_C2}
              max={maxRangeStart}
              step={1}
              disabled={allLocked}
              value={clampedStartMidi}
              onChange={(e) =>
                onUpdatePitchRange(parseInt(e.target.value, 10), settings.rangeLength)
              }
              className="w-full studio-slider"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 text-xs mb-1">
              <label htmlFor="rangeLengthSlider" className="font-medium text-slate-700 dark:text-slate-300">
                Range Length (semitones)
              </label>
              <NumericReadoutInput
                ariaLabel="Range Length in semitones"
                testId="range-length-value"
                value={settings.rangeLength}
                min={12}
                max={24}
                step={1}
                decimals={0}
                disabled={allLocked}
                onCommit={(val) => onUpdatePitchRange(clampedStartMidi, val)}
                className="w-12"
              />
            </div>
            <input
              id="rangeLengthSlider"
              type="range"
              min={12}
              max={24}
              step={1}
              disabled={allLocked}
              value={settings.rangeLength}
              onChange={(e) =>
                onUpdatePitchRange(clampedStartMidi, parseInt(e.target.value, 10))
              }
              className="w-full studio-slider"
            />
          </div>

          <div className="pt-1 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>Current Range</span>
            <span
              data-testid="current-range-display"
              className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100"
            >
              {startNoteName} - {endNoteName}
            </span>
          </div>
        </div>

        {/* 3. Output Mix */}
        <div className="p-2.5 rounded-md border border-slate-200 dark:border-slate-700/80 bg-slate-50/40 dark:bg-slate-800/40 sm:col-span-2 lg:col-span-1 flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100 pb-1 border-b border-slate-200 dark:border-slate-700">
            Output Mix
          </h3>

          <div className={masterGainDisabled ? 'opacity-50' : ''}>
            <div className="flex items-center justify-between gap-2 text-xs mb-1">
              <label htmlFor="masterGain" className="font-medium text-slate-700 dark:text-slate-300">
                Master Gain
              </label>
              <NumericReadoutInput
                ariaLabel="Master Gain numeric value"
                value={settings.masterGain}
                min={0}
                max={1}
                step={0.01}
                decimals={2}
                disabled={masterGainDisabled}
                onCommit={(val) => onUpdateSettings('masterGain', val)}
                className="w-14"
              />
            </div>
            <input
              id="masterGain"
              type="range"
              min={0}
              max={1}
              step={0.01}
              disabled={masterGainDisabled}
              value={settings.masterGain}
              onChange={(e) => onUpdateSettings('masterGain', parseFloat(e.target.value))}
              className="w-full studio-slider"
            />
          </div>

          <div className={metronomeDisabled ? 'opacity-50' : ''}>
            <div className="flex items-center justify-between gap-2 text-xs mb-1">
              <label htmlFor="metronomeVolume" className="font-medium text-slate-700 dark:text-slate-300">
                Metronome Vol
              </label>
              <NumericReadoutInput
                ariaLabel="Metronome Volume numeric value"
                value={settings.metronomeVolume}
                min={0}
                max={1}
                step={0.01}
                decimals={2}
                disabled={metronomeDisabled}
                onCommit={(val) => onUpdateSettings('metronomeVolume', val)}
                className="w-14"
              />
            </div>
            <input
              id="metronomeVolume"
              type="range"
              min={0}
              max={1}
              step={0.01}
              disabled={metronomeDisabled}
              value={settings.metronomeVolume}
              onChange={(e) => onUpdateSettings('metronomeVolume', parseFloat(e.target.value))}
              className="w-full studio-slider"
            />
          </div>
        </div>

        {/* 4. Instrument, Synth & Filter */}
        <div
          className={`p-2.5 rounded-md border border-slate-200 dark:border-slate-700/80 bg-slate-50/40 dark:bg-slate-800/40 flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3 ${
            synthDisabled ? 'opacity-50' : ''
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              Instrument & Synth
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <label htmlFor="instrumentPreset" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Instrument
                </label>
                <select
                  id="instrumentPreset"
                  disabled={synthDisabled}
                  value={settings.instrumentPreset}
                  onChange={(e) => onSelectInstrument(e.target.value as InstrumentPreset)}
                  className="px-2 py-1 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                >
                  {INSTRUMENT_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <label htmlFor="oscillatorType" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Waveform
                </label>
                <select
                  id="oscillatorType"
                  disabled={synthDisabled}
                  value={settings.oscillatorType}
                  onChange={(e) =>
                    onUpdateSettings('oscillatorType', e.target.value as OscillatorKind)
                  }
                  className="px-2 py-1 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                >
                  {OSCILLATOR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 items-center">
            <AdsrVisualizer
              adsr={{
                attack: settings.attack,
                decay: settings.decay,
                sustain: settings.sustain,
                release: settings.release,
              }}
              synthGain={settings.synthGain}
              theme={settings.theme}
            />

            <div className="grid grid-cols-5 gap-2">
              {[
                {
                  id: 'attack',
                  label: 'Attack',
                  value: settings.attack,
                  min: 0.01,
                  max: 2,
                  step: 0.01,
                  key: 'attack' as const,
                },
                {
                  id: 'decay',
                  label: 'Decay',
                  value: settings.decay,
                  min: 0.01,
                  max: 2,
                  step: 0.01,
                  key: 'decay' as const,
                },
                {
                  id: 'sustain',
                  label: 'Sustain',
                  value: settings.sustain,
                  min: 0,
                  max: 1,
                  step: 0.01,
                  key: 'sustain' as const,
                },
                {
                  id: 'release',
                  label: 'Release',
                  value: settings.release,
                  min: 0.01,
                  max: 3,
                  step: 0.01,
                  key: 'release' as const,
                },
                {
                  id: 'synthGain',
                  label: 'Gain',
                  value: settings.synthGain,
                  min: 0,
                  max: 1,
                  step: 0.01,
                  key: 'synthGain' as const,
                },
              ].map((ctrl) => (
                <div key={ctrl.id} className="flex flex-col items-center gap-1">
                  <label htmlFor={ctrl.id} className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    {ctrl.label}
                  </label>
                  <input
                    id={ctrl.id}
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    step={ctrl.step}
                    disabled={synthDisabled}
                    value={ctrl.value}
                    onChange={(e) => onUpdateSettings(ctrl.key, parseFloat(e.target.value))}
                    className="adsr-fader"
                  />
                  <NumericReadoutInput
                    ariaLabel={`${ctrl.label} numeric value`}
                    value={ctrl.value}
                    min={ctrl.min}
                    max={ctrl.max}
                    step={ctrl.step}
                    decimals={2}
                    disabled={synthDisabled}
                    onCommit={(val) => onUpdateSettings(ctrl.key, val)}
                    className="w-12 text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Filter & Voice Shaping Row */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 items-end">
            <div>
              <label htmlFor="filterType" className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                Filter Type
              </label>
              <select
                id="filterType"
                disabled={synthDisabled}
                value={settings.filterType}
                onChange={(e) => onUpdateSettings('filterType', e.target.value as FilterKind)}
                className="w-full px-2 py-1 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 disabled:bg-slate-100 dark:disabled:bg-slate-800"
              >
                {FILTER_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between gap-1 text-[11px] mb-1">
                <label htmlFor="filterCutoff" className="font-medium text-slate-700 dark:text-slate-300">
                  Cutoff
                </label>
                <NumericReadoutInput
                  ariaLabel="Filter Cutoff Hz"
                  testId="filter-cutoff-input"
                  value={settings.filterCutoff}
                  min={120}
                  max={12000}
                  step={1}
                  decimals={0}
                  allowKiloSuffix={true}
                  formatBlurred={formatCutoffHz}
                  disabled={synthDisabled}
                  onCommit={(val) => onUpdateSettings('filterCutoff', val)}
                  className="w-18"
                />
              </div>
              <input
                id="filterCutoff"
                type="range"
                min={120}
                max={12000}
                step={20}
                disabled={synthDisabled}
                value={settings.filterCutoff}
                onChange={(e) => onUpdateSettings('filterCutoff', parseInt(e.target.value, 10))}
                className="w-full studio-slider"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-1 text-[11px] mb-1">
                <label htmlFor="filterResonance" className="font-medium text-slate-700 dark:text-slate-300">
                  Resonance
                </label>
                <NumericReadoutInput
                  ariaLabel="Filter Resonance numeric value"
                  value={settings.filterResonance}
                  min={0.1}
                  max={18}
                  step={0.1}
                  decimals={1}
                  disabled={synthDisabled}
                  onCommit={(val) => onUpdateSettings('filterResonance', val)}
                  className="w-12"
                />
              </div>
              <input
                id="filterResonance"
                type="range"
                min={0.1}
                max={18}
                step={0.1}
                disabled={synthDisabled}
                value={settings.filterResonance}
                onChange={(e) => onUpdateSettings('filterResonance', parseFloat(e.target.value))}
                className="w-full studio-slider"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-1 text-[11px] mb-1">
                <label htmlFor="filterEnvAmount" className="font-medium text-slate-700 dark:text-slate-300">
                  Filter Env
                </label>
                <NumericReadoutInput
                  ariaLabel="Filter Envelope amount percent"
                  value={settings.filterEnvAmount}
                  min={0}
                  max={1}
                  step={0.01}
                  decimals={0}
                  displayFactor={100}
                  unit="%"
                  disabled={synthDisabled}
                  onCommit={(val) => onUpdateSettings('filterEnvAmount', val)}
                  className="w-13"
                />
              </div>
              <input
                id="filterEnvAmount"
                type="range"
                min={0}
                max={1}
                step={0.01}
                disabled={synthDisabled}
                value={settings.filterEnvAmount}
                onChange={(e) => onUpdateSettings('filterEnvAmount', parseFloat(e.target.value))}
                className="w-full studio-slider"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-1 text-[11px] mb-1">
                <label htmlFor="detuneCents" className="font-medium text-slate-700 dark:text-slate-300">
                  Detune
                </label>
                <NumericReadoutInput
                  ariaLabel="Detune cents"
                  value={settings.detuneCents}
                  min={0}
                  max={40}
                  step={1}
                  decimals={0}
                  unit="ct"
                  disabled={synthDisabled}
                  onCommit={(val) => onUpdateSettings('detuneCents', val)}
                  className="w-13"
                />
              </div>
              <input
                id="detuneCents"
                type="range"
                min={0}
                max={40}
                step={1}
                disabled={synthDisabled}
                value={settings.detuneCents}
                onChange={(e) => onUpdateSettings('detuneCents', parseInt(e.target.value, 10))}
                className="w-full studio-slider"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-1 text-[11px] mb-1">
                <label htmlFor="subOscMix" className="font-medium text-slate-700 dark:text-slate-300">
                  Sub Osc
                </label>
                <NumericReadoutInput
                  ariaLabel="Sub Oscillator mix percent"
                  value={settings.subOscMix}
                  min={0}
                  max={1}
                  step={0.01}
                  decimals={0}
                  displayFactor={100}
                  unit="%"
                  disabled={synthDisabled}
                  onCommit={(val) => onUpdateSettings('subOscMix', val)}
                  className="w-13"
                />
              </div>
              <input
                id="subOscMix"
                type="range"
                min={0}
                max={1}
                step={0.01}
                disabled={synthDisabled}
                value={settings.subOscMix}
                onChange={(e) => onUpdateSettings('subOscMix', parseFloat(e.target.value))}
                className="w-full studio-slider"
              />
            </div>
          </div>
        </div>

        {/* 5. Arpeggiator */}
        <ArpeggiatorBar
          arpeggiator={settings.arpeggiator}
          disabled={synthDisabled}
          onUpdateArpeggiator={onUpdateArpeggiator}
        />

        {/* 6. Effects Rack */}
        <EffectsRackPanel
          effects={settings.effects}
          bpm={settings.bpm}
          disabled={synthDisabled}
          onUpdateEffect={onUpdateEffect}
        />
      </div>
    </section>
  );
};
