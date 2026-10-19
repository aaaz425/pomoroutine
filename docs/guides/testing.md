---
version: 1.0
---

# 테스트

| 종류 | 도구 | 실행 |
|---|---|---|
| 단위 | Vitest | `pnpm test` — `packages/shared`와 `apps/web`을 함께 실행 |
| e2e | Playwright | PR마다 GitHub Actions에서 자동 실행, 로컬은 `pnpm test:e2e` |
| 모바일 | 없음 | CI에서 타입체크와 린트만 실행 — `.github/workflows/mobile-check.yml` |

## 단위 테스트

**대상**
- 브라우저 없이 돌아가는 순수 로직만 테스트, UI 컴포넌트는 제외
- `packages/shared` — 타이머 스토어, 작업과 설정의 낙관적 반영과 롤백, focusPeriods 정규화, 뱃지, 공유 카드, 방치 감지
- `apps/web/store` — 타이머 포트 주입한 저장과 복원
- `apps/web/lib` — localStorage 파싱 실패 처리, DB row 변환과 Zod 검증 실패 처리

**규칙**
- 테스트 파일은 대상 파일과 같은 폴더에 `*.test.ts`로 둠
- `lib/`, `store/`, `packages/shared`를 바꾸면 관련 테스트를 직접 실행해 확인 — pre-commit hook은 prettier, 타입체크, 린트만 돌리고 단위 테스트는 돌리지 않음

## e2e 테스트

| 파일 | 흐름 |
|---|---|
| `auth.setup.ts` | 테스트 계정으로 로그인해 storageState 저장, 나머지 스펙이 재사용 |
| `full-flow.spec.ts` | 작업 생성 → 타이머 → 기록 → 저널과 통계 반영 |
| `timer.spec.ts` | 시작, 일시정지, 종료 |
| `tasks.spec.ts` | 작업 생성과 타이머 연결 |
| `settings.spec.ts` | 카테고리와 동기부여 메시지 추가, 수정, 삭제 |
| `dashboard.spec.ts` | 통계 화면 렌더링과 탭 전환 |

**실행 환경**
- Chromium 하나로 실행, CI에서는 실패 시 2회 재시도
- 로컬은 3000번 포트에 서버가 떠 있으면 재사용하고, 없으면 dev 서버가 아닌 프로덕션 빌드로 띄움
- `.env.local`의 Supabase에 테스트 계정으로 접속해 실제 데이터를 만듦 — CI는 시크릿 `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` 사용
- 시작 화면의 타이머 값은 테스트 계정의 타이머 기본값을 따르므로 증감 버튼 횟수에 의존하지 말고 값을 직접 입력
