const app = require('./app');
const { ensureDatabaseReady } = require('./db/bootstrap');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Start function that ensures DB is ready before binding HTTP server
async function start() {
  try {
    console.log('[Server] Ensuring database is ready (env, connectivity, schema)...');
    await ensureDatabaseReady();
    console.log('[Server] Database ready. Starting HTTP server...');
  } catch (e) {
    console.error('[Server] Failed to prepare database:', e && e.stack ? e.stack : e);
    // Don't proceed to start server without DB since routes depend on it
    process.exit(1);
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running and listening on ${HOST}:${PORT} (external access likely via https on mapped port)`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  return server;
}

const server = start();

module.exports = server;
