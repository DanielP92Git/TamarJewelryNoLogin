import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Test file patterns
    include: ['tests/**/*.test.js'],

    // Global setup file
    setupFiles: ['./tests/setup.js'],

    // Make describe, it, expect available without imports
    globals: true,

    // Timeout for tests (mongodb-memory-server needs time to start)
    testTimeout: 30000,

    // Files to exclude from watch
    exclude: ['**/node_modules/**', '**/coverage/**'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'tests/**',
        'vitest.config.js',
        'migrate-mongo-config.js',
        'migrations/**',
      ],
    },
  },
});
