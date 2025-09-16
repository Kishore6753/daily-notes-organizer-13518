# Daily Notes Organizer — Backend (Express)

Express-based REST API providing CRUD for Users, Tags, and Notes, with search/filter endpoints and Swagger docs.

Quick links:
- Swagger UI: `/docs`
- OpenAPI JSON: generate with `node generate_openapi.js` (writes to `interfaces/openapi.json`)

## Environment Variables

Provided by orchestrator; do not hardcode in code. Create a `.env` locally if needed.

Database:
- MYSQL_URL or individual:
  - MYSQL_HOST
  - MYSQL_PORT
  - MYSQL_USER
  - MYSQL_PASSWORD
  - MYSQL_DB (or MYSQL_DATABASE)

Network:
- PORT (default 3001)
- HOST (default 0.0.0.0)
- FRONTEND_ORIGIN (recommended in prod; see CORS section)

## HTTPS/TLS Termination (Important)

This backend serves HTTP only and does NOT start an HTTPS server.

- HTTPS MUST be terminated at the reverse proxy/load balancer (e.g., Nginx/Traefik/Caddy/Cloud).
- The proxy should forward traffic to the Node app over plain HTTP (http://0.0.0.0:3001).
- Do not set TLS_CERT_PATH/TLS_KEY_PATH here; Node does not read TLS certs.
- If you enable TLS inside Node while the proxy expects HTTP, you will see 502 Bad Gateway from the proxy.

Sample Nginx (TLS termination with HTTP upstream):
server {
  listen 443 ssl http2;
  server_name your-domain.example.com;

  ssl_certificate     /etc/letsencrypt/live/your-domain/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain/privkey.pem;

  # Optional security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_pass http://127.0.0.1:3001;
  }
}

Why this matters:
- Centralized TLS simplifies ops and certificate rotation.
- Avoids filesystem/permission issues reading certs in Node.
- Prevents persistent 502s from protocol mismatch and “Failed to fetch” due to mixed content.

The server binds to `HOST` and `PORT`:
- Always HTTP: `http://HOST:PORT` (defaults: 0.0.0.0:3001)

Frontend integration:
- Your frontend must call the public HTTPS URL of the proxy. Example:
  REACT_APP_API_BASE=https://your-domain.example.com
- The proxy will forward to this backend over HTTP.

## CORS

CORS is enabled at the app level before any routes so the frontend can call all API endpoints (GET, POST, PUT, DELETE, PATCH, OPTIONS).

Configuration (in `src/app.js`):
- Allowed origin (strict by default):
  - Uses `FRONTEND_ORIGIN` if set (e.g., `https://your-frontend.example.com`)
  - Otherwise defaults to:
    `https://vscode-internal-36885-beta.beta01.cloud.kavia.ai:3000`
- Non-browser or server-to-server requests without an `Origin` header are allowed.
- Allowed methods: `GET, POST, PUT, DELETE, PATCH, OPTIONS`
- Allowed headers: `Content-Type, Authorization`
- Preflight (`OPTIONS`) handled globally: `app.options('*', cors(...))`

To set a strict origin in production, configure:
FRONTEND_ORIGIN=https://your-frontend.example.com

Note: Credentials are disabled (`credentials: false`) since this API does not use cookies. If you add cookie-based auth, set `credentials: true` and update the allowed origin to a specific URL (not `*`).

## Running

- Install: `npm install`
- Dev: `npm run dev` (nodemon)
- Prod: `npm start`

Startup behavior:
- By default, the server ensures DB readiness before binding to the port. If DB prep fails, the process exits.
- You can allow HTTP server to start even if the DB is not ready (for network/proxy testing) by setting:
  ALLOW_START_WITHOUT_DB=true
  In this mode, health endpoints work and DB-dependent routes may return 503 until the DB becomes reachable (then the server flips to ready state automatically).

On startup, the backend:
- Validates DB env vars,
- Connects to MySQL,
- Ensures the schema exists (creates users, tags, notes, note_tags if missing),
- Seeds one demo user if no users exist (so you can POST /notes without creating a user first).

You can verify DB connectivity via:
- GET `/db/health` -> 200 OK when DB is reachable

Quick checks:
- Start (degraded mode for HTTP-only/proxy testing):
  - `PORT=3001 HOST=0.0.0.0 ALLOW_START_WITHOUT_DB=true npm start`
- Health (inside backend container):
  - HTTP: `curl -sI http://localhost:$PORT/ | head -n1`
- Health (through proxy/public):
  - `curl -sIk https://your-domain.example.com/ | head -n1`
- Notes POST (inside backend):
  - `curl -s -X POST http://localhost:$PORT/notes -H 'Content-Type: application/json' --data '{"user_id":1,"title":"Test"}' -i`
  Note: Will return 503 if database is not ready (degraded mode) or 500 if a DB error occurs; this confirms route reachability and that DB is required.

## Endpoints (summary)

- GET `/` -> Health
- Users
  - GET `/users`
  - POST `/users`
  - GET `/users/:id`
  - PUT `/users/:id`
  - DELETE `/users/:id`
- Tags
  - GET `/tags?q=`
  - POST `/tags`
  - GET `/tags/:id`
  - PUT `/tags/:id`
  - DELETE `/tags/:id`
- Notes
  - GET `/notes?user_id=&tag_ids=1,2&status=&priority=&archived=&q=&page=&pageSize=`
  - POST `/notes`
  - GET `/notes/:id`
  - PUT `/notes/:id`
  - DELETE `/notes/:id`

Status and priority enums:
- status: `not_started | in_progress | completed`
- priority: `low | moderate | high`

Notes:
- All configuration is via environment variables.
- Database schema must exist (see task_database).
