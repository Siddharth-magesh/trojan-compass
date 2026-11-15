// Vite config for the Trojan Compass frontend: React + Tailwind, `@/` alias, and a dev proxy from /api to the backend.
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const port = Number(process.env.PORT ?? 5173);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
    dedupe: ['react', 'react-dom'],
  },
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '127.0.0.1',
    // Forward /api to the FastAPI backend (uvicorn backend.main:app --port 8000); SSE streams pass through unchanged.
    proxy: {
      '/api': { target: process.env.BACKEND_URL ?? 'http://localhost:8000', changeOrigin: true },
    },
  },
  preview: { port, host: '127.0.0.1' },
});
