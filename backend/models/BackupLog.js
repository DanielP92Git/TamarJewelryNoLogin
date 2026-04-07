'use strict';

const mongoose = require('mongoose');

const BackupLogSchema = new mongoose.Schema({
  timestamp:   { type: Date, required: true, default: Date.now },
  status:      { type: String, required: true, enum: ['success', 'failed'] },
  filename:    { type: String, required: true },
  bytes:       { type: Number, default: null },
  duration_ms: { type: Number, default: null },
  error:       { type: String, default: null },
  trigger:     { type: String, required: true, enum: ['cron', 'manual'] },
  retention_deleted: { type: Number, default: 0 },
  retention_error:   { type: String, default: null },
});

// Index on timestamp descending for newest-first listing queries (D-14)
BackupLogSchema.index({ timestamp: -1 });

// No TTL index per D-10 — entries kept indefinitely
module.exports =
  mongoose.models.BackupLog || mongoose.model('BackupLog', BackupLogSchema);
