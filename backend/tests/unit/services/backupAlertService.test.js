/**
 * Unit tests for backupAlertService.js (Phase 35, MON-02)
 *
 * Tests sendBackupFailureAlert():
 * - Skips silently when any required EmailJS env var is missing
 * - Sends correct HTTP POST request to EmailJS v1.6 endpoint
 * - Request body contains all required fields with correct mapping
 * - Logs warning on HTTP failure (D-05: no retry, no throw)
 * - Logs warning on fetch exception (D-05: no retry, no throw)
 * - Does not throw on any failure scenario
 *
 * MOCKING STRATEGY:
 * backupAlertService.js uses CJS require() and calls globalThis.fetch.
 * We mock globalThis.fetch using vi.stubGlobal() for HTTP interception.
 * We spy on console.warn to verify warning logs.
 * Env vars are saved and restored in beforeEach/afterEach to prevent test pollution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// CJS reference to the module under test
// ---------------------------------------------------------------------------
const { sendBackupFailureAlert } = require('../../../services/backupAlertService');

// ---------------------------------------------------------------------------
// Mock result matching runBackup() return shape
// ---------------------------------------------------------------------------
const mockResult = {
  error: 'mongodump exited 1: connection refused',
  timestamp: '2026-04-07T03:00:00.000Z',
  filename: 'backup-2026-04-07T03-00-00.000Z.archive.gz',
  durationMs: 1203,
  status: 'failed',
};

// ---------------------------------------------------------------------------
// Standard test env vars
// ---------------------------------------------------------------------------
const EMAILJS_ENV_VARS = {
  EMAILJS_SERVICE_ID: 'test_service_id',
  EMAILJS_ALERT_TEMPLATE_ID: 'test_template_id',
  EMAILJS_PUBLIC_KEY: 'test_public_key',
  EMAILJS_PRIVATE_KEY: 'test_private_key',
  ALERT_EMAIL_TO: 'admin@test.com',
};

describe('backupAlertService', () => {
  describe('sendBackupFailureAlert', () => {
    let savedEnvVars = {};
    let warnSpy;
    let logSpy;

    beforeEach(() => {
      // Save and delete all EmailJS env vars
      for (const key of Object.keys(EMAILJS_ENV_VARS)) {
        savedEnvVars[key] = process.env[key];
        delete process.env[key];
      }

      // Spy on console.warn and console.log
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      // Restore env vars
      for (const [key, value] of Object.entries(savedEnvVars)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      savedEnvVars = {};

      // Restore spies
      warnSpy.mockRestore();
      logSpy.mockRestore();

      // Remove any fetch mock
      vi.unstubAllGlobals();
    });

    // =============================================
    // Env var guard — skips when any var is missing
    // =============================================

    describe('env var guard', () => {
      it('should skip when EMAILJS_SERVICE_ID is missing', async () => {
        // Set all except EMAILJS_SERVICE_ID
        Object.assign(process.env, EMAILJS_ENV_VARS);
        delete process.env.EMAILJS_SERVICE_ID;

        const mockFetch = vi.fn();
        vi.stubGlobal('fetch', mockFetch);

        await sendBackupFailureAlert(mockResult);

        expect(mockFetch).not.toHaveBeenCalled();
        const warnMessages = warnSpy.mock.calls.map(c => c[0]);
        expect(warnMessages.some(m => /EMAILJS env vars not configured/i.test(m))).toBe(true);
      });

      it('should skip when EMAILJS_ALERT_TEMPLATE_ID is missing', async () => {
        Object.assign(process.env, EMAILJS_ENV_VARS);
        delete process.env.EMAILJS_ALERT_TEMPLATE_ID;

        const mockFetch = vi.fn();
        vi.stubGlobal('fetch', mockFetch);

        await sendBackupFailureAlert(mockResult);

        expect(mockFetch).not.toHaveBeenCalled();
        const warnMessages = warnSpy.mock.calls.map(c => c[0]);
        expect(warnMessages.some(m => /EMAILJS env vars not configured/i.test(m))).toBe(true);
      });

      it('should skip when EMAILJS_PUBLIC_KEY is missing', async () => {
        Object.assign(process.env, EMAILJS_ENV_VARS);
        delete process.env.EMAILJS_PUBLIC_KEY;

        const mockFetch = vi.fn();
        vi.stubGlobal('fetch', mockFetch);

        await sendBackupFailureAlert(mockResult);

        expect(mockFetch).not.toHaveBeenCalled();
        const warnMessages = warnSpy.mock.calls.map(c => c[0]);
        expect(warnMessages.some(m => /EMAILJS env vars not configured/i.test(m))).toBe(true);
      });

      it('should skip when all EmailJS env vars are absent', async () => {
        // No vars set (all deleted in beforeEach)
        const mockFetch = vi.fn();
        vi.stubGlobal('fetch', mockFetch);

        await sendBackupFailureAlert(mockResult);

        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    // =============================================
    // Correct HTTP request when env vars are set
    // =============================================

    describe('HTTP request shape', () => {
      beforeEach(() => {
        // Set all required env vars
        Object.assign(process.env, EMAILJS_ENV_VARS);
      });

      it('should send POST to EmailJS v1.6 endpoint', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', mockFetch);

        await sendBackupFailureAlert(mockResult);

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [url] = mockFetch.mock.calls[0];
        expect(url).toBe('https://api.emailjs.com/api/v1.6/email/send');
      });

      it('should use POST method', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', mockFetch);

        await sendBackupFailureAlert(mockResult);

        const [, options] = mockFetch.mock.calls[0];
        expect(options.method).toBe('POST');
      });

      it('should set Content-Type: application/json', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', mockFetch);

        await sendBackupFailureAlert(mockResult);

        const [, options] = mockFetch.mock.calls[0];
        expect(options.headers['Content-Type']).toBe('application/json');
      });

      it('should include service_id from env var in body', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', mockFetch);

        await sendBackupFailureAlert(mockResult);

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.service_id).toBe('test_service_id');
      });

      it('should include template_id from env var in body', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', mockFetch);

        await sendBackupFailureAlert(mockResult);

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.template_id).toBe('test_template_id');
      });

      it('should include user_id (public key) from env var in body', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', mockFetch);

        await sendBackupFailureAlert(mockResult);

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.user_id).toBe('test_public_key');
      });

      it('should include accessToken (private key) from env var in body', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', mockFetch);

        await sendBackupFailureAlert(mockResult);

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.accessToken).toBe('test_private_key');
      });

      it('should include correct template_params fields', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', mockFetch);

        await sendBackupFailureAlert(mockResult);

        const [, options] = mockFetch.mock.calls[0];
        const body = JSON.parse(options.body);
        const params = body.template_params;

        expect(params.to_email).toBe('admin@test.com');
        expect(params.error_message).toBe(mockResult.error);
        expect(params.timestamp).toBe(mockResult.timestamp);
        expect(params.filename).toBe(mockResult.filename);
        expect(params.duration_ms).toBe(mockResult.durationMs);
      });
    });

    // =============================================
    // Failure handling (D-05: log warning, no throw)
    // =============================================

    describe('failure handling (D-05)', () => {
      beforeEach(() => {
        Object.assign(process.env, EMAILJS_ENV_VARS);
      });

      it('should log warning when HTTP response is not ok', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: vi.fn().mockResolvedValue('Internal Server Error'),
        });
        vi.stubGlobal('fetch', mockFetch);

        await sendBackupFailureAlert(mockResult);

        const warnMessages = warnSpy.mock.calls.map(c => c[0]);
        expect(warnMessages.some(m => /alert email failed/i.test(m))).toBe(true);
      });

      it('should log warning when fetch throws a network error', async () => {
        const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
        vi.stubGlobal('fetch', mockFetch);

        await sendBackupFailureAlert(mockResult);

        const warnMessages = warnSpy.mock.calls.map(c => c[0]);
        expect(warnMessages.some(m => /alert email failed/i.test(m))).toBe(true);
      });

      it('should NOT throw when HTTP response is not ok (D-05)', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          text: vi.fn().mockResolvedValue('Bad Request'),
        });
        vi.stubGlobal('fetch', mockFetch);

        // Should resolve without throwing
        await expect(sendBackupFailureAlert(mockResult)).resolves.not.toThrow();
      });

      it('should NOT throw when fetch rejects (D-05)', async () => {
        const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
        vi.stubGlobal('fetch', mockFetch);

        // Should resolve without throwing
        await expect(sendBackupFailureAlert(mockResult)).resolves.not.toThrow();
      });

      it('should NOT throw when env vars missing (D-05)', async () => {
        // All vars already deleted in beforeEach of outer describe, then set in this beforeEach
        // Re-delete them for this specific test
        delete process.env.EMAILJS_SERVICE_ID;
        delete process.env.EMAILJS_ALERT_TEMPLATE_ID;
        delete process.env.EMAILJS_PUBLIC_KEY;

        // Should resolve without throwing
        await expect(sendBackupFailureAlert(mockResult)).resolves.not.toThrow();
      });

      it('should log success when HTTP response is ok', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', mockFetch);

        await sendBackupFailureAlert(mockResult);

        const logMessages = logSpy.mock.calls.map(c => c[0]);
        expect(logMessages.some(m => /alert email sent successfully/i.test(m))).toBe(true);
      });
    });
  });
});
