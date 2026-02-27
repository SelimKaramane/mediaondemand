#!/usr/bin/env bash
set -euo pipefail

PORT="${API_TEST_PORT:-4010}"
HOST="127.0.0.1"
READY_URL="http://${HOST}:${PORT}/api/epub"

cleanup() {
  if [[ -n "${DEV_PID:-}" ]]; then
    pkill -TERM -P "${DEV_PID}" 2>/dev/null || true
    kill -TERM -"${DEV_PID}" 2>/dev/null || kill -TERM "${DEV_PID}" 2>/dev/null || true
    wait "${DEV_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

NEXT_TELEMETRY_DISABLED=1 \
NEXT_PUBLIC_ALGOLIA_APP_ID="${NEXT_PUBLIC_ALGOLIA_APP_ID:-demo}" \
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY="${NEXT_PUBLIC_ALGOLIA_SEARCH_KEY:-demo}" \
CLOUDCONVERT_API_KEY="${CLOUDCONVERT_API_KEY:-demo}" \
npm run dev -- --hostname "${HOST}" --port "${PORT}" >/tmp/mediaondemand-api-test.log 2>&1 &
DEV_PID=$!

ready=0
for _ in $(seq 1 120); do
  code="$(curl -s -o /dev/null -w "%{http_code}" "${READY_URL}" || true)"
  if [[ "${code}" != "000" ]]; then
    ready=1
    break
  fi
  sleep 0.5
done

if [[ "${ready}" -ne 1 ]]; then
  echo "❌ API test server did not start in time."
  tail -n 80 /tmp/mediaondemand-api-test.log || true
  exit 1
fi

API_TEST_PORT="${PORT}" node --test tests/api.test.js
