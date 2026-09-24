import { defineConfig } from 'vite';
import { sections } from './src/projects.js';
import { renderSections, renderMenu, renderBubbles } from './src/render.js';

const tapList = {
  name: 'tap-list',
  transformIndexHtml(html) {
    return html
      .replace('<!-- menu -->', renderMenu(sections))
      .replace('<!-- sections -->', renderSections(sections))
      .replace('<!-- bubbles -->', renderBubbles());
  },
};

export default defineConfig({
  plugins: [tapList],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
