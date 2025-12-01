import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', '@dnd-kit/accessibility'],
  },
  optimizeDeps: {
    include: ['uuid', 'dexie', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', '@dnd-kit/accessibility'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
    rollupOptions: {
      maxParallelFileOps: 20,
      onwarn(warning, warn) {
        // Ignore specific warnings
        if (warning.code === 'UNRESOLVED_IMPORT') return;
        warn(warning);
      },
    },
  },
  server: {
    port: 6174,
    host: '0.0.0.0', // Listen on all interfaces (required for Docker/ECS)
    strictPort: true,
    hmr: false, // Disable HMR to prevent WebSocket errors in headless environments
  },
})
