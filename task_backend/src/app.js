const cors = require('cors');
const express = require('express');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../swagger');

// Initialize express app
const app = express();

/**
 * CORS configuration
 * - Uses FRONTEND_ORIGIN env var if provided, otherwise allows the known deployed frontend,
 *   and finally falls back to '*' for permissive development environments.
 * - Applied BEFORE any routes or parsers, and handles preflight for all endpoints.
 *
 * To configure a strict origin, set FRONTEND_ORIGIN in the environment (see README).
 */
const DEFAULT_FRONTEND = 'https://vscode-internal-36885-beta.beta01.cloud.kavia.ai:3000';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || DEFAULT_FRONTEND || '*';

const corsOptions = {
  origin: FRONTEND_ORIGIN === '*' ? '*' : [FRONTEND_ORIGIN, DEFAULT_FRONTEND],
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
  });
});

module.exports = app;
