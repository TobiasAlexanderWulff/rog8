import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    sourcemap: true,
    target: 'es2022',
    outDir: 'dist',
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['src/shared/setup-parse5.ts'],
    pool: 'threads',
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
    },
  },
});
