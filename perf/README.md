# perf

로컬 Supabase에서만 돌리는 성능 측정 스크립트, 결과 해석은 `docs/perf/sessions-baseline.md`

| 스크립트 | 명령 | 내용 |
|---|---|---|
| `seed/seed-sessions.mjs` | `pnpm perf:seed` | 측정 계정 3개에 기록 100건, 1천 건, 1만 건 시드 |
| `k6/sessions.js` | `pnpm perf:k6` | 전체, 범위, 페이지 조회와 RPC 요약 응답 시간과 크기 |
| `apps/web/tests/perf/` | `pnpm --filter web perf:flow` | 통계, 기록 화면 흐름의 Supabase 요청 수, 바이트, 중복, 표시 시간 |

- 측정 계정 비밀번호는 `perf1234`
- 시드와 측정 모두 Supabase URL이 로컬이 아니면 중단
- 결과 JSON은 `perf/results/`, gitignore
