#!/bin/sh
set -e
eval "$(npx supabase status -o env 2>/dev/null | grep -E '^(API_URL|ANON_KEY)=')"
case "$API_URL" in
  http://127.0.0.1*|http://localhost*) ;;
  *) echo "로컬 Supabase가 아님: $API_URL"; exit 1 ;;
esac
mkdir -p perf/results
for mode in single concurrent; do
  k6 run --quiet -e SUPABASE_URL="$API_URL" -e ANON_KEY="$ANON_KEY" -e MODE="$mode" perf/k6/sessions.js
done
