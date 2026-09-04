import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * GitHub Pages hosts the site under /story-books/. We hard-code that as `base`
 * so all emitted asset URLs include the project path. The router keeps using
 * hash mode so refresh on a deep link never 404s, and we still drop a 404.html
 * copy as a belt-and-suspenders fallback for any direct hit.
 */
const BASE_PATH = '/story-books/';

/**
 * write404HtmlPlugin — after Vite emits index.html, clone it as 404.html so
 * GitHub Pages can serve the SPA shell for any unknown path (history-mode style
 * navigation, search bots, or accidental refreshes). Hash mode means our actual
 * routes never reach this fallback, but the copy is cheap insurance.
 */
function write404HtmlPlugin(): Plugin {
  return {
    name: 'story-garden:write-404',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const indexAsset = bundle['index.html'];
      if (!indexAsset || indexAsset.type !== 'asset') return;
      const clone = { ...indexAsset, fileName: '404.html' };
      this.emitFile(clone);
    },
  };
}

export default defineConfig({
  plugins: [vue(), write404HtmlPlugin()],
  base: BASE_PATH,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  // Allow import.meta.glob('/stories/**') — stories live at the project root.
  assetsInclude: ['**/*.md'],
});
