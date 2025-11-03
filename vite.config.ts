import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

const testConfig: Record<string, unknown> = {
  environment: 'node',
  globals: true,
  include: ['src/**/*.{test,spec}.{ts,tsx}'],
  setupFiles: ['src/shared/setup-parse5.ts'],
  pool: 'threads',
  globalSetup: ['src/shared/vitest-global-setup.ts'],
  coverage: {
    provider: 'v8',
    reportsDirectory: 'coverage',
  },
};

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
  test: testConfig,
});
