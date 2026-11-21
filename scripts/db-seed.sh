#!/usr/bin/env bash
# Runs supabase/seed/*.sql in name order against the local DB (or SUPABASE_DB_URL).
set -euo pipefail
DB_URL="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
shopt -s nullglob
files=(supabase/seed/*.sql)
if [ ${#files[@]} -eq 0 ]; then echo "No seed files yet."; exit 0; fi
for f in "${files[@]}"; do
  echo "Seeding $f"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done
