import { defineConfig } from 'vite';

export default defineConfig({
  root: 'app',
  envDir: '..',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // keep every script in a file so the CSP can forbid inline scripts
    modulePreload: { polyfill: false },
    assetsInlineLimit: 0,
  },
});
