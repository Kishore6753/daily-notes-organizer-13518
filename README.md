# Daily Notes Organizer — Project Overview and Infrastructure Guide

This repository contains a simple to-do app with:
- task_backend (Express API)
- task_frontend (React UI)
- task_database (MySQL)

Critical infrastructure model for reliable HTTP/HTTPS behavior:
1) Backend (Node/Express) must run over plain HTTP only, bound to HOST:PORT (default 0.0.0.0:3001). Do not enable in-app TLS in Node.
2) Public HTTPS is terminated by the reverse proxy/cloud/preview system (e.g., Nginx, Traefik, Cloud LB). The proxy forwards requests to the backend over HTTP.
3) Frontend must call the API via the public HTTPS URL of the proxy (REACT_APP_API_BASE=https://...), not http://.
4) Mixing HTTP and HTTPS or turning on TLS inside Node causes persistent “Failed to fetch” (browser mixed content/CORS) and 502 Bad Gateway from the proxy.

Quick links
- Backend Swagger UI (proxied): https://YOUR-PUBLIC-HOST:PORT/docs
- Backend OpenAPI JSON: generate inside backend with `node generate_openapi.js` (writes to task_backend/interfaces/openapi.json)

Repository layout
- task_backend/ (Express API)
- task_frontend/ (React UI) — ensure .env uses REACT_APP_API_BASE=https://YOUR-PUBLIC-HOST[:PORT]
- task_database/ (MySQL schema/data) — managed via env variables

Infrastructure model in detail
- Node backend: HTTP only, listen on 0.0.0.0:3001. No tls.createServer, no certs in Node.
- Reverse proxy / Cloud: Listens on 443 (HTTPS), holds certificates, forwards upstream to http://backend:3001 (or 127.0.0.1:3001).
- Frontend: Runs on HTTPS (public) and calls the API at the public HTTPS origin (the proxy). Never point the frontend at http:// when the page is served over https://.

Sample Nginx config (TLS termination + HTTP upstream)
server {
  listen 443 ssl http2;
  server_name your-domain.example.com;

  ssl_certificate     /etc/letsencrypt/live/your-domain/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain/privkey.pem;

  # Optional security headers (adjust as needed)
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_pass http://127.0.0.1:3001;
  }
}

Frontend .env (example)
# The public HTTPS URL where users access the site/proxy
REACT_APP_API_BASE=https://your-domain.example.com

Local development (without TLS)
- Backend: PORT=3001 HOST=0.0.0.0 npm run dev
- Frontend: set REACT_APP_API_BASE=http://localhost:3001 if both frontend and backend run locally over HTTP.
- Do not use HTTPS locally for the backend; if you need HTTPS locally, terminate TLS at a local reverse proxy that forwards to http://localhost:3001.

Why “Failed to fetch” and 502 happen
- Browser mixed content: If the page is https:// but API calls target http://, browsers block with “Failed to fetch”.
- In-app TLS enabled in Node: If the proxy expects HTTP upstream but Node is speaking HTTPS, the proxy can return 502 Bad Gateway; the reverse also fails.
- Wrong base URL: If REACT_APP_API_BASE points to http:// from an https:// page, or points to an unreachable host/port, requests fail.

Troubleshooting checklist
1) Confirm backend listens on HTTP only:
   - curl -sI http://localhost:3001/ | head -n1  -> Expect HTTP/1.1 200 OK
2) Confirm proxy forwards HTTPS -> HTTP upstream:
   - curl -sIk https://your-domain.example.com/ | head -n1 -> Expect HTTP/2 200
3) Check CORS: FRONTEND_ORIGIN should match your public frontend URL (see backend README).
4) Verify frontend env:
   - REACT_APP_API_BASE=https://your-domain.example.com
   - Rebuild/restart frontend after changes to .env.
5) Avoid custom certs inside Node: do not mount TLS certs/keys for the Express app.

Pointers
- See task_backend/README.md for backend env, CORS, and startup options.
- See task_frontend/README_PROXY_AND_ENV.md (added) for frontend .env examples and proxy notes.
