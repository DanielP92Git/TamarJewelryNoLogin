/**
 * Integration tests for GET /admin/backup-status endpoint (Phase 33, BKUP-04).
 * Tests authentication gating and response shape.
 *
 * Key behaviors:
 * - Unauthenticated requests get 401
 * - Non-admin users get 403
 * - Admin users get 200 with binary status, scheduling info, and env config
 * - Binary status reflects actual environment (found: false in test env — no mongodump installed)
 * - Secret env var values are masked ([SET]/[NOT SET])
 * - BACKUP_SPACES_KEY and BACKUP_SPACES_SECRET always masked
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createUser, createAdmin } from '../helpers/factories.js';
import { createAuthToken, TEST_JWT_KEY } from '../helpers/authHelpers.js';
import { validateTestEnvironment } from '../helpers/envGuard.js';
import { disableNetConnect, cleanAllMocks } from '../helpers/mocks/index.js';

// Ensure JWT_KEY is set before app import
process.env.JWT_KEY = TEST_JWT_KEY;

describe('GET /admin/backup-status', () => {
  let app;
  let User;
  let adminUser;
  let adminToken;
  let regularUser;
  let regularToken;

  beforeAll(async () => {
    // Validate test environment (prevents production contamination)
    validateTestEnvironment();

    // Disable real network requests
    disableNetConnect();

    // Import app after environment is configured
    const appModule = await import('../../index.js');
    app = appModule.app;

    // Get User model
    User = mongoose.model('Users');
  });

  beforeEach(async () => {
    // Clean mocks from previous tests
    cleanAllMocks();

    // Create test users
    adminUser = await User.create(createAdmin());
    adminToken = createAuthToken(adminUser);

    regularUser = await User.create(createUser());
    regularToken = createAuthToken(regularUser);
  });

  // =============================================
  // Authentication Gating
  // =============================================

  describe('Authentication gating', () => {
    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/admin/backup-status');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 with informative error message for unauthenticated request', async () => {
      const response = await request(app)
        .get('/admin/backup-status');

      expect(response.status).toBe(401);
      // fetchUser middleware returns 401 with authentication error message
      expect(response.body.errors).toMatch(/authenticate|token/i);
    });

    it('should return 403 for non-admin user', async () => {
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 403 error message for non-admin user', async () => {
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.status).toBe(403);
      expect(response.body.errors).toMatch(/admin access required/i);
    });
  });

  // =============================================
  // Admin Success Path
  // =============================================

  describe('Admin success path (200)', () => {
    it('should return 200 for admin user', async () => {
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should return JSON body for admin user', async () => {
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
    });
  });

  // =============================================
  // Response Shape: mongodump
  // =============================================

  describe('Response body: mongodump object', () => {
    it('should have mongodump object with required keys', async () => {
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body).toHaveProperty('mongodump');
      expect(response.body.mongodump).toHaveProperty('found');
      expect(response.body.mongodump).toHaveProperty('path');
      expect(response.body.mongodump).toHaveProperty('version');
      expect(response.body.mongodump).toHaveProperty('error');
    });

    it('mongodump.found should be a boolean', async () => {
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(typeof response.body.mongodump.found).toBe('boolean');
    });

    it('mongodump.path should be a string', async () => {
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(typeof response.body.mongodump.path).toBe('string');
    });

    it('mongodump.path should default to "mongodump" when MONGODUMP_PATH not set', async () => {
      // In test env, MONGODUMP_PATH is not set
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body.mongodump.path).toBe('mongodump');
    });
  });

  // =============================================
  // Response Shape: mongorestore
  // =============================================

  describe('Response body: mongorestore object', () => {
    it('should have mongorestore object with required keys', async () => {
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body).toHaveProperty('mongorestore');
      expect(response.body.mongorestore).toHaveProperty('found');
      expect(response.body.mongorestore).toHaveProperty('version');
      expect(response.body.mongorestore).toHaveProperty('path');
      expect(response.body.mongorestore).toHaveProperty('error');
    });

    it('mongorestore.found should be a boolean', async () => {
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(typeof response.body.mongorestore.found).toBe('boolean');
    });
  });

  // =============================================
  // Response Shape: scheduling
  // =============================================

  describe('Response body: scheduling object', () => {
    it('should have scheduling object documenting D-01/D-02 decisions', async () => {
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body).toHaveProperty('scheduling');
    });

    it('scheduling.strategy should be "in-process node-cron"', async () => {
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body.scheduling.strategy).toBe('in-process node-cron');
    });

    it('scheduling.distributedLock should be false (D-02: no lock needed)', async () => {
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body.scheduling.distributedLock).toBe(false);
    });
  });

  // =============================================
  // Response Shape: envConfig with secret masking
  // =============================================

  describe('Response body: envConfig with masked secrets', () => {
    it('should have envConfig object with backup env vars', async () => {
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.body).toHaveProperty('envConfig');
      expect(response.body.envConfig).toHaveProperty('BACKUP_BUCKET');
      expect(response.body.envConfig).toHaveProperty('BACKUP_SPACES_KEY');
      expect(response.body.envConfig).toHaveProperty('BACKUP_SPACES_SECRET');
    });

    it('BACKUP_SPACES_KEY should be masked as [SET] or [NOT SET]', async () => {
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${adminToken}`);

      const keyValue = response.body.envConfig.BACKUP_SPACES_KEY;
      expect(['[SET]', '[NOT SET]']).toContain(keyValue);
    });

    it('BACKUP_SPACES_SECRET should be masked as [SET] or [NOT SET]', async () => {
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${adminToken}`);

      const secretValue = response.body.envConfig.BACKUP_SPACES_SECRET;
      expect(['[SET]', '[NOT SET]']).toContain(secretValue);
    });

    it('BACKUP_BUCKET should be masked as [SET] or [NOT SET]', async () => {
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${adminToken}`);

      const bucketValue = response.body.envConfig.BACKUP_BUCKET;
      expect(['[SET]', '[NOT SET]']).toContain(bucketValue);
    });

    it('envConfig should contain all 9 backup env var keys', async () => {
      const response = await request(app)
        .get('/admin/backup-status')
        .set('Authorization', `Bearer ${adminToken}`);

      const envConfig = response.body.envConfig;
      expect(envConfig).toHaveProperty('BACKUP_BUCKET');
      expect(envConfig).toHaveProperty('BACKUP_SPACES_KEY');
      expect(envConfig).toHaveProperty('BACKUP_SPACES_SECRET');
      expect(envConfig).toHaveProperty('BACKUP_SPACES_ENDPOINT');
      expect(envConfig).toHaveProperty('BACKUP_SPACES_REGION');
      expect(envConfig).toHaveProperty('BACKUP_SPACES_PREFIX');
      expect(envConfig).toHaveProperty('BACKUP_RETENTION_COUNT');
      expect(envConfig).toHaveProperty('MONGODUMP_PATH');
      expect(envConfig).toHaveProperty('MONGORESTORE_PATH');
    });

    it('BACKUP_SPACES_KEY should never leak actual credentials', async () => {
      // Set a fake secret key to verify it's masked
      const originalKey = process.env.BACKUP_SPACES_KEY;
      process.env.BACKUP_SPACES_KEY = 'super-secret-spaces-key-12345';

      try {
        const response = await request(app)
          .get('/admin/backup-status')
          .set('Authorization', `Bearer ${adminToken}`);

        // Value should be [SET] not the actual key value
        expect(response.body.envConfig.BACKUP_SPACES_KEY).toBe('[SET]');
        expect(response.body.envConfig.BACKUP_SPACES_KEY).not.toContain('super-secret');
      } finally {
        // Restore
        if (originalKey === undefined) {
          delete process.env.BACKUP_SPACES_KEY;
        } else {
          process.env.BACKUP_SPACES_KEY = originalKey;
        }
      }
    });
  });
});
