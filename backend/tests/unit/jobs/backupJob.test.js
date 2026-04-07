/**
 * Unit tests for backupJob.js (Phase 34 + Phase 35 additions)
 *
 * Tests startBackupJob():
 * - Calls cron.schedule with expression '0 3 * * *' (BKUP-01: daily at 03:00)
 * - Uses timezone 'Asia/Jerusalem' (D-04)
 * - Sets { scheduled: true } option
 * - Cron expression is valid per node-cron.validate
 * - Logs scheduling message in non-production environments
 * - Does NOT log in production (NODE_ENV=production)
 *
 * Phase 35 additions:
 * - Cron callback calls BackupLog.create() with trigger:'cron' (D-08, D-09)
 * - Cron callback calls sendBackupFailureAlert() on failure (MON-02)
 * - Cron callback does NOT call sendBackupFailureAlert() on success
 * - BackupLog.create() failure is caught and logged (does not crash cron)
 *
 * MOCKING STRATEGY:
 * backupJob.js uses require('node-cron'), require('../services/backupService'),
 * require('../models/BackupLog'), and require('../services/backupAlertService').
 * All are CJS requires. We replace module properties directly before/after tests.
 * BackupLog is the default CJS export (the Mongoose model class itself).
 * We mock its static .create() method via vi.fn().
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import cron from 'node-cron';

// ---------------------------------------------------------------------------
// CJS module references for direct property replacement
// ---------------------------------------------------------------------------

const nodeCron = require('node-cron');
const backupServiceModule = require('../../../services/backupService');
const backupAlertServiceModule = require('../../../services/backupAlertService');

// BackupLog is a Mongoose Model class (default export). We mock its create() static.
const BackupLogModel = require('../../../models/BackupLog');

// Save originals for restoration
const originalCronSchedule = nodeCron.schedule;
const originalRunBackup = backupServiceModule.runBackup;
const originalSendAlert = backupAlertServiceModule.sendBackupFailureAlert;
const originalBackupLogCreate = BackupLogModel.create;

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
      backupServiceModule.runBackup = vi.fn().mockResolvedValue({
        status: 'success',
        filename: 'backup-2026-04-07T03-00-00.000Z.archive.gz',
        sizeBytes: 8421376,
        durationMs: 1203,
        timestamp: '2026-04-07T03:00:00.000Z',
        retentionDeleted: 0,
        retentionError: null,
        error: null,
      });

      // Mock BackupLog.create to avoid real DB writes
      BackupLogModel.create = vi.fn().mockResolvedValue({});

      // Mock sendBackupFailureAlert to avoid real HTTP calls
      backupAlertServiceModule.sendBackupFailureAlert = vi.fn().mockResolvedValue(undefined);
    });

    afterEach(() => {
      // Restore originals
      nodeCron.schedule = originalCronSchedule;
      backupServiceModule.runBackup = originalRunBackup;
      BackupLogModel.create = originalBackupLogCreate;
      backupAlertServiceModule.sendBackupFailureAlert = originalSendAlert;
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

    // =============================================
    // Phase 35: BackupLog persistence (D-08, D-09)
    //
    // backupJob.js destructures runBackup and sendBackupFailureAlert at require()
    // time: const { runBackup } = require('../services/backupService').
    // Replacing module object properties alone won't update the captured reference.
    // We must clear the require cache and re-require backupJob.js AFTER setting
    // the module property mocks — the fresh load destructures from the mock values.
    // =============================================

    describe('BackupLog persistence (Phase 35, D-08, D-09)', () => {
      // Helper: reload backupJob module so its destructured references pick up mocks
      function reloadBackupJob() {
        delete require.cache[require.resolve('../../../jobs/backupJob')];
        const { startBackupJob: freshStart } = require('../../../jobs/backupJob');
        freshStart();
        // scheduleCallArgs is now populated with the fresh callback
        return scheduleCallArgs;
      }

      afterEach(() => {
        // Clean up module cache so original module is used in next test
        delete require.cache[require.resolve('../../../jobs/backupJob')];
      });

      it("should call BackupLog.create() with trigger:'cron' after runBackup()", async () => {
        // BackupLogModel.create is already mocked in outer beforeEach
        // backupJob.js requires BackupLog directly (not destructured), so
        // BackupLogModel.create mock is effective without cache clearing.
        process.env.NODE_ENV = 'test';
        reloadBackupJob();

        await scheduleCallArgs.callback();

        expect(BackupLogModel.create).toHaveBeenCalledTimes(1);
        const createArg = BackupLogModel.create.mock.calls[0][0];
        expect(createArg.trigger).toBe('cron');
      });

      it('should map runBackup result fields to BackupLog schema fields', async () => {
        const successResult = {
          status: 'success',
          filename: 'backup-2026-04-07T03-00-00.000Z.archive.gz',
          sizeBytes: 8421376,
          durationMs: 1203,
          timestamp: '2026-04-07T03:00:00.000Z',
          retentionDeleted: 2,
          retentionError: null,
          error: null,
        };
        // Set mock before reload so the destructured reference captures it
        backupServiceModule.runBackup = vi.fn().mockResolvedValue(successResult);

        process.env.NODE_ENV = 'test';
        reloadBackupJob();
        await scheduleCallArgs.callback();

        expect(BackupLogModel.create).toHaveBeenCalledTimes(1);
        const createArg = BackupLogModel.create.mock.calls[0][0];
        expect(createArg.status).toBe('success');
        expect(createArg.filename).toBe(successResult.filename);
        expect(createArg.bytes).toBe(successResult.sizeBytes);
        expect(createArg.duration_ms).toBe(successResult.durationMs);
        expect(createArg.error).toBeNull();
        expect(createArg.retention_deleted).toBe(2);
      });

      it('should handle BackupLog.create() failure gracefully (does not crash)', async () => {
        BackupLogModel.create = vi.fn().mockRejectedValue(new Error('DB write failed'));
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        process.env.NODE_ENV = 'test';
        reloadBackupJob();

        // Cron callback must not throw even when DB write fails
        await expect(scheduleCallArgs.callback()).resolves.not.toThrow();

        warnSpy.mockRestore();
      });

      it('should log a warning when BackupLog.create() fails', async () => {
        BackupLogModel.create = vi.fn().mockRejectedValue(new Error('DB write failed'));
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        process.env.NODE_ENV = 'test';
        reloadBackupJob();
        await scheduleCallArgs.callback();

        const warnMessages = warnSpy.mock.calls.map(c => c[0]);
        expect(warnMessages.some(m => /failed to persist BackupLog/i.test(m))).toBe(true);

        warnSpy.mockRestore();
      });
    });

    // =============================================
    // Phase 35: Failure alerting (MON-02)
    // =============================================

    describe('Failure alerting (Phase 35, MON-02)', () => {
      // Helper: reload backupJob module so destructured sendBackupFailureAlert
      // picks up the current value of backupAlertServiceModule.sendBackupFailureAlert
      function reloadBackupJob() {
        delete require.cache[require.resolve('../../../jobs/backupJob')];
        const { startBackupJob: freshStart } = require('../../../jobs/backupJob');
        freshStart();
        return scheduleCallArgs;
      }

      afterEach(() => {
        delete require.cache[require.resolve('../../../jobs/backupJob')];
      });

      it('should call sendBackupFailureAlert when runBackup returns status:failed', async () => {
        const failedResult = {
          status: 'failed',
          filename: 'backup-2026-04-07T03-00-00.000Z.archive.gz',
          sizeBytes: null,
          durationMs: 500,
          timestamp: '2026-04-07T03:00:00.000Z',
          retentionDeleted: 0,
          retentionError: null,
          error: 'mongodump exited 1: connection refused',
        };
        // Set mocks BEFORE reload so destructured references capture them
        backupServiceModule.runBackup = vi.fn().mockResolvedValue(failedResult);
        backupAlertServiceModule.sendBackupFailureAlert = vi.fn().mockResolvedValue(undefined);

        process.env.NODE_ENV = 'test';
        reloadBackupJob();
        await scheduleCallArgs.callback();

        expect(backupAlertServiceModule.sendBackupFailureAlert).toHaveBeenCalledTimes(1);
      });

      it('should pass runBackup result to sendBackupFailureAlert', async () => {
        const failedResult = {
          status: 'failed',
          filename: 'backup-2026-04-07T03-00-00.000Z.archive.gz',
          sizeBytes: null,
          durationMs: 500,
          timestamp: '2026-04-07T03:00:00.000Z',
          retentionDeleted: 0,
          retentionError: null,
          error: 'mongodump exited 1: connection refused',
        };
        backupServiceModule.runBackup = vi.fn().mockResolvedValue(failedResult);
        backupAlertServiceModule.sendBackupFailureAlert = vi.fn().mockResolvedValue(undefined);

        process.env.NODE_ENV = 'test';
        reloadBackupJob();
        await scheduleCallArgs.callback();

        expect(backupAlertServiceModule.sendBackupFailureAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'failed',
            error: failedResult.error,
          })
        );
      });

      it('should NOT call sendBackupFailureAlert when runBackup returns status:success', async () => {
        // backupServiceModule.runBackup already returns success from outer beforeEach
        backupAlertServiceModule.sendBackupFailureAlert = vi.fn().mockResolvedValue(undefined);

        process.env.NODE_ENV = 'test';
        reloadBackupJob();
        await scheduleCallArgs.callback();

        expect(backupAlertServiceModule.sendBackupFailureAlert).not.toHaveBeenCalled();
      });
    });
  });
});
