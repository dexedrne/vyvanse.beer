import { defineConfig } from 'vite';
import { site, groups, projects, crew, mascot } from './src/projects.js';
import { renderHero, renderContent, renderFooter } from './src/render.js';

// Renders the landing from src/projects.js into index.html, so the shipped HTML already
// holds every project and link before any JS runs.
const landing = {
  name: 'landing',
  transformIndexHtml(html) {
    return html
      .replace('<!-- hero -->', renderHero(site, mascot))
      .replace('<!-- content -->', renderContent({ groups, projects, crew }))
      .replace('<!-- footer -->', renderFooter(site));
  },
};

export default defineConfig({
  plugins: [landing],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
