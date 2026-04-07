/**
 * Unit tests for backupService.js (Phase 34)
 *
 * Tests all 5 exported functions:
 * - buildBackupFilename: ISO timestamp pattern, no colons (BKUP-03)
 * - spawnMongodump: spawn args, exit code handling, ENOENT, URI redaction (BKUP-01)
 * - createBackupS3Client: S3 constructor with BACKUP_SPACES_* credentials (BKUP-02)
 * - runRetentionCleanup: listObjectsV2, sort, delete surplus, return count (RET-01, ADM-03)
 * - runBackup: full orchestration, credential guard, success log, failure log, D-09 (all)
 *
 * MOCKING STRATEGY:
 * In this Vitest ESM test environment, vi.mock() intercepts ESM imports but NOT CJS require().
 * Since backupService.js uses require(), we mock at the CJS module object level:
 *
 *   - child_process: vi.spyOn(require('child_process'), 'spawn') works because
 *     backupService.js accesses childProcess.spawn dynamically (not destructured).
 *
 *   - aws-sdk S3: We save/restore awsSdk.S3 and replace it with a mock class.
 *     The mock class constructor stores the config args and returns a mock instance.
 *     We track the last created S3 instance via module-level variable.
 *
 *   - aws-sdk Endpoint: Similarly replaced with a simple function.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// ---------------------------------------------------------------------------
// CJS module references
// ---------------------------------------------------------------------------

const childProcess = require('child_process');
const awsSdk = require('aws-sdk');

// Save originals for restoration after each test
const originalS3 = awsSdk.S3;
const originalEndpoint = awsSdk.Endpoint;

// Load the module under test
const backupService = require('../../../services/backupService');
const {
  buildBackupFilename,
  spawnMongodump,
  createBackupS3Client,
  runRetentionCleanup,
  runBackup,
} = backupService;

// ---------------------------------------------------------------------------
// Mock tracking state
// ---------------------------------------------------------------------------

// Track S3 constructor calls and instances
let s3ConstructorCallCount = 0;
let s3ConstructorLastConfig = null;
let s3MockInstanceQueue = []; // queue of mock instances to return per call

// Mock S3 class
class MockS3Class {
  constructor(config) {
    s3ConstructorCallCount++;
    s3ConstructorLastConfig = config;

    // Return the next queued instance, or a default one
    const instance = s3MockInstanceQueue.length > 0
      ? s3MockInstanceQueue.shift()
      : createDefaultMockS3Instance();

    // Copy all instance properties to this
    Object.assign(this, instance);
  }
}

function createDefaultMockS3Instance() {
  return {
    putObject: vi.fn().mockReturnValue({ promise: vi.fn().mockResolvedValue({}) }),
    listObjectsV2: vi.fn().mockReturnValue({
      promise: vi.fn().mockResolvedValue({ Contents: [] }),
    }),
    deleteObjects: vi.fn().mockReturnValue({
      promise: vi.fn().mockResolvedValue({ Errors: [] }),
    }),
  };
}

// Mock Endpoint function
function MockEndpoint(url) {
  this.href = url;
  this.host = url;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock child process with stdout/stderr EventEmitters.
 */
function createMockChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  return child;
}

/**
 * Queues a mock S3 instance to be returned by the next MockS3Class constructor call.
 * Returns the instance for assertion access.
 */
function queueMockS3Instance(config = {}) {
  const instance = createMockS3FromConfig(config);
  s3MockInstanceQueue.push(instance);
  return instance;
}

function createMockS3FromConfig({
  listContents = [],
  listRejectsWithError = null,
} = {}) {
  const putObject = vi.fn().mockReturnValue({ promise: vi.fn().mockResolvedValue({}) });
  const listObjectsV2 = listRejectsWithError
    ? vi.fn().mockReturnValue({
        promise: vi.fn().mockRejectedValue(listRejectsWithError),
      })
    : vi.fn().mockReturnValue({
        promise: vi.fn().mockResolvedValue({ Contents: listContents }),
      });
  const deleteObjects = vi.fn().mockReturnValue({
    promise: vi.fn().mockResolvedValue({ Errors: [] }),
  });
  return { putObject, listObjectsV2, deleteObjects };
}

/**
 * Default env vars for a successful backup run.
 */
const DEFAULT_ENV = {
  BACKUP_BUCKET: 'test-backup-bucket',
  BACKUP_SPACES_ENDPOINT: 'https://ams3.digitaloceanspaces.com',
  BACKUP_SPACES_KEY: 'test-key',
  BACKUP_SPACES_SECRET: 'test-secret',
  BACKUP_SPACES_REGION: 'ams3',
  BACKUP_SPACES_PREFIX: 'backups/',
  BACKUP_RETENTION_COUNT: '14',
  MONGO_URL: 'mongodb+srv://user:pass@cluster.example.com/testdb',
};

// ---------------------------------------------------------------------------
// Install/uninstall aws-sdk mock for tests that need it
// ---------------------------------------------------------------------------

function installAwsMock() {
  s3ConstructorCallCount = 0;
  s3ConstructorLastConfig = null;
  s3MockInstanceQueue = [];
  awsSdk.S3 = MockS3Class;
  awsSdk.Endpoint = MockEndpoint;
}

function uninstallAwsMock() {
  awsSdk.S3 = originalS3;
  awsSdk.Endpoint = originalEndpoint;
}

// ---------------------------------------------------------------------------
// describe: buildBackupFilename (BKUP-03)
// ---------------------------------------------------------------------------

describe('buildBackupFilename', () => {
  it('returns string matching ISO timestamp pattern with dashes (no colons)', () => {
    const filename = buildBackupFilename();
    // Expected: backup-YYYY-MM-DDTHH-mm-ss.mmmZ.archive.gz
    expect(filename).toMatch(
      /^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.\d{3}Z\.archive\.gz$/
    );
  });

  it('contains no colons (filesystem safe, lexicographically sortable)', () => {
    const filename = buildBackupFilename();
    expect(filename).not.toContain(':');
  });
});

// ---------------------------------------------------------------------------
// describe: spawnMongodump (BKUP-01)
// ---------------------------------------------------------------------------

describe('spawnMongodump', () => {
  let spawnSpy;
  let savedMongodumpPath;

  beforeEach(() => {
    savedMongodumpPath = process.env.MONGODUMP_PATH;
    delete process.env.MONGODUMP_PATH;
    spawnSpy = vi.spyOn(childProcess, 'spawn');
  });

  afterEach(() => {
    spawnSpy.mockRestore();
    if (savedMongodumpPath === undefined) {
      delete process.env.MONGODUMP_PATH;
    } else {
      process.env.MONGODUMP_PATH = savedMongodumpPath;
    }
  });

  it('calls spawn with --uri, mongoUri, --archive, --gzip args in order', async () => {
    const mockChild = createMockChild();
    spawnSpy.mockReturnValue(mockChild);

    const uri = 'mongodb://localhost:27017/test';
    const promise = spawnMongodump(uri);

    setImmediate(() => {
      mockChild.stdout.emit('data', Buffer.from('archive-data'));
      mockChild.emit('close', 0);
    });

    await promise;

    expect(spawnSpy).toHaveBeenCalledWith(
      'mongodump',
      ['--uri', uri, '--archive', '--gzip'],
      expect.objectContaining({ stdio: ['ignore', 'pipe', 'pipe'] })
    );
  });

  it('uses MONGODUMP_PATH env var when set instead of bare "mongodump"', async () => {
    process.env.MONGODUMP_PATH = '/custom/path/mongodump';
    const mockChild = createMockChild();
    spawnSpy.mockReturnValue(mockChild);

    const promise = spawnMongodump('mongodb://localhost/test');
    setImmediate(() => mockChild.emit('close', 0));
    await promise;

    expect(spawnSpy).toHaveBeenCalledWith(
      '/custom/path/mongodump',
      expect.any(Array),
      expect.any(Object)
    );
  });

  it('resolves with Buffer.concat of all stdout chunks on exit code 0', async () => {
    const mockChild = createMockChild();
    spawnSpy.mockReturnValue(mockChild);

    const chunk1 = Buffer.from('chunk-one');
    const chunk2 = Buffer.from('-chunk-two');

    const promise = spawnMongodump('mongodb://localhost/test');

    setImmediate(() => {
      mockChild.stdout.emit('data', chunk1);
      mockChild.stdout.emit('data', chunk2);
      mockChild.emit('close', 0);
    });

    const result = await promise;

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result).toEqual(Buffer.concat([chunk1, chunk2]));
  });

  it('rejects on non-zero exit code with "mongodump exited N" and stderr content', async () => {
    const mockChild = createMockChild();
    spawnSpy.mockReturnValue(mockChild);

    const promise = spawnMongodump('mongodb://localhost/test');

    setImmediate(() => {
      mockChild.stderr.emit('data', Buffer.from('connection refused'));
      mockChild.emit('close', 1);
    });

    let error;
    try {
      await promise;
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.message).toContain('mongodump exited 1');
    expect(error.message).toContain('connection refused');
  });

  it('rejects on spawn error event (e.g. ENOENT — binary not found)', async () => {
    const mockChild = createMockChild();
    spawnSpy.mockReturnValue(mockChild);

    const promise = spawnMongodump('mongodb://localhost/test');

    setImmediate(() => {
      const err = new Error('spawn mongodump ENOENT');
      err.code = 'ENOENT';
      mockChild.emit('error', err);
    });

    await expect(promise).rejects.toThrow('ENOENT');
  });

  it('redacts MongoDB URI credentials from stderr before surfacing in error message', async () => {
    const mockChild = createMockChild();
    spawnSpy.mockReturnValue(mockChild);

    const promise = spawnMongodump('mongodb://user:pass@cluster.example.com/db');

    setImmediate(() => {
      mockChild.stderr.emit(
        'data',
        // Use standard mongodb:// format to match the regex in backupService.js
        Buffer.from(`Error: failed for mongodb://user:pass@cluster.example.com/db`)
      );
      mockChild.emit('close', 1);
    });

    let errorMsg = '';
    try {
      await promise;
    } catch (err) {
      errorMsg = err.message;
    }

    expect(errorMsg).not.toContain('pass');
    expect(errorMsg).toContain('[REDACTED]');
  });

  it('redacts mongodb+srv:// credentials from stderr (CR-01 fix)', async () => {
    const mockChild = createMockChild();
    spawnSpy.mockReturnValue(mockChild);

    const promise = spawnMongodump('mongodb+srv://admin:s3cret@cluster0.abc.mongodb.net/prod');

    setImmediate(() => {
      mockChild.stderr.emit(
        'data',
        Buffer.from('Error: failed for mongodb+srv://admin:s3cret@cluster0.abc.mongodb.net/prod')
      );
      mockChild.emit('close', 1);
    });

    let errorMsg = '';
    try {
      await promise;
    } catch (err) {
      errorMsg = err.message;
    }

    expect(errorMsg).not.toContain('s3cret');
    expect(errorMsg).toContain('[REDACTED]');
  });
});

// ---------------------------------------------------------------------------
// describe: createBackupS3Client (BKUP-02)
// ---------------------------------------------------------------------------

describe('createBackupS3Client', () => {
  let savedEnv;

  beforeEach(() => {
    savedEnv = {};
    for (const key of Object.keys(DEFAULT_ENV)) {
      savedEnv[key] = process.env[key];
      process.env[key] = DEFAULT_ENV[key];
    }
    installAwsMock();
  });

  afterEach(() => {
    uninstallAwsMock();
    for (const key of Object.keys(DEFAULT_ENV)) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  it('creates S3 client configured with BACKUP_SPACES_KEY and BACKUP_SPACES_SECRET', () => {
    createBackupS3Client();

    expect(s3ConstructorCallCount).toBe(1);
    expect(s3ConstructorLastConfig).toMatchObject({
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
    });
  });
});

// ---------------------------------------------------------------------------
// describe: runRetentionCleanup (RET-01)
// ---------------------------------------------------------------------------

describe('runRetentionCleanup', () => {
  let mockS3;

  beforeEach(() => {
    mockS3 = {
      listObjectsV2: vi.fn(),
      deleteObjects: vi.fn(),
    };
  });

  it('calls listObjectsV2 with correct Bucket and Prefix', async () => {
    mockS3.listObjectsV2.mockReturnValue({
      promise: vi.fn().mockResolvedValue({ Contents: [] }),
    });

    await runRetentionCleanup(mockS3, 'my-bucket', 'backups/', 14);

    expect(mockS3.listObjectsV2).toHaveBeenCalledWith({
      Bucket: 'my-bucket',
      Prefix: 'backups/',
    });
  });

  it('returns 0 and skips deleteObjects when count is within retention limit', async () => {
    mockS3.listObjectsV2.mockReturnValue({
      promise: vi.fn().mockResolvedValue({
        Contents: [
          { Key: 'backups/backup-2026-01-01T03-00-00.000Z.archive.gz' },
          { Key: 'backups/backup-2026-01-02T03-00-00.000Z.archive.gz' },
        ],
      }),
    });

    const deleted = await runRetentionCleanup(mockS3, 'my-bucket', 'backups/', 14);

    expect(deleted).toBe(0);
    expect(mockS3.deleteObjects).not.toHaveBeenCalled();
  });

  it('deletes surplus oldest objects sorted lexicographically when count exceeds retention', async () => {
    // 5 objects (out of order), retention=3 → 2 oldest deleted
    mockS3.listObjectsV2.mockReturnValue({
      promise: vi.fn().mockResolvedValue({
        Contents: [
          { Key: 'backups/backup-2026-01-05T03-00-00.000Z.archive.gz' },
          { Key: 'backups/backup-2026-01-03T03-00-00.000Z.archive.gz' },
          { Key: 'backups/backup-2026-01-01T03-00-00.000Z.archive.gz' },
          { Key: 'backups/backup-2026-01-04T03-00-00.000Z.archive.gz' },
          { Key: 'backups/backup-2026-01-02T03-00-00.000Z.archive.gz' },
        ],
      }),
    });
    mockS3.deleteObjects.mockReturnValue({
      promise: vi.fn().mockResolvedValue({ Errors: [] }),
    });

    await runRetentionCleanup(mockS3, 'my-bucket', 'backups/', 3);

    expect(mockS3.deleteObjects).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'my-bucket',
        Delete: expect.objectContaining({
          Objects: expect.arrayContaining([
            { Key: 'backups/backup-2026-01-01T03-00-00.000Z.archive.gz' },
            { Key: 'backups/backup-2026-01-02T03-00-00.000Z.archive.gz' },
          ]),
        }),
      })
    );
  });

  it('returns count of deleted objects', async () => {
    mockS3.listObjectsV2.mockReturnValue({
      promise: vi.fn().mockResolvedValue({
        Contents: [
          { Key: 'backups/backup-2026-01-01T03-00-00.000Z.archive.gz' },
          { Key: 'backups/backup-2026-01-02T03-00-00.000Z.archive.gz' },
          { Key: 'backups/backup-2026-01-03T03-00-00.000Z.archive.gz' },
        ],
      }),
    });
    mockS3.deleteObjects.mockReturnValue({
      promise: vi.fn().mockResolvedValue({ Errors: [] }),
    });

    // retention=1 with 3 objects → 2 deleted
    const deleted = await runRetentionCleanup(mockS3, 'my-bucket', 'backups/', 1);

    expect(deleted).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// describe: runBackup (BKUP-01, BKUP-02, MON-01, RET-01, ADM-03)
// ---------------------------------------------------------------------------

describe('runBackup', () => {
  let spawnSpy;
  let consoleLogSpy;
  let savedEnv;

  beforeEach(() => {
    // Save and apply all required env vars
    savedEnv = {};
    for (const key of Object.keys(DEFAULT_ENV)) {
      savedEnv[key] = process.env[key];
      process.env[key] = DEFAULT_ENV[key];
    }

    // Install AWS mock
    installAwsMock();

    // Silence and capture console.log for MON-01 log assertions
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Default spawn: succeeds with archive data
    spawnSpy = vi.spyOn(childProcess, 'spawn').mockImplementation(() => {
      const child = createMockChild();
      setImmediate(() => {
        child.stdout.emit('data', Buffer.from('backup-archive-bytes'));
        child.emit('close', 0);
      });
      return child;
    });

    // Queue a default S3 instance for the main S3 call in runBackup
    queueMockS3Instance();
  });

  afterEach(() => {
    spawnSpy.mockRestore();
    consoleLogSpy.mockRestore();
    uninstallAwsMock();

    for (const key of Object.keys(DEFAULT_ENV)) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  /** Parse the structured backup log line from console.log calls. */
  function getBackupLog() {
    const logCalls = consoleLogSpy.mock.calls.map(c => c[0]);
    const line = logCalls.find(msg => typeof msg === 'string' && msg.startsWith('[backup] '));
    if (!line) return null;
    return JSON.parse(line.slice('[backup] '.length));
  }

  // ------ Success path ------

  it('returns result object with status=success and all MON-01 fields', async () => {
    const result = await runBackup();

    expect(result.status).toBe('success');
    expect(result.filename).toMatch(/^backup-.+\.archive\.gz$/);
    expect(result.sizeBytes).toBe(Buffer.from('backup-archive-bytes').length);
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeNull();
    expect(result.retentionError).toBeNull();
    expect(typeof result.retentionDeleted).toBe('number');
    expect(result.timestamp).toBeDefined();
  });

  it('logs "[backup] " prefixed JSON with all MON-01 fields on success', async () => {
    await runBackup();

    const parsed = getBackupLog();
    expect(parsed).not.toBeNull();
    expect(parsed.status).toBe('success');
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.filename).toBeDefined();
    expect(typeof parsed.sizeBytes).toBe('number');
    expect(typeof parsed.durationMs).toBe('number');
    expect(typeof parsed.retentionDeleted).toBe('number');
    expect(parsed.error).toBeNull();
    expect(parsed.retentionError).toBeNull();
  });

  it('calls putObject with correct Bucket, Key (prefix+filename), Body (Buffer), ContentType', async () => {
    let capturedPutArgs;

    // Queue a custom S3 instance that captures putObject args
    s3MockInstanceQueue.unshift({
      putObject: vi.fn().mockImplementation(args => {
        capturedPutArgs = args;
        return { promise: vi.fn().mockResolvedValue({}) };
      }),
      listObjectsV2: vi.fn().mockReturnValue({
        promise: vi.fn().mockResolvedValue({ Contents: [] }),
      }),
      deleteObjects: vi.fn(),
    });

    await runBackup();

    expect(capturedPutArgs).toBeDefined();
    expect(capturedPutArgs.Bucket).toBe('test-backup-bucket');
    expect(capturedPutArgs.Key).toMatch(/^backups\/backup-.+\.archive\.gz$/);
    expect(Buffer.isBuffer(capturedPutArgs.Body)).toBe(true);
    expect(capturedPutArgs.ContentType).toBe('application/gzip');
  });

  // ------ Failure path ------

  it('returns status=failed and error field when mongodump exits non-zero', async () => {
    spawnSpy.mockImplementationOnce(() => {
      const child = createMockChild();
      setImmediate(() => {
        child.stderr.emit('data', Buffer.from('connection refused'));
        child.emit('close', 1);
      });
      return child;
    });

    const result = await runBackup();

    expect(result.status).toBe('failed');
    expect(result.error).toBeTruthy();
    expect(result.sizeBytes).toBeNull();
  });

  it('logs JSON with status=failed and error set on mongodump failure (MON-01)', async () => {
    spawnSpy.mockImplementationOnce(() => {
      const child = createMockChild();
      setImmediate(() => child.emit('close', 1));
      return child;
    });

    await runBackup();

    const parsed = getBackupLog();
    expect(parsed).not.toBeNull();
    expect(parsed.status).toBe('failed');
    expect(parsed.error).toBeTruthy();
    expect(parsed.sizeBytes).toBeNull();
  });

  // ------ Credential guard tests ------

  it('fails immediately with error when BACKUP_BUCKET is missing', async () => {
    delete process.env.BACKUP_BUCKET;

    const result = await runBackup();

    expect(result.status).toBe('failed');
    expect(result.error).toContain('Missing BACKUP_SPACES_* credentials or BACKUP_BUCKET');
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it('fails immediately with error when BACKUP_SPACES_ENDPOINT is missing', async () => {
    delete process.env.BACKUP_SPACES_ENDPOINT;

    const result = await runBackup();

    expect(result.status).toBe('failed');
    expect(result.error).toContain('Missing BACKUP_SPACES_* credentials or BACKUP_BUCKET');
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it('fails immediately with error when MONGO_URL is missing', async () => {
    delete process.env.MONGO_URL;

    const result = await runBackup();

    expect(result.status).toBe('failed');
    expect(result.error).toContain('MONGO_URL is not set');
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  // ------ D-09: Retention failure does not change backup status ------

  it('status remains "success" when retention cleanup fails (D-09)', async () => {
    // Override the queued instance with one that rejects on listObjectsV2
    s3MockInstanceQueue[0] = createMockS3FromConfig({
      listRejectsWithError: new Error('S3 list permission denied'),
    });

    const result = await runBackup();

    expect(result.status).toBe('success');
    expect(result.retentionError).toContain('S3 list permission denied');
    expect(result.error).toBeNull();
  });

  it('retentionError field is populated in log when retention fails (D-09)', async () => {
    s3MockInstanceQueue[0] = createMockS3FromConfig({
      listRejectsWithError: new Error('access denied'),
    });

    await runBackup();

    const parsed = getBackupLog();
    expect(parsed.status).toBe('success');
    expect(parsed.retentionError).toContain('access denied');
    expect(parsed.error).toBeNull();
  });

  // ------ ADM-03: BACKUP_RETENTION_COUNT env var ------

  it('respects BACKUP_RETENTION_COUNT=5 — 6 objects results in 1 deleted', async () => {
    process.env.BACKUP_RETENTION_COUNT = '5';

    const mockDeleteObjects = vi.fn().mockReturnValue({
      promise: vi.fn().mockResolvedValue({ Errors: [] }),
    });

    s3MockInstanceQueue[0] = {
      putObject: vi.fn().mockReturnValue({ promise: vi.fn().mockResolvedValue({}) }),
      listObjectsV2: vi.fn().mockReturnValue({
        promise: vi.fn().mockResolvedValue({
          Contents: Array.from({ length: 6 }, (_, i) => ({
            Key: `backups/backup-2026-01-0${i + 1}T03-00-00.000Z.archive.gz`,
          })),
        }),
      }),
      deleteObjects: mockDeleteObjects,
    };

    const result = await runBackup();

    expect(result.status).toBe('success');
    expect(result.retentionDeleted).toBe(1);
    expect(mockDeleteObjects).toHaveBeenCalledTimes(1);
  });

  it('defaults BACKUP_RETENTION_COUNT to 14 — 14 objects, 0 deleted', async () => {
    delete process.env.BACKUP_RETENTION_COUNT;

    const mockDeleteObjects = vi.fn().mockReturnValue({
      promise: vi.fn().mockResolvedValue({ Errors: [] }),
    });

    s3MockInstanceQueue[0] = {
      putObject: vi.fn().mockReturnValue({ promise: vi.fn().mockResolvedValue({}) }),
      listObjectsV2: vi.fn().mockReturnValue({
        promise: vi.fn().mockResolvedValue({
          Contents: Array.from({ length: 14 }, (_, i) => ({
            Key: `backups/backup-2026-01-${String(i + 1).padStart(2, '0')}T03-00-00.000Z.archive.gz`,
          })),
        }),
      }),
      deleteObjects: mockDeleteObjects,
    };

    const result = await runBackup();

    // 14 objects with default retention=14 → 0 deleted
    expect(result.status).toBe('success');
    expect(result.retentionDeleted).toBe(0);
    expect(mockDeleteObjects).not.toHaveBeenCalled();
  });
});
