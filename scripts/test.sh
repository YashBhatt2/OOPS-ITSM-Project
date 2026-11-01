#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
case "${1:-unit}" in
  unit) exec mvn -pl domain test ;;
  integration)
    : "${TEST_DB_PASSWORD:?Set TEST_DB_PASSWORD for the isolated test database}"
    exec mvn -Pintegration verify
    ;;
  *) echo 'Usage: scripts/test.sh [unit|integration]' >&2; exit 2 ;;
esac
