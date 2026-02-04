import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
    },

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
      reporter: ['text', 'json', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: [
        'index.js',
        'middleware/**/*.js',
        'models/**/*.js',
        'services/**/*.js',
        'config/**/*.js',
        'jobs/**/*.js'
      ],
      exclude: [
        'node_modules/**',
        'tests/**',
        'coverage/**',
        '*.config.js',
        'migrate-mongo-config.js',
        'migrations/**',
      ],
      thresholds: {
        // Start with no thresholds, increase as coverage improves
        // lines: 70,
        // functions: 70,
        // branches: 60,
        // statements: 70
      }
    },
  },
});
