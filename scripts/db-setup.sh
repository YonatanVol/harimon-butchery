#!/usr/bin/env bash
# Creates the local development and test databases and checks Hebrew collation support.
# Requires Homebrew PostgreSQL 17:  brew install postgresql@17 && brew services start postgresql@17
set -euo pipefail

export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"

if ! pg_isready -q; then
  echo "Postgres is not running. Start it with: brew services start postgresql@17" >&2
  exit 1
fi

for db in meatstore_dev meatstore_test; do
  if psql -lqt | cut -d '|' -f 1 | grep -qw "$db"; then
    echo "✓ $db already exists"
  else
    createdb "$db"
    echo "✓ created $db"
  fi
done

if psql -d meatstore_dev -Atc "SELECT 1 FROM pg_collation WHERE collname = 'he-IL-x-icu'" | grep -q 1; then
  echo "✓ Hebrew ICU collation he-IL-x-icu is available"
else
  echo "✗ Collation he-IL-x-icu is missing — Hebrew sorting will be wrong. See docs/adr/0001-hebrew-collation.md" >&2
  exit 1
fi
