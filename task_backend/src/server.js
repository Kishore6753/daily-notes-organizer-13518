const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const app = require('./app');
const { ensureDatabaseReady } = require('./db/bootstrap');

// Networking configuration
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';

// TLS configuration via environment variables
// Provide defaults to commonly used paths under ./certs directory
const TLS_CERT_PATH = process.env.TLS_CERT_PATH || path.join(__dirname, '..', 'certs', 'cert.pem');
const TLS_KEY_PATH = process.env.TLS_KEY_PATH || path.join(__dirname, '..', 'certs', 'key.pem');
// If set to "true", the server will log a prominent warning when falling back to HTTP
const TLS_WARN_ON_HTTP_FALLBACK = String(process.env.TLS_WARN_ON_HTTP_FALLBACK || 'true').toLowerCase() === 'true';

// Helper to detect if both cert and key are readable
function loadTlsCredentials() {
  try {
    const key = fs.readFileSync(TLS_KEY_PATH);
    const cert = fs.readFileSync(TLS_CERT_PATH);
    return { key, cert };
  } catch (e) {
    return null;
  }
}

// Start function that ensures DB is ready before binding server (HTTPS preferred)
async function start() {
  try {
    console.log('[Server] Ensuring database is ready (env, connectivity, schema)...');
    await ensureDatabaseReady();
    console.log('[Server] Database ready. Starting server...');
  } catch (e) {
    console.error('[Server] Failed to prepare database:', e && e.stack ? e.stack : e);
    process.exit(1);
  }

  const creds = loadTlsCredentials();
  let server;
  if (creds) {
    // HTTPS server
    server = https.createServer(
      {
        key: creds.key,
        cert: creds.cert,
        // Recommended security options (can be tuned further)
        // honorCipherOrder is default in modern Node; we set minimum TLS version
        minVersion: 'TLSv1.2',
      },
      app
    ).listen(PORT, HOST, () => {
      console.log(`[Server] HTTPS server listening on https://${HOST}:${PORT}`);
    });
  } else {
    // HTTP fallback
    if (TLS_WARN_ON_HTTP_FALLBACK) {
      console.warn('[Server] TLS certificate or key not found. Falling back to HTTP.');
      console.warn(`[Server] Expected TLS files at:\n  KEY : ${TLS_KEY_PATH}\n  CERT: ${TLS_CERT_PATH}`);
      console.warn('[Server] For production, provision valid certificates (e.g., via Let’s Encrypt). See README for instructions.');
    }
    server = http.createServer(app).listen(PORT, HOST, () => {
      console.log(`[Server] HTTP server listening on http://${HOST}:${PORT}`);
    });
  }

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing server');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  return server;
}

const server = start();
module.exports = server;
