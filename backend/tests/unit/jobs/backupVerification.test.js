/**
 * Unit tests for backup binary verification (Phase 33, BKUP-04).
 * Tests verifyMongodumpBinary() startup check behavior.
 *
 * Key behaviors:
 * - Logs version when binary found (both mongodump and mongorestore)
 * - Throws in production when binary missing (D-06: fail loud)
 * - Warns (no throw) in non-production when binary missing
 * - Respects MONGODUMP_PATH and MONGORESTORE_PATH env vars (D-08)
 * - Uses execFileSync (not execSync) for security — no shell spawning
 *
 * Testing approach: dependency injection. verifyMongodumpBinary() accepts an
 * optional execFileSync override, so tests pass a vi.fn() mock directly.
 * This avoids ESM/CJS module mock boundary issues.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Use require() for CJS backend modules (consistent with other backend unit tests)
const { verifyMongodumpBinary } = require('../../../utils/backupBinaryCheck.js');

describe('verifyMongodumpBinary', () => {
  let originalEnv;
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;
  let mockExecFileSync;

  beforeEach(() => {
    // Save environment
    originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      MONGODUMP_PATH: process.env.MONGODUMP_PATH,
      MONGORESTORE_PATH: process.env.MONGORESTORE_PATH,
    };

    // Reset env vars to clean defaults
    delete process.env.MONGODUMP_PATH;
    delete process.env.MONGORESTORE_PATH;
    // Set dev mode by default (most tests run in dev)
    process.env.NODE_ENV = 'development';

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create fresh mock for each test
    mockExecFileSync = vi.fn();
  });

  afterEach(() => {
    // Restore environment
    if (originalEnv.NODE_ENV === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalEnv.NODE_ENV;
    }

    if (originalEnv.MONGODUMP_PATH === undefined) {
      delete process.env.MONGODUMP_PATH;
    } else {
      process.env.MONGODUMP_PATH = originalEnv.MONGODUMP_PATH;
    }

    if (originalEnv.MONGORESTORE_PATH === undefined) {
      delete process.env.MONGORESTORE_PATH;
    } else {
      process.env.MONGORESTORE_PATH = originalEnv.MONGORESTORE_PATH;
    }

    // Restore console
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Binary found (success path)', () => {
    beforeEach(() => {
      // Mock execFileSync to return version strings for both binaries
      mockExecFileSync.mockImplementation((cmd, args) => {
        if (cmd === 'which') {
          return '/usr/bin/mongodump\n';
        }
        if (args && args[0] === '--version') {
          if (cmd === 'mongodump' || (typeof cmd === 'string' && cmd.includes('mongodump'))) {
            return 'mongodump version 100.10.0\ngit version: ...\n';
          }
          if (cmd === 'mongorestore' || (typeof cmd === 'string' && cmd.includes('mongorestore'))) {
            return 'mongorestore version 100.10.0\ngit version: ...\n';
          }
        }
        return '';
      });
    });

    it('should not throw when both binaries are found', () => {
      expect(() => verifyMongodumpBinary(mockExecFileSync)).not.toThrow();
    });

    it('should log mongodump version when binary is found', () => {
      verifyMongodumpBinary(mockExecFileSync);
      // Should log the first line of the version output
      const logCalls = consoleLogSpy.mock.calls.map(call => call[0]);
      const mongodumpLog = logCalls.find(msg =>
        typeof msg === 'string' && msg.includes('[backup] mongodump binary OK')
      );
      expect(mongodumpLog).toBeDefined();
      expect(mongodumpLog).toContain('mongodump version 100.10.0');
    });

    it('should log mongorestore version when binary is found', () => {
      verifyMongodumpBinary(mockExecFileSync);
      const logCalls = consoleLogSpy.mock.calls.map(call => call[0]);
      const mongorestoreLog = logCalls.find(msg =>
        typeof msg === 'string' && msg.includes('[backup] mongorestore binary OK')
      );
      expect(mongorestoreLog).toBeDefined();
      expect(mongorestoreLog).toContain('mongorestore version 100.10.0');
    });

    it('should call execFileSync with --version args (not execSync pattern)', () => {
      verifyMongodumpBinary(mockExecFileSync);
      // execFileSync should have been called with ['--version'] args
      const versionCalls = mockExecFileSync.mock.calls.filter(
        ([, args]) => args && args[0] === '--version'
      );
      expect(versionCalls.length).toBeGreaterThanOrEqual(2); // mongodump + mongorestore
    });
  });

  describe('Binary missing in production (fail loud)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      // Mock execFileSync to simulate ENOENT (binary not found)
      mockExecFileSync.mockImplementation((cmd) => {
        const err = new Error(`spawn ${cmd} ENOENT`);
        err.code = 'ENOENT';
        throw err;
      });
    });

    it('should throw Error when mongodump is missing in production', () => {
      expect(() => verifyMongodumpBinary(mockExecFileSync)).toThrow();
    });

    it('should throw Error with "mongodump binary unavailable" message in production', () => {
      expect(() => verifyMongodumpBinary(mockExecFileSync)).toThrow('mongodump binary unavailable');
    });

    it('should log FATAL error before throwing in production', () => {
      try {
        verifyMongodumpBinary(mockExecFileSync);
      } catch {
        // expected
      }
      const errorCalls = consoleErrorSpy.mock.calls.map(call => call[0]);
      const fatalLog = errorCalls.find(msg =>
        typeof msg === 'string' && msg.includes('[backup] FATAL')
      );
      expect(fatalLog).toBeDefined();
    });
  });

  describe('mongorestore missing in production (fail loud)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should throw Error with "mongorestore binary unavailable" when mongorestore missing in production', () => {
      let mongodumpCalled = false;
      // Mock: mongodump succeeds, mongorestore fails
      mockExecFileSync.mockImplementation((cmd, args) => {
        // Allow 'which' to fail silently (caught inside function)
        if (cmd === 'which') {
          const err = new Error('which not found');
          err.code = 'ENOENT';
          throw err;
        }
        if (args && args[0] === '--version') {
          if ((cmd === 'mongodump' || cmd.includes('mongodump')) && !mongodumpCalled) {
            mongodumpCalled = true;
            return 'mongodump version 100.10.0\n';
          }
          // mongorestore --version fails
          const err = new Error('spawn mongorestore ENOENT');
          err.code = 'ENOENT';
          throw err;
        }
        return '';
      });

      expect(() => verifyMongodumpBinary(mockExecFileSync)).toThrow('mongorestore binary unavailable');
    });
  });

  describe('Binary missing in dev (warn, no throw)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      // Mock execFileSync to simulate ENOENT for all commands
      mockExecFileSync.mockImplementation((cmd) => {
        const err = new Error(`spawn ${cmd} ENOENT`);
        err.code = 'ENOENT';
        throw err;
      });
    });

    it('should NOT throw when mongodump is missing in dev', () => {
      expect(() => verifyMongodumpBinary(mockExecFileSync)).not.toThrow();
    });

    it('should log a warning when mongodump is missing in dev', () => {
      verifyMongodumpBinary(mockExecFileSync);
      const warnCalls = consoleWarnSpy.mock.calls.map(call => call[0]);
      const warnLog = warnCalls.find(msg =>
        typeof msg === 'string' && msg.includes('[backup] WARNING') && msg.includes('mongodump')
      );
      expect(warnLog).toBeDefined();
    });

    it('should log a warning when mongorestore is missing in dev', () => {
      verifyMongodumpBinary(mockExecFileSync);
      const warnCalls = consoleWarnSpy.mock.calls.map(call => call[0]);
      const mongorestoreWarn = warnCalls.find(msg =>
        typeof msg === 'string' && msg.includes('[backup] WARNING') && msg.includes('mongorestore')
      );
      expect(mongorestoreWarn).toBeDefined();
    });

    it('should NOT throw when NODE_ENV is not set (non-production)', () => {
      delete process.env.NODE_ENV;
      expect(() => verifyMongodumpBinary(mockExecFileSync)).not.toThrow();
    });
  });

  describe('Env var override (D-08)', () => {
    beforeEach(() => {
      // Make any binary call succeed
      mockExecFileSync.mockImplementation((cmd, args) => {
        if (cmd === 'which') return `/usr/bin/${args[0]}\n`;
        if (args && args[0] === '--version') return `${cmd} version 100.10.0\n`;
        return '';
      });
    });

    it('should use MONGODUMP_PATH env var when set', () => {
      process.env.MONGODUMP_PATH = '/custom/path/mongodump';
      verifyMongodumpBinary(mockExecFileSync);

      // execFileSync should have been called with the custom path
      const calls = mockExecFileSync.mock.calls;
      const versionCall = calls.find(([cmd, args]) =>
        cmd === '/custom/path/mongodump' && args && args[0] === '--version'
      );
      expect(versionCall).toBeDefined();
    });

    it('should use MONGORESTORE_PATH env var when set', () => {
      process.env.MONGORESTORE_PATH = '/custom/path/mongorestore';
      verifyMongodumpBinary(mockExecFileSync);

      // execFileSync should have been called with the custom path
      const calls = mockExecFileSync.mock.calls;
      const versionCall = calls.find(([cmd, args]) =>
        cmd === '/custom/path/mongorestore' && args && args[0] === '--version'
      );
      expect(versionCall).toBeDefined();
    });

    it('should default to bare "mongodump" when MONGODUMP_PATH is not set', () => {
      delete process.env.MONGODUMP_PATH;
      verifyMongodumpBinary(mockExecFileSync);

      const calls = mockExecFileSync.mock.calls;
      const versionCall = calls.find(([cmd, args]) =>
        cmd === 'mongodump' && args && args[0] === '--version'
      );
      expect(versionCall).toBeDefined();
    });

    it('should default to bare "mongorestore" when MONGORESTORE_PATH is not set', () => {
      delete process.env.MONGORESTORE_PATH;
      verifyMongodumpBinary(mockExecFileSync);

      const calls = mockExecFileSync.mock.calls;
      const versionCall = calls.find(([cmd, args]) =>
        cmd === 'mongorestore' && args && args[0] === '--version'
      );
      expect(versionCall).toBeDefined();
    });
  });
});
