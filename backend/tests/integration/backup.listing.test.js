/**
 * Integration tests for GET /admin/backups endpoint (Phase 35, REST-03)
 *
 * Tests backup listing endpoint:
 * - Authentication gating: 401 (unauth), 403 (non-admin), 200 (admin)
 * - Merged listing (D-12): Spaces objects enriched with BackupLog data by filename
 * - Failed-only entries (D-13): BackupLog-only entries (no Spaces object) included
 * - Sort order (D-14): Newest-first by lastModified
 * - Unknown status: S3 objects with no BackupLog entry have status:'unknown'
 * - Empty state: returns empty array when no data
 * - S3 failure graceful handling: returns log-only entries when Spaces unreachable
 *
 * MOCKING STRATEGY:
 * backup.js uses CJS require() and destructures createBackupS3Client at load time.
 * We replace the module property with a vi.fn() stub BEFORE the app is imported,
 * so backup.js captures our stub reference. Per-test behavior is set via .mockReturnValue()
 * on the same stub instance.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createUser, createAdmin } from '../helpers/factories.js';
import { createAuthToken, TEST_JWT_KEY } from '../helpers/authHelpers.js';
import { validateTestEnvironment } from '../helpers/envGuard.js';
import { disableNetConnect, cleanAllMocks } from '../helpers/mocks/index.js';

// Ensure JWT_KEY is set before app import
process.env.JWT_KEY = TEST_JWT_KEY;

// ---------------------------------------------------------------------------
// CJS module references — set up stubs BEFORE app loads
// ---------------------------------------------------------------------------
const backupServiceModule = require('../../services/backupService');
const backupAlertServiceModule = require('../../services/backupAlertService');

// Replace with vi.fn() stubs NOW, before app import
const runBackupStub = vi.fn();
const createS3ClientStub = vi.fn();
const sendAlertStub = vi.fn().mockResolvedValue(undefined);

backupServiceModule.runBackup = runBackupStub;
backupServiceModule.createBackupS3Client = createS3ClientStub;
backupAlertServiceModule.sendBackupFailureAlert = sendAlertStub;

// Set BACKUP env vars so the listing route attempts S3 listing
process.env.BACKUP_BUCKET = 'test-bucket';
process.env.BACKUP_SPACES_ENDPOINT = 'https://test.endpoint.com';
process.env.BACKUP_SPACES_KEY = 'test-key';
process.env.BACKUP_SPACES_SECRET = 'test-secret';
process.env.BACKUP_SPACES_PREFIX = 'backups/';

// ---------------------------------------------------------------------------
// S3 test data fixtures
// ---------------------------------------------------------------------------
const PREFIX = 'backups/';

const S3_OBJECTS = [
  {
    Key: `${PREFIX}backup-2026-04-07T03-00-00.000Z.archive.gz`,
    Size: 8421376,
    LastModified: new Date('2026-04-07T03:00:04Z'),
  },
  {
    Key: `${PREFIX}backup-2026-04-06T03-00-00.000Z.archive.gz`,
    Size: 7200000,
    LastModified: new Date('2026-04-06T03:00:04Z'),
  },
];

function makeFilename(obj) {
  return obj.Key.replace(PREFIX, '');
}

// Build a mock S3 client that returns the given Contents array
function buildMockS3(contents) {
  return {
    listObjectsV2: vi.fn().mockReturnValue({
      promise: vi.fn().mockResolvedValue({ Contents: contents }),
    }),
  };
}

// Build a mock S3 client that rejects on listObjectsV2
function buildFailingMockS3() {
  return {
    listObjectsV2: vi.fn().mockReturnValue({
      promise: vi.fn().mockRejectedValue(new Error('S3 connection refused')),
    }),
  };
}

describe('GET /admin/backups', () => {
  let app;
  let User;
  let BackupLog;
  let adminUser;
  let adminToken;
  let regularUser;
  let regularToken;

  beforeAll(async () => {
    validateTestEnvironment();
    disableNetConnect();

    // App loads backup.js which destructures createBackupS3Client from backupServiceModule.
    // Since we already replaced it with createS3ClientStub, backup.js captures that stub.
    const appModule = await import('../../index.js');
    app = appModule.app;

    User = mongoose.model('Users');
    BackupLog = mongoose.model('BackupLog');
  });

  beforeEach(async () => {
    cleanAllMocks();

    // Reset stubs
    createS3ClientStub.mockReset();
    runBackupStub.mockReset();
    sendAlertStub.mockReset();
    sendAlertStub.mockResolvedValue(undefined);

    // Default: return both S3 objects
    createS3ClientStub.mockReturnValue(buildMockS3(S3_OBJECTS));

    // Clean BackupLog collection
    await BackupLog.deleteMany({});

    // Create test users
    adminUser = await User.create(createAdmin());
    adminToken = createAuthToken(adminUser);

    regularUser = await User.create(createUser());
    regularToken = createAuthToken(regularUser);
  });

  // =============================================
  // Authentication gating
  // =============================================

  describe('Authentication gating', () => {
    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/admin/backups');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/admin/backups')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 200 for admin user', async () => {
      const response = await request(app)
        .get('/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // =============================================
  // Response shape
  // =============================================

  describe('Response shape', () => {
    it('should return success:true and backups array', async () => {
      const response = await request(app)
        .get('/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('backups');
      expect(Array.isArray(response.body.backups)).toBe(true);
    });

    it('should return entries with all required fields', async () => {
      // Seed a matching BackupLog entry for S3_OBJECTS[0]
      await BackupLog.create({
        status: 'success',
        filename: makeFilename(S3_OBJECTS[0]),
        trigger: 'cron',
        bytes: S3_OBJECTS[0].Size,
        duration_ms: 1203,
        timestamp: S3_OBJECTS[0].LastModified,
      });

      const response = await request(app)
        .get('/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`);

      const entry = response.body.backups.find(
        b => b.filename === makeFilename(S3_OBJECTS[0])
      );
      expect(entry).toBeDefined();
      expect(entry).toHaveProperty('filename');
      expect(entry).toHaveProperty('lastModified');
      expect(entry).toHaveProperty('sizeBytes');
      expect(entry).toHaveProperty('status');
      expect(entry).toHaveProperty('durationMs');
      expect(entry).toHaveProperty('error');
      expect(entry).toHaveProperty('trigger');
    });
  });

  // =============================================
  // Merged listing (D-12): Spaces + BackupLog merge
  // =============================================

  describe('Merged listing (D-12)', () => {
    it('should merge S3 size/lastModified with BackupLog status/trigger/durationMs', async () => {
      await BackupLog.create({
        status: 'success',
        filename: makeFilename(S3_OBJECTS[0]),
        trigger: 'cron',
        duration_ms: 1203,
        timestamp: S3_OBJECTS[0].LastModified,
        bytes: S3_OBJECTS[0].Size,
      });

      const response = await request(app)
        .get('/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`);

      const entry = response.body.backups.find(
        b => b.filename === makeFilename(S3_OBJECTS[0])
      );

      expect(entry).toBeDefined();
      // From S3
      expect(entry.sizeBytes).toBe(S3_OBJECTS[0].Size);
      // From BackupLog
      expect(entry.status).toBe('success');
      expect(entry.trigger).toBe('cron');
      expect(entry.durationMs).toBe(1203);
    });

    it('should use S3 size when available (S3 takes precedence over log bytes)', async () => {
      await BackupLog.create({
        status: 'success',
        filename: makeFilename(S3_OBJECTS[0]),
        trigger: 'cron',
        bytes: 999, // Different from S3 Size — S3 should win
        timestamp: S3_OBJECTS[0].LastModified,
      });

      const response = await request(app)
        .get('/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`);

      const entry = response.body.backups.find(
        b => b.filename === makeFilename(S3_OBJECTS[0])
      );

      // S3 size takes precedence per merge algorithm
      expect(entry.sizeBytes).toBe(S3_OBJECTS[0].Size);
    });
  });

  // =============================================
  // Failed-only entries (D-13): no S3 object
  // =============================================

  describe('Failed-only entries (D-13)', () => {
    it('should include BackupLog entries with no matching S3 object', async () => {
      const failedFilename = 'backup-2026-04-05T03-00-00.000Z.archive.gz';

      // This filename is NOT in S3_OBJECTS
      await BackupLog.create({
        status: 'failed',
        filename: failedFilename,
        trigger: 'cron',
        error: 'mongodump exited 1: connection refused',
        duration_ms: 500,
        timestamp: new Date('2026-04-05T03:00:00Z'),
      });

      const response = await request(app)
        .get('/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`);

      const failedEntry = response.body.backups.find(b => b.filename === failedFilename);
      expect(failedEntry).toBeDefined();
      expect(failedEntry.status).toBe('failed');
      expect(failedEntry.sizeBytes).toBeNull();
      expect(failedEntry.error).toBe('mongodump exited 1: connection refused');
    });

    it('failed entry should have trigger from BackupLog', async () => {
      const failedFilename = 'backup-2026-04-05T03-00-00.000Z.archive.gz';

      await BackupLog.create({
        status: 'failed',
        filename: failedFilename,
        trigger: 'manual',
        error: 'test error',
        timestamp: new Date('2026-04-05T03:00:00Z'),
      });

      const response = await request(app)
        .get('/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`);

      const failedEntry = response.body.backups.find(b => b.filename === failedFilename);
      expect(failedEntry.trigger).toBe('manual');
    });
  });

  // =============================================
  // Sort order (D-14): newest-first
  // =============================================

  describe('Sort order (D-14)', () => {
    it('should return backups sorted newest-first by lastModified', async () => {
      // Seed BackupLog entries for both S3 objects
      await BackupLog.create([
        {
          status: 'success',
          filename: makeFilename(S3_OBJECTS[0]),
          trigger: 'cron',
          timestamp: S3_OBJECTS[0].LastModified,
        },
        {
          status: 'success',
          filename: makeFilename(S3_OBJECTS[1]),
          trigger: 'cron',
          timestamp: S3_OBJECTS[1].LastModified,
        },
      ]);

      const response = await request(app)
        .get('/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`);

      const backups = response.body.backups;
      expect(backups.length).toBeGreaterThanOrEqual(2);

      // Verify newest-first ordering
      for (let i = 0; i < backups.length - 1; i++) {
        const current = new Date(backups[i].lastModified).getTime();
        const next = new Date(backups[i + 1].lastModified).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  // =============================================
  // Unknown status: S3 object with no BackupLog
  // =============================================

  describe('Unknown status for S3-only objects', () => {
    it('should have status:unknown for S3 objects with no BackupLog entry', async () => {
      // No BackupLog entries seeded
      const response = await request(app)
        .get('/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`);

      const entry = response.body.backups.find(
        b => b.filename === makeFilename(S3_OBJECTS[0])
      );

      expect(entry).toBeDefined();
      expect(entry.status).toBe('unknown');
      expect(entry.trigger).toBeNull();
      expect(entry.durationMs).toBeNull();
    });

    it('should have sizeBytes from S3 for unknown-status entries', async () => {
      const response = await request(app)
        .get('/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`);

      const entry = response.body.backups.find(
        b => b.filename === makeFilename(S3_OBJECTS[0])
      );

      expect(entry.sizeBytes).toBe(S3_OBJECTS[0].Size);
    });
  });

  // =============================================
  // Empty state
  // =============================================

  describe('Empty state', () => {
    it('should return empty backups array when no S3 objects and no BackupLog entries', async () => {
      createS3ClientStub.mockReturnValue(buildMockS3([]));
      // No BackupLog entries seeded

      const response = await request(app)
        .get('/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body.success).toBe(true);
      expect(response.body.backups).toEqual([]);
    });

    it('should return BackupLog entries even with empty S3 Contents', async () => {
      createS3ClientStub.mockReturnValue(buildMockS3([]));

      await BackupLog.create({
        status: 'success',
        filename: 'backup-2026-04-07T03-00-00.000Z.archive.gz',
        trigger: 'cron',
        timestamp: new Date('2026-04-07T03:00:00Z'),
      });

      const response = await request(app)
        .get('/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body.backups).toHaveLength(1);
      expect(response.body.backups[0].filename).toBe(
        'backup-2026-04-07T03-00-00.000Z.archive.gz'
      );
    });
  });

  // =============================================
  // S3 failure graceful handling
  // =============================================

  describe('S3 failure graceful handling', () => {
    it('should return log-only entries when Spaces listing throws (not 500)', async () => {
      createS3ClientStub.mockReturnValue(buildFailingMockS3());

      await BackupLog.create({
        status: 'success',
        filename: 'backup-2026-04-07T03-00-00.000Z.archive.gz',
        trigger: 'cron',
        timestamp: new Date('2026-04-07T03:00:00Z'),
      });

      const response = await request(app)
        .get('/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const entry = response.body.backups.find(
        b => b.filename === 'backup-2026-04-07T03-00-00.000Z.archive.gz'
      );
      expect(entry).toBeDefined();
      expect(entry.status).toBe('success');
    });

    it('should return 200 (not 500) when S3 is unavailable', async () => {
      createS3ClientStub.mockReturnValue(buildFailingMockS3());

      const response = await request(app)
        .get('/admin/backups')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  // =============================================
  // Spaces credentials not configured
  // =============================================

  describe('Spaces credentials not configured', () => {
    it('should still return BackupLog entries when BACKUP_BUCKET is unset', async () => {
      const originalBucket = process.env.BACKUP_BUCKET;
      delete process.env.BACKUP_BUCKET;

      try {
        await BackupLog.create({
          status: 'success',
          filename: 'backup-2026-04-07T03-00-00.000Z.archive.gz',
          trigger: 'cron',
          timestamp: new Date('2026-04-07T03:00:00Z'),
        });

        const response = await request(app)
          .get('/admin/backups')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.backups).toHaveLength(1);
      } finally {
        process.env.BACKUP_BUCKET = originalBucket;
      }
    });
  });
});
