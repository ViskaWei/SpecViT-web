# SpecViT Interactive Website

> Interactive research promotion website for SpecViT: Vision Transformers for Stellar Parameter Estimation

**Live Demo** (after deploy): https://viskawei.github.io/SpecViT-web

## 🎯 Project Goals

Transform the SpecViT paper into an interactive, distill.pub-quality website with:
- Live data visualizations (D3.js charts)
- Interactive spectrum viewer
- Attention map visualizations
- Performance comparisons across stellar types
- Bilingual support (EN/CN)

## 📊 Current Status

### ✅ Completed
- [x] Project scaffold with Astro + TypeScript
- [x] Dark astronomy theme with responsive design
- [x] Bilingual navigation and footer
- [x] Data extraction (1.2MB of spectra and predictions)
- [x] First interactive demo: Per-Stellar-Type MAE chart (D3.js)
- [x] GitHub Actions auto-deployment

### 🚧 Next Steps
- Interactive scatter plot (pred vs true, toggle SpecViT/LightGBM)
- Spectrum viewer with pan/zoom
- Three.js hero animation
- Training curves
- Attention map heatmaps

**Progress**: ~30% complete (~8 hours remaining)

See [PROGRESS.md](./PROGRESS.md) for detailed roadmap and [DESIGN.md](./DESIGN.md) for full story architecture.

## 🚀 Quick Start

```bash
# Start dev server
npm run dev
# → Open http://localhost:4321

# Build for production
npm run build

# Deploy (auto via GitHub Actions on push to main)
git push origin main
```

## 📁 Key Files

```
SpecViT-web/
├── public/data/           # 1.2MB JSON data (spectra, predictions)
├── src/
│   ├── islands/           # Interactive TypeScript demos
│   │   └── StellarTypeChart.ts  # D3.js bar chart ✅
│   ├── pages/index.astro  # Main landing page
│   └── styles/global.css  # Dark astronomy theme
├── scripts/extract_data.py  # Data extraction script
├── DESIGN.md              # Story architecture (10 sections)
└── PROGRESS.md            # Detailed progress tracking
```

## 📚 Documentation

- **[DESIGN.md](./DESIGN.md)** - Full story architecture with 10 scroll sections
- **[PROGRESS.md](./PROGRESS.md)** - Detailed progress, metrics, and next steps
- **[Astro Docs](https://docs.astro.build)** - Framework documentation

---

**Built with** [Astro](https://astro.build) | **Deployed on** [GitHub Pages](https://pages.github.com)
