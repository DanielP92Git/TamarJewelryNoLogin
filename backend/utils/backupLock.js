'use strict';

/**
 * Shared backup/restore concurrency lock (Phase 36, D-12).
 *
 * Replaces the isBackupRunning boolean from Phase 35 with a unified
 * activeOperation enum: null | 'backup' | 'restore'.
 *
 * Shared between backup.js (routes) and backupJob.js (cron) to prevent
 * concurrent backup/restore operations on single-instance App Platform.
 */

let activeOperation = null; // null | 'backup' | 'restore'

function getActiveOperation() {
  return activeOperation;
}

function setActiveOperation(operation) {
  activeOperation = operation;
}

function clearActiveOperation() {
  activeOperation = null;
}

module.exports = { getActiveOperation, setActiveOperation, clearActiveOperation };
