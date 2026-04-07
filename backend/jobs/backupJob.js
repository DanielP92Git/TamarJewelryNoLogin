/**
 * Backup Job (Phase 34, updated Phase 35)
 *
 * Schedules the daily MongoDB backup cron job.
 * Mirrors the exchangeRateJob.js pattern exactly.
 *
 * D-04: Runs at 03:00 AM Israel time (Asia/Jerusalem) every day.
 * D-05: Cron expression '0 3 * * *' is hardcoded — change requires code deploy.
 *
 * Phase 35 additions:
 * - Persists each cron run to BackupLog MongoDB collection (D-08, D-09)
 * - Sends failure alert email via backupAlertService (D-04, MON-02)
 */

'use strict';

const cron = require('node-cron');
const { runBackup } = require('../services/backupService');
const BackupLog = require('../models/BackupLog');
const { sendBackupFailureAlert } = require('../services/backupAlertService');

const isProd = process.env.NODE_ENV === 'production';

/**
 * Start the daily backup cron job.
 * Runs at 03:00 AM Israel time (Asia/Jerusalem) per D-04.
 * Cron expression is hardcoded per D-05 -- change requires code deploy.
 */
function startBackupJob() {
  cron.schedule(
    '0 3 * * *',
    async () => {
      const result = await runBackup();

      // D-08, D-09: Persist to BackupLog (caller persists, not backupService)
      try {
        await BackupLog.create({
          timestamp: new Date(result.timestamp),
          status: result.status,
          filename: result.filename,
          bytes: result.sizeBytes,
          duration_ms: result.durationMs,
          error: result.error,
          trigger: 'cron',
          retention_deleted: result.retentionDeleted || 0,
          retention_error: result.retentionError || null,
        });
      } catch (dbErr) {
        console.warn('[backup] failed to persist BackupLog:', dbErr.message);
      }

      // D-04, MON-02: Send alert on failure (both cron and manual)
      if (result.status === 'failed') {
        await sendBackupFailureAlert(result);
      }
    },
    { scheduled: true, timezone: 'Asia/Jerusalem' }
  );

  if (!isProd) {
    console.log('[backup] Daily backup job scheduled (03:00 AM Israel time)');
  }
}

module.exports = { startBackupJob };
