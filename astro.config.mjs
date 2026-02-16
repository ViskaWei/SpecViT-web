// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://viskawei.github.io',
  base: '/SpecViT-web',
  build: {
    assets: '_assets',
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) return 'three';
            if (id.includes('node_modules/d3')) return 'd3';
            if (id.includes('node_modules/katex')) return 'katex';
          },
        },
      },
    },
  },
});
