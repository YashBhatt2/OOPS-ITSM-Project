#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
: "${DB_PASSWORD:?Set DB_PASSWORD for PostgreSQL}"

intelligence_pid=
backend_pid=
cleanup() {
  trap - EXIT INT TERM
  for pid in "$backend_pid" "$intelligence_pid"; do
    if [ -n "$pid" ]; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [ ! -x intelligence/.venv/bin/python ]; then
  if [ -n "${PYTHON:-}" ]; then
    python_command=$PYTHON
  else
    python_command=
    for candidate in python3.13 python3.12 python3.11 python3; do
      if command -v "$candidate" >/dev/null 2>&1; then
        python_command=$candidate
        break
      fi
    done
  fi
  : "${python_command:?Install Python 3.11–3.13 or set PYTHON to its executable}"
  "$python_command" -m venv intelligence/.venv
fi

python_bin="$PWD/intelligence/.venv/bin/python"
requirements_stamp=intelligence/.venv/installed-requirements.txt
if ! cmp -s intelligence/requirements.txt "$requirements_stamp" ||
   ! "$python_bin" -c 'import fastapi, uvicorn, pydantic_settings, sklearn, numpy' 2>/dev/null; then
  "$python_bin" -m pip install -r intelligence/requirements.txt
  cp intelligence/requirements.txt "$requirements_stamp"
fi

mvn -DskipTests package

INTELLIGENCE_PORT=${INTELLIGENCE_PORT:-8000}
export INTELLIGENCE_URL="http://127.0.0.1:$INTELLIGENCE_PORT"
# Both processes inherit the same optional token, including an explicitly empty one.
export INTELLIGENCE_TOKEN=${INTELLIGENCE_TOKEN:-}

echo "Starting intelligence service at $INTELLIGENCE_URL"
(
  cd intelligence
  exec "$python_bin" -m uvicorn app.main:app --host 127.0.0.1 --port "$INTELLIGENCE_PORT"
) &
intelligence_pid=$!

attempt=0
while :; do
  if ! kill -0 "$intelligence_pid" 2>/dev/null; then
    echo "Intelligence service failed to start. Check its output above and whether port $INTELLIGENCE_PORT is already in use." >&2
    exit 1
  fi
  if "$python_bin" -c 'import os, urllib.request; r = urllib.request.urlopen(os.environ["INTELLIGENCE_URL"] + "/health", timeout=1); raise SystemExit(0 if r.status == 200 else 1)' 2>/dev/null; then
    # Let an unsuccessful bind exit before accepting another service's health response.
    sleep 1
    if kill -0 "$intelligence_pid" 2>/dev/null; then
      break
    fi
  fi
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    echo "Intelligence service did not become healthy. Check its output above." >&2
    exit 1
  fi
  sleep 1
done

echo "Intelligence service ready. Starting Spring Boot. Press Ctrl+C to stop both services."
java -jar backend/target/itsm-backend-0.1.0-SNAPSHOT.jar &
backend_pid=$!

while kill -0 "$backend_pid" 2>/dev/null; do
  if ! kill -0 "$intelligence_pid" 2>/dev/null; then
    echo "Intelligence service stopped unexpectedly; shutting down Spring Boot." >&2
    exit 1
  fi
  sleep 1
done

if wait "$backend_pid"; then
  exit 0
else
  exit "$?"
fi
