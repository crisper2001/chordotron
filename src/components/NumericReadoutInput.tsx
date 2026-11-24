import React, { useEffect, useState } from 'react';

interface NumericReadoutInputProps {
  id?: string;
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals?: number;
  displayFactor?: number;
  unit?: string;
  allowKiloSuffix?: boolean;
  formatBlurred?: (val: number) => string;
  disabled?: boolean;
  testId?: string;
  className?: string;
  onCommit: (nextValue: number) => void;
}

function roundToDecimals(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

function getDecimalsFromStep(step: number): number {
  const str = String(step);
  const dotIdx = str.indexOf('.');
  return dotIdx === -1 ? 0 : str.length - dotIdx - 1;
}

export const NumericReadoutInput: React.FC<NumericReadoutInputProps> = ({
  id,
  ariaLabel,
  value,
  min,
  max,
  step,
  decimals,
  displayFactor = 1,
  unit = '',
  allowKiloSuffix = false,
  formatBlurred,
  disabled = false,
  testId,
  className = '',
  onCommit,
}) => {
  const effectiveDecimals =
    decimals !== undefined ? decimals : getDecimalsFromStep(step * displayFactor);

  const formatEditableValue = (rawVal: number): string => {
    const scaled = rawVal * displayFactor;
    return effectiveDecimals === 0
      ? String(Math.round(scaled))
      : roundToDecimals(scaled, effectiveDecimals).toFixed(effectiveDecimals);
  };

  const formatIdleDisplay = (rawVal: number): string => {
    if (formatBlurred) return formatBlurred(rawVal);
    return `${formatEditableValue(rawVal)}${unit}`;
  };

  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => formatIdleDisplay(value));

  useEffect(() => {
    if (!focused) {
      setDraft(formatIdleDisplay(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused, min, max, displayFactor, unit, effectiveDecimals]);

  const commitDraft = (rawText: string) => {
    let cleaned = rawText.trim().toLowerCase();
    if (unit) {
      const lowerUnit = unit.toLowerCase();
      if (cleaned.endsWith(lowerUnit)) {
        cleaned = cleaned.slice(0, -lowerUnit.length).trim();
      }
    }

    let multiplier = 1;
    if (allowKiloSuffix && cleaned.endsWith('k')) {
      multiplier = 1000;
      cleaned = cleaned.slice(0, -1).trim();
    } else if (allowKiloSuffix && cleaned.endsWith('hz')) {
      cleaned = cleaned.slice(0, -2).trim();
      if (cleaned.endsWith('k')) {
        multiplier = 1000;
        cleaned = cleaned.slice(0, -1).trim();
      }
    }

    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed) || cleaned === '') {
      setDraft(formatIdleDisplay(value));
      return;
    }

    const unscaled = (parsed * multiplier) / displayFactor;
    const clamped = Math.max(min, Math.min(max, unscaled));
    const valueDecimals = getDecimalsFromStep(step);
    const rounded =
      valueDecimals === 0
        ? Math.round(clamped)
        : roundToDecimals(clamped, Math.max(valueDecimals, 2));

    onCommit(rounded);
    setDraft(formatIdleDisplay(rounded));
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      data-testid={testId}
      disabled={disabled}
      value={draft}
      onFocus={(e) => {
        setFocused(true);
        const editVal = formatEditableValue(value);
        setDraft(editVal);
        const target = e.currentTarget;
        requestAnimationFrame(() => {
          target.select();
        });
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        commitDraft(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitDraft(draft);
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setFocused(false);
          setDraft(formatIdleDisplay(value));
          e.currentTarget.blur();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const dir = e.key === 'ArrowUp' ? 1 : -1;
          const next = Math.max(min, Math.min(max, roundToDecimals(value + dir * step, 4)));
          onCommit(next);
          setDraft(formatEditableValue(next));
        }
      }}
      className={`font-mono tabular-nums text-right text-[11px] font-semibold text-blue-700 dark:text-blue-400 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 focus:border-blue-600 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 rounded px-1.5 py-0.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    />
  );
};
