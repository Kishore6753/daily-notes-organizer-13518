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

TLS (for HTTPS):
- TLS_CERT_PATH (default: `./certs/cert.pem`)
- TLS_KEY_PATH (default: `./certs/key.pem`)
- TLS_WARN_ON_HTTP_FALLBACK (default: `true`) — logs a prominent warning if TLS is not available and server falls back to HTTP

## HTTPS/TLS

This backend prefers HTTPS on startup:
- If both certificate and key files are present (`TLS_CERT_PATH`, `TLS_KEY_PATH`), the server listens with HTTPS on `PORT` (default 3001).
- If certs are missing, the server falls back to HTTP on the same port. A warning is logged by default (can be controlled via `TLS_WARN_ON_HTTP_FALLBACK`).

Default certificate locations:
- `task_backend/certs/cert.pem`
- `task_backend/certs/key.pem`

You may override these via env vars:
```
TLS_CERT_PATH=/absolute/or/relative/path/to/fullchain.pem
TLS_KEY_PATH=/absolute/or/relative/path/to/privkey.pem
```

Important:
- Self-signed certificates are acceptable for local development only and will trigger browser warnings. Do NOT use self-signed certs in production.
- For production, provision valid certificates from a trusted Certificate Authority (e.g., Let’s Encrypt).

### Provisioning Production TLS (Let’s Encrypt)

Option A: Terminate TLS at a reverse proxy (recommended)
- Put Nginx/Traefik/Caddy in front of the Node.js service.
- Obtain TLS via Let’s Encrypt (e.g., Certbot for Nginx) and proxy traffic to the Node app over HTTP (localhost:3001).
- Benefits: automatic renewal, centralized TLS, simpler Node configuration.

Option B: Terminate TLS in Node.js
- Use Certbot to obtain certificates on the host VM:
  - Typical paths:
    - `/etc/letsencrypt/live/<your-domain>/fullchain.pem`
    - `/etc/letsencrypt/live/<your-domain>/privkey.pem`
- Set:
  ```
  TLS_CERT_PATH=/etc/letsencrypt/live/<your-domain>/fullchain.pem
  TLS_KEY_PATH=/etc/letsencrypt/live/<your-domain>/privkey.pem
  ```
- Ensure the Node process user has read permissions to these files.
- Set up a renewal hook or restart process if needed after renewals (some setups can reload certs without restart).

Note: Always ensure your frontend calls the API via HTTPS to avoid mixed content issues.

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
```
FRONTEND_ORIGIN=https://vscode-internal-36885-beta.beta01.cloud.kavia.ai:3000
```

Note: Credentials are disabled (`credentials: false`) since this API does not use cookies. If you add cookie-based auth, set `credentials: true` and update the allowed origin to a specific URL (not `*`).

## Running

- Install: `npm install`
- Dev: `npm run dev` (nodemon)
- Prod: `npm start`

On startup, the backend:
- Validates DB env vars,
- Connects to MySQL,
- Ensures the schema exists (creates users, tags, notes, note_tags if missing),
- Seeds one demo user if no users exist (so you can POST /notes without creating a user first).

You can verify DB connectivity via:
- GET `/db/health` -> 200 OK when DB is reachable

The server binds to `HOST` and `PORT`:
- With TLS: `https://HOST:PORT`
- Without TLS: `http://HOST:PORT` (fallback; not for production)

Frontend integration:
- Ensure the frontend API base URL uses HTTPS. Example:
  ```
  API_BASE_URL=https://vscode-internal-36885-beta.beta01.cloud.kavia.ai:3001
  ```
- Using `http://...:3001` from a HTTPS page will be blocked by the browser as mixed content and show “Failed to fetch”.

Quick checks:
- Health (inside backend container):
  - HTTP: `curl -sI http://localhost:$PORT/ | head -n1`
  - HTTPS (if TLS provisioned): `curl -sIk https://localhost:$PORT/ | head -n1`
- Health (public):
  - `curl -sIk https://vscode-internal-36885-beta.beta01.cloud.kavia.ai:3001/ | head -n1`
- Notes POST (inside backend): `curl -s -X POST http://localhost:$PORT/notes -H 'Content-Type: application/json' --data '{"user_id":1,"title":"Test"}' -i`
  Note: Will return 500 if the database is not configured; this confirms route reachability and that DB is required.

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
