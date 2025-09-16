const http = require('http');

const app = require('./app');
const { ensureDatabaseReady, checkConnection } = require('./db/bootstrap');

const crypto = require('crypto');

// Networking configuration
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';

// Allow starting server without DB for environments where DB isn't yet ready.
// When enabled, server starts and routes can check DB health and return 503 accordingly.
const ALLOW_START_WITHOUT_DB = String(process.env.ALLOW_START_WITHOUT_DB || '').toLowerCase() === 'true';

/**
 * Emit a concise summary of current runtime configuration for diagnostics.
 */
function logStartupSummary() {
  const env = process.env.NODE_ENV || 'development';
  const hasJwt = !!process.env.JWT_SECRET;
  const mysqlSource = process.env.MYSQL_URL ? 'MYSQL_URL' : 'parts';
  const mysqlVars = {
    MYSQL_URL: !!process.env.MYSQL_URL,
    MYSQL_HOST: !!process.env.MYSQL_HOST,
    MYSQL_PORT: process.env.MYSQL_PORT !== undefined,
    MYSQL_USER: process.env.MYSQL_USER !== undefined,
    MYSQL_PASSWORD: process.env.MYSQL_PASSWORD !== undefined,
    MYSQL_DB: !!process.env.MYSQL_DB || !!process.env.MYSQL_DATABASE,
  };

  console.log('[Init] Runtime summary:');
  console.log(`       NODE_ENV=${env}`);
  console.log(`       HOST=${HOST} PORT=${PORT}`);
  console.log(`       ALLOW_START_WITHOUT_DB=${ALLOW_START_WITHOUT_DB}`);
  console.log(`       JWT_SECRET: ${hasJwt ? 'present' : 'missing'}`);
  console.log(`       MySQL config source: ${mysqlSource}`);
  console.log('       MySQL vars presence:', mysqlVars);
}

/**
 * Ensure JWT secret exists; if missing in development, generate one and log it.
 * In production (NODE_ENV=production), we DO NOT auto-generate and will exit with an error.
 */
function ensureJwtSecret() {
  const env = process.env.NODE_ENV || 'development';
  let secret = process.env.JWT_SECRET;
  if (!secret) {
    if (env === 'production') {
      console.error('[Config] JWT_SECRET is missing and NODE_ENV=production. Aborting startup.');
      process.exit(1);
    }
    // Generate a random dev secret
    const suggested = `dev-${crypto.randomBytes(24).toString('hex')}`;
    process.env.JWT_SECRET = suggested;
    secret = suggested;
    console.warn('[Config] JWT_SECRET was not set. Generated a development secret automatically.');
    console.warn('[Config] NOTE: Set JWT_SECRET explicitly in production to keep tokens stable across restarts.');
  } else if (String(secret).startsWith('dev-')) {
    console.warn('[Config] Using a development-style JWT secret. Do not use dev secrets in production.');
  }
  return secret;
}

/**
 * Check presence of MySQL environment variables and emit actionable warnings.
 */
function checkMysqlEnv() {
  const missing = [];
  if (!process.env.MYSQL_URL) {
    if (!process.env.MYSQL_HOST) missing.push('MYSQL_HOST');
    if (process.env.MYSQL_PORT === undefined) missing.push('MYSQL_PORT');
    if (process.env.MYSQL_USER === undefined) missing.push('MYSQL_USER');
    if (process.env.MYSQL_PASSWORD === undefined) missing.push('MYSQL_PASSWORD');
    if (!process.env.MYSQL_DB && !process.env.MYSQL_DATABASE) missing.push('MYSQL_DB|MYSQL_DATABASE');
  }
  if (missing.length) {
    console.warn('[Config] MySQL environment appears incomplete:', missing.join(', '));
    console.warn('[Config] Provide MYSQL_URL or discrete MYSQL_* vars. See task_backend/README.md and .env.example guidance.');
  } else {
    console.log('[Config] MySQL environment variables detected.');
  }
  return missing;
}

/**
 * Start function that ensures config and DB are ready before binding server.
 * TLS is intentionally NOT handled here; HTTPS must be terminated by a reverse proxy (nginx/traefik/caddy).
 */
async function start() {
  logStartupSummary();

  // Validate/generate JWT secret first to avoid /login runtime failures
  const jwtSecret = ensureJwtSecret();

  // Check MySQL env presence
  const mysqlMissing = checkMysqlEnv();

  let dbReady = false;
  try {
    console.log('[Server] Ensuring database is ready (env, connectivity, schema)...');
    await ensureDatabaseReady();
    dbReady = true;
    console.log('[Server] Database ready.');
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
  app.locals.configSummary = {
    mysqlMissing,
    hasJwt: !!jwtSecret,
    allowStartWithoutDb: ALLOW_START_WITHOUT_DB,
  };

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
        console.log('[Server] Database connectivity restored; resuming normal operation.');
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
