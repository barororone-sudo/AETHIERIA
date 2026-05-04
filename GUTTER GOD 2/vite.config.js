import { defineConfig } from 'vite';

export default defineConfig({
  // Limiter le scan de dépendances à index.html uniquement
  // Évite que Vite scanne les centaines de .html dans assets/
  optimizeDeps: {
    entries: ['index.html'],
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: 'index.html',
      output: {
        manualChunks(id) {
          if (id.includes('@babylonjs'))       return 'vendor-babylon';
          if (id.includes('@dimforge'))        return 'vendor-rapier';
          if (id.includes('simplex-noise'))    return 'vendor-noise';
          if (id.includes('dexie'))            return 'vendor-dexie';
        },
      },
    },
  },
  server: {
    watch: {
      // Ne pas surveiller les assets (trop de fichiers, ralentit le HMR)
      ignored: ['**/assets/**'],
    },
  },
});
