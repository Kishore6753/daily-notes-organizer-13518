const http = require('http');

const app = require('./app');
const { ensureDatabaseReady } = require('./db/bootstrap');

// Networking configuration
const PORT = Number(process.env.PORT || 3001);
// Force binding to 0.0.0.0 unless explicitly overridden, but default is 0.0.0.0
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Start function that ensures DB is ready before binding server.
 * TLS is intentionally NOT handled here; HTTPS must be terminated by a reverse proxy (nginx/traefik/caddy).
 */
async function start() {
  try {
    console.log('[Server] Ensuring database is ready (env, connectivity, schema)...');
    await ensureDatabaseReady();
    console.log('[Server] Database ready. Starting HTTP server...');
  } catch (e) {
    console.error('[Server] Failed to prepare database:', e && e.stack ? e.stack : e);
    process.exit(1);
  }

  const server = http.createServer(app).listen(PORT, HOST, () => {
    console.log(`[Server] HTTP server listening on http://${HOST}:${PORT}`);
  });

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
