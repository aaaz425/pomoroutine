#!/bin/sh
command=$(jq -r '.tool_input.command // empty')

case "$command" in
  *"gh pr create"* | *"gh pr edit"*) ;;
  *) exit 0 ;;
esac

if printf '%s' "$command" | grep -q '·'; then
  echo "PR 제목이나 본문에 중간점 · 이 있음 — 쉼표나 줄바꿈으로 바꾸고 docs/guides/commit-convention.md PR 문체 규칙을 다시 확인" >&2
  exit 2
fi
