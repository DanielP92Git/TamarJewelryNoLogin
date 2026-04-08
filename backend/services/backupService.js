/**
 * Backup Service (Phase 34)
 *
 * Implements automated MongoDB backup via mongodump, upload to DigitalOcean Spaces,
 * count-based retention cleanup, and structured JSON logging.
 *
 * Requirements satisfied:
 *   BKUP-01 — Daily automated MongoDB backup using mongodump with gzip compression
 *   BKUP-02 — Backup archives uploaded directly to DigitalOcean Spaces (off-region)
 *   BKUP-03 — Timestamped naming convention (ISO format, filesystem-safe, sortable)
 *   MON-01  — Structured log entry per run (timestamp, status, size, duration, error)
 *   RET-01  — Auto-deletes backups exceeding retention count after each successful backup
 *   ADM-03  — Retention count configurable via BACKUP_RETENTION_COUNT env var (default 14)
 */

'use strict';

const AWS = require('aws-sdk');
const childProcess = require('child_process');

/**
 * Creates and returns an AWS S3 instance configured with backup-specific credentials.
 * Uses BACKUP_SPACES_* credentials — do NOT reuse the S3 client from index.js.
 *
 * @returns {AWS.S3}
 */
function createBackupS3Client() {
  return new AWS.S3({
    endpoint: new AWS.Endpoint(process.env.BACKUP_SPACES_ENDPOINT),
    accessKeyId: process.env.BACKUP_SPACES_KEY,
    secretAccessKey: process.env.BACKUP_SPACES_SECRET,
    region: process.env.BACKUP_SPACES_REGION || undefined,
  });
}

/**
 * Returns an ISO-timestamped filename for a backup archive.
 * Colons are replaced with dashes for filesystem compatibility (BKUP-03).
 * Lexicographic sort order equals chronological order.
 *
 * Example: backup-2026-04-05T03-00-00.000Z.archive.gz
 *
 * @returns {string}
 */
function buildBackupFilename() {
  return 'backup-' + new Date().toISOString().replace(/:/g, '-') + '.archive.gz';
}

/**
 * Spawns mongodump and buffers the gzip archive from stdout into memory (D-01, D-02).
 *
 * Uses spawn (NOT execFile) to avoid maxBuffer limits on large databases.
 * stdin is ignored; stdout is piped for the archive; stderr is piped for error reporting.
 *
 * MongoDB URI is NEVER logged — it is redacted in any error messages produced here.
 *
 * @param {string} mongoUri - MongoDB connection URI (e.g. process.env.MONGO_URL)
 * @returns {Promise<Buffer>} Resolves with the gzip archive buffer on success
 */
function spawnMongodump(mongoUri) {
  return new Promise((resolve, reject) => {
    const mongodumpPath = process.env.MONGODUMP_PATH || 'mongodump';

    const child = childProcess.spawn(
      mongodumpPath,
      ['--uri', mongoUri, '--archive', '--gzip'],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    const chunks = [];
    const stderrChunks = [];

    child.stdout.on('data', chunk => chunks.push(chunk));
    child.stderr.on('data', chunk => stderrChunks.push(chunk));

    child.on('close', code => {
      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString('utf8');
        // Redact MongoDB URI credentials from stderr before surfacing in error message
        const redacted = stderr.replace(/(mongodb(?:\+srv)?:\/\/)[^\s@]+@/g, '$1[REDACTED]@');
        return reject(new Error(`mongodump exited ${code}: ${redacted}`));
      }
      resolve(Buffer.concat(chunks));
    });

    child.on('error', err => reject(err));
  });
}

/**
 * Deletes surplus backups in the S3 prefix that exceed the retention count.
 *
 * Objects are sorted lexicographically by Key (oldest-first, because filenames are
 * ISO-timestamped). Surplus objects at the beginning of the sorted list are deleted.
 *
 * Note: listObjectsV2 returns max 1000 objects per call; with retention ~14,
 * pagination is unnecessary for this project.
 *
 * @param {AWS.S3} s3 - Configured S3 client
 * @param {string} bucket - Bucket name
 * @param {string} prefix - Key prefix for backup objects (e.g. 'backups/')
 * @param {number} retentionCount - Maximum number of backups to keep
 * @returns {Promise<number>} Number of objects deleted
 */
async function runRetentionCleanup(s3, bucket, prefix, retentionCount) {
  const listResp = await s3.listObjectsV2({ Bucket: bucket, Prefix: prefix }).promise();
  const objects = (listResp.Contents || []).sort((a, b) => a.Key.localeCompare(b.Key));
  const surplus = objects.slice(0, Math.max(0, objects.length - retentionCount));

  if (surplus.length === 0) return 0;

  const deleteResp = await s3.deleteObjects({
    Bucket: bucket,
    Delete: { Objects: surplus.map(o => ({ Key: o.Key })) },
  }).promise();

  if (deleteResp.Errors && deleteResp.Errors.length > 0) {
    throw new Error(`deleteObjects partial failure: ${JSON.stringify(deleteResp.Errors)}`);
  }

  return surplus.length;
}

/**
 * Main backup orchestrator (D-07).
 *
 * Steps:
 *   1. Guard: verify required env vars are present
 *   2. Spawn mongodump and buffer archive to memory (D-01, D-02)
 *   3. Upload buffer to DigitalOcean Spaces via S3 putObject (BKUP-02)
 *   4. Run retention cleanup in nested try/catch — failure does not change status (D-09)
 *
 * Always logs a single JSON line with all MON-01 fields (success or failure).
 * Returns the result object so Phase 35's manual trigger endpoint can use it directly.
 *
 * @returns {Promise<Object>} Result object with MON-01 fields
 */
async function runBackup(options = {}) {
  const startedAt = Date.now();
  const filename = buildBackupFilename();

  const result = {
    timestamp: new Date().toISOString(),
    status: 'success',
    filename,
    sizeBytes: null,
    durationMs: null,
    retentionDeleted: 0,
    error: null,
    retentionError: null,
  };

  try {
    // Guard: credentials present (BKUP-02 / Pitfall 5)
    if (
      !process.env.BACKUP_BUCKET ||
      !process.env.BACKUP_SPACES_ENDPOINT ||
      !process.env.BACKUP_SPACES_KEY ||
      !process.env.BACKUP_SPACES_SECRET
    ) {
      throw new Error('Missing BACKUP_SPACES_* credentials or BACKUP_BUCKET');
    }

    // Guard: MongoDB URI present
    if (!process.env.MONGO_URL) {
      throw new Error('MONGO_URL is not set');
    }

    // Spawn mongodump and collect archive in memory (D-01, D-02)
    const buffer = await spawnMongodump(process.env.MONGO_URL);
    result.sizeBytes = buffer.length; // D-03: exact byte count from buffer

    // Upload to DigitalOcean Spaces (BKUP-02)
    const s3 = createBackupS3Client();
    const prefix = options.prefix || process.env.BACKUP_SPACES_PREFIX || 'backups/';
    const key = prefix + filename;

    await s3.putObject({
      Bucket: process.env.BACKUP_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'application/gzip',
    }).promise();

    // Retention cleanup — failure does NOT change backup status (D-09)
    try {
      const retentionCount = parseInt(process.env.BACKUP_RETENTION_COUNT, 10) || 14;
      result.retentionDeleted = await runRetentionCleanup(
        s3,
        process.env.BACKUP_BUCKET,
        prefix,
        retentionCount
      );
    } catch (retErr) {
      result.retentionError = retErr.message;
    }
  } catch (err) {
    // D-08: log failed status with error message; no retry
    result.status = 'failed';
    result.error = err.message;
  } finally {
    result.durationMs = Date.now() - startedAt;
  }

  // D-06/MON-01: single JSON log line per run (success or failure)
  console.log('[backup] ' + JSON.stringify(result));

  // D-07: return result so Phase 35 manual trigger can expose it via API
  return result;
}

/**
 * Spawns mongorestore and writes the archive buffer to stdin (D-05, D-06).
 *
 * Mirrors spawnMongodump exactly but in reverse:
 * - stdin is piped IN (write buffer then end)
 * - stdout is ignored (mongorestore outputs to database, not stdout)
 * - stderr is piped for error reporting
 * - Uses --drop flag for clean state (D-06)
 *
 * MongoDB URI is NEVER logged — redacted in error messages.
 *
 * @param {string} mongoUri - MongoDB connection URI
 * @param {Buffer} archiveBuffer - gzip archive from Spaces
 * @returns {Promise<void>} Resolves on success
 */
function spawnMongorestore(mongoUri, archiveBuffer) {
  return new Promise((resolve, reject) => {
    const mongorestorePath = process.env.MONGORESTORE_PATH || 'mongorestore';

    const child = childProcess.spawn(
      mongorestorePath,
      ['--uri', mongoUri, '--archive', '--gzip', '--drop'],
      { stdio: ['pipe', 'ignore', 'pipe'] }
    );

    const stderrChunks = [];
    child.stderr.on('data', chunk => stderrChunks.push(chunk));

    child.on('close', code => {
      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString('utf8');
        const redacted = stderr.replace(/(mongodb(?:\+srv)?:\/\/)[^\s@]+@/g, '$1[REDACTED]@');
        return reject(new Error(`mongorestore exited ${code}: ${redacted}`));
      }
      resolve();
    });

    child.on('error', err => reject(err));

    // Write archive to stdin, then signal EOF (Pitfall 1: MUST call end)
    child.stdin.write(archiveBuffer);
    child.stdin.end();
  });
}

/**
 * Checks whether a key exists in the Spaces bucket via headObject (D-11).
 *
 * Uses headObject (lightweight HEAD request) rather than listing all objects.
 * Handles both 'NotFound' and statusCode 404 for Spaces compatibility (Pitfall 5).
 *
 * @param {AWS.S3} s3 - Configured S3 client
 * @param {string} bucket - Bucket name
 * @param {string} key - Full object key to check
 * @returns {Promise<boolean>} true if object exists
 */
async function keyExistsInSpaces(s3, bucket, key) {
  try {
    await s3.headObject({ Bucket: bucket, Key: key }).promise();
    return true;
  } catch (err) {
    if (err.code === 'NotFound' || err.statusCode === 404) return false;
    throw err;
  }
}

/**
 * Restore orchestrator (D-08).
 *
 * Steps:
 *   1. Guard: required env vars present
 *   2. Validate key against Spaces objects (D-11) — return failedStep:'validation' if not found
 *   3. Pre-restore safety backup via runBackup with pre-restore/ prefix (D-01, D-02, D-03)
 *   4. Download archive buffer from Spaces (D-05) — measure downloadMs
 *   5. Spawn mongorestore with --archive --gzip --drop (D-06) — measure restoreMs
 *
 * Returns result object with step timing (D-20) and preRestoreBackup filename (D-04).
 * No auto-rollback on failure (D-19) — result includes preRestoreBackup for manual recovery.
 *
 * @param {string} key - Full S3 key of the backup object to restore from
 * @returns {Promise<Object>} Result object with status, timing, error details
 */
async function runRestore(key) {
  const startedAt = Date.now();

  const result = {
    timestamp: new Date().toISOString(),
    status: 'success',
    preRestoreBackup: null,
    failedStep: null,
    downloadMs: null,
    preBackupMs: null,
    restoreMs: null,
    totalMs: null,
    error: null,
  };

  try {
    // Guard: Spaces credentials present
    if (
      !process.env.BACKUP_BUCKET ||
      !process.env.BACKUP_SPACES_ENDPOINT ||
      !process.env.BACKUP_SPACES_KEY ||
      !process.env.BACKUP_SPACES_SECRET
    ) {
      throw new Error('Missing BACKUP_SPACES_* credentials or BACKUP_BUCKET');
    }

    // Guard: MongoDB URI present
    if (!process.env.MONGO_URL) {
      throw new Error('MONGO_URL is not set');
    }

    const s3 = createBackupS3Client();
    const bucket = process.env.BACKUP_BUCKET;
    const prefix = process.env.BACKUP_SPACES_PREFIX || 'backups/';

    // Prepend prefix if not already present (UI sends bare filename)
    if (!key.startsWith(prefix)) {
      key = prefix + key;
    }

    // D-11: Validate key against actual Spaces objects
    const exists = await keyExistsInSpaces(s3, bucket, key);
    if (!exists) {
      result.status = 'failed';
      result.failedStep = 'validation';
      result.error = `Backup key not found: ${key}`;
      result.totalMs = Date.now() - startedAt;
      console.log('[backup] restore ' + JSON.stringify(result));
      return result;
    }

    // D-01/D-02/D-03: Pre-restore safety backup with separate prefix
    const preBackupStart = Date.now();
    const preRestorePrefix = process.env.BACKUP_PRE_RESTORE_PREFIX || 'pre-restore/';
    const preBackupResult = await runBackup({ prefix: preRestorePrefix });
    result.preBackupMs = Date.now() - preBackupStart;

    if (preBackupResult.status === 'failed') {
      result.status = 'failed';
      result.failedStep = 'pre-backup';
      result.error = `Pre-restore backup failed: ${preBackupResult.error}`;
      result.totalMs = Date.now() - startedAt;
      console.log('[backup] restore ' + JSON.stringify(result));
      return result;
    }
    // D-04: Store pre-restore backup filename for audit and manual recovery
    result.preRestoreBackup = preBackupResult.filename;

    // D-05: Download archive into memory
    const downloadStart = Date.now();
    const response = await s3.getObject({ Bucket: bucket, Key: key }).promise();
    const archiveBuffer = response.Body;
    result.downloadMs = Date.now() - downloadStart;

    // D-06: Run mongorestore --archive --gzip --drop
    const restoreStart = Date.now();
    await spawnMongorestore(process.env.MONGO_URL, archiveBuffer);
    result.restoreMs = Date.now() - restoreStart;

  } catch (err) {
    result.status = 'failed';
    result.error = err.message;
    if (!result.failedStep) result.failedStep = 'restore';
  } finally {
    result.totalMs = Date.now() - startedAt;
  }

  // Structured log line — same pattern as runBackup
  console.log('[backup] restore ' + JSON.stringify(result));

  return result;
}

module.exports = {
  runBackup,
  runRestore,
  createBackupS3Client,
  spawnMongodump,
  spawnMongorestore,
  buildBackupFilename,
  runRetentionCleanup,
  keyExistsInSpaces,
};
