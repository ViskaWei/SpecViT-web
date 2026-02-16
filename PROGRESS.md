# SpecViT Web Project - Progress Report

## ✅ Completed (Phases 1-2 + Part of 3)

### Phase 1: Story Architecture ✅
- [x] Designed 10-section scroll narrative (DESIGN.md)
- [x] Mapped paper content to web sections
- [x] Defined interactive demo priorities
- [x] Created bilingual (EN/CN) content plan

### Phase 2: Project Scaffold ✅
- [x] Initialized Astro 5 project with TypeScript
- [x] Installed dependencies: Three.js, D3.js, KaTeX
- [x] Created directory structure (components, islands, layouts)
- [x] Configured GitHub Pages deployment (`.github/workflows/deploy.yml`)
- [x] Set up dark astronomy theme (`src/styles/global.css`)
- [x] Created base layout with fonts and KaTeX
- [x] Built responsive nav with language toggle
- [x] Built footer with BibTeX copy functionality
- [x] Created minimal landing page
- [x] **Build verified**: 29KB bundle, compiles successfully

### Phase 3a: Data Extraction ✅
- [x] Extracted 7 diverse spectrum examples with true/predicted log g
- [x] Extracted 1000 predictions for SpecViT and LightGBM
- [x] Computed metrics: SpecViT R²=0.711, MAE=0.442
- [x] Extracted per-stellar-type breakdown (giants, subgiants, dwarfs)

#### Data Files Created (1.2MB total)
- `public/data/spectra_examples.json` (881KB) - 7 spectra with wavelengths + flux
- `public/data/predictions.json` (195KB) - 1000 predictions for scatter plots
- `public/data/stellar_type_metrics.json` (254B) - MAE by stellar type

## 🚧 In Progress / TODO

### Phase 3b: Simulation Engine Port (Next)
- [ ] Create `src/sim/prng.ts` - seeded random number generator
- [ ] Create `src/sim/spectra.ts` - spectrum data loader
- [ ] (Optional) Port attention weight computation for visualization

### Phase 4: Interactive Demos (Main Work)

#### Priority 1: Giants vs Dwarfs Comparison (Section 3)
- [ ] Create `src/islands/PerformanceComparison.ts`
- [ ] D3 scatter plot: pred vs true
- [ ] Toggle: SpecViT ↔ LightGBM
- [ ] Color-code by stellar type (giants=red, dwarfs=blue)
- [ ] Data: `predictions.json`

#### Priority 2: Per-Stellar-Type Bar Chart (Section 6)
- [ ] Create `src/islands/StellarTypeChart.ts`
- [ ] D3 grouped bar chart (MAE for giants, subgiants, dwarfs)
- [ ] Show SpecViT vs LightGBM side-by-side
- [ ] Data: `stellar_type_metrics.json`

#### Priority 3: Spectrum Viewer (Section 2)
- [ ] Create `src/islands/SpectrumViewer.ts`
- [ ] Canvas 2D plot of flux vs wavelength
- [ ] Dropdown to select from 7 examples
- [ ] Show true log g vs predicted log g
- [ ] Pan/zoom functionality
- [ ] Data: `spectra_examples.json`

#### Priority 4: Hero Animation (Section 1)
- [ ] Create `src/islands/HeroAnimation.ts`
- [ ] Three.js particle system (250 particles, reduced to 100 on mobile)
- [ ] Particles represent wavelengths
- [ ] Attention-weighted glow effect
- [ ] Flows through "encoder layers" visualization

#### Optional Demos
- [ ] Training curves (if WandB data extracted)
- [ ] Attention map heatmap (requires checkpoint loading)
- [ ] Residual histogram
- [ ] Method architecture diagram

### Phase 5: Bilingual Support (i18n)
- [ ] Translate all section titles to Chinese
- [ ] Translate demo labels and tooltips
- [ ] Translate footer acknowledgments
- [ ] Update BibTeX with Chinese title

### Phase 6: Polish & Deploy
- [ ] Add paper PDF link (when available)
- [ ] Add arXiv link (when available)
- [ ] Test on mobile (iPhone, Android)
- [ ] Optimize images (if any added)
- [ ] Run Lighthouse audit (target: Performance > 90)
- [ ] Create social media preview image
- [ ] Push to GitHub and deploy via Actions

## 📊 Current Metrics

**Extracted Data:**
- ✅ SpecViT R²: 0.711, MAE: 0.442 (matches paper!)
- ✅ LightGBM R²: 0.614, MAE: 0.560
- ✅ Per-Type MAE:
  - Giants: SpecViT 0.430 vs LightGBM 0.665 (SpecViT wins!)
  - Subgiants: SpecViT 0.417 vs LightGBM 0.378 (LightGBM wins)
  - Dwarfs: SpecViT 0.466 vs LightGBM 0.589 (SpecViT wins!)

**Build Stats:**
- Initial bundle: 29KB (HTML + CSS only)
- After adding Three.js: ~300KB chunk (lazy-loaded)
- After adding D3: ~200KB chunk (lazy-loaded)
- Target total: < 800KB

## 🎯 Estimated Remaining Time

| Task | Time | Priority |
|------|------|----------|
| Performance Comparison Demo | 1.5 hrs | HIGH |
| Stellar Type Bar Chart | 1 hr | HIGH |
| Spectrum Viewer | 1.5 hrs | MEDIUM |
| Hero Animation (Three.js) | 2 hrs | MEDIUM |
| Bilingual translations | 30 min | LOW |
| Polish & deploy | 30 min | HIGH |
| **Total remaining** | **~7 hours** | - |

## 🚀 Quick Commands

```bash
# Development
cd /home/swei20/SpecViT-web
npm run dev          # Start dev server (localhost:4321)
npm run build        # Build for production
npm run preview      # Preview production build

# Data extraction (if need to re-run)
python scripts/extract_data.py

# Deploy
git add -A && git commit -m "Update site" && git push
# GitHub Actions will auto-deploy to https://viskawei.github.io/SpecViT-web
```

## 📝 Notes

1. **Only 7 spectra examples**: The BOSZ test set has limited diversity in stellar types. This is fine for demos - we have giants, subgiants, and dwarfs represented.

2. **LightGBM wins on subgiants**: This is expected and matches the paper's findings. SpecViT's strength is on the extremes (giants and dwarfs).

3. **Attention maps**: Not extracted yet. This requires loading the checkpoint and running inference with attention hooks. Can be added later as an "Advanced" section.

4. **ONNX export**: For live browser inference, we'd need to export the model to ONNX.js format. This is a stretch goal - for now, we'll use pre-computed predictions.

## 🎨 Design Decisions

- **Dark theme**: Astronomy papers traditionally use dark backgrounds for spectra plots
- **Purple brand color**: Distinctive, not typical "science blue"
- **Stellar type colors**: Red (giants/cool) → Yellow (subgiants) → Blue (dwarfs/hot) matches physical intuition
- **Minimalist nav**: Only 4 links to avoid cluttering mobile view
- **Scroll narrative**: Single-page story > multi-page site for research demos

## 🔗 Live Preview (After Deploy)

Once pushed to `main` branch:
- **URL**: https://viskawei.github.io/SpecViT-web
- **Auto-deploy**: Every push triggers GitHub Actions workflow
- **Build time**: ~1-2 minutes

---

**Last updated**: 2026-02-16 01:10 AM EST
**Current phase**: Phase 3b (Simulation Engine) / Phase 4 (Interactive Demos)
