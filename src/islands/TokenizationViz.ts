// TokenizationViz — Show how a spectrum is split into patches (Canvas 2D)

const container = document.getElementById('tokenization-viz');
if (container) {
  const baseUrl = (import.meta as any).env?.BASE_URL || '';

  const wrap = document.createElement('div');
  wrap.className = 'demo-canvas-wrap';
  wrap.style.aspectRatio = '2.5 / 1';
  container.appendChild(wrap);

  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  // Info bar
  const info = document.createElement('div');
  info.style.cssText = 'margin-top:0.75rem; font-size:0.85rem; color:var(--text-muted); display:flex; gap:1.5rem; flex-wrap:wrap;';
  info.innerHTML = `
    <span>Spectrum length: <strong style="color:var(--text-primary)">4096</strong> pixels</span>
    <span>Patch size: <strong style="color:var(--text-primary)">16</strong></span>
    <span>Num patches: <strong style="color:var(--text-primary)">256</strong></span>
    <span id="tok-hover-info" style="color:var(--accent-purple);"></span>
  `;
  container.appendChild(info);

  let wavelengths: number[] = [];
  let flux: number[] = [];
  let hoveredPatch = -1;

  // Load attention weights for coloring
  let attentionWeights: number[] = [];

  Promise.all([
    fetch(`${baseUrl}/data/spectra_examples.json`).then(r => r.json()),
    fetch(`${baseUrl}/data/attention_weights.json`).then(r => r.json()),
  ]).then(([specData, attnData]) => {
    wavelengths = specData.wavelengths;
    flux = specData.spectra[0].flux;
    attentionWeights = attnData.layers['averaged'];
    draw();
  });

  const PATCH_SIZE = 16;
  const NUM_PATCHES = 256;

  function draw() {
    if (!flux.length) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = wrap.clientWidth * dpr;
    canvas.height = wrap.clientHeight * dpr;
    ctx.scale(dpr, dpr);
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;

    ctx.clearRect(0, 0, W, H);

    const pad = { l: 50, r: 15, t: 15, b: 30 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    const fArr = flux.slice(0, NUM_PATCHES * PATCH_SIZE);
    const fMin = Math.min(...fArr) * 0.95;
    const fMax = Math.max(...fArr) * 1.05;
    const wMin = wavelengths[0];
    const wMax = wavelengths[NUM_PATCHES * PATCH_SIZE - 1] || wavelengths[wavelengths.length - 1];

    const xScale = (idx: number) => pad.l + (idx / (NUM_PATCHES * PATCH_SIZE)) * pw;
    const yScale = (f: number) => pad.t + ph - ((f - fMin) / (fMax - fMin)) * ph;

    // Normalize attention for color mapping
    const maxAttn = Math.max(...attentionWeights);
    const minAttn = Math.min(...attentionWeights);

    // Draw patch backgrounds
    for (let p = 0; p < NUM_PATCHES; p++) {
      const x0 = xScale(p * PATCH_SIZE);
      const x1 = xScale((p + 1) * PATCH_SIZE);

      const t = attentionWeights.length > 0
        ? (attentionWeights[p] - minAttn) / (maxAttn - minAttn)
        : 0;

      if (p === hoveredPatch) {
        ctx.fillStyle = `rgba(124, 92, 191, 0.25)`;
      } else {
        // Gradient from purple (high attention) to transparent (low)
        const r = Math.round(124 * t + 45 * (1 - t));
        const g = Math.round(92 * t + 165 * (1 - t));
        const b = Math.round(191 * t + 184 * (1 - t));
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.04 + t * 0.12})`;
      }
      ctx.fillRect(x0, pad.t, x1 - x0, ph);

      // Dashed patch boundary
      if (p > 0) {
        ctx.strokeStyle = p === hoveredPatch || p - 1 === hoveredPatch
          ? 'rgba(124,92,191,0.5)'
          : 'rgba(196,181,224,0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x0, pad.t);
        ctx.lineTo(x0, pad.t + ph);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw spectrum line
    ctx.beginPath();
    ctx.strokeStyle = '#7c5cbf';
    ctx.lineWidth = 1.5;
    const step = Math.max(1, Math.floor(fArr.length / pw));
    for (let i = 0; i < fArr.length; i += step) {
      const x = xScale(i);
      const y = yScale(fArr[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Highlight hovered patch line segment
    if (hoveredPatch >= 0) {
      const start = hoveredPatch * PATCH_SIZE;
      const end = Math.min((hoveredPatch + 1) * PATCH_SIZE, fArr.length);
      ctx.beginPath();
      ctx.strokeStyle = '#2da5b8';
      ctx.lineWidth = 2.5;
      for (let i = start; i < end; i++) {
        const x = xScale(i);
        const y = yScale(fArr[i]);
        if (i === start) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Axes
    ctx.fillStyle = '#8888aa';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${wMin.toFixed(0)} nm`, pad.l, H - 5);
    ctx.fillText(`${wMax.toFixed(0)} nm`, pad.l + pw, H - 5);
  }

  // Mouse hover
  canvas.addEventListener('mousemove', (e) => {
    const rect = wrap.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const pad = { l: 50, r: 15 };
    const pw = wrap.clientWidth - pad.l - pad.r;
    const relX = (mx - pad.l) / pw;
    const patch = Math.floor(relX * NUM_PATCHES);

    if (patch >= 0 && patch < NUM_PATCHES && patch !== hoveredPatch) {
      hoveredPatch = patch;
      const hoverInfo = document.getElementById('tok-hover-info');
      if (hoverInfo) {
        const wStart = wavelengths[patch * PATCH_SIZE];
        const wEnd = wavelengths[Math.min((patch + 1) * PATCH_SIZE - 1, wavelengths.length - 1)];
        const attn = attentionWeights[patch] || 0;
        hoverInfo.textContent = `Patch ${patch}: ${wStart.toFixed(0)}-${wEnd.toFixed(0)} nm | Attention: ${attn.toFixed(4)}`;
      }
      draw();
    }
  });

  canvas.addEventListener('mouseleave', () => {
    hoveredPatch = -1;
    const hoverInfo = document.getElementById('tok-hover-info');
    if (hoverInfo) hoverInfo.textContent = '';
    draw();
  });

  window.addEventListener('resize', draw);
}
