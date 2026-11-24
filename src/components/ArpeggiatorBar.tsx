import React from 'react';
import { Power } from 'lucide-react';
import { ARP_PATTERN_OPTIONS, ARP_RATE_OPTIONS } from '../config/constants';
import type { ArpPattern, ArpRate, ArpeggiatorSettings } from '../types/chordotron';
import { NumericReadoutInput } from './NumericReadoutInput';

interface ArpeggiatorBarProps {
  arpeggiator: ArpeggiatorSettings;
  disabled: boolean;
  onUpdateArpeggiator: (patch: Partial<ArpeggiatorSettings>) => void;
}

export const ArpeggiatorBar: React.FC<ArpeggiatorBarProps> = ({
  arpeggiator,
  disabled,
  onUpdateArpeggiator,
}) => {
  return (
    <div
      className={`p-2.5 rounded-md border border-slate-200 dark:border-slate-700/80 bg-slate-50/40 dark:bg-slate-800/40 sm:col-span-2 lg:col-span-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center justify-between lg:justify-start gap-2.5 shrink-0">
        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
          Arpeggiator
        </h3>
        <button
          type="button"
          disabled={disabled}
          aria-pressed={arpeggiator.enabled}
          aria-label="Toggle Arpeggiator"
          onClick={() => onUpdateArpeggiator({ enabled: !arpeggiator.enabled })}
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded border transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap ${
            arpeggiator.enabled
              ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Power className="w-3 h-3" aria-hidden="true" />
          <span>{arpeggiator.enabled ? 'On' : 'Off'}</span>
        </button>
      </div>

      <div
        className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1 items-center ${
          !arpeggiator.enabled ? 'opacity-70' : ''
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <label
            htmlFor="arpPattern"
            className="text-[11px] font-medium text-slate-700 dark:text-slate-300 shrink-0"
          >
            Pattern
          </label>
          <select
            id="arpPattern"
            disabled={disabled}
            value={arpeggiator.pattern}
            onChange={(e) => onUpdateArpeggiator({ pattern: e.target.value as ArpPattern })}
            className="w-full min-w-0 px-2 py-1 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 disabled:bg-slate-100 dark:disabled:bg-slate-800"
          >
            {ARP_PATTERN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 min-w-0">
          <label
            htmlFor="arpRate"
            className="text-[11px] font-medium text-slate-700 dark:text-slate-300 shrink-0"
          >
            Rate
          </label>
          <select
            id="arpRate"
            disabled={disabled}
            value={arpeggiator.rate}
            onChange={(e) => onUpdateArpeggiator({ rate: e.target.value as ArpRate })}
            className="w-full min-w-0 px-2 py-1 text-xs font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 disabled:bg-slate-100 dark:disabled:bg-slate-800"
          >
            {ARP_RATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 min-w-0">
          <label
            htmlFor="arpOctaves"
            className="text-[11px] font-medium text-slate-700 dark:text-slate-300 shrink-0"
          >
            Octaves
          </label>
          <select
            id="arpOctaves"
            disabled={disabled}
            value={arpeggiator.octaves}
            onChange={(e) => onUpdateArpeggiator({ octaves: parseInt(e.target.value, 10) })}
            className="w-full min-w-0 px-2 py-1 text-xs font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 disabled:bg-slate-100 dark:disabled:bg-slate-800"
          >
            <option value={1}>1 Oct</option>
            <option value={2}>2 Oct</option>
            <option value={3}>3 Oct</option>
          </select>
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-1 text-[11px] mb-0.5">
            <label htmlFor="arpGate" className="font-medium text-slate-700 dark:text-slate-300">
              Gate
            </label>
            <NumericReadoutInput
              ariaLabel="Arpeggiator Gate percent"
              value={arpeggiator.gate}
              min={0.2}
              max={1.0}
              step={0.01}
              decimals={0}
              displayFactor={100}
              unit="%"
              disabled={disabled}
              onCommit={(val) => onUpdateArpeggiator({ gate: val })}
              className="w-14"
            />
          </div>
          <input
            id="arpGate"
            type="range"
            min={0.2}
            max={1.0}
            step={0.05}
            disabled={disabled}
            value={arpeggiator.gate}
            onChange={(e) => onUpdateArpeggiator({ gate: parseFloat(e.target.value) })}
            className="w-full studio-slider"
          />
        </div>
      </div>
    </div>
  );
};
