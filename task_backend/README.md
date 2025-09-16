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

The server binds to `HOST` and `PORT` and is reachable at `http://HOST:PORT`.

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
