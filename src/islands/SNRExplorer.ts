// SNRExplorer — Interactive SNR degradation viewer (Canvas 2D)

const container = document.getElementById('snr-explorer');
if (container) {
  const baseUrl = (import.meta as any).env?.BASE_URL || '';

  // Create controls
  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex; align-items:center; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;';
  controls.innerHTML = `
    <label style="font-size:0.9rem; color:var(--text-secondary); font-weight:500;">
      Magnitude: <strong id="snr-mag-label" style="color:var(--accent-purple)">20.0</strong>
    </label>
    <input type="range" id="snr-slider" class="range-slider" min="20.0" max="22.5" step="0.1" value="20.0" style="flex:1; min-width:200px;">
    <span id="snr-snr-label" style="font-size:0.85rem; color:var(--text-muted);">SNR ~50</span>
  `;
  container.appendChild(controls);

  // Create canvas wrap
  const wrap = document.createElement('div');
  wrap.className = 'demo-canvas-wrap';
  wrap.style.aspectRatio = '2.5 / 1';
  container.appendChild(wrap);

  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  const slider = document.getElementById('snr-slider') as HTMLInputElement;
  const magLabel = document.getElementById('snr-mag-label')!;
  const snrLabel = document.getElementById('snr-snr-label')!;

  let wavelengths: number[] = [];
  let cleanFlux: number[] = [];

  fetch(`${baseUrl}/data/spectra_examples.json`)
    .then(r => r.json())
    .then(data => {
      wavelengths = data.wavelengths;
      // Use the highest SNR spectrum as template
      const sorted = [...data.spectra].sort((a: any, b: any) => b.snr - a.snr);
      cleanFlux = sorted[0].flux;
      draw();
    });

  // Seeded PRNG
  function seededRandom(seed: number) {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return s / 2147483647;
    };
  }

  function magToSNR(mag: number): number {
    // Approximate: SNR ~= 10^((22.5 - mag) / 2.5) * 5
    return Math.max(1, 5 * Math.pow(10, (22.5 - mag) / 2.5));
  }

  function draw() {
    if (!cleanFlux.length) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = wrap.clientWidth * dpr;
    canvas.height = wrap.clientHeight * dpr;
    ctx.scale(dpr, dpr);
    const W = wrap.clientWidth;
    const H = wrap.clientHeight;

    const mag = parseFloat(slider.value);
    const snr = magToSNR(mag);
    magLabel.textContent = mag.toFixed(1);
    snrLabel.textContent = `SNR ~${snr.toFixed(0)}`;

    ctx.clearRect(0, 0, W, H);

    const pad = { l: 55, r: 20, t: 15, b: 35 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    // Generate noisy spectrum
    const rng = seededRandom(42);
    const noiseScale = 1 / snr;
    const noisyFlux = cleanFlux.map(v => v + (rng() - 0.5) * 2 * noiseScale * Math.abs(v));

    const allFlux = [...cleanFlux, ...noisyFlux];
    const fMin = Math.min(...allFlux) * 0.95;
    const fMax = Math.max(...allFlux) * 1.05;
    const wMin = wavelengths[0];
    const wMax = wavelengths[wavelengths.length - 1];

    const xScale = (w: number) => pad.l + ((w - wMin) / (wMax - wMin)) * pw;
    const yScale = (f: number) => pad.t + ph - ((f - fMin) / (fMax - fMin)) * ph;

    // Grid
    ctx.strokeStyle = 'rgba(196,181,224,0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (ph / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + pw, y);
      ctx.stroke();
    }

    // Draw clean template (light purple)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(196,181,224,0.5)';
    ctx.lineWidth = 1.5;
    const step = Math.max(1, Math.floor(cleanFlux.length / pw));
    for (let i = 0; i < cleanFlux.length; i += step) {
      const x = xScale(wavelengths[i]);
      const y = yScale(cleanFlux[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw noisy spectrum
    ctx.beginPath();
    ctx.strokeStyle = '#7c5cbf';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < noisyFlux.length; i += step) {
      const x = xScale(wavelengths[i]);
      const y = yScale(noisyFlux[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Axes labels
    ctx.fillStyle = '#8888aa';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${wMin.toFixed(0)} nm`, pad.l, H - 5);
    ctx.fillText(`${((wMin + wMax) / 2).toFixed(0)} nm`, pad.l + pw / 2, H - 5);
    ctx.fillText(`${wMax.toFixed(0)} nm`, pad.l + pw, H - 5);

    ctx.save();
    ctx.translate(12, pad.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Normalized Flux', 0, 0);
    ctx.restore();

    // Legend
    ctx.fillStyle = 'rgba(196,181,224,0.5)';
    ctx.fillRect(W - 160, 10, 12, 3);
    ctx.fillStyle = '#8888aa';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Clean template', W - 143, 14);

    ctx.fillStyle = '#7c5cbf';
    ctx.fillRect(W - 160, 24, 12, 3);
    ctx.fillStyle = '#8888aa';
    ctx.fillText(`mag ${mag.toFixed(1)}`, W - 143, 28);
  }

  slider.addEventListener('input', draw);
  window.addEventListener('resize', draw);
}
