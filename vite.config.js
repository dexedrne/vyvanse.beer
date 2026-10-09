import { defineConfig } from 'vite';
import { site, groups, projects, crew, contact, duo } from './src/projects.js';
import { renderShell } from './src/render.js';
import { globSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeWorker } from './src/pwa/build.js';

// Renders the game-select screen from src/projects.js into index.html, so the shipped HTML
// already holds every game, model download and link before any JS runs.
const shell = {
  name: 'shell',
  transformIndexHtml(html) {
    return html.replace('<!-- shell -->', renderShell({ site, groups, projects, crew, contact, duo }));
  },
};

export default defineConfig({
  plugins: [shell, { name: 'art-archives', writeBundle({ dir }) {
    for (const file of globSync('**/*.prev.*', { cwd: dir })) rmSync(resolve(dir, file));
  } }, { name: 'launcher-worker', closeBundle() { writeWorker(resolve('dist')); } }],
  cacheDir: process.env.TMPDIR ? `${process.env.TMPDIR}/vyvanse-vite-cache` : undefined,
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    // three.js (the live duo, src/duo.js) is one chunk of about 0.6 MB, loaded on its own after
    // the first paint, never in the way of the menu. Only warn above that.
    chunkSizeWarningLimit: 700,
  },
});
