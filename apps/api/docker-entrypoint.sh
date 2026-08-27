#!/bin/sh
set -eu

log() {
  printf '[entrypoint] %s\n' "$*"
}

fail() {
  printf '[entrypoint] ERROR: %s\n' "$*" >&2
  exit 1
}

parse_database_url() {
  if [ -z "${DATABASE_URL:-}" ]; then
    fail 'DATABASE_URL is not set'
  fi

  # Passwords may contain @ : / — parse with Node's URL, not sed.
  parsed=$(
    node -e '
      const raw = process.env.DATABASE_URL || "";
      let u;
      try { u = new URL(raw); } catch { process.exit(2); }
      if (u.protocol !== "mysql:") process.exit(2);
      if (!u.hostname) process.exit(2);
      process.stdout.write(u.hostname + " " + (u.port || "3306"));
    '
  ) || fail 'Could not parse host from DATABASE_URL'

  DB_HOST=${parsed%% *}
  DB_PORT=${parsed#* }

  if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
    fail "Could not parse host from DATABASE_URL"
  fi
}

wait_for_mysql() {
  parse_database_url
  log "Waiting for MySQL at ${DB_HOST}:${DB_PORT}..."

  attempts=0
  max_attempts=60
  while ! nc -z "$DB_HOST" "$DB_PORT" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge "$max_attempts" ]; then
      fail "MySQL not reachable at ${DB_HOST}:${DB_PORT} after ${max_attempts} attempts"
    fi
    sleep 2
  done

  log "MySQL TCP port is open"
}

run_migrations() {
  log 'Running migrations...'
  if ! node ./scripts/migrate.js; then
    fail 'migration:run failed — fix migrations or DATABASE_URL before restarting'
  fi
}

run_seed_if_requested() {
  if [ "${SEED_ON_BOOT:-0}" = '1' ] || [ "${SEED_ON_BOOT:-0}" = 'true' ]; then
    log 'SEED_ON_BOOT is enabled — running seed...'
    if ! node ./scripts/seed.js; then
      fail 'seed failed — fix seed script or disable SEED_ON_BOOT'
    fi
  else
    log 'SEED_ON_BOOT not set — skipping seed'
  fi
}

wait_for_mysql
run_migrations
run_seed_if_requested

log "Starting API: $*"
exec "$@"
