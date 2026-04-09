'use strict';

/**
 * Backup Routes (Phase 35)
 *
 * Provides authenticated admin endpoints for manual backup trigger and backup listing.
 *
 * POST /admin/backup  — Manual backup trigger (ADM-01, D-15, D-16, D-17)
 * GET  /admin/backups — Backup history listing (REST-03, D-12, D-13, D-14)
 *
 * Both routes require admin authentication (fetchUser + requireAdmin).
 * adminRateLimiter recreated locally — not exported from index.js (see RESEARCH.md Pitfall 1).
 */

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { fetchUser, requireAdmin } = require('../middleware/auth');
const { runBackup, runRestore, createBackupS3Client } = require('../services/backupService');
const { getActiveOperation, setActiveOperation, clearActiveOperation } = require('../utils/backupLock');
const BackupLog = require('../models/BackupLog');
const { sendBackupFailureAlert } = require('../services/backupAlertService');

const router = Router();

// Recreate admin rate limiter (not exported from index.js)
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_ADMIN_MAX || 120),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// =============================================
// POST /admin/backup — Manual trigger (ADM-01, D-15, D-16, D-17)
// =============================================
router.post(
  '/backup',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    // D-17/D-12: Reject if any operation already in progress
    if (getActiveOperation() !== null) {
      const msg = getActiveOperation() === 'restore'
        ? 'Restore in progress'
        : 'Backup already in progress';
      return res.status(409).json({ success: false, error: msg });
    }

    setActiveOperation('backup');
    let logWarning = null;
    try {
      // D-16: Synchronous — await runBackup and return result directly
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
          trigger: 'manual',
          retention_deleted: result.retentionDeleted || 0,
          retention_error: result.retentionError || null,
        });
      } catch (dbErr) {
        // DB write failure must not block API response
        console.warn('[backup] failed to persist BackupLog:', dbErr.message);
        logWarning = 'Backup succeeded but log entry could not be saved to database';
      }

      // D-04, MON-02: Send alert on failure (both cron and manual)
      if (result.status === 'failed') {
        await sendBackupFailureAlert(result);
      }

      // Return result directly per UI-SPEC API Response Shape Contract
      return res.json({
        success: true,
        status: result.status,
        filename: result.filename,
        sizeBytes: result.sizeBytes,
        durationMs: result.durationMs,
        timestamp: result.timestamp,
        retentionDeleted: result.retentionDeleted,
        error: result.error,
        ...(logWarning && { warning: logWarning }),
      });
    } catch (err) {
      // Unexpected error (runBackup should not throw — it catches internally)
      console.error('[backup] unexpected error in manual trigger:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Unexpected backup error',
      });
    } finally {
      // D-17/D-12: Always release lock
      clearActiveOperation();
    }
  }
);

// =============================================
// GET /admin/backups — Backup listing (REST-03, D-12, D-13, D-14)
// =============================================
router.get(
  '/backups',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    try {
      // Fetch Spaces objects (if credentials configured)
      const spacesMap = new Map();

      if (
        process.env.BACKUP_BUCKET &&
        process.env.BACKUP_SPACES_ENDPOINT &&
        process.env.BACKUP_SPACES_KEY &&
        process.env.BACKUP_SPACES_SECRET
      ) {
        try {
          const s3 = createBackupS3Client();
          const prefix = process.env.BACKUP_SPACES_PREFIX || 'backups/';
          const listResp = await s3
            .listObjectsV2({ Bucket: process.env.BACKUP_BUCKET, Prefix: prefix })
            .promise();
          const spacesObjects = listResp.Contents || [];

          for (const obj of spacesObjects) {
            const filename = obj.Key.replace(prefix, '');
            spacesMap.set(filename, obj);
          }
        } catch (s3Err) {
          console.warn('[backup] failed to list Spaces objects:', s3Err.message);
          // Continue with log-only data if Spaces unreachable
        }
      }

      // Fetch all BackupLog entries sorted newest-first
      const logs = await BackupLog.find({}).sort({ timestamp: -1 }).lean();

      // D-12: Build lookup from filename -> log entry
      const logMap = new Map();
      for (const log of logs) {
        logMap.set(log.filename, log);
      }

      // D-12, D-13: Union of both sources — merge by filename
      const allFilenames = new Set([...spacesMap.keys(), ...logMap.keys()]);
      const merged = [];

      for (const filename of allFilenames) {
        const spacesObj = spacesMap.get(filename);
        const logEntry = logMap.get(filename);

        merged.push({
          filename,
          lastModified: spacesObj?.LastModified ?? logEntry?.timestamp ?? null,
          sizeBytes: spacesObj?.Size ?? logEntry?.bytes ?? null,
          status: logEntry?.status ?? 'unknown',
          durationMs: logEntry?.duration_ms ?? null,
          error: logEntry?.error ?? null,
          trigger: logEntry?.trigger ?? null,
        });
      }

      // D-14: Sort newest-first (no pagination)
      merged.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

      return res.json({ success: true, backups: merged });
    } catch (err) {
      console.error('[backup] listing error:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve backup listing',
      });
    }
  }
);

// =============================================
// POST /admin/restore/:key — Database restore (REST-01, REST-02, D-09, D-10)
// =============================================
router.post(
  '/restore/:key(*)',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    // D-10/REST-02: Confirmation gate — strict equality required (Pitfall 6)
    if (req.body.confirm !== 'RESTORE') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid confirmation. Send { "confirm": "RESTORE" } to proceed.',
      });
    }

    // D-12: Unified concurrency lock
    if (getActiveOperation() !== null) {
      const msg = getActiveOperation() === 'backup'
        ? 'Backup in progress — cannot restore while backup is running'
        : 'Restore already in progress';
      return res.status(409).json({ success: false, error: msg });
    }

    setActiveOperation('restore');
    try {
      // D-07: Synchronous — await runRestore and return result directly
      const result = await runRestore(req.params.key);

      // D-15/D-16: Persist to BackupLog with trigger:'restore' and preRestoreBackup
      try {
        await BackupLog.create({
          timestamp: new Date(result.timestamp),
          status: result.status,
          filename: req.params.key,
          bytes: null,
          duration_ms: result.totalMs,
          error: result.error,
          trigger: 'restore',
          preRestoreBackup: result.preRestoreBackup,
        });
      } catch (dbErr) {
        console.warn('[backup] failed to persist restore BackupLog:', dbErr.message);
      }

      // D-17: Alert on restore failure
      if (result.status === 'failed') {
        try {
          await sendBackupFailureAlert({
            error: result.error,
            timestamp: result.timestamp,
            filename: req.params.key,
            durationMs: result.totalMs,
          });
        } catch (alertErr) {
          console.warn('[backup] restore alert failed:', alertErr.message);
        }
      }

      // D-18/D-19: Return full result with timing and preRestoreBackup.
      // failedStep === 'validation' means key not found (D-11) — return 404.
      // Other failures return 500.
      if (result.status === 'failed') {
        const httpStatus = result.failedStep === 'validation' ? 404 : 500;
        return res.status(httpStatus).json({ success: false, ...result });
      }

      return res.json({ success: true, ...result });
    } catch (err) {
      // Unexpected error (runRestore should not throw — it catches internally)
      console.error('[backup] unexpected error in restore:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Unexpected restore error',
      });
    } finally {
      // D-12: Always release lock
      clearActiveOperation();
    }
  }
);

module.exports = router;
