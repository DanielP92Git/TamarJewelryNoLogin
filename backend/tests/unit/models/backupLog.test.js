/**
 * Unit tests for BackupLog Mongoose model (Phase 35, MON-03)
 *
 * Tests schema validation:
 * - All required fields present in schema
 * - Enum constraints on status and trigger
 * - Required field validation
 * - Default values
 * - Index on timestamp:-1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import BackupLog from '../../../models/BackupLog.js';

// The mongodb-memory-server is set up in tests/setup.js (beforeAll/afterAll).
// Collections are cleared after each test by setup.js afterEach.

describe('BackupLog model', () => {
  beforeEach(async () => {
    // Ensure collection is clean before each test
    await BackupLog.deleteMany({});
  });

  // =============================================
  // Schema paths
  // =============================================

  describe('schema paths', () => {
    it('should have all 9 required schema paths', () => {
      const paths = BackupLog.schema.paths;
      expect(paths).toHaveProperty('timestamp');
      expect(paths).toHaveProperty('status');
      expect(paths).toHaveProperty('filename');
      expect(paths).toHaveProperty('bytes');
      expect(paths).toHaveProperty('duration_ms');
      expect(paths).toHaveProperty('error');
      expect(paths).toHaveProperty('trigger');
      expect(paths).toHaveProperty('retention_deleted');
      expect(paths).toHaveProperty('retention_error');
    });

    it('should have timestamp with Date type', () => {
      const path = BackupLog.schema.paths.timestamp;
      expect(path.instance).toBe('Date');
    });

    it('should have status with String type', () => {
      const path = BackupLog.schema.paths.status;
      expect(path.instance).toBe('String');
    });

    it('should have trigger with String type', () => {
      const path = BackupLog.schema.paths.trigger;
      expect(path.instance).toBe('String');
    });

    it('should have bytes with Number type', () => {
      const path = BackupLog.schema.paths.bytes;
      expect(path.instance).toBe('Number');
    });

    it('should have duration_ms with Number type', () => {
      const path = BackupLog.schema.paths.duration_ms;
      expect(path.instance).toBe('Number');
    });
  });

  // =============================================
  // status enum validation
  // =============================================

  describe('status enum validation', () => {
    it("should accept status: 'success'", async () => {
      const doc = await BackupLog.create({
        status: 'success',
        filename: 'backup-2026-04-07T03-00-00.000Z.archive.gz',
        trigger: 'cron',
      });
      expect(doc.status).toBe('success');
    });

    it("should accept status: 'failed'", async () => {
      const doc = await BackupLog.create({
        status: 'failed',
        filename: 'backup-2026-04-07T03-00-00.000Z.archive.gz',
        trigger: 'cron',
        error: 'mongodump exited 1',
      });
      expect(doc.status).toBe('failed');
    });

    it("should reject status: 'invalid' with ValidationError", async () => {
      await expect(
        BackupLog.create({
          status: 'invalid',
          filename: 'backup-test.archive.gz',
          trigger: 'cron',
        })
      ).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it("should reject status: 'running' with ValidationError", async () => {
      await expect(
        BackupLog.create({
          status: 'running',
          filename: 'backup-test.archive.gz',
          trigger: 'cron',
        })
      ).rejects.toThrow(mongoose.Error.ValidationError);
    });
  });

  // =============================================
  // trigger enum validation
  // =============================================

  describe('trigger enum validation', () => {
    it("should accept trigger: 'cron'", async () => {
      const doc = await BackupLog.create({
        status: 'success',
        filename: 'backup-2026-04-07T03-00-00.000Z.archive.gz',
        trigger: 'cron',
      });
      expect(doc.trigger).toBe('cron');
    });

    it("should accept trigger: 'manual'", async () => {
      const doc = await BackupLog.create({
        status: 'success',
        filename: 'backup-2026-04-07T03-00-00.000Z.archive.gz',
        trigger: 'manual',
      });
      expect(doc.trigger).toBe('manual');
    });

    it("should reject trigger: 'invalid' with ValidationError", async () => {
      await expect(
        BackupLog.create({
          status: 'success',
          filename: 'backup-test.archive.gz',
          trigger: 'invalid',
        })
      ).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it("should reject trigger: 'scheduled' with ValidationError", async () => {
      await expect(
        BackupLog.create({
          status: 'success',
          filename: 'backup-test.archive.gz',
          trigger: 'scheduled',
        })
      ).rejects.toThrow(mongoose.Error.ValidationError);
    });
  });

  // =============================================
  // Required field validation
  // =============================================

  describe('required field validation', () => {
    it('should throw ValidationError when status is missing', async () => {
      await expect(
        BackupLog.create({
          filename: 'backup-test.archive.gz',
          trigger: 'cron',
        })
      ).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should throw ValidationError when filename is missing', async () => {
      await expect(
        BackupLog.create({
          status: 'success',
          trigger: 'cron',
        })
      ).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should throw ValidationError when trigger is missing', async () => {
      await expect(
        BackupLog.create({
          status: 'success',
          filename: 'backup-test.archive.gz',
        })
      ).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should allow creating with only required fields (no optionals)', async () => {
      const doc = await BackupLog.create({
        status: 'success',
        filename: 'backup-test.archive.gz',
        trigger: 'cron',
      });
      expect(doc._id).toBeDefined();
    });
  });

  // =============================================
  // Default values
  // =============================================

  describe('default values', () => {
    it('timestamp should default to approximately now', async () => {
      const before = Date.now();
      const doc = await BackupLog.create({
        status: 'success',
        filename: 'backup-test.archive.gz',
        trigger: 'cron',
      });
      const after = Date.now();

      const ts = new Date(doc.timestamp).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('bytes should default to null', async () => {
      const doc = await BackupLog.create({
        status: 'success',
        filename: 'backup-test.archive.gz',
        trigger: 'cron',
      });
      expect(doc.bytes).toBeNull();
    });

    it('duration_ms should default to null', async () => {
      const doc = await BackupLog.create({
        status: 'success',
        filename: 'backup-test.archive.gz',
        trigger: 'cron',
      });
      expect(doc.duration_ms).toBeNull();
    });

    it('error should default to null', async () => {
      const doc = await BackupLog.create({
        status: 'success',
        filename: 'backup-test.archive.gz',
        trigger: 'cron',
      });
      expect(doc.error).toBeNull();
    });

    it('retention_deleted should default to 0', async () => {
      const doc = await BackupLog.create({
        status: 'success',
        filename: 'backup-test.archive.gz',
        trigger: 'cron',
      });
      expect(doc.retention_deleted).toBe(0);
    });

    it('retention_error should default to null', async () => {
      const doc = await BackupLog.create({
        status: 'success',
        filename: 'backup-test.archive.gz',
        trigger: 'cron',
      });
      expect(doc.retention_error).toBeNull();
    });
  });

  // =============================================
  // Successful create with all fields
  // =============================================

  describe('successful create', () => {
    it('should save document with all fields to MongoDB', async () => {
      const now = new Date('2026-04-07T03:00:00.000Z');
      const doc = await BackupLog.create({
        timestamp: now,
        status: 'success',
        filename: 'backup-2026-04-07T03-00-00.000Z.archive.gz',
        bytes: 8421376,
        duration_ms: 1203,
        error: null,
        trigger: 'cron',
        retention_deleted: 2,
        retention_error: null,
      });

      expect(doc._id).toBeDefined();
      expect(doc.timestamp).toEqual(now);
      expect(doc.status).toBe('success');
      expect(doc.filename).toBe('backup-2026-04-07T03-00-00.000Z.archive.gz');
      expect(doc.bytes).toBe(8421376);
      expect(doc.duration_ms).toBe(1203);
      expect(doc.error).toBeNull();
      expect(doc.trigger).toBe('cron');
      expect(doc.retention_deleted).toBe(2);
      expect(doc.retention_error).toBeNull();
    });

    it('should persist to MongoDB and be retrievable', async () => {
      await BackupLog.create({
        status: 'success',
        filename: 'backup-test.archive.gz',
        trigger: 'cron',
      });

      const found = await BackupLog.findOne({ filename: 'backup-test.archive.gz' });
      expect(found).not.toBeNull();
      expect(found.status).toBe('success');
      expect(found.trigger).toBe('cron');
    });

    it('should save failed backup entry with error field', async () => {
      const doc = await BackupLog.create({
        status: 'failed',
        filename: 'backup-test.archive.gz',
        trigger: 'manual',
        error: 'mongodump exited 1: connection refused',
        duration_ms: 500,
      });

      expect(doc.status).toBe('failed');
      expect(doc.error).toBe('mongodump exited 1: connection refused');
      expect(doc.trigger).toBe('manual');
    });
  });

  // =============================================
  // Index on timestamp:-1
  // =============================================

  describe('index on timestamp:-1', () => {
    it('should have an index on { timestamp: -1 }', () => {
      const indexes = BackupLog.schema.indexes();
      const hasTimestampIndex = indexes.some(([fields]) => {
        return fields.timestamp === -1;
      });
      expect(hasTimestampIndex).toBe(true);
    });
  });
});
