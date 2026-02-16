# SpecViT Interactive Website - Story Architecture

## Page Sections (Scroll Narrative)

### Section 1: HERO — "Reading the Stars"
**Visual**: Three.js particle system forming a spectrum, with attention-weighted wavelengths glowing
- **Port from**: `scripts/plot_attention_map.py` attention weights
- **Effect**: Particles flow through "encoder layers", wavelengths light up based on attention
- **Mobile**: Reduced to 100 particles, static gradient background fallback
- **Tagline**: "Vision Transformers Learn to Read Stellar Spectra"

### Section 2: THE PROBLEM — "Decoding Starlight"
**Narrative**: Every star's light tells a story - its gravity, temperature, composition
- **Demo A**: Interactive spectrum viewer (real DESI spectrum, user can zoom/pan)
- **Demo B**: Toggle showing "what we want" (log g label) vs "what we get" (noisy 7781-dim vector)
- **Key insight**: "How do you extract a single number (log g) from 7781 noisy measurements?"

### Section 3: WHY IT'S HARD — "Giants vs Dwarfs"
**Narrative**: Traditional methods struggle on giant stars (log g < 2.5)
- **Demo**: Interactive scatter plot (pred vs true), toggle between:
  - LightGBM (baseline) - shows large errors on giants
  - SpecViT - tight fit across all stellar types
- **Data**: `results/scaling/lgbm_1m_predictions_test10k.csv` vs `vit_1m_predictions_test10k.csv`
- **Annotation**: Color-code by stellar type (giants=red, subgiants=yellow, dwarfs=blue)

### Section 4: OUR INSIGHT — "Attention is All You Need"
**Visual**: Split-screen animation
- **Left**: Traditional method (uses ALL wavelengths equally)
- **Right**: SpecViT (highlights Ca II H&K lines, Mg triplet - known gravity indicators)
- **Port from**: Attention map visualization from checkpoint
- **Interactive**: User can select different spectra → see attention patterns change

### Section 5: THE METHOD — "Patch-Based Vision Transformer"
**Diagram**: Animated flow
1. Spectrum (7781 points) → Patch embedding (256-dim)
2. 6 Transformer layers with self-attention
3. Final MLP head → log g prediction
- **Data**: Model architecture from `src/models/specvit.py`
- **Interactive**: Click on each block to expand technical details

### Section 6: RESULTS — "State-of-the-Art Performance"
**Dashboard**: Multi-panel D3 visualization
- **Panel A**: Bar chart (MAE by stellar type) - SpecViT vs baselines
  - Data: `results/summary_bar_chart.png` → extract to JSON
- **Panel B**: R² comparison table (BOSZ, DESI, APOGEE)
  - SpecViT: 0.711, LightGBM: 0.614, Ridge: 0.477
- **Panel C**: Residual histogram showing calibration
  - Data: `results/bias_analysis_plot.png` → extract to JSON
- **Toggle**: Switch between "BOSZ Test" / "DESI Transfer" / "APOGEE Transfer"

### Section 7: CONVERGENCE — "Not Cherry-Picked"
**Training curves**: Line chart from WandB logs
- **Metrics**: val_mae, val_r2, train_loss over 128 epochs
- **Data**: Extract from `/home/swei20/VIT/wandb_localruns_20260203_163405/run-20251226_012330-khgqjngm/`
- **Annotation**: Mark best checkpoint (epoch 128: val_mae=0.372, val_r2=0.718)

### Section 8: DEEP DIVE — "For the Experts"
**Expandable sections** (HTML `<details>`):
- **Architecture Details**: Patch size, embedding dim, layer count
- **Training Recipe**: 3-stage pipeline (BOSZ → DESI → APOGEE)
- **Computational Cost**: Table T1 (latency, throughput, GPU memory)
- **Ablations**: Effect of patch size, number of layers, pre-training
- **Key Equations**: KaTeX-rendered loss function, patch embedding formula

### Section 9: TRY IT — "Interactive Demo" (Optional - requires ONNX export)
**Live prediction** (if we can export model to ONNX.js):
- User uploads/selects a spectrum
- Model runs in browser → shows prediction + attention map
- **Fallback**: Pre-computed gallery of 20 example spectra

### Section 10: FOOTER
- **Paper PDF link**, **GitHub repo**, **arXiv**
- **BibTeX** (click to copy)
- **Acknowledgments**: NSF, DOE, DESI collaboration
- **EN/CN toggle** in top-right nav

---

## Simulation Engine Port

### Files to Port
| Python Source | TypeScript Target | Purpose |
|---------------|-------------------|---------|
| `src/models/specvit.py` | `src/sim/attention.ts` | Attention weight computation (for viz) |
| N/A | `src/sim/spectra.ts` | Spectrum data loader + interpolation |
| N/A | `src/sim/prng.ts` | Seeded random (for particle animations) |

### Critical Functions
- **loadSpectrum(idx: number)**: Fetch from pre-extracted JSON
- **computeAttentionWeights(spectrum: Float64Array)**: Port from checkpoint
- **interpolateSpectrum(wavelengths, flux, targetWavelengths)**: For zooming

### Performance Targets
- Hero animation: 60fps on desktop, 30fps on mobile
- Attention map render: < 100ms per spectrum
- Dashboard charts: Interactive (pan/zoom) without lag

---

## Data Extraction Checklist

- [ ] Extract 20 example spectra to `public/data/spectra.json`
  - Include: wavelengths, flux, true_logg, pred_logg, stellar_type
- [ ] Convert predictions to JSON:
  - `vit_1m_predictions_test10k.csv` → `public/data/predictions_vit.json`
  - `lgbm_1m_predictions_test10k.csv` → `public/data/predictions_lgbm.json`
- [ ] Extract attention weights for 20 examples:
  - Run `scripts/plot_attention_map.py` on subset → save to `public/data/attention_maps.json`
- [ ] Extract training curves:
  - WandB run → `public/data/training_curves.json`
- [ ] Per-stellar-type MAE table:
  - From paper results → `public/data/mae_by_type.json`
- [ ] Computational cost table:
  - Run benchmarks → `public/data/computational_cost.json`

---

## Tech Stack (Confirmed)

| Layer | Tool | Why |
|-------|------|-----|
| Build | **Astro 5** | Zero-JS by default, perfect for static content + islands |
| Hero | **Three.js** | GPU-accelerated particle system |
| 2D Viz | **Canvas 2D** | Spectrum plots, attention heatmaps |
| Charts | **D3.js v7** | Interactive scatter plots, bar charts |
| Math | **KaTeX** | Render equations (loss function, patch embedding) |
| i18n | **Data attributes** | EN/CN toggle without library overhead |
| Deploy | **GitHub Pages** | Free, automated via Actions |

---

## Color Palette (Astronomy Theme)

```css
:root {
  --bg-primary: #0a0e17;        /* Deep space */
  --bg-secondary: #111827;      /* Darker panels */
  --bg-card: #1a2332;           /* Card backgrounds */

  --text-primary: #e2e8f0;      /* White text */
  --text-secondary: #94a3b8;    /* Muted text */

  --accent-blue: #3b82f6;       /* Dwarfs (hot stars) */
  --accent-red: #ef4444;        /* Giants (cool stars) */
  --accent-yellow: #f59e0b;     /* Subgiants */
  --accent-cyan: #06b6d4;       /* Highlights, links */
  --accent-purple: #8b5cf6;     /* SpecViT brand color */

  --gradient-hero: linear-gradient(135deg, #8b5cf6, #06b6d4);
}
```

**Stellar Type Color Mapping**:
- Giants (log g < 2.5): Red (#ef4444)
- Subgiants (2.5 ≤ log g < 3.5): Yellow (#f59e0b)
- Dwarfs (log g ≥ 3.5): Blue (#3b82f6)

---

## Critical Success Metrics

- [ ] Hero loads in < 2s on 4G connection
- [ ] All interactive demos respond in < 100ms
- [ ] Mobile: 100% readable, all charts responsive
- [ ] Lighthouse Performance > 90
- [ ] Total bundle size < 800KB (including Three.js, D3)
- [ ] Works in Chrome, Firefox, Safari (last 2 versions)
- [ ] Accessible: keyboard navigation, screen reader labels

---

## Timeline Estimate

| Phase | Time | Blocker? |
|-------|------|----------|
| Phase 1: Story (this doc) | ✅ Done | - |
| Phase 2: Scaffold | 15 min | - |
| Phase 3a: Data extraction | 1 hour | Need to run attention map extraction |
| Phase 3b: Port attention viz | 30 min | - |
| Phase 4a: Hero (Three.js) | 2 hours | - |
| Phase 4b: Demos (Canvas/D3) | 3 hours | - |
| Phase 4c: Training curves | 30 min | WandB log already extracted |
| Phase 5: i18n (EN/CN) | 30 min | Need CN translations |
| Phase 6: Deploy | 15 min | - |
| **Total** | **~8 hours** | - |

---

## Next Steps

1. **Now**: Create Astro project scaffold
2. **Then**: Extract 20 example spectra + attention maps
3. **Then**: Build hero animation (sets visual tone)
4. **Then**: Build Section 3 demo (giants vs dwarfs) - this is the killer demo
5. **Then**: Build results dashboard
6. **Then**: Add remaining sections + polish
7. **Finally**: Deploy + share link

---

## Open Questions

1. **ONNX export**: Can we export the model for live browser inference?
   - If yes → Section 9 "Try It" becomes real
   - If no → Pre-compute 20 examples, make it feel interactive
2. **CN translations**: Do you have bilingual abstract/title ready?
   - If yes → Full EN/CN support
   - If no → EN-only for now, add CN later
3. **Computational cost data**: Do we have benchmark results from earlier task?
   - If yes → Add to Deep Dive section
   - If no → Skip for v1, add later
