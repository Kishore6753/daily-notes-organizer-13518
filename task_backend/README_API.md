# Daily Notes Organizer — Backend API

Express-based REST API providing CRUD for Users, Tags, Notes, and search/filter endpoints.

Docs:
- Swagger UI: /docs
- OpenAPI JSON: Generate with `node generate_openapi.js` (writes to interfaces/openapi.json)

Environment variables (provided by orchestrator; do not hardcode):
- MYSQL_URL or
  - MYSQL_HOST
  - MYSQL_PORT
  - MYSQL_USER
  - MYSQL_PASSWORD
  - MYSQL_DB (or MYSQL_DATABASE)
- PORT (default 3001)
- HOST (default 0.0.0.0)

Protocol model:
- The API listens on HTTP only (no in-app TLS).
- Public HTTPS is terminated by a reverse proxy or cloud and forwarded to HTTP upstream.

Endpoints (summary):
- GET /               -> Health
- Users
  - GET /users
  - POST /users
  - GET /users/:id
  - PUT /users/:id
  - DELETE /users/:id
- Tags
  - GET /tags?q=
  - POST /tags
  - GET /tags/:id
  - PUT /tags/:id
  - DELETE /tags/:id
- Notes
  - GET /notes?user_id=&tag_ids=1,2&status=&priority=&archived=&q=&page=&pageSize=
  - POST /notes
  - GET /notes/:id
  - PUT /notes/:id
  - DELETE /notes/:id

Status and priority enums:
- status: not_started | in_progress | completed
- priority: low | moderate | high

Notes:
- All configuration is via environment variables.
- Database schema must exist (see task_database).
