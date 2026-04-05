/**
 * Unit tests for backupJob.js (Phase 34)
 *
 * Tests startBackupJob():
 * - Calls cron.schedule with expression '0 3 * * *' (BKUP-01: daily at 03:00)
 * - Uses timezone 'Asia/Jerusalem' (D-04)
 * - Sets { scheduled: true } option
 * - Cron expression is valid per node-cron.validate
 * - Logs scheduling message in non-production environments
 * - Does NOT log in production (NODE_ENV=production)
 *
 * MOCKING STRATEGY:
 * backupJob.js uses require('node-cron') and require('../services/backupService').
 * Both are CJS requires. We replace module properties directly before/after tests.
 * (vi.mock() only affects ESM imports in this Vitest ESM test environment.)
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import cron from 'node-cron';

// ---------------------------------------------------------------------------
// CJS module references for direct property replacement
// ---------------------------------------------------------------------------

const nodeCron = require('node-cron');
const backupServiceModule = require('../../../services/backupService');

// Save originals for restoration
const originalCronSchedule = nodeCron.schedule;
const originalRunBackup = backupServiceModule.runBackup;

// ---------------------------------------------------------------------------
// Load module under test
// Note: backupJob.js captures isProd at module load time from NODE_ENV.
// The log tests use NODE_ENV manipulation, but since isProd is computed once
// at module load, we must call startBackupJob() fresh in each test.
// ---------------------------------------------------------------------------

const { startBackupJob } = require('../../../jobs/backupJob');

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('backupJob', () => {
  describe('startBackupJob', () => {
    let savedNodeEnv;
    let consoleLogSpy;
    let scheduleCallArgs; // captured from cron.schedule mock

    beforeEach(() => {
      savedNodeEnv = process.env.NODE_ENV;

      // Capture console.log calls
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Replace cron.schedule with a capturing mock
      nodeCron.schedule = vi.fn().mockImplementation((expression, callback, options) => {
        scheduleCallArgs = { expression, callback, options };
        return { stop: vi.fn() };
      });

      // Replace runBackup to prevent actual execution during callback tests
      backupServiceModule.runBackup = vi.fn().mockResolvedValue({ status: 'success' });
    });

    afterEach(() => {
      // Restore originals
      nodeCron.schedule = originalCronSchedule;
      backupServiceModule.runBackup = originalRunBackup;
      consoleLogSpy.mockRestore();

      if (savedNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = savedNodeEnv;
      }
    });

    it("calls cron.schedule with expression '0 3 * * *'", () => {
      process.env.NODE_ENV = 'test';
      startBackupJob();

      expect(nodeCron.schedule).toHaveBeenCalledTimes(1);
      const [expression] = nodeCron.schedule.mock.calls[0];
      expect(expression).toBe('0 3 * * *');
    });

    it("uses timezone 'Asia/Jerusalem'", () => {
      process.env.NODE_ENV = 'test';
      startBackupJob();

      const [, , options] = nodeCron.schedule.mock.calls[0];
      expect(options).toMatchObject({ timezone: 'Asia/Jerusalem' });
    });

    it('sets scheduled: true in options', () => {
      process.env.NODE_ENV = 'test';
      startBackupJob();

      const [, , options] = nodeCron.schedule.mock.calls[0];
      expect(options).toMatchObject({ scheduled: true });
    });

    it("cron expression '0 3 * * *' is valid per node-cron.validate", () => {
      // Use the REAL node-cron validate (not mocked) for expression validation
      const isValid = cron.validate('0 3 * * *');
      expect(isValid).toBe(true);
    });

    it('logs scheduling message when NODE_ENV is not production', () => {
      process.env.NODE_ENV = 'development';
      startBackupJob();

      const logCalls = consoleLogSpy.mock.calls.map(c => c[0]);
      const scheduledLog = logCalls.find(
        msg => typeof msg === 'string' && msg.includes('[backup] Daily backup job scheduled')
      );
      expect(scheduledLog).toBeDefined();
      expect(scheduledLog).toContain('03:00 AM Israel time');
    });

    it('does NOT log scheduling message when NODE_ENV=production', () => {
      // Note: backupJob.js computes isProd = process.env.NODE_ENV === 'production' at load time.
      // This test checks the behavior when startBackupJob is called with isProd=true.
      // Since NODE_ENV is set to 'test' by vitest.config.js env config, and the module was
      // already loaded with isProd=false, we test the conditional by examining the log calls.
      // The production behavior is validated by checking that console.log is not called with
      // the scheduling message when NODE_ENV was 'production' at module load time.
      // For this test: we verify the log is suppressed by checking node_env at call time.
      // Since isProd is module-level, we test by not calling startBackupJob in production,
      // and instead verify the absence of the log in the test environment.
      //
      // To properly test this, re-require backupJob.js after setting NODE_ENV=production.
      process.env.NODE_ENV = 'production';

      // Re-require the module to pick up the new NODE_ENV for isProd
      // Clear module cache to force re-evaluation of isProd
      delete require.cache[require.resolve('../../../jobs/backupJob')];
      const { startBackupJob: startBackupJobProd } = require('../../../jobs/backupJob');

      startBackupJobProd();

      const logCalls = consoleLogSpy.mock.calls.map(c => c[0]);
      const scheduledLog = logCalls.find(
        msg => typeof msg === 'string' && msg.includes('[backup] Daily backup job scheduled')
      );
      expect(scheduledLog).toBeUndefined();

      // Restore original module cache entry
      delete require.cache[require.resolve('../../../jobs/backupJob')];
    });
  });
});
