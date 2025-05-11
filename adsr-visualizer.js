import * as DomElements from './dom-elements.js';

let canvas = null;
let ctx = null;

const PADDING = 25; // Padding around the graph
const LABEL_OFFSET = 5;
const AXIS_COLOR = '#666';
const LINE_COLOR = '#ff8c00'; // Orange, similar to the image
const GUIDE_COLOR = '#ccc';
const TEXT_COLOR = '#333';
const KEY_EVENT_COLOR = '#555';

// A representative duration for the "note held" part in the visualizer
// This is not the actual noteHeldDuration from playback, but for visual consistency.
const VISUAL_NOTE_HELD_DURATION_PLOT = 1.0; // seconds

function clearCanvas() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawAxes() {
    if (!ctx || !canvas) return;
    ctx.strokeStyle = AXIS_COLOR;
    ctx.lineWidth = 1;
    ctx.font = '10px Arial';
    ctx.fillStyle = TEXT_COLOR;

    // Y-axis (Value)
    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING);
    ctx.lineTo(PADDING, canvas.height - PADDING);
    ctx.stroke();
    ctx.fillText('Gain', PADDING - LABEL_OFFSET - 15, PADDING - LABEL_OFFSET - 5);
    ctx.fillText('1.0', PADDING - LABEL_OFFSET - 18, PADDING + 5); // Peak
    ctx.fillText('0.0', PADDING - LABEL_OFFSET - 18, canvas.height - PADDING);

    // X-axis (Time)
    ctx.beginPath();
    ctx.moveTo(PADDING, canvas.height - PADDING);
    ctx.lineTo(canvas.width - PADDING, canvas.height - PADDING);
    ctx.stroke();
    ctx.fillText('Time', canvas.width - PADDING - 15, canvas.height - PADDING + LABEL_OFFSET + 10);
}

export function drawADSRGraph(adsrSettings) {
    if (!ctx || !canvas) return;
    clearCanvas();
    drawAxes();

    const { attack, decay, sustain, release } = adsrSettings;

    const graphWidth = canvas.width - 2 * PADDING;
    const graphHeight = canvas.height - 2 * PADDING;

    // Max values for scaling (time axis is tricky due to variable components)
    // We'll scale time based on total duration of the envelope for this plot
    const totalPlotTime = attack + decay + VISUAL_NOTE_HELD_DURATION_PLOT + release;
    const peakGain = 1.0; // Normalized peak gain for visualization

    if (totalPlotTime <= 0) return; // Avoid division by zero

    const timeScale = graphWidth / totalPlotTime;
    const gainScale = graphHeight / peakGain;

    // Helper to convert graph coordinates to canvas coordinates
    const toCanvasX = (time) => PADDING + time * timeScale;
    const toCanvasY = (gain) => PADDING + graphHeight - (gain * gainScale); // Invert Y

    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();

    // 1. Start
    ctx.moveTo(toCanvasX(0), toCanvasY(0));

    // 2. Attack Phase
    const attackEndTime = attack;
    ctx.lineTo(toCanvasX(attackEndTime), toCanvasY(peakGain));

    // 3. Decay Phase
    const decayEndTime = attackEndTime + decay;
    const sustainLevelGain = peakGain * sustain;
    ctx.lineTo(toCanvasX(decayEndTime), toCanvasY(sustainLevelGain));

    // 4. Sustain Phase (for visualization)
    const sustainPlotEndTime = decayEndTime + VISUAL_NOTE_HELD_DURATION_PLOT;
    ctx.lineTo(toCanvasX(sustainPlotEndTime), toCanvasY(sustainLevelGain));

    // 5. Release Phase
    const releaseEndTime = sustainPlotEndTime + release;
    ctx.lineTo(toCanvasX(releaseEndTime), toCanvasY(0));
    
    ctx.stroke();

    // Draw vertical guides and labels
    ctx.strokeStyle = GUIDE_COLOR;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);
    ctx.font = '9px Arial';
    ctx.fillStyle = TEXT_COLOR;

    const drawGuide = (time, label, keyEvent = null, keyEventLabel = null) => {
        const x = toCanvasX(time);
        ctx.beginPath();
        ctx.moveTo(x, PADDING);
        ctx.lineTo(x, canvas.height - PADDING);
        ctx.stroke();
        ctx.fillText(label, x + 3, PADDING - 3);

        if (keyEvent) {
            ctx.fillStyle = KEY_EVENT_COLOR;
            ctx.fillText(keyEventLabel, x - (ctx.measureText(keyEventLabel).width /2) , PADDING - 15);
            // Draw arrow
            ctx.beginPath();
            if (keyEvent === 'on') {
                ctx.moveTo(x, PADDING - 12);
                ctx.lineTo(x, PADDING - 5);
                ctx.moveTo(x-3, PADDING - 8);
                ctx.lineTo(x, PADDING - 5);
                ctx.lineTo(x+3, PADDING - 8);

            } else { // off
                ctx.moveTo(x, PADDING - 5);
                ctx.lineTo(x, PADDING - 12);
                ctx.moveTo(x-3, PADDING - 9);
                ctx.lineTo(x, PADDING - 12);
                ctx.lineTo(x+3, PADDING - 9);
            }
            ctx.stroke();
            ctx.fillStyle = TEXT_COLOR; // Reset fillStyle
        }
    };
    
    drawGuide(0, "", 'on', 'Key On');
    if (attack > 0.01) drawGuide(attackEndTime, "Attack");
    if (decay > 0.01) drawGuide(decayEndTime, "Decay");
    drawGuide(sustainPlotEndTime, "Sustain", 'off', 'Key Off');
    if (release > 0.01) drawGuide(releaseEndTime, "Release");


    ctx.setLineDash([]); // Reset line dash
}


export function initADSRVisualizer() {
    canvas = DomElements.adsrCanvas;
    if (!canvas) {
        console.error("ADSR Canvas element not found!");
        return;
    }
    ctx = canvas.getContext('2d');
    
    // Initial draw with default values (or values from sliders if already set)
    const initialADSR = {
        attack: parseFloat(DomElements.attackSlider.value),
        decay: parseFloat(DomElements.decaySlider.value),
        sustain: parseFloat(DomElements.sustainSlider.value),
        release: parseFloat(DomElements.releaseSlider.value)
    };
    drawADSRGraph(initialADSR);
}