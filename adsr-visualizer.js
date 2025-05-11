import * as DomElements from './dom-elements.js';

let canvas = null;
let ctx = null;

const PADDING = 20; 
const AXIS_COLOR = '#888'; 
const LINE_COLOR = '#007bff'; 
const GUIDE_COLOR = '#ddd'; 
const TEXT_COLOR = '#555'; 

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

    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING);
    ctx.lineTo(PADDING, canvas.height - PADDING);
    ctx.stroke();
    ctx.fillText('1.0', PADDING - 18, PADDING + 5); 
    ctx.fillText('0.0', PADDING - 18, canvas.height - PADDING);

    ctx.beginPath();
    ctx.moveTo(PADDING, canvas.height - PADDING);
    ctx.lineTo(canvas.width - PADDING, canvas.height - PADDING);
    ctx.stroke();
}

export function drawADSRGraph(adsrSettings, currentSynthGain) { 
    if (!ctx || !canvas) return;
    clearCanvas();
    drawAxes(); 

    const { attack, decay, sustain, release } = adsrSettings;

    const graphWidth = canvas.width - 2 * PADDING;
    const graphHeight = canvas.height - 2 * PADDING;

    const totalPlotTime = attack + decay + VISUAL_NOTE_HELD_DURATION_PLOT + release;
    
    const envelopeHeightMultiplier = parseFloat(currentSynthGain); 

    if (totalPlotTime <= 0) return; 

    const timeScale = graphWidth / totalPlotTime;
    const gainScale = graphHeight / 1.0; 

    const toCanvasX = (time) => PADDING + time * timeScale;
    const toCanvasY = (adsrGainValue) => PADDING + graphHeight - (adsrGainValue * envelopeHeightMultiplier * gainScale);

    ctx.strokeStyle = LINE_COLOR; 
    ctx.lineWidth = 2;
    ctx.beginPath();

    ctx.moveTo(toCanvasX(0), toCanvasY(0)); 

    const attackEndTime = attack;
    ctx.lineTo(toCanvasX(attackEndTime), toCanvasY(1.0)); 

    const decayEndTime = attackEndTime + decay;
    const sustainLevelRelative = sustain; 
    ctx.lineTo(toCanvasX(decayEndTime), toCanvasY(sustainLevelRelative));

    const sustainPlotEndTime = decayEndTime + VISUAL_NOTE_HELD_DURATION_PLOT;
    ctx.lineTo(toCanvasX(sustainPlotEndTime), toCanvasY(sustainLevelRelative));

    const releaseEndTime = sustainPlotEndTime + release;
    ctx.lineTo(toCanvasX(releaseEndTime), toCanvasY(0)); 
    
    ctx.stroke();

    ctx.strokeStyle = GUIDE_COLOR;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.font = '10px Arial';
    ctx.fillStyle = TEXT_COLOR;
    ctx.textAlign = 'center';

    const drawPhaseLabel = (startTime, endTime, label) => {
        if (endTime - startTime < 0.001 && !(label === "S" && VISUAL_NOTE_HELD_DURATION_PLOT > 0.01) ) return;
        
        const midTime = startTime + (endTime - startTime) / 2;
        const x = toCanvasX(midTime);
        const y = canvas.height - PADDING + 12; 

        if (label) {
            ctx.beginPath();
            ctx.moveTo(x, canvas.height - PADDING);
            ctx.lineTo(x, y - 8);
            ctx.stroke();
            ctx.fillText(label, x, y);
        }
    };
    
    drawPhaseLabel(0, attackEndTime, "A");
    drawPhaseLabel(attackEndTime, decayEndTime, "D");
    drawPhaseLabel(decayEndTime, sustainPlotEndTime, "S");
    drawPhaseLabel(sustainPlotEndTime, releaseEndTime, "R");
    
    ctx.textAlign = 'start';
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
    const initialSynthGain = parseFloat(DomElements.synthGainSlider.value);
    drawADSRGraph(initialADSR, initialSynthGain);
}
