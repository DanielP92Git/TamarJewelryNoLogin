import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use happy-dom environment for browser simulation (2-3x faster than jsdom)
    environment: 'happy-dom',

    // Test file patterns
    include: [
      'tests/**/*.test.js',
      'js/**/*.test.js'
    ],

    // Setup file to run before each test
    setupFiles: ['./tests/setup.js'],

    // Enable globals (describe, it, expect available without import)
    globals: true,

    // Generous timeout for DOM operations
    testTimeout: 10000,

    // Exclude these directories from watch mode
    exclude: [
      'node_modules/**',
      '.parcel-cache/**',
      'dist/**',
      '**/node_modules/**',
      '**/.parcel-cache/**',
      '**/dist/**'
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: [
        'js/**/*.js'
      ],
      exclude: [
        'node_modules/**',
        'tests/**',
        'coverage/**',
        'dist/**',
        '.parcel-cache/**',
        '*.config.js',
        '**/*.test.js',
        '**/postbuild.js'
      ],
      thresholds: {
        // Start with no thresholds, increase as coverage improves
        // lines: 70,
        // functions: 70,
        // branches: 60,
        // statements: 70
      }
    }
  }
});
