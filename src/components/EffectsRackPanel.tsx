import React, { useState } from 'react';
import { Clock, Power } from 'lucide-react';
import { EFFECT_LABELS } from '../config/constants';
import type { BpmSyncDivision, EffectKey, SynthEffectsSettings } from '../types/chordotron';
import {
  DELAY_SYNC_DIVISIONS,
  LFO_SYNC_DIVISIONS,
  bpmToDelaySeconds,
  bpmToLfoHz,
} from '../utils/bpm-sync';
import { NumericReadoutInput } from './NumericReadoutInput';

interface EffectsRackPanelProps {
  effects: SynthEffectsSettings;
  bpm: number;
  disabled: boolean;
  onUpdateEffect: <K extends EffectKey>(
    effectKey: K,
    patch: Partial<SynthEffectsSettings[K]>
  ) => void;
}

const EFFECT_KEYS: EffectKey[] = [
  'reverb',
  'delay',
  'chorus',
  'flanger',
  'phaser',
  'vibrato',
  'tremolo',
];

export const EffectsRackPanel: React.FC<EffectsRackPanelProps> = ({
  effects,
  bpm,
  disabled,
  onUpdateEffect,
}) => {
  const [selectedEffect, setSelectedEffect] = useState<EffectKey>('reverb');

  const activeCount = EFFECT_KEYS.filter((k) => effects[k].enabled).length;

  const renderParamSlider = (
    id: string,
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    unit: string,
    onChange: (val: number) => void,
    decimals = 2
  ) => (
    <div key={id}>
      <div className="flex items-center justify-between gap-1 text-[11px] mb-1">
        <label htmlFor={id} className="font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <NumericReadoutInput
          ariaLabel={`${EFFECT_LABELS[selectedEffect]} ${label}`}
          value={value}
          min={min}
          max={max}
          step={step}
          decimals={decimals}
          unit={unit}
          disabled={disabled}
          onCommit={onChange}
          className="w-16"
        />
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full studio-slider"
      />
    </div>
  );

  const renderSyncableTimingControl = (
    effectKey: Exclude<EffectKey, 'reverb'>,
    label: 'Time' | 'Rate',
    manualValue: number,
    min: number,
    max: number,
    step: number,
    unit: 's' | 'Hz',
    syncBpm: boolean,
    syncDivision: BpmSyncDivision,
    onManualChange: (val: number) => void
  ) => {
    const divisions = effectKey === 'delay' ? DELAY_SYNC_DIVISIONS : LFO_SYNC_DIVISIONS;
    const computedValue =
      effectKey === 'delay'
        ? bpmToDelaySeconds(bpm, syncDivision)
        : bpmToLfoHz(bpm, syncDivision);

    return (
      <div key={`fx-${effectKey}-timing`}>
        <div className="flex items-center justify-between gap-1 text-[11px] mb-1">
          <div className="flex items-center gap-1 min-w-0">
            <label
              htmlFor={`fx-${effectKey}-timing`}
              className="font-medium text-slate-700 dark:text-slate-300"
            >
              {label}
            </label>
            <button
              type="button"
              disabled={disabled}
              aria-pressed={syncBpm}
              aria-label={`Sync ${EFFECT_LABELS[effectKey]} ${label} to BPM`}
              title="Sync to project BPM"
              onClick={() =>
                onUpdateEffect(effectKey, { syncBpm: !syncBpm } as Partial<
                  SynthEffectsSettings[typeof effectKey]
                >)
              }
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded border transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap ${
                syncBpm
                  ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Clock className="w-2.5 h-2.5" aria-hidden="true" />
              <span>Sync</span>
            </button>
          </div>

          {syncBpm ? (
            <span
              data-testid={`fx-${effectKey}-synced-value`}
              className="font-mono tabular-nums text-[11px] font-semibold text-blue-700 dark:text-blue-400 whitespace-nowrap"
            >
              {computedValue.toFixed(2)}
              {unit}
            </span>
          ) : (
            <NumericReadoutInput
              ariaLabel={`${EFFECT_LABELS[effectKey]} ${label}`}
              value={manualValue}
              min={min}
              max={max}
              step={step}
              decimals={2}
              unit={unit}
              disabled={disabled}
              onCommit={onManualChange}
              className="w-16"
            />
          )}
        </div>

        {syncBpm ? (
          <select
            id={`fx-${effectKey}-timing`}
            aria-label={`${EFFECT_LABELS[effectKey]} BPM Division`}
            disabled={disabled}
            value={syncDivision}
            onChange={(e) =>
              onUpdateEffect(effectKey, {
                syncDivision: e.target.value as BpmSyncDivision,
              } as Partial<SynthEffectsSettings[typeof effectKey]>)
            }
            className="w-full px-2 py-0.5 text-xs font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 disabled:bg-slate-100 dark:disabled:bg-slate-800"
          >
            {divisions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={`fx-${effectKey}-timing`}
            type="range"
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            value={manualValue}
            onChange={(e) => onManualChange(parseFloat(e.target.value))}
            className="w-full studio-slider"
          />
        )}
      </div>
    );
  };

  const renderSelectedControls = () => {
    switch (selectedEffect) {
      case 'reverb':
        return (
          <>
            {renderParamSlider('fx-reverb-mix', 'Mix', effects.reverb.mix, 0, 1, 0.01, '', (v) =>
              onUpdateEffect('reverb', { mix: v })
            )}
            {renderParamSlider(
              'fx-reverb-decay',
              'Decay',
              effects.reverb.decay,
              0.3,
              5.0,
              0.1,
              's',
              (v) => onUpdateEffect('reverb', { decay: v }),
              1
            )}
          </>
        );
      case 'delay':
        return (
          <>
            {renderParamSlider('fx-delay-mix', 'Mix', effects.delay.mix, 0, 1, 0.01, '', (v) =>
              onUpdateEffect('delay', { mix: v })
            )}
            {renderSyncableTimingControl(
              'delay',
              'Time',
              effects.delay.time,
              0.05,
              1.0,
              0.01,
              's',
              effects.delay.syncBpm,
              effects.delay.syncDivision,
              (v) => onUpdateEffect('delay', { time: v })
            )}
            {renderParamSlider(
              'fx-delay-fb',
              'Feedback',
              effects.delay.feedback,
              0,
              0.85,
              0.01,
              '',
              (v) => onUpdateEffect('delay', { feedback: v })
            )}
          </>
        );
      case 'chorus':
        return (
          <>
            {renderParamSlider('fx-chorus-mix', 'Mix', effects.chorus.mix, 0, 1, 0.01, '', (v) =>
              onUpdateEffect('chorus', { mix: v })
            )}
            {renderSyncableTimingControl(
              'chorus',
              'Rate',
              effects.chorus.rate,
              0.1,
              5.0,
              0.05,
              'Hz',
              effects.chorus.syncBpm,
              effects.chorus.syncDivision,
              (v) => onUpdateEffect('chorus', { rate: v })
            )}
            {renderParamSlider('fx-chorus-depth', 'Depth', effects.chorus.depth, 0, 1, 0.01, '', (v) =>
              onUpdateEffect('chorus', { depth: v })
            )}
          </>
        );
      case 'flanger':
        return (
          <>
            {renderParamSlider('fx-flanger-mix', 'Mix', effects.flanger.mix, 0, 1, 0.01, '', (v) =>
              onUpdateEffect('flanger', { mix: v })
            )}
            {renderSyncableTimingControl(
              'flanger',
              'Rate',
              effects.flanger.rate,
              0.1,
              5.0,
              0.05,
              'Hz',
              effects.flanger.syncBpm,
              effects.flanger.syncDivision,
              (v) => onUpdateEffect('flanger', { rate: v })
            )}
            {renderParamSlider('fx-flanger-depth', 'Depth', effects.flanger.depth, 0, 1, 0.01, '', (v) =>
              onUpdateEffect('flanger', { depth: v })
            )}
            {renderParamSlider(
              'fx-flanger-fb',
              'Feedback',
              effects.flanger.feedback,
              0,
              0.85,
              0.01,
              '',
              (v) => onUpdateEffect('flanger', { feedback: v })
            )}
          </>
        );
      case 'phaser':
        return (
          <>
            {renderParamSlider('fx-phaser-mix', 'Mix', effects.phaser.mix, 0, 1, 0.01, '', (v) =>
              onUpdateEffect('phaser', { mix: v })
            )}
            {renderSyncableTimingControl(
              'phaser',
              'Rate',
              effects.phaser.rate,
              0.1,
              5.0,
              0.05,
              'Hz',
              effects.phaser.syncBpm,
              effects.phaser.syncDivision,
              (v) => onUpdateEffect('phaser', { rate: v })
            )}
            {renderParamSlider('fx-phaser-depth', 'Depth', effects.phaser.depth, 0, 1, 0.01, '', (v) =>
              onUpdateEffect('phaser', { depth: v })
            )}
            {renderParamSlider(
              'fx-phaser-fb',
              'Feedback',
              effects.phaser.feedback,
              0,
              0.85,
              0.01,
              '',
              (v) => onUpdateEffect('phaser', { feedback: v })
            )}
          </>
        );
      case 'vibrato':
        return (
          <>
            {renderSyncableTimingControl(
              'vibrato',
              'Rate',
              effects.vibrato.rate,
              0.5,
              12.0,
              0.1,
              'Hz',
              effects.vibrato.syncBpm,
              effects.vibrato.syncDivision,
              (v) => onUpdateEffect('vibrato', { rate: v })
            )}
            {renderParamSlider(
              'fx-vibrato-depth',
              'Depth',
              effects.vibrato.depth,
              0,
              100,
              1,
              'ct',
              (v) => onUpdateEffect('vibrato', { depth: v }),
              0
            )}
          </>
        );
      case 'tremolo':
        return (
          <>
            {renderSyncableTimingControl(
              'tremolo',
              'Rate',
              effects.tremolo.rate,
              0.5,
              15.0,
              0.1,
              'Hz',
              effects.tremolo.syncBpm,
              effects.tremolo.syncDivision,
              (v) => onUpdateEffect('tremolo', { rate: v })
            )}
            {renderParamSlider('fx-tremolo-depth', 'Depth', effects.tremolo.depth, 0, 1, 0.01, '', (v) =>
              onUpdateEffect('tremolo', { depth: v })
            )}
          </>
        );
    }
  };

  return (
    <div
      className={`p-2.5 rounded-md border border-slate-200 dark:border-slate-700/80 bg-slate-50/40 dark:bg-slate-800/40 sm:col-span-2 lg:col-span-3 flex flex-col gap-2 ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
          Effects Rack
        </h3>
        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
          {activeCount} active
        </span>
      </div>

      {/* 7 Effect Tiles with Power Toggle & Select */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-1.5">
        {EFFECT_KEYS.map((key) => {
          const isEnabled = effects[key].enabled;
          const isSelected = selectedEffect === key;
          return (
            <div
              key={key}
              className={`flex items-center justify-between gap-1 px-2 py-1 rounded border transition-colors ${
                isSelected
                  ? 'border-blue-600 dark:border-blue-400 bg-blue-50/70 dark:bg-blue-950/50'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
              }`}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => setSelectedEffect(key)}
                className={`text-[11px] font-medium truncate text-left flex-1 cursor-pointer disabled:cursor-not-allowed ${
                  isSelected
                    ? 'text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {EFFECT_LABELS[key]}
              </button>
              <button
                type="button"
                disabled={disabled}
                aria-pressed={isEnabled}
                aria-label={`Toggle ${EFFECT_LABELS[key]}`}
                title={`${isEnabled ? 'Disable' : 'Enable'} ${EFFECT_LABELS[key]}`}
                onClick={() => {
                  setSelectedEffect(key);
                  onUpdateEffect(key, { enabled: !isEnabled } as Partial<
                    SynthEffectsSettings[typeof key]
                  >);
                }}
                className={`p-1 rounded transition-colors cursor-pointer disabled:cursor-not-allowed ${
                  isEnabled
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Power className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Selected Effect Parameters */}
      <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
            {EFFECT_LABELS[selectedEffect]} Parameters
          </span>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {effects[selectedEffect].enabled ? 'Enabled' : 'Bypassed'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {renderSelectedControls()}
        </div>
      </div>
    </div>
  );
};
