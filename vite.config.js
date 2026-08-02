import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Important for GitHub Pages relative paths
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  server: {
    port: 5173,
    open: true
  }
});
