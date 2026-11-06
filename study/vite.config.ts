/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173, strictPort: true },
  worker: { format: 'es' },
  build: { chunkSizeWarningLimit: 900 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
