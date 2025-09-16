# Troubleshooting — Proxy/HTTPS vs Backend HTTP

Observed error (example)
- HTTP/2 502 Bad Gateway from nginx when calling https://PUBLIC-HOST:3001/notes
- Indicates the upstream backend service on port 3001 was not reachable or protocol-mismatched.

Root causes to check
1) Backend not running or not listening on 0.0.0.0:3001.
   - Fix: Start backend: PORT=3001 HOST=0.0.0.0 npm start
   - Check: curl -sI http://localhost:3001/ | head -n1 -> HTTP/1.1 200 OK
2) Protocol mismatch (Node accidentally using HTTPS).
   - Fix: Ensure Node uses HTTP only. Remove any in-app TLS config/certs from Node.
   - Proxy expects HTTP upstream (proxy_pass http://127.0.0.1:3001).
3) Frontend calling http:// from an https:// page (mixed content).
   - Fix: Set REACT_APP_API_BASE=https://PUBLIC-HOST in frontend .env and rebuild.
4) CORS origin mismatch.
   - Fix: Set FRONTEND_ORIGIN=https://PUBLIC-HOST in backend env. Restart backend.

Validation via curl
- Direct HTTP (inside backend host/container):
  curl -sI http://localhost:3001/ | head -n1
- Through proxy/public HTTPS:
  curl -sIk https://PUBLIC-HOST/ | head -n1

If DB is not ready
- Backend can be started with ALLOW_START_WITHOUT_DB=true to test network/proxy path.
- Non-health routes may return 503 until DB is reachable.
