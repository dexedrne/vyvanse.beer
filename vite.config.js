import { defineConfig } from 'vite';
import { projects } from './src/projects.js';
import { renderProjects, renderBubbles } from './src/render.js';

const tapList = {
  name: 'tap-list',
  transformIndexHtml(html) {
    return html
      .replace('<!-- tap-list -->', renderProjects(projects))
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
