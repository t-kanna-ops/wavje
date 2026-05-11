import { defineConfig } from 'vite';

export default defineConfig({
  // For GitHub Pages deployment, set base to your repository name.
  // e.g.  base: '/WavJe-Portable/'
  // The GitHub Actions workflow sets this automatically via VITE_BASE_PATH env var.
  base: process.env.VITE_BASE_PATH ?? '/',

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },

  server: {
    open: true,
    // Required for microphone/camera access (HTTPS not needed locally)
    // If deploying to a non-HTTPS host, camera/mic won't work in browsers.
  },
});
