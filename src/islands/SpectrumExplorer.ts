// SpectrumExplorer — Pan/zoom spectrum viewer (Canvas 2D)

const container = document.getElementById('spectrum-explorer');
if (container) {
  const baseUrl = (import.meta as any).env?.BASE_URL || '';

  // Controls
  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex; align-items:center; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;';
  controls.innerHTML = `
    <select id="spec-select" class="glass-select">
      <option value="0">Loading...</option>
    </select>
    <span id="spec-meta" style="font-size:0.85rem; color:var(--text-muted);"></span>
    <button id="spec-reset" style="padding:0.4rem 0.8rem; background:rgba(255,255,255,0.6); border:1px solid rgba(196,181,224,0.3); border-radius:8px; cursor:pointer; font-size:0.85rem; color:var(--text-secondary);">Reset View</button>
  `;
  container.appendChild(controls);

  // Canvas
  const wrap = document.createElement('div');
  wrap.className = 'demo-canvas-wrap';
  wrap.style.cssText = 'aspect-ratio:2.5/1; cursor:grab;';
  container.appendChild(wrap);
  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  // Help text
  const help = document.createElement('div');
  help.style.cssText = 'margin-top:0.5rem; font-size:0.8rem; color:var(--text-muted);';
  help.textContent = 'Drag to pan, scroll to zoom. Select different spectra above.';
  container.appendChild(help);

  const select = document.getElementById('spec-select') as HTMLSelectElement;
  const metaEl = document.getElementById('spec-meta')!;
  const resetBtn = document.getElementById('spec-reset')!;

  interface Spectrum {
    idx: number;
    flux: number[];
    true_logg: number;
    pred_logg: number;
    snr: number;
  }

  let wavelengths: number[] = [];
  let spectra: Spectrum[] = [];
  let currentIdx = 0;

  // View state
  let viewXMin = 0;
  let viewXMax = 1;
  let isDragging = false;
  let dragStartX = 0;
  let dragViewStart = 0;

  fetch(`${baseUrl}/data/spectra_examples.json`)
    .then(r => r.json())
    .then(data => {
      wavelengths = data.wavelengths;
      spectra = data.spectra;

      // Populate select
      select.innerHTML = '';
      spectra.forEach((s: Spectrum, i: number) => {
        const logg = s.true_logg;
        const type = logg < 2 ? 'Giant' : logg < 3.5 ? 'Subgiant' : 'Dwarf';
        const opt = document.createElement('option');
        opt.value = `${i}`;
        opt.textContent = `Spectrum ${i + 1}: ${type} (log g = ${logg.toFixed(2)}, SNR = ${s.snr.toFixed(0)})`;
        select.appendChild(opt);
      });

      resetView();
      draw();
    });

  function resetView() {
    viewXMin = 0;
    viewXMax = 1;
  }

  function getClassification(logg: number): string {
    if (logg < 2) return 'Giant';
    if (logg < 3.5) return 'Subgiant';
    return 'Dwarf';
  }

  function draw() {
    if (!spectra.length) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = wrap.clientWidth * dpr;
    canvas.height = wrap.clientHeight * dpr;
    ctx.scale(dpr, dpr);
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;

    ctx.clearRect(0, 0, W, H);

    const spec = spectra[currentIdx];
    const flux = spec.flux;

    // Update metadata
    const type = getClassification(spec.true_logg);
    metaEl.innerHTML = `<strong style="color:var(--accent-purple)">${type}</strong> | log g = ${spec.true_logg.toFixed(2)} | pred = ${spec.pred_logg.toFixed(2)} | SNR = ${spec.snr.toFixed(0)}`;

    const pad = { l: 55, r: 15, t: 15, b: 30 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    // Visible range
    const iMin = Math.floor(viewXMin * flux.length);
    const iMax = Math.ceil(viewXMax * flux.length);
    const visFlux = flux.slice(iMin, iMax);

    const fMin = Math.min(...visFlux) * 0.98;
    const fMax = Math.max(...visFlux) * 1.02;
    const wMin = wavelengths[iMin] || wavelengths[0];
    const wMax = wavelengths[Math.min(iMax, wavelengths.length - 1)];

    const xScale = (i: number) => pad.l + ((i - iMin) / (iMax - iMin)) * pw;
    const yScale = (f: number) => pad.t + ph - ((f - fMin) / (fMax - fMin)) * ph;

    // Grid
    ctx.strokeStyle = 'rgba(196,181,224,0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gy = pad.t + (ph / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.l, gy);
      ctx.lineTo(pad.l + pw, gy);
      ctx.stroke();
    }

    // Spectrum
    ctx.beginPath();
    ctx.strokeStyle = '#7c5cbf';
    ctx.lineWidth = 1.5;
    const step = Math.max(1, Math.floor(visFlux.length / (pw * 2)));
    for (let j = 0; j < visFlux.length; j += step) {
      const x = xScale(iMin + j);
      const y = yScale(visFlux[j]);
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Axes
    ctx.fillStyle = '#8888aa';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';

    const numTicks = 5;
    for (let t = 0; t <= numTicks; t++) {
      const w = wMin + (wMax - wMin) * (t / numTicks);
      const x = pad.l + (t / numTicks) * pw;
      ctx.fillText(`${w.toFixed(0)}`, x, H - 5);
    }

    ctx.fillText('nm', pad.l + pw + 10, H - 5);

    ctx.save();
    ctx.translate(12, pad.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Flux', 0, 0);
    ctx.restore();
  }

  // Pan handling
  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragViewStart = viewXMin;
    wrap.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const viewWidth = viewXMax - viewXMin;
    const shift = -dx / wrap.clientWidth * viewWidth;
    let newMin = dragViewStart + shift;
    let newMax = newMin + viewWidth;

    if (newMin < 0) { newMin = 0; newMax = viewWidth; }
    if (newMax > 1) { newMax = 1; newMin = 1 - viewWidth; }

    viewXMin = newMin;
    viewXMax = newMax;
    draw();
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    wrap.style.cursor = 'grab';
  });

  // Zoom handling
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87;
    const rect = wrap.getBoundingClientRect();
    const mouseRel = (e.clientX - rect.left) / rect.width;

    const viewWidth = viewXMax - viewXMin;
    const mouseX = viewXMin + mouseRel * viewWidth;

    let newWidth = viewWidth * zoomFactor;
    if (newWidth > 1) newWidth = 1;
    if (newWidth < 0.01) newWidth = 0.01;

    let newMin = mouseX - mouseRel * newWidth;
    let newMax = newMin + newWidth;

    if (newMin < 0) { newMin = 0; newMax = newWidth; }
    if (newMax > 1) { newMax = 1; newMin = 1 - newWidth; }

    viewXMin = newMin;
    viewXMax = newMax;
    draw();
  }, { passive: false });

  select.addEventListener('change', () => {
    currentIdx = parseInt(select.value);
    resetView();
    draw();
  });

  resetBtn.addEventListener('click', () => {
    resetView();
    draw();
  });

  window.addEventListener('resize', draw);
}
