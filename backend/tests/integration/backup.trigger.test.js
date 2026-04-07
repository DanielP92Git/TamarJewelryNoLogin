/**
 * Integration tests for POST /admin/backup endpoint (Phase 35, ADM-01)
 *
 * Tests manual backup trigger endpoint:
 * - Authentication gating: 401 (unauth), 403 (non-admin), 200 (admin)
 * - Success path: response shape, BackupLog creation, no alert sent on success
 * - Failure path: response shape, BackupLog creation with status:'failed', alert sent
 * - Concurrency lock (D-17): 409 when backup already in progress
 *
 * MOCKING STRATEGY:
 * backup.js uses CJS require() and destructures runBackup and sendBackupFailureAlert
 * at load time. To intercept these in an integration test:
 *
 * 1. Get the CJS module references BEFORE app loads
 * 2. Replace module properties with vi.fn() stubs BEFORE calling import('../../index.js')
 * 3. backup.js destructures from the (now-mocked) module, capturing the vi.fn() reference
 * 4. In each test, call .mockResolvedValue() / .mockReset() on the vi.fn() instance
 *    — the destructured reference inside backup.js still points to the same vi.fn()
 *    and picks up the new implementation
 *
 * This is the same pattern used in backupJob.test.js.
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
// CJS module references — get these BEFORE app loads
// We replace module properties with vi.fn() stubs, then let app load so that
// backup.js destructures from the mocked module object.
// ---------------------------------------------------------------------------
const backupServiceModule = require('../../services/backupService');
const backupAlertServiceModule = require('../../services/backupAlertService');

// Replace with vi.fn() stubs NOW, before app import
// backup.js will destructure: const { runBackup } = require('../services/backupService')
// Since the module is cached, backup.js gets our vi.fn() reference.
const runBackupStub = vi.fn();
const sendAlertStub = vi.fn().mockResolvedValue(undefined);
const createS3ClientStub = vi.fn();

backupServiceModule.runBackup = runBackupStub;
backupServiceModule.createBackupS3Client = createS3ClientStub;
backupAlertServiceModule.sendBackupFailureAlert = sendAlertStub;

// ---------------------------------------------------------------------------
// Test data fixtures
// ---------------------------------------------------------------------------
const mockSuccessResult = {
  status: 'success',
  filename: 'backup-2026-04-07T03-00-00.000Z.archive.gz',
  sizeBytes: 8421376,
  durationMs: 1203,
  timestamp: '2026-04-07T03:00:00.000Z',
  retentionDeleted: 2,
  retentionError: null,
  error: null,
};

const mockFailedResult = {
  status: 'failed',
  filename: 'backup-2026-04-07T04-00-00.000Z.archive.gz',
  sizeBytes: null,
  durationMs: 500,
  timestamp: '2026-04-07T04:00:00.000Z',
  retentionDeleted: 0,
  retentionError: null,
  error: 'mongodump exited 1: connection refused',
};

describe('POST /admin/backup', () => {
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

    // App imports backup.js which destructures runBackup from backupServiceModule.
    // Since we already replaced backupServiceModule.runBackup with runBackupStub above,
    // the destructured reference in backup.js IS runBackupStub.
    const appModule = await import('../../index.js');
    app = appModule.app;

    User = mongoose.model('Users');
    BackupLog = mongoose.model('BackupLog');
  });

  beforeEach(async () => {
    cleanAllMocks();

    // Reset stubs before each test — new mock return value can be set per-test
    runBackupStub.mockReset();
    sendAlertStub.mockReset();
    sendAlertStub.mockResolvedValue(undefined);

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
        .post('/admin/backup');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 with informative error for unauthenticated request', async () => {
      const response = await request(app)
        .post('/admin/backup');

      expect(response.status).toBe(401);
      expect(response.body.errors).toMatch(/authenticate|token/i);
    });

    it('should return 403 for non-admin user', async () => {
      runBackupStub.mockResolvedValue(mockSuccessResult);

      const response = await request(app)
        .post('/admin/backup')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 200 for admin user', async () => {
      runBackupStub.mockResolvedValue(mockSuccessResult);

      const response = await request(app)
        .post('/admin/backup')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  // =============================================
  // Success path
  // =============================================

  describe('Success path', () => {
    beforeEach(() => {
      runBackupStub.mockResolvedValue(mockSuccessResult);
    });

    it('should return success:true in response', async () => {
      const response = await request(app)
        .post('/admin/backup')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body.success).toBe(true);
    });

    it('should return response shape matching UI-SPEC', async () => {
      const response = await request(app)
        .post('/admin/backup')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('filename');
      expect(response.body).toHaveProperty('sizeBytes');
      expect(response.body).toHaveProperty('durationMs');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('retentionDeleted');
      expect(response.body).toHaveProperty('error');
    });

    it('should return correct values from runBackup result', async () => {
      const response = await request(app)
        .post('/admin/backup')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body.status).toBe('success');
      expect(response.body.filename).toBe(mockSuccessResult.filename);
      expect(response.body.sizeBytes).toBe(mockSuccessResult.sizeBytes);
      expect(response.body.durationMs).toBe(mockSuccessResult.durationMs);
      expect(response.body.timestamp).toBe(mockSuccessResult.timestamp);
      expect(response.body.retentionDeleted).toBe(mockSuccessResult.retentionDeleted);
      expect(response.body.error).toBeNull();
    });

    it('should create a BackupLog document with trigger:manual (D-09, D-11)', async () => {
      await request(app)
        .post('/admin/backup')
        .set('Authorization', `Bearer ${adminToken}`);

      const log = await BackupLog.findOne({ filename: mockSuccessResult.filename });
      expect(log).not.toBeNull();
      expect(log.trigger).toBe('manual');
      expect(log.status).toBe('success');
    });

    it('should create BackupLog with correct field mappings', async () => {
      await request(app)
        .post('/admin/backup')
        .set('Authorization', `Bearer ${adminToken}`);

      const log = await BackupLog.findOne({ filename: mockSuccessResult.filename });
      expect(log.bytes).toBe(mockSuccessResult.sizeBytes);
      expect(log.duration_ms).toBe(mockSuccessResult.durationMs);
      expect(log.error).toBeNull();
      expect(log.retention_deleted).toBe(mockSuccessResult.retentionDeleted);
    });

    it('should NOT call sendBackupFailureAlert on success', async () => {
      await request(app)
        .post('/admin/backup')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(sendAlertStub).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // Failure path
  // =============================================

  describe('Failure path', () => {
    beforeEach(() => {
      runBackupStub.mockResolvedValue(mockFailedResult);
    });

    it('should return 200 status code even when backup fails', async () => {
      const response = await request(app)
        .post('/admin/backup')
        .set('Authorization', `Bearer ${adminToken}`);

      // Backup logic failures return 200 with status:'failed' (not HTTP 500)
      expect(response.status).toBe(200);
    });

    it('should return status:failed in response body', async () => {
      const response = await request(app)
        .post('/admin/backup')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('failed');
    });

    it('should return error message in response body', async () => {
      const response = await request(app)
        .post('/admin/backup')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body.error).toBe(mockFailedResult.error);
    });

    it('should create BackupLog with status:failed', async () => {
      await request(app)
        .post('/admin/backup')
        .set('Authorization', `Bearer ${adminToken}`);

      const log = await BackupLog.findOne({ filename: mockFailedResult.filename });
      expect(log).not.toBeNull();
      expect(log.status).toBe('failed');
      expect(log.trigger).toBe('manual');
    });

    it('should create BackupLog with error field set', async () => {
      await request(app)
        .post('/admin/backup')
        .set('Authorization', `Bearer ${adminToken}`);

      const log = await BackupLog.findOne({ filename: mockFailedResult.filename });
      expect(log.error).toBe(mockFailedResult.error);
    });

    it('should call sendBackupFailureAlert with the result on failure', async () => {
      await request(app)
        .post('/admin/backup')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(sendAlertStub).toHaveBeenCalledTimes(1);
      expect(sendAlertStub).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: mockFailedResult.error,
        })
      );
    });
  });

  // =============================================
  // Concurrency lock (D-17)
  // =============================================

  describe('Concurrency lock (D-17)', () => {
    it('should return 409 when backup already in progress', async () => {
      // Make runBackup take 500ms so both requests can be in-flight simultaneously
      runBackupStub.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockSuccessResult), 500))
      );

      // Fire both requests at the same time — don't await either initially
      const [firstResponse, secondResponse] = await Promise.all([
        request(app)
          .post('/admin/backup')
          .set('Authorization', `Bearer ${adminToken}`),
        // Small delay before second so first has time to set isBackupRunning = true
        new Promise((resolve) => setTimeout(resolve, 50)).then(() =>
          request(app)
            .post('/admin/backup')
            .set('Authorization', `Bearer ${adminToken}`)
        ),
      ]);

      // One should be 200, the other 409
      const statuses = [firstResponse.status, secondResponse.status].sort();
      expect(statuses).toContain(409);
      expect(statuses).toContain(200);

      // The 409 response should have the correct error body
      const conflictResponse =
        firstResponse.status === 409 ? firstResponse : secondResponse;
      expect(conflictResponse.body.success).toBe(false);
      expect(conflictResponse.body.error).toMatch(/already in progress/i);
    }, 10000);

    it('should allow new backup after first completes', async () => {
      runBackupStub.mockResolvedValue(mockSuccessResult);

      // First backup
      const firstResponse = await request(app)
        .post('/admin/backup')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(firstResponse.status).toBe(200);

      // Second backup should succeed after first completes
      const secondResponse = await request(app)
        .post('/admin/backup')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.status).toBe('success');
    });
  });

  // =============================================
  // auth-token header alternative
  // =============================================

  describe('auth-token header alternative', () => {
    it('should accept auth-token header as alternative to Authorization Bearer', async () => {
      runBackupStub.mockResolvedValue(mockSuccessResult);

      const response = await request(app)
        .post('/admin/backup')
        .set('auth-token', adminToken);

      expect(response.status).toBe(200);
    });
  });
});
