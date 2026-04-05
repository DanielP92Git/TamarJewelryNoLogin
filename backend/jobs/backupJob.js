/**
 * Backup Job (Phase 34)
 *
 * Schedules the daily MongoDB backup cron job.
 * Mirrors the exchangeRateJob.js pattern exactly.
 *
 * D-04: Runs at 03:00 AM Israel time (Asia/Jerusalem) every day.
 * D-05: Cron expression '0 3 * * *' is hardcoded — change requires code deploy.
 */

'use strict';

const cron = require('node-cron');
const { runBackup } = require('../services/backupService');

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
      await runBackup();
    },
    { scheduled: true, timezone: 'Asia/Jerusalem' }
  );

  if (!isProd) {
    console.log('[backup] Daily backup job scheduled (03:00 AM Israel time)');
  }
}

module.exports = { startBackupJob };
