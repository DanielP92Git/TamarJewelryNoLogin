/**
 * Integration tests for POST /admin/restore/:key endpoint (Phase 36, REST-01, REST-02)
 *
 * Tests restore endpoint:
 * - Authentication gating: 401 (unauth), 403 (non-admin), 200 (admin)
 * - Confirmation gate (REST-02): 400 on missing/wrong confirm, 200 on 'RESTORE'
 * - Key validation: 404 when failedStep === 'validation'
 * - Concurrency lock (D-12): 409 when backup or restore in progress; lock released after completion
 * - Success response shape: preRestoreBackup, downloadMs, preBackupMs, restoreMs, totalMs
 * - Failure handling: 500 with preRestoreBackup, alert sent on failure, not on success
 * - BackupLog persistence: trigger:'restore', preRestoreBackup field
 *
 * MOCKING STRATEGY:
 * backup.js uses CJS require() and destructures runRestore and sendBackupFailureAlert
 * at load time. To intercept these:
 *
 * 1. Get CJS module references BEFORE app loads
 * 2. Replace module properties with vi.fn() stubs BEFORE calling import('../../index.js')
 * 3. backup.js destructures from the (now-mocked) module, capturing the vi.fn() references
 * 4. Per-test: call .mockResolvedValue() / .mockReset() on the stub instances
 *
 * Same pattern as backup.trigger.test.js.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
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
// ---------------------------------------------------------------------------
const backupServiceModule = require('../../services/backupService');
const backupAlertServiceModule = require('../../services/backupAlertService');
const backupLockModule = require('../../utils/backupLock');

// Replace with vi.fn() stubs NOW, before app import
const runRestoreStub = vi.fn();
const runBackupStub = vi.fn();
const createS3ClientStub = vi.fn();
const sendAlertStub = vi.fn().mockResolvedValue(undefined);

backupServiceModule.runRestore = runRestoreStub;
backupServiceModule.runBackup = runBackupStub;
backupServiceModule.createBackupS3Client = createS3ClientStub;
backupAlertServiceModule.sendBackupFailureAlert = sendAlertStub;

// ---------------------------------------------------------------------------
// Test data fixtures
// ---------------------------------------------------------------------------
const TEST_KEY = 'backups/backup-2026-04-08T03-00-00.000Z.archive.gz';

const mockSuccessRestoreResult = {
  timestamp: '2026-04-08T12:00:00.000Z',
  status: 'success',
  preRestoreBackup: 'pre-restore-backup-2026-04-08T12-00-00.000Z.archive.gz',
  failedStep: null,
  downloadMs: 523,
  preBackupMs: 1204,
  restoreMs: 890,
  totalMs: 2617,
  error: null,
};

const mockFailedRestoreResult = {
  timestamp: '2026-04-08T12:00:00.000Z',
  status: 'failed',
  preRestoreBackup: 'pre-restore-backup-2026-04-08T12-00-00.000Z.archive.gz',
  failedStep: 'restore',
  downloadMs: 523,
  preBackupMs: 1204,
  restoreMs: null,
  totalMs: 1900,
  error: 'mongorestore exited 1: [REDACTED] connection refused',
};

const mockValidationFailedResult = {
  timestamp: '2026-04-08T12:00:00.000Z',
  status: 'failed',
  preRestoreBackup: null,
  failedStep: 'validation',
  downloadMs: null,
  preBackupMs: null,
  restoreMs: null,
  totalMs: 50,
  error: `Backup key not found: ${TEST_KEY}`,
};

describe('POST /admin/restore/:key', () => {
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

    // App imports backup.js which destructures runRestore from backupServiceModule.
    // Since we already replaced backupServiceModule.runRestore with runRestoreStub above,
    // the destructured reference in backup.js IS runRestoreStub.
    const appModule = await import('../../index.js');
    app = appModule.app;

    User = mongoose.model('Users');
    BackupLog = mongoose.model('BackupLog');
  });

  beforeEach(async () => {
    cleanAllMocks();

    // Reset stubs before each test
    runRestoreStub.mockReset();
    runBackupStub.mockReset();
    sendAlertStub.mockReset();
    sendAlertStub.mockResolvedValue(undefined);

    // Ensure lock is clear before each test
    backupLockModule.clearActiveOperation();

    // Clean BackupLog collection
    await BackupLog.deleteMany({});

    // Create test users
    adminUser = await User.create(createAdmin());
    adminToken = createAuthToken(adminUser);

    regularUser = await User.create(createUser());
    regularToken = createAuthToken(regularUser);
  });

  afterEach(() => {
    // Always clear the lock after each test to avoid state leakage
    backupLockModule.clearActiveOperation();
  });

  // =============================================
  // Authentication gating (T-36-T02)
  // =============================================

  describe('Authentication gating', () => {
    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .send({ confirm: 'RESTORE' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      runRestoreStub.mockResolvedValue(mockSuccessRestoreResult);

      const response = await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ confirm: 'RESTORE' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 200 for admin user with valid confirm and successful restore', async () => {
      runRestoreStub.mockResolvedValue(mockSuccessRestoreResult);

      const response = await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'RESTORE' });

      expect(response.status).toBe(200);
    });
  });

  // =============================================
  // Confirmation gate (REST-02, T-36-T01)
  // =============================================

  describe('Confirmation gate (REST-02)', () => {
    it('should return 400 when confirm field is missing from body', async () => {
      const response = await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(runRestoreStub).not.toHaveBeenCalled();
    });

    it('should return 400 when confirm is wrong string "yes"', async () => {
      const response = await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'yes' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(runRestoreStub).not.toHaveBeenCalled();
    });

    it('should return 400 when confirm is lowercase "restore"', async () => {
      const response = await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'restore' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(runRestoreStub).not.toHaveBeenCalled();
    });

    it('should return 400 when body is empty object {}', async () => {
      const response = await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should succeed (200) when confirm is exactly "RESTORE"', async () => {
      runRestoreStub.mockResolvedValue(mockSuccessRestoreResult);

      const response = await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'RESTORE' });

      expect(response.status).toBe(200);
      expect(runRestoreStub).toHaveBeenCalledTimes(1);
    });
  });

  // =============================================
  // Key validation
  // =============================================

  describe('Key validation', () => {
    it('should return 404 when runRestore returns failedStep:validation', async () => {
      runRestoreStub.mockResolvedValue(mockValidationFailedResult);

      const response = await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'RESTORE' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.failedStep).toBe('validation');
    });
  });

  // =============================================
  // Concurrency lock (D-12)
  // =============================================

  describe('Concurrency lock (D-12)', () => {
    it('should return 409 with "Backup in progress" message when activeOperation is backup', async () => {
      backupLockModule.setActiveOperation('backup');

      const response = await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'RESTORE' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/Backup in progress/i);
    });

    it('should return 409 with "Restore already in progress" when activeOperation is restore', async () => {
      backupLockModule.setActiveOperation('restore');

      const response = await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'RESTORE' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/Restore already in progress/i);
    });

    it('should release lock after successful restore', async () => {
      runRestoreStub.mockResolvedValue(mockSuccessRestoreResult);

      // First request: completes successfully
      await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'RESTORE' });

      // Lock should be released — second request should not get 409
      runRestoreStub.mockResolvedValue(mockSuccessRestoreResult);
      const secondResponse = await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'RESTORE' });

      expect(secondResponse.status).toBe(200);
    });

    it('should release lock after failed restore', async () => {
      runRestoreStub.mockResolvedValue(mockFailedRestoreResult);

      // First request: fails
      await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'RESTORE' });

      // Lock should be released — second request should not get 409
      runRestoreStub.mockResolvedValue(mockSuccessRestoreResult);
      const secondResponse = await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'RESTORE' });

      expect(secondResponse.status).toBe(200);
    });
  });

  // =============================================
  // Success response shape
  // =============================================

  describe('Success response shape', () => {
    beforeEach(() => {
      runRestoreStub.mockResolvedValue(mockSuccessRestoreResult);
    });

    it('should include preRestoreBackup in success response', async () => {
      const response = await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'RESTORE' });

      expect(response.status).toBe(200);
      expect(response.body.preRestoreBackup).toBe(mockSuccessRestoreResult.preRestoreBackup);
    });

    it('should include all timing fields in success response', async () => {
      const response = await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'RESTORE' });

      expect(response.body).toHaveProperty('downloadMs', mockSuccessRestoreResult.downloadMs);
      expect(response.body).toHaveProperty('preBackupMs', mockSuccessRestoreResult.preBackupMs);
      expect(response.body).toHaveProperty('restoreMs', mockSuccessRestoreResult.restoreMs);
      expect(response.body).toHaveProperty('totalMs', mockSuccessRestoreResult.totalMs);
    });
  });

  // =============================================
  // Failure handling
  // =============================================

  describe('Failure handling', () => {
    it('should return 500 with preRestoreBackup when restore fails (D-19)', async () => {
      runRestoreStub.mockResolvedValue(mockFailedRestoreResult);

      const response = await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'RESTORE' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.preRestoreBackup).toBe(mockFailedRestoreResult.preRestoreBackup);
    });

    it('should call sendBackupFailureAlert when restore fails', async () => {
      runRestoreStub.mockResolvedValue(mockFailedRestoreResult);

      await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'RESTORE' });

      expect(sendAlertStub).toHaveBeenCalledTimes(1);
    });

    it('should NOT call sendBackupFailureAlert when restore succeeds', async () => {
      runRestoreStub.mockResolvedValue(mockSuccessRestoreResult);

      await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'RESTORE' });

      expect(sendAlertStub).not.toHaveBeenCalled();
    });

    it('should create BackupLog with trigger:restore (D-15)', async () => {
      runRestoreStub.mockResolvedValue(mockSuccessRestoreResult);

      await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'RESTORE' });

      const log = await BackupLog.findOne({ trigger: 'restore' });
      expect(log).not.toBeNull();
      expect(log.trigger).toBe('restore');
    });

    it('should create BackupLog with preRestoreBackup field (D-16)', async () => {
      runRestoreStub.mockResolvedValue(mockSuccessRestoreResult);

      await request(app)
        .post(`/admin/restore/${encodeURIComponent(TEST_KEY)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: 'RESTORE' });

      const log = await BackupLog.findOne({ trigger: 'restore' });
      expect(log).not.toBeNull();
      expect(log.preRestoreBackup).toBe(mockSuccessRestoreResult.preRestoreBackup);
    });
  });
});
