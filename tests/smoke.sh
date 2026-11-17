#!/usr/bin/env bash
# Afterlife BBS — smoke test.
# Starts a local HTTP server, curls the homepage and every key file,
# then stops the server. Exits non-zero on any failure.
set -u
cd "$(dirname "$0")/.." || exit 1

PORT="${SMOKE_PORT:-8123}"
BASE="http://127.0.0.1:${PORT}"
FAIL=0

python3 -m http.server "${PORT}" --bind 127.0.0.1 >/tmp/afterlife-smoke.log 2>&1 &
SERVER_PID=$!
trap 'kill "${SERVER_PID}" 2>/dev/null || true' EXIT

# Wait for the server to answer (up to ~5s).
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fs -o /dev/null "${BASE}/" 2>/dev/null; then break; fi
  sleep 0.5
done

check() { # check <path> <must-contain-or-empty>
  local path="$1" needle="${2:-}"
  local code
  code="$(curl -s -o /tmp/afterlife-smoke-body.txt -w '%{http_code}' "${BASE}${path}")"
  if [ "${code}" != "200" ]; then
    echo "FAIL  ${path} -> HTTP ${code} (expected 200)"
    FAIL=1
    return
  fi
  if [ -n "${needle}" ] && ! grep -qF "${needle}" /tmp/afterlife-smoke-body.txt; then
    echo "FAIL  ${path} -> 200 but missing expected text: ${needle}"
    FAIL=1
    return
  fi
  echo "PASS  ${path} -> 200"
}

check "/" "Afterlife BBS"
check "/index.html" "Afterlife BBS"
check "/styles.css" "phosphor"
check "/app.js" "toggleCandle"
check "/data/seed.json" "town-square"
check "/data/seed-marlowe.json" "Marlowe House"
check "/manifest.json" "Afterlife BBS"
check "/sw.js" "afterlife-bbs-v2"
check "/favicon.svg" "<svg"

if [ "${FAIL}" -ne 0 ]; then
  echo "SMOKE FAILED — see /tmp/afterlife-smoke.log"
  exit 1
fi
echo "SMOKE OK — homepage 200, all key files present."
