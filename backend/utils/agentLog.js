/**
 * Debug logging utility — sends structured events to a local collector.
 * No-ops silently when the collector is unreachable.
 */
function agentLog(hypothesisId, location, message, data) {
  try {
    const payload = {
      sessionId: 'debug-session',
      runId: process.env.DEBUG_RUN_ID || 'pre-fix',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    };
    const url =
      'http://127.0.0.1:7243/ingest/eb432dfa-49d6-4ed3-b785-ea960658995f';
    const body = JSON.stringify(payload);

    if (typeof globalThis.fetch === 'function') {
      globalThis
        .fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })
        .catch(() => {});
      return;
    }

    const http = require('http');
    const req = http.request(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      () => {}
    );
    req.on('error', () => {});
    req.write(body);
    req.end();
  } catch {
    // ignore
  }
}

module.exports = { agentLog };
