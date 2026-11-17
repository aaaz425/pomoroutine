#!/bin/sh
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0

input=$(cat)
tool=$(printf '%s' "$input" | grep -o '"tool_name" *: *"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')

block() {
  echo "클라우드 실행에서 $1 차단 — CLAUDE.md 무인 실행 규칙에 따라 draft PR까지만 진행" >&2
  exit 2
}

case "$tool" in
  Bash)
    command=$(printf '%s' "$input" | grep -o '"command" *: *"\([^"\\]\|\\.\)*"')
    printf '%s' "$command" | grep -Eq 'gh +pr +merge|gh +api[^|;&]*/merge' && block "PR merge"
    printf '%s' "$command" | grep -Eq 'git +push[^|;&]*([ :+]main([ "]|$)|HEAD:main)' && block "main push"
    ;;
  mcp__github__merge_pull_request)
    block "PR merge"
    ;;
  mcp__github__create_or_update_file | mcp__github__push_files | mcp__github__delete_file)
    printf '%s' "$input" | grep -Eq '"branch" *: *"claude/' || block "claude/ 외 브랜치 직접 커밋"
    ;;
esac
exit 0
