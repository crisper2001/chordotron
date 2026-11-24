import React, { useEffect, useRef } from 'react';
import type { ADSRSettings, ThemeMode } from '../types/chordotron';

interface AdsrVisualizerProps {
  adsr: ADSRSettings;
  synthGain: number;
  theme: ThemeMode;
}

const PADDING = 22;
const VISUAL_NOTE_HELD_DURATION_PLOT = 1.0;

export const AdsrVisualizer: React.FC<AdsrVisualizerProps> = ({ adsr, synthGain, theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDark = theme === 'dark';
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Theme-aware background
    ctx.fillStyle = isDark ? '#0F172A' : '#F8FAFC';
    ctx.fillRect(0, 0, width, height);

    // Axes
    ctx.strokeStyle = isDark ? '#475569' : '#94A3B8';
    ctx.lineWidth = 1;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';

    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING - 4);
    ctx.lineTo(PADDING, height - PADDING);
    ctx.lineTo(width - PADDING + 6, height - PADDING);
    ctx.stroke();

    ctx.fillText('1.0', 2, PADDING + 4);
    ctx.fillText('0.0', 2, height - PADDING + 2);

    const { attack, decay, sustain, release } = adsr;
    const graphWidth = width - 2 * PADDING;
    const graphHeight = height - 2 * PADDING;
    const totalPlotTime = attack + decay + VISUAL_NOTE_HELD_DURATION_PLOT + release;
    if (totalPlotTime <= 0) return;

    const timeScale = graphWidth / totalPlotTime;
    const toCanvasX = (time: number) => PADDING + time * timeScale;
    const toCanvasY = (adsrGain: number) =>
      PADDING + graphHeight - adsrGain * synthGain * graphHeight;

    const attackEnd = attack;
    const decayEnd = attackEnd + decay;
    const sustainEnd = decayEnd + VISUAL_NOTE_HELD_DURATION_PLOT;
    const releaseEnd = sustainEnd + release;

    // Shaded area under curve
    ctx.fillStyle = isDark ? 'rgba(96, 165, 250, 0.16)' : 'rgba(37, 99, 235, 0.10)';
    ctx.beginPath();
    ctx.moveTo(toCanvasX(0), toCanvasY(0));
    ctx.lineTo(toCanvasX(attackEnd), toCanvasY(1.0));
    ctx.lineTo(toCanvasX(decayEnd), toCanvasY(sustain));
    ctx.lineTo(toCanvasX(sustainEnd), toCanvasY(sustain));
    ctx.lineTo(toCanvasX(releaseEnd), toCanvasY(0));
    ctx.closePath();
    ctx.fill();

    // Envelope line
    ctx.strokeStyle = isDark ? '#60A5FA' : '#2563EB';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toCanvasX(0), toCanvasY(0));
    ctx.lineTo(toCanvasX(attackEnd), toCanvasY(1.0));
    ctx.lineTo(toCanvasX(decayEnd), toCanvasY(sustain));
    ctx.lineTo(toCanvasX(sustainEnd), toCanvasY(sustain));
    ctx.lineTo(toCanvasX(releaseEnd), toCanvasY(0));
    ctx.stroke();

    // Phase guides and A/D/S/R labels
    ctx.strokeStyle = isDark ? '#334155' : '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.fillStyle = isDark ? '#CBD5E1' : '#475569';
    ctx.textAlign = 'center';

    const drawPhaseLabel = (startTime: number, endTime: number, label: string) => {
      if (endTime - startTime < 0.001 && !(label === 'S' && VISUAL_NOTE_HELD_DURATION_PLOT > 0.01)) {
        return;
      }
      const midTime = startTime + (endTime - startTime) / 2;
      const x = toCanvasX(midTime);
      const y = height - PADDING + 13;
      ctx.beginPath();
      ctx.moveTo(x, height - PADDING);
      ctx.lineTo(x, y - 9);
      ctx.stroke();
      ctx.fillText(label, x, y);
    };

    drawPhaseLabel(0, attackEnd, 'A');
    drawPhaseLabel(attackEnd, decayEnd, 'D');
    drawPhaseLabel(decayEnd, sustainEnd, 'S');
    drawPhaseLabel(sustainEnd, releaseEnd, 'R');

    ctx.textAlign = 'start';
    ctx.setLineDash([]);
  }, [adsr, synthGain, theme]);

  return (
    <div className="w-full flex justify-center">
      <canvas
        ref={canvasRef}
        data-testid="adsr-canvas"
        width={220}
        height={84}
        className="w-full max-w-[230px] h-auto rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
      />
    </div>
  );
};
