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
 * Ensure JWT secret exists; if missing in development, generate one and log it.
 * In production (NODE_ENV=production), we DO NOT auto-generate and will exit with an error.
 */
function ensureJwtSecret() {
  const env = process.env.NODE_ENV || 'development';
  let secret = process.env.JWT_SECRET;
  if (!secret) {
    if (env === 'production') {
      console.error('[Config] JWT_SECRET is missing and NODE_ENV=production. /login will fail. Aborting startup.');
      process.exit(1);
    }
    // Generate a random dev secret
    const suggested = `dev-${require('crypto').randomBytes(24).toString('hex')}`;
    process.env.JWT_SECRET = suggested;
    secret = suggested;
    console.warn('[Config] JWT_SECRET was not set. Generated a development secret automatically.');
    console.warn('[Config] NOTE: Set JWT_SECRET explicitly in production to avoid invalidating tokens on restarts.');
  }
  return secret;
}

/**
 * Start function that ensures config and DB are ready before binding server.
 * TLS is intentionally NOT handled here; HTTPS must be terminated by a reverse proxy (nginx/traefik/caddy).
 */
async function start() {
  // Validate/generate JWT secret first to avoid /login runtime failures
  const jwtSecret = ensureJwtSecret();

  // Log DB env presence to help diagnose failures
  const hasMysqlUrl = !!process.env.MYSQL_URL;
  const hasParts =
    !!process.env.MYSQL_HOST &&
    !!(process.env.MYSQL_DB || process.env.MYSQL_DATABASE) &&
    process.env.MYSQL_USER !== undefined &&
    process.env.MYSQL_PORT !== undefined;

  if (!hasMysqlUrl && !hasParts) {
    console.warn('[Config] MySQL configuration appears incomplete. Set MYSQL_URL or MYSQL_HOST/PORT/USER/PASSWORD/DB.');
    console.warn('[Config] Backend will likely fail for DB-dependent routes (e.g., /login, /notes). See task_backend/.env.example.');
  }

  let dbReady = false;
  try {
    console.log('[Server] Ensuring database is ready (env, connectivity, schema)...');
    await ensureDatabaseReady();
    dbReady = true;
    console.log('[Server] Database ready. Starting HTTP server...');
  } catch (e) {
    console.error('[Server] Failed to prepare database:', e && e.stack ? e.stack : e);
    if (!ALLOW_START_WITHOUT_DB) {
      console.error('[Server] Set ALLOW_START_WITHOUT_DB=true to start HTTP server in degraded mode for network/proxy testing.');
      process.exit(1);
    } else {
      console.warn('[Server] ALLOW_START_WITHOUT_DB=true -> continuing to start HTTP server in degraded mode.');
      console.warn('[Server] /login and other DB-backed endpoints will return 503 until DB connectivity is fixed.');
    }
  }

  // Expose flags for downstream middlewares/health
  app.locals.dbReady = dbReady;
  app.locals.jwtReady = !!jwtSecret;

  // Middleware to surface degraded DB state with 503 for non-health routes
  app.use(async (req, res, next) => {
    if (!app.locals.dbReady) {
      const healthPaths = new Set(['/', '/db/health', '/docs']);
      if (!healthPaths.has(req.path)) {
        const status = await checkConnection();
        if (!status.ok) {
          return res.status(503).json({
            status: 'error',
            message: 'Database not ready',
            details: status.error || undefined,
          });
        }
        // DB became available during runtime
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
