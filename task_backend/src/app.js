const cors = require('cors');
const express = require('express');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger');

/**
 * Note on protocol:
 * - This Express app runs over HTTP internally.
 * - In the deployed environment, HTTPS is terminated by an upstream proxy/load balancer.
 * - From browsers, always call the API over HTTPS on the public URL/port.
 */
const app = express();

/**
 * CORS configuration
 * - Uses FRONTEND_ORIGIN env var if provided, otherwise allows the known deployed frontend.
 * - For non-browser or server-to-server requests (no Origin header), allow.
 * - Applied BEFORE any routes or parsers, and handles preflight for all endpoints.
 *
 * To configure a strict origin, set FRONTEND_ORIGIN in the environment (see README).
 */
const DEFAULT_FRONTEND = 'https://vscode-internal-36885-beta.beta01.cloud.kavia.ai:3000';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || DEFAULT_FRONTEND;

// Build allowed origins list (unique, non-empty strings)
const allowedOrigins = Array.from(
  new Set(
    [FRONTEND_ORIGIN, DEFAULT_FRONTEND]
      .filter(Boolean)
  )
);

/**
 * Dynamic origin validator:
 * - If no origin provided (e.g., curl, server-to-server), allow.
 * - If origin matches allowed list, allow and echo it back so the browser accepts it.
 * - Otherwise, block with an error.
 */
const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      // Non-browser requests or same-origin without Origin header -> allow
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false, // no cookies used by this API; set true if auth cookies are added later
  optionsSuccessStatus: 204,
};

// Apply CORS globally before any routes
app.use(cors(corsOptions));
// Explicitly handle preflight across all routes
app.options('*', cors(corsOptions));

app.set('trust proxy', true);
app.use('/docs', swaggerUi.serve, (req, res, next) => {
  const host = req.get('host');           // may or may not include port
  let protocol = req.protocol;            // http or https

  const actualPort = req.socket.localPort;
  const hasPort = host.includes(':');

  const needsPort =
    !hasPort &&
    ((protocol === 'http' && actualPort !== 80) ||
     (protocol === 'https' && actualPort !== 443));
  const fullHost = needsPort ? `${host}:${actualPort}` : host;
  protocol = req.secure ? 'https' : protocol;

  const dynamicSpec = {
    ...swaggerSpec,
    servers: [
      {
        url: `${protocol}://${fullHost}`,
      },
    ],
  };
  swaggerUi.setup(dynamicSpec)(req, res, next);
});

// Parse JSON request body
app.use(express.json());

// Mount routes
app.use('/', routes);

// Error handling middleware (includes CORS errors)
app.use((err, req, res, next) => {
  const isCorsError = err && /CORS/i.test(String(err.message || ''));
  if (isCorsError) {
    return res.status(403).json({
      status: 'error',
      message: err.message,
    });
  }
  console.error(err.stack || err);
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
  });
});

module.exports = app;
