#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
: "${DB_PASSWORD:?Set DB_PASSWORD for PostgreSQL}"
mvn -DskipTests package
exec java -jar backend/target/itsm-backend-0.1.0-SNAPSHOT.jar
