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
        const redacted = stderr.replace(/(mongodb[^s]?:\/\/)[^\s@]+@/g, '$1[REDACTED]@');
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
async function runBackup() {
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
    const prefix = process.env.BACKUP_SPACES_PREFIX || 'backups/';
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

module.exports = {
  runBackup,
  createBackupS3Client,
  spawnMongodump,
  buildBackupFilename,
  runRetentionCleanup,
};
