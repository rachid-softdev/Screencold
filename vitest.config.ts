import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', 'dist', '.next'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web'),
      '@screencold/types': path.resolve(__dirname, './packages/types/src'),
      '@screencold/db': path.resolve(__dirname, './packages/db/src'),
    },
  },
});