// AttentionExplorer — Interactive attention heatmap overlaid on spectrum (Canvas 2D)

const container = document.getElementById('attention-explorer');
if (container) {
  const baseUrl = (import.meta as any).env?.BASE_URL || '';

  // Controls
  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex; align-items:center; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;';
  controls.innerHTML = `
    <label style="font-size:0.9rem; color:var(--text-secondary); font-weight:500;">
      Layer: <strong id="attn-layer-label" style="color:var(--accent-purple);">Averaged</strong>
    </label>
    <input type="range" id="attn-layer-slider" class="range-slider" min="0" max="6" step="1" value="0" style="flex:1; min-width:200px;">
    <label style="font-size:0.85rem; color:var(--text-muted); display:flex; align-items:center; gap:0.3rem;">
      <input type="checkbox" id="attn-show-lines" checked style="accent-color:var(--accent-purple);">
      Spectral lines
    </label>
  `;
  container.appendChild(controls);

  // Canvas for spectrum
  const specWrap = document.createElement('div');
  specWrap.className = 'demo-canvas-wrap';
  specWrap.style.aspectRatio = '3 / 1';
  container.appendChild(specWrap);
  const specCanvas = document.createElement('canvas');
  specWrap.appendChild(specCanvas);
  const specCtx = specCanvas.getContext('2d')!;

  // Canvas for heatmap
  const heatLabel = document.createElement('div');
  heatLabel.style.cssText = 'margin-top:0.75rem; font-size:0.85rem; color:var(--text-muted); margin-bottom:0.25rem;';
  heatLabel.textContent = 'Attention heatmap across layers:';
  container.appendChild(heatLabel);

  const heatWrap = document.createElement('div');
  heatWrap.className = 'demo-canvas-wrap';
  heatWrap.style.aspectRatio = '6 / 1';
  container.appendChild(heatWrap);
  const heatCanvas = document.createElement('canvas');
  heatWrap.appendChild(heatCanvas);
  const heatCtx = heatCanvas.getContext('2d')!;

  // Hover info
  const hoverInfo = document.createElement('div');
  hoverInfo.id = 'attn-hover-info';
  hoverInfo.style.cssText = 'margin-top:0.5rem; font-size:0.85rem; color:var(--accent-purple); min-height:1.2em;';
  container.appendChild(hoverInfo);

  const slider = document.getElementById('attn-layer-slider') as HTMLInputElement;
  const layerLabel = document.getElementById('attn-layer-label')!;
  const showLinesCheck = document.getElementById('attn-show-lines') as HTMLInputElement;

  interface AttnData {
    wavelength_range: number[];
    num_patches: number;
    spectral_lines: { name: string; wavelength: number; element: string }[];
    layers: Record<string, number[]>;
  }

  let attnData: AttnData | null = null;
  let wavelengths: number[] = [];
  let flux: number[] = [];
  let hoverX = -1;

  Promise.all([
    fetch(`${baseUrl}/data/attention_weights.json`).then(r => r.json()),
    fetch(`${baseUrl}/data/spectra_examples.json`).then(r => r.json()),
  ]).then(([aData, sData]) => {
    attnData = aData as AttnData;
    wavelengths = sData.wavelengths;
    flux = sData.spectra[0].flux;
    draw();
  });

  function getLayerKey(): string {
    const val = parseInt(slider.value);
    return val === 0 ? 'averaged' : `${val}`;
  }

  function wavelengthToX(w: number, padL: number, pw: number): number {
    const wMin = wavelengths[0];
    const wMax = wavelengths[wavelengths.length - 1];
    return padL + ((w - wMin) / (wMax - wMin)) * pw;
  }

  function draw() {
    if (!attnData || !flux.length) return;
    drawSpectrum();
    drawHeatmap();
  }

  function drawSpectrum() {
    const dpr = window.devicePixelRatio || 1;
    specCanvas.width = specWrap.clientWidth * dpr;
    specCanvas.height = specWrap.clientHeight * dpr;
    specCtx.scale(dpr, dpr);
    const W = specWrap.clientWidth;
    const H = specWrap.clientHeight;

    specCtx.clearRect(0, 0, W, H);

    const pad = { l: 50, r: 15, t: 10, b: 25 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    const fMin = Math.min(...flux) * 0.95;
    const fMax = Math.max(...flux) * 1.05;

    const xScale = (i: number) => pad.l + (i / flux.length) * pw;
    const yScale = (f: number) => pad.t + ph - ((f - fMin) / (fMax - fMin)) * ph;

    // Attention overlay
    const layerKey = getLayerKey();
    const weights = attnData!.layers[layerKey] || attnData!.layers['averaged'];
    const maxW = Math.max(...weights);

    for (let p = 0; p < weights.length; p++) {
      const x0 = xScale(p * 16);
      const x1 = xScale((p + 1) * 16);
      const t = weights[p] / maxW;
      specCtx.fillStyle = `rgba(124, 92, 191, ${t * 0.3})`;
      specCtx.fillRect(x0, pad.t, x1 - x0, ph);
    }

    // Spectrum line
    specCtx.beginPath();
    specCtx.strokeStyle = '#4a4a6a';
    specCtx.lineWidth = 1.2;
    const step = Math.max(1, Math.floor(flux.length / pw));
    for (let i = 0; i < flux.length; i += step) {
      const x = xScale(i);
      const y = yScale(flux[i]);
      if (i === 0) specCtx.moveTo(x, y);
      else specCtx.lineTo(x, y);
    }
    specCtx.stroke();

    // Spectral line markers
    if (showLinesCheck.checked) {
      attnData!.spectral_lines.forEach(line => {
        const x = wavelengthToX(line.wavelength, pad.l, pw);
        if (x >= pad.l && x <= pad.l + pw) {
          specCtx.strokeStyle = 'rgba(196, 122, 158, 0.7)';
          specCtx.lineWidth = 1;
          specCtx.setLineDash([4, 3]);
          specCtx.beginPath();
          specCtx.moveTo(x, pad.t);
          specCtx.lineTo(x, pad.t + ph);
          specCtx.stroke();
          specCtx.setLineDash([]);

          specCtx.fillStyle = '#c47a9e';
          specCtx.font = '9px Inter, sans-serif';
          specCtx.textAlign = 'center';
          specCtx.fillText(`${line.name}`, x, pad.t - 1);
        }
      });
    }

    // Hover crosshair
    if (hoverX >= 0) {
      specCtx.strokeStyle = 'rgba(45, 165, 184, 0.6)';
      specCtx.lineWidth = 1;
      specCtx.setLineDash([2, 2]);
      specCtx.beginPath();
      specCtx.moveTo(hoverX, pad.t);
      specCtx.lineTo(hoverX, pad.t + ph);
      specCtx.stroke();
      specCtx.setLineDash([]);
    }

    // Wavelength labels
    specCtx.fillStyle = '#8888aa';
    specCtx.font = '10px Inter, sans-serif';
    specCtx.textAlign = 'center';
    const wMin = wavelengths[0];
    const wMax = wavelengths[wavelengths.length - 1];
    specCtx.fillText(`${wMin.toFixed(0)} nm`, pad.l, H - 3);
    specCtx.fillText(`${wMax.toFixed(0)} nm`, pad.l + pw, H - 3);
  }

  function drawHeatmap() {
    const dpr = window.devicePixelRatio || 1;
    heatCanvas.width = heatWrap.clientWidth * dpr;
    heatCanvas.height = heatWrap.clientHeight * dpr;
    heatCtx.scale(dpr, dpr);
    const W = heatWrap.clientWidth;
    const H = heatWrap.clientHeight;

    heatCtx.clearRect(0, 0, W, H);

    const pad = { l: 50, r: 15, t: 5, b: 5 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    const layerNames = ['1', '2', '3', '4', '5', '6'];
    const rowH = ph / layerNames.length;

    // Find global max for color normalization
    let globalMax = 0;
    layerNames.forEach(l => {
      const w = attnData!.layers[l];
      if (w) globalMax = Math.max(globalMax, Math.max(...w));
    });

    layerNames.forEach((layerName, li) => {
      const weights = attnData!.layers[layerName];
      if (!weights) return;
      const y0 = pad.t + li * rowH;

      // Layer label
      heatCtx.fillStyle = '#8888aa';
      heatCtx.font = '9px Inter, sans-serif';
      heatCtx.textAlign = 'right';
      heatCtx.fillText(`L${layerName}`, pad.l - 8, y0 + rowH / 2 + 3);

      // Draw heatmap row
      const cellW = pw / weights.length;
      for (let p = 0; p < weights.length; p++) {
        const t = weights[p] / globalMax;
        // Purple-cyan gradient
        const r = Math.round(124 * t + 248 * (1 - t));
        const g = Math.round(92 * t + 246 * (1 - t));
        const b = Math.round(191 * t + 255 * (1 - t));
        heatCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        heatCtx.fillRect(pad.l + p * cellW, y0, cellW + 0.5, rowH - 1);
      }

      // Highlight current layer
      if (getLayerKey() === layerName) {
        heatCtx.strokeStyle = 'var(--accent-purple)';
        heatCtx.lineWidth = 2;
        heatCtx.strokeRect(pad.l, y0, pw, rowH - 1);
      }
    });

    // Hover crosshair on heatmap
    if (hoverX >= 0) {
      heatCtx.strokeStyle = 'rgba(45, 165, 184, 0.6)';
      heatCtx.lineWidth = 1;
      heatCtx.setLineDash([2, 2]);
      heatCtx.beginPath();
      heatCtx.moveTo(hoverX, pad.t);
      heatCtx.lineTo(hoverX, pad.t + ph);
      heatCtx.stroke();
      heatCtx.setLineDash([]);
    }
  }

  // Mouse events — linked crosshair
  function handleHover(e: MouseEvent, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    hoverX = e.clientX - rect.left;

    // Convert to patch/wavelength
    const pad = { l: 50, r: 15 };
    const pw = target.clientWidth - pad.l - pad.r;
    const relX = (hoverX - pad.l) / pw;
    if (relX >= 0 && relX <= 1) {
      const patchIdx = Math.floor(relX * 256);
      const wIdx = Math.min(patchIdx * 16, wavelengths.length - 1);
      const w = wavelengths[wIdx];
      const layerKey = getLayerKey();
      const weight = attnData?.layers[layerKey]?.[patchIdx] || 0;
      hoverInfo.textContent = `Wavelength: ${w.toFixed(1)} nm | Patch ${patchIdx} | Attention: ${weight.toFixed(4)}`;
    }

    draw();
  }

  specCanvas.addEventListener('mousemove', (e) => handleHover(e, specWrap));
  heatCanvas.addEventListener('mousemove', (e) => handleHover(e, heatWrap));

  [specCanvas, heatCanvas].forEach(c => {
    c.addEventListener('mouseleave', () => {
      hoverX = -1;
      hoverInfo.textContent = '';
      draw();
    });
  });

  slider.addEventListener('input', () => {
    const val = parseInt(slider.value);
    layerLabel.textContent = val === 0 ? 'Averaged' : `Layer ${val}`;
    draw();
  });

  showLinesCheck.addEventListener('change', draw);
  window.addEventListener('resize', draw);
}
