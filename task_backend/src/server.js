const http = require('http');

const app = require('./app');
const { ensureDatabaseReady, checkConnection } = require('./db/bootstrap');

// Networking configuration
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';

// Allow starting server without DB for environments where DB isn't yet ready.
// When enabled, server starts and routes can check DB health and return 503 accordingly.
const ALLOW_START_WITHOUT_DB = String(process.env.ALLOW_START_WITHOUT_DB || '').toLowerCase() === 'true';

/**
 * Start function that ensures DB is ready before binding server.
 * TLS is intentionally NOT handled here; HTTPS must be terminated by a reverse proxy (nginx/traefik/caddy).
 */
async function start() {
  let dbReady = false;
  try {
    console.log('[Server] Ensuring database is ready (env, connectivity, schema)...');
    await ensureDatabaseReady();
    dbReady = true;
    console.log('[Server] Database ready. Starting HTTP server...');
  } catch (e) {
    console.error('[Server] Failed to prepare database:', e && e.stack ? e.stack : e);
    if (!ALLOW_START_WITHOUT_DB) {
      process.exit(1);
    } else {
      console.warn('[Server] ALLOW_START_WITHOUT_DB=true -> continuing to start HTTP server in degraded mode.');
    }
  }

  // Expose a simple flag and middleware to indicate degraded mode if DB is not ready
  app.locals.dbReady = dbReady;
  app.use(async (req, res, next) => {
    // Only block if DB-dependent routes and DB is not ready
    if (!app.locals.dbReady) {
      const healthPaths = new Set(['/', '/db/health', '/docs']);
      if (!healthPaths.has(req.path)) {
        const status = await checkConnection();
        if (!status.ok) {
          return res.status(503).json({ status: 'error', message: 'Database not ready', details: status.error || undefined });
        }
        // If DB becomes ready during runtime, flip the flag
        app.locals.dbReady = true;
      }
    }
    return next();
  });

  const server = http.createServer(app).listen(PORT, HOST, () => {
    console.log(`[Server] HTTP server listening on http://${HOST}:${PORT}`);
    if (!app.locals.dbReady) {
      console.log('[Server] Running in degraded mode: DB not ready. Non-health routes may return 503 until DB is reachable.');
    }
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
