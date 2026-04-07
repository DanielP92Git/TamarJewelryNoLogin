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
const { runBackup, createBackupS3Client } = require('../services/backupService');
const BackupLog = require('../models/BackupLog');
const { sendBackupFailureAlert } = require('../services/backupAlertService');

const router = Router();

// Recreate admin rate limiter (not exported from index.js)
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_ADMIN_MAX || 120),
});

// D-17: In-memory concurrency lock (single-instance App Platform)
let isBackupRunning = false;

// =============================================
// POST /admin/backup — Manual trigger (ADM-01, D-15, D-16, D-17)
// =============================================
router.post(
  '/backup',
  adminRateLimiter,
  fetchUser,
  requireAdmin,
  async (req, res) => {
    // D-17: Reject if backup already in progress
    if (isBackupRunning) {
      return res.status(409).json({
        success: false,
        error: 'Backup already in progress',
      });
    }

    isBackupRunning = true;
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
      });
    } catch (err) {
      // Unexpected error (runBackup should not throw — it catches internally)
      console.error('[backup] unexpected error in manual trigger:', err.message);
      return res.status(500).json({
        success: false,
        error: 'Unexpected backup error',
      });
    } finally {
      // D-17: Always release lock
      isBackupRunning = false;
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

module.exports = router;
