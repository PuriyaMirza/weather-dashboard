import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    // .claude/worktrees holds agent worktrees: full repo copies whose tests aren't this checkout's.
    exclude: ['**/node_modules/**', '**/tests/e2e/**', '.claude/**'],
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
