import { defineConfig } from 'vite';
import { site, groups, projects, crew, contact, mascot } from './src/projects.js';
import { renderHero, renderContent, renderFooter } from './src/render.js';

// Renders the landing from src/projects.js into index.html, so the shipped HTML already
// holds every project and link before any JS runs.
const landing = {
  name: 'landing',
  transformIndexHtml(html) {
    return html
      .replace('<!-- hero -->', renderHero(site, mascot))
      .replace('<!-- content -->', renderContent({ groups, projects, crew, contact }))
      .replace('<!-- footer -->', renderFooter(site));
  },
};

// model-viewer 4.3.1 ships debug console.log calls ("[$updateSource] called!" and friends). Its
// logs are silenced in the bundle; warnings and errors still come through.
const quietViewer = {
  name: 'quiet-model-viewer',
  apply: 'build',
  transform(code, id) {
    if (!/[\\/]@google[\\/]model-viewer[\\/]lib[\\/]/.test(id) || !code.includes('console.log(')) return null;
    return { code: code.replaceAll('console.log(', '(() => {})('), map: null };
  },
};

export default defineConfig({
  plugins: [landing, quietViewer],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    // model-viewer (three.js inside) is one ~1 MB chunk, loaded on its own once the hero is on
    // screen (src/bro.js), never in the way of the page. Only warn above that.
    chunkSizeWarningLimit: 1100,
  },
});
