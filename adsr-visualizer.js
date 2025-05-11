import * as DomElements from './dom-elements.js';

let canvas = null;
let ctx = null;

const PADDING = 20; // Reduced padding slightly for more graph space
const AXIS_COLOR = '#888'; // Lighter axis
const LINE_COLOR = '#007bff'; 
const GUIDE_COLOR = '#ddd'; // Lighter guides
const TEXT_COLOR = '#555'; // Slightly lighter text

const VISUAL_NOTE_HELD_DURATION_PLOT = 1.0; 

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

    // Y-axis (Value) - No text labels for 1.0 / 0.0
    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING);
    ctx.lineTo(PADDING, canvas.height - PADDING);
    ctx.stroke();
    // ctx.fillText('Gain', PADDING - 18, PADDING - 10); // Removed "Gain"

    // X-axis (Time) - No "Time" label
    ctx.beginPath();
    ctx.moveTo(PADDING, canvas.height - PADDING);
    ctx.lineTo(canvas.width - PADDING, canvas.height - PADDING);
    ctx.stroke();
}

export function drawADSRGraph(adsrSettings) {
    if (!ctx || !canvas) return;
    clearCanvas();
    drawAxes();

    const { attack, decay, sustain, release } = adsrSettings;

    const graphWidth = canvas.width - 2 * PADDING;
    const graphHeight = canvas.height - 2 * PADDING;

    const totalPlotTime = attack + decay + VISUAL_NOTE_HELD_DURATION_PLOT + release;
    const peakGain = 1.0; 

    if (totalPlotTime <= 0) return; 

    const timeScale = graphWidth / totalPlotTime;
    const gainScale = graphHeight / peakGain;

    const toCanvasX = (time) => PADDING + time * timeScale;
    const toCanvasY = (gain) => PADDING + graphHeight - (gain * gainScale);

    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();

    ctx.moveTo(toCanvasX(0), toCanvasY(0));

    const attackEndTime = attack;
    ctx.lineTo(toCanvasX(attackEndTime), toCanvasY(peakGain));

    const decayEndTime = attackEndTime + decay;
    const sustainLevelGain = peakGain * sustain;
    ctx.lineTo(toCanvasX(decayEndTime), toCanvasY(sustainLevelGain));

    const sustainPlotEndTime = decayEndTime + VISUAL_NOTE_HELD_DURATION_PLOT;
    ctx.lineTo(toCanvasX(sustainPlotEndTime), toCanvasY(sustainLevelGain));

    const releaseEndTime = sustainPlotEndTime + release;
    ctx.lineTo(toCanvasX(releaseEndTime), toCanvasY(0));
    
    ctx.stroke();

    // Draw vertical guides and phase labels (simplified)
    ctx.strokeStyle = GUIDE_COLOR;
    ctx.lineWidth = 1; // Make guides slightly more prominent than 0.5
    ctx.setLineDash([2, 3]); // Slightly different dash
    ctx.font = '10px Arial'; // Slightly larger font for phase names
    ctx.fillStyle = TEXT_COLOR;
    ctx.textAlign = 'center'; // Center the phase names

    const drawPhaseLabel = (startTime, endTime, label) => {
        if (endTime - startTime < 0.001 && !(label === "Sustain" && VISUAL_NOTE_HELD_DURATION_PLOT > 0.01) ) return; // Don't draw label for zero-length phases unless it's sustain
        
        const midTime = startTime + (endTime - startTime) / 2;
        const x = toCanvasX(midTime);
        const y = canvas.height - PADDING + 12; // Position below the x-axis

        // Draw a small vertical line from x-axis down to where text starts
        const guideStartY = canvas.height - PADDING;
        const guideEndY = y - 8; 
        if (label) { // Only draw guide if there's a label
            ctx.beginPath();
            ctx.moveTo(x, guideStartY);
            ctx.lineTo(x, guideEndY);
            ctx.stroke();
            ctx.fillText(label, x, y);
        }
    };
    
    drawPhaseLabel(0, attackEndTime, "A");
    drawPhaseLabel(attackEndTime, decayEndTime, "D");
    drawPhaseLabel(decayEndTime, sustainPlotEndTime, "S");
    drawPhaseLabel(sustainPlotEndTime, releaseEndTime, "R");
    
    ctx.textAlign = 'start'; // Reset alignment
    ctx.setLineDash([]); 
}


export function initADSRVisualizer() {
    canvas = DomElements.adsrCanvas;
    if (!canvas) {
        console.error("ADSR Canvas element not found!");
        return;
    }
    ctx = canvas.getContext('2d');
    
    const initialADSR = {
        attack: parseFloat(DomElements.attackSlider.value),
        decay: parseFloat(DomElements.decaySlider.value),
        sustain: parseFloat(DomElements.sustainSlider.value),
        release: parseFloat(DomElements.releaseSlider.value)
    };
    drawADSRGraph(initialADSR);
}