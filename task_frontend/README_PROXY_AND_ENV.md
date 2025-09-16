# Frontend — API Base URL and Proxy/TLS Guidance

This frontend talks to the backend API through a reverse proxy/cloud that terminates HTTPS. To avoid mixed content and 502s, follow these rules:

Core rules
1) Backend (Node/Express) runs over plain HTTP on 0.0.0.0:3001. No HTTPS inside Node.
2) Public HTTPS endpoint is at the reverse proxy/cloud. The proxy forwards to the backend over HTTP.
3) Frontend must call the API via the public HTTPS URL (REACT_APP_API_BASE=https://...), not http://, when the app itself is loaded over https://.

Environment variables
- Create or update .env in task_frontend with:
  REACT_APP_API_BASE=https://your-domain.example.com

- Local development (all-HTTP dev):
  If you serve the frontend via http://localhost:3000 and run backend at http://localhost:3001, then:
  REACT_APP_API_BASE=http://localhost:3001

Note: Whenever .env changes, restart the dev server/build so the variable is picked up.

Common symptoms and fixes
- “Failed to fetch” in browser console:
  - Likely mixed content (frontend is https:// but REACT_APP_API_BASE is http://). Fix: switch to https:// public URL.
  - Could also be CORS if FRONTEND_ORIGIN is not configured on backend to match the public frontend URL.
- HTTP 502 from proxy:
  - Proxy may be configured to forward HTTP to an upstream that is actually speaking HTTPS (because Node was incorrectly set to use TLS). Ensure Node is HTTP-only and proxy_pass is http://.

Sample Nginx reverse proxy (HTTPS termination -> HTTP backend)
server {
  listen 443 ssl http2;
  server_name your-domain.example.com;

  ssl_certificate     /etc/letsencrypt/live/your-domain/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain/privkey.pem;

  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_pass http://backend:3001; # or 127.0.0.1:3001
  }
}

Backend CORS (reference)
- The backend expects FRONTEND_ORIGIN to match your public frontend URL. Example:
  FRONTEND_ORIGIN=https://your-domain.example.com

Verification steps
1) curl -sI http://localhost:3001/ | head -n1 -> HTTP/1.1 200 OK (backend reachable over HTTP)
2) curl -sIk https://your-domain.example.com/ | head -n1 -> HTTP/2 200 (proxy forwarding works)
3) Browser network tab: requests go to https://your-domain.example.com/... (not http://)
