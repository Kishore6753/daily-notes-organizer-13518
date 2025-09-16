#!/usr/bin/env bash
# Non-interactive test script for /signup and /login against HTTP backend
# Usage: HOST=localhost PORT=3001 ./test_auth.sh

set -euo pipefail

HOST="${HOST:-localhost}"
PORT="${PORT:-3001}"
BASE="http://${HOST}:${PORT}"

echo "Testing /db/health..."
set +e
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/db/health")
set -e
echo "db/health status: ${HEALTH}"

echo "Signup (may return 409 if already exists)..."
curl -s -i -X POST "${BASE}/signup" \
  -H "Content-Type: application/json" \
  --data '{"name":"Test User","email":"testuser@example.com","password":"testpass123"}' | sed -n '1,20p'

echo ""
echo "Login..."
curl -s -i -X POST "${BASE}/login" \
  -H "Content-Type: application/json" \
  --data '{"email":"testuser@example.com","password":"testpass123"}' | sed -n '1,40p'

echo ""
echo "Done."
