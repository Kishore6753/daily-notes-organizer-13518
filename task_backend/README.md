# Daily Notes Organizer — Backend (Express)

Express-based REST API providing CRUD for Users, Tags, and Notes, with search/filter endpoints and Swagger docs.

Quick links:
- Swagger UI: `/docs`
- OpenAPI JSON: generate with `node generate_openapi.js` (writes to `interfaces/openapi.json`)

## Environment Variables

Provided by orchestrator; do not hardcode in code. Create a `.env` locally if needed.

- MYSQL_URL or individual:
  - MYSQL_HOST
  - MYSQL_PORT
  - MYSQL_USER
  - MYSQL_PASSWORD
  - MYSQL_DB (or MYSQL_DATABASE)
- PORT (default 3000)
- HOST (default 0.0.0.0)
- FRONTEND_ORIGIN (optional; see CORS section)

## CORS

CORS is enabled at the app level before any routes so the frontend can call all API endpoints (GET, POST, PUT, DELETE, PATCH, OPTIONS).

Configuration (in `src/app.js`):
- Allowed origin:
  - Uses `FRONTEND_ORIGIN` if set (e.g., `https://your-frontend.example.com`)
  - Otherwise allows the known deployed frontend:
    `https://vscode-internal-36885-beta.beta01.cloud.kavia.ai:3000`
  - In development, it effectively falls back to `*` if no origin is provided.
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

The server binds to `HOST` and `PORT` and listens over HTTP at `http://HOST:PORT`.

Important: In the cloud environment, public access is via HTTPS with TLS terminated by the platform’s proxy. This means:
- Internally (from within the backend/container network), use HTTP, e.g., `http://localhost:3001`.
- Externally (from the browser/frontend), use HTTPS, e.g., `https://vscode-internal-36885-beta.beta01.cloud.kavia.ai:3001`.

Frontend integration:
- Ensure the frontend API base URL uses HTTPS, not HTTP. Example:
  API_BASE_URL=https://vscode-internal-36885-beta.beta01.cloud.kavia.ai:3001
- Using `http://...:3001` from a HTTPS page will be blocked by the browser as mixed content and show “Failed to fetch”.

Quick checks:
- Health (inside backend container): `curl -sI http://localhost:$PORT/ | head -n1` -> `HTTP/1.1 200 OK`
- Health (public): `curl -sIk https://vscode-internal-36885-beta.beta01.cloud.kavia.ai:3001/ | head -n1` -> `HTTP/2 200`
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
