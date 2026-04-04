/**
 * Backup binary verification utility (Phase 33, BKUP-04).
 *
 * Verifies that mongodump and mongorestore binaries are available at startup.
 * Decision D-06: fail loud in production, warn in dev (binary may not be installed locally).
 * Decision D-08: respects MONGODUMP_PATH and MONGORESTORE_PATH env vars.
 *
 * Extracted from backend/index.js for testability.
 *
 * The _execFileSync parameter allows dependency injection for testing.
 * In production use (no argument), the real child_process.execFileSync is used.
 */

const childProcess = require('child_process');

/**
 * Verify mongodump and mongorestore binaries are available.
 *
 * In production (NODE_ENV=production): throws Error if either binary is missing.
 * In non-production: logs a warning and continues (binary may not be installed locally).
 *
 * @param {Function} [_execFileSync] - Optional override for child_process.execFileSync (for testing)
 * @throws {Error} "mongodump binary unavailable..." or "mongorestore binary unavailable..."
 *   when NODE_ENV=production and binary is not found.
 */
function verifyMongodumpBinary(_execFileSync) {
  const execFileSync = _execFileSync || childProcess.execFileSync;
  const mongodumpPath = process.env.MONGODUMP_PATH || 'mongodump';
  const mongorestorePath = process.env.MONGORESTORE_PATH || 'mongorestore';

  // Check mongodump
  try {
    // Log resolved path — critical for confirming /layers path on App Platform
    try {
      const whichResult = execFileSync('which', [mongodumpPath], { encoding: 'utf8', timeout: 5000 }).trim();
      console.log(`[backup] mongodump resolved path: ${whichResult}`);
    } catch {
      // 'which' may not be available in all environments (Windows)
      console.log(`[backup] mongodump PATH lookup: ${mongodumpPath}`);
    }

    const version = execFileSync(mongodumpPath, ['--version'], { encoding: 'utf8', timeout: 5000 }).trim();
    // Only log the first line (version string), not full output
    const versionLine = version.split('\n')[0];
    console.log(`[backup] mongodump binary OK: ${versionLine}`);
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      // D-06: fail loud in production
      console.error(`[backup] FATAL: mongodump binary not found at "${mongodumpPath}"`, err.message);
      throw new Error('mongodump binary unavailable. Check Aptfile and MONGODUMP_PATH env var.');
    } else {
      console.warn(`[backup] WARNING: mongodump not found at "${mongodumpPath}" — backup features will not work. This is expected in local dev.`);
    }
  }

  // Check mongorestore (log only, same pattern)
  try {
    const restoreVersion = execFileSync(mongorestorePath, ['--version'], { encoding: 'utf8', timeout: 5000 }).trim();
    const restoreVersionLine = restoreVersion.split('\n')[0];
    console.log(`[backup] mongorestore binary OK: ${restoreVersionLine}`);
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`[backup] FATAL: mongorestore binary not found at "${mongorestorePath}"`, err.message);
      throw new Error('mongorestore binary unavailable. Check Aptfile and MONGORESTORE_PATH env var.');
    } else {
      console.warn(`[backup] WARNING: mongorestore not found at "${mongorestorePath}" — restore features will not work.`);
    }
  }
}

module.exports = { verifyMongodumpBinary };
