'use strict';

/**
 * Backup Alert Service (Phase 35, MON-02)
 *
 * Sends email notifications via EmailJS REST API when a backup fails.
 * Uses globalThis.fetch (Node 22+) — no new dependencies.
 *
 * D-01: POST to api.emailjs.com/api/v1.6/email/send
 * D-02: Recipient from ALERT_EMAIL_TO env var
 * D-03: Dedicated template (EMAILJS_ALERT_TEMPLATE_ID), separate from contact form
 * D-05: On EmailJS failure, log warning and move on — no retry
 * D-06: All IDs/keys from env vars — nothing hardcoded
 * D-07: Full context in email: error, timestamp, filename, duration
 */

/**
 * Send a backup failure alert email via EmailJS REST API.
 *
 * Silently skips if EmailJS env vars are not configured (guards present).
 * On HTTP failure or exception, logs a warning and returns — no retry (D-05).
 *
 * @param {Object} result - The runBackup() result object
 * @param {string} result.error - Error message
 * @param {string} result.timestamp - ISO timestamp
 * @param {string} result.filename - Attempted backup filename
 * @param {number} result.durationMs - Duration before failure in ms
 */
async function sendBackupFailureAlert(result) {
  // Guard: skip silently if EmailJS env vars not configured
  if (
    !process.env.EMAILJS_SERVICE_ID ||
    !process.env.EMAILJS_ALERT_TEMPLATE_ID ||
    !process.env.EMAILJS_PUBLIC_KEY
  ) {
    console.warn('[backup] alert email skipped: EMAILJS env vars not configured');
    return;
  }

  try {
    const body = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_ALERT_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      accessToken: process.env.EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: process.env.ALERT_EMAIL_TO,
        error_message: result.error,
        timestamp: result.timestamp,
        filename: result.filename,
        duration_ms: result.durationMs,
      },
    };

    const resp = await globalThis.fetch(
      'https://api.emailjs.com/api/v1.6/email/send',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${text}`);
    }

    console.log('[backup] alert email sent successfully');
  } catch (err) {
    // D-05: log warning, no retry, move on
    console.warn('[backup] alert email failed:', err.message);
  }
}

module.exports = { sendBackupFailureAlert };
