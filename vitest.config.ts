import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.opencode/**',
      '**/.claude/**',
      'screencold-worker/tests/jobs.test.ts',
      'screencold-worker/tests/pipeline.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './screencold-web'),
      '@screencold/types': path.resolve(__dirname, './packages/types/src'),
      '@screencold/db': path.resolve(__dirname, './packages/db/src'),
    },
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    include: [
      'screencold-web/lib/**/*.ts',
      'screencold-web/hooks/**/*.ts',
      'screencold-web/components/**/*.tsx',
      'screencold-worker/**/*.ts',
      'packages/types/src/**/*.ts',
    ],
    exclude: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.opencode/**',
      '**/.claude/**',
    ],
  },
});