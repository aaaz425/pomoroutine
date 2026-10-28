# PomoRoutine — Claude Context

## 프로젝트 개요

포모도로 타이머 기반 학습 집중 도구. 집중 타이머 → 세션 기록 → 대시보드.
자세한 내용: `docs/specs/PRD.md`, `docs/specs/architecture-diagram.md`

## 기술 스택

- 웹: Next.js 16 App Router, Tailwind CSS, shadcn/ui, Recharts, framer-motion, Vercel Analytics, Speed Insights
- 앱: React Native, Expo Router, react-native-reanimated, react-native-webview
- 공통: Zustand, TanStack Query, Zod, date-fns
- 백엔드: Supabase Postgres, Auth, RLS, Edge Functions

## 모노레포 구조

pnpm workspace + Turborepo. `apps/web`(Next.js 웹 앱), `apps/mobile`(Expo 앱), `packages/shared`(`@pomoroutine/shared`, 두 앱이 공유하는 순수 로직). `docs/`, `supabase/`는 루트 공용 리소스. 앱의 통계와 기록 탭은 웹 `/embed/*` 화면을 WebView로 띄운다.

## 개발 명령어

```bash
pnpm dev          # 웹 로컬 개발 서버 (apps/web)
pnpm build        # 웹 프로덕션 빌드 — 사용자가 요청할 때만 실행
pnpm lint         # 전체 워크스페이스 린트
pnpm test         # 단위 테스트 (packages/shared + apps/web, vitest)
pnpm --filter mobile start   # Expo 개발 서버 (apps/mobile)
```

---

## 절대 규칙 (non-obvious — 코드만 봐서는 알 수 없는 것들)

### 작업 순서

- 새 기능 작업 시작 전 **반드시** `docs/roadmap.md`를 읽고 다음에 할 작업을 파악한다
- 파악한 내용을 사용자에게 제시하고 **승인을 받은 후** 브랜치를 생성한다
- 임의로 작업 범위를 결정하거나 브랜치를 생성하지 않는다
- 로드맵에 없는 작업은 사용자 지시를 따르고 로드맵에 추가하지 않는다 — 추가는 사용자가 요청할 때만
- 승인된 계획보다 간단한 구현이 보이면 그쪽을 택하고, 달라진 점은 커밋 요약 때 알린다

### 응답과 검증

- 사용자에게 쓰는 응답은 항상 한국어, 두괄식으로 짧게
- 선택지를 물을 때는 AskUserQuestion 대신 텍스트로 번호를 매긴다 — 한글 선택지가 깨져 보임
- `pnpm build`, 브라우저 자동화, 시뮬레이터 테스트는 사용자가 요청할 때만 — 단위 테스트와 타입체크는 직접 실행해도 됨
- 이미 켜진 dev 서버는 끄지 않는다
- 테스트는 깨지면 아픈 핵심 로직만 추가한다

### 웹과 모바일 동시 적용

- 기능 변경과 버그 수정은 `apps/web`과 `apps/mobile`에 **함께** 적용한다
- 두 앱이 같은 로직을 쓰면 각자 구현하지 말고 `packages/shared`로 옮긴다
- 리뷰나 조사도 한쪽만 보지 말고 두 앱을 같이 확인한다
- 앱 UI는 웹의 모바일 화면과 픽셀 단위로 동일하게 — 색상, 레이아웃, 컴포넌트 구성까지 1:1로 옮긴다

### Zustand

- Zustand에는 타이머 같은 클라이언트 상태만 둠 → Supabase에서 오는 서버 데이터는 TanStack Query로 조회
- `create()` 전역 싱글톤 **금지** → `createStore()` 팩토리 + `StoreProvider` 패턴 사용 (SSR 버그 방지)
- 컴포넌트에서 스토어 전체 구독 **금지** → slice 선택자 필수

```ts
// 금지
const store = useTimerStore((s) => s)
// 허용
const isRunning = useTimerStore((s) => s.startedAt !== null)
```

### localStorage

- 직접 파싱 **금지** → 반드시 Zod 스키마로 런타임 검증 후 사용
- SSR guard 필수: `typeof window === 'undefined'` 체크
- 파싱 실패 시 기본값 fallback (`try/catch` 필수)

### 타이머

- `setInterval` 카운트다운 방식 **금지** → 절대 시간 기반 계산 (백그라운드 탭 throttle 방지)

```ts
// 금지 — 백그라운드에서 드리프트 발생
remainingSeconds - 1
// 허용
targetSeconds - Math.floor((Date.now() - startedAt) / 1000)
```

- `visibilitychange` 이벤트로 탭 복귀 시 즉시 재계산

### 의존성 방향

- `app/ → components/ → lib/` 단방향만 허용
- `lib/`에서 `components/` 또는 `app/` import **금지**
- 인라인 타입 정의 금지 — 아래 위치에서만 import:
  - 도메인 인터페이스: `types/models.ts`
  - Zod 스키마/기본값: `types/schemas.ts`
  - 검증·비즈니스 상수: `lib/constants/limits.ts` 또는 `lib/constants` barrel
  - 카테고리 색상: `lib/constants/categoryColors.ts`
  - 타이머 페이즈 색상/라벨: `lib/constants/timerColors.ts`
  - `@/types`와 `@/lib/constants` barrel import도 허용 (re-export함)

### 코드 스타일

- 색상은 Tailwind 클래스만 사용, 인라인 `style={}` 금지
- 절대 경로 import 사용 (`@/components/...`), 상대 경로 금지
- shadcn/ui `components/ui/` 파일 직접 수정 금지 — 래퍼 컴포넌트 사용

### 주석

- **기본은 주석 없음** — 새 코드에는 주석을 달지 않는다
- 예외는 코드만 봐서는 절대 알 수 없는 제약뿐(외부 라이브러리 버그 우회 등), 그때도 1줄
- 단위/포맷 힌트(`// 분`, `// ISO 8601`)는 허용
- WHY 설명이 필요하면 코드 대신 대화나 PR 본문에 쓴다
- 코드를 고치다 기존 주석이 맞지 않게 되면 고쳐 쓰지 말고 지운다
- 커밋 전 `git diff | grep '^+.*//'`로 추가된 주석이 없는지 확인

### 보안

- `NEXT_PUBLIC_` 접두사는 브라우저에 완전히 노출됨 → **API 키에 절대 사용 금지**
- Claude API 키 등 모든 시크릿은 `.env.local`에만, `app/api/` 서버 사이드에서만 사용
- `.env.local` **절대 커밋 금지** — `.gitignore`에 있어도 `git add -f` 사용 금지
- API 라우트 응답은 필요한 필드만 추출해서 반환 — 외부 API 응답 원본을 클라이언트에 그대로 전달 금지
- `dangerouslySetInnerHTML` 사용 금지 — 사용자 입력을 HTML로 렌더링하는 경로 차단

### 원격 DB 반영

- `supabase db push`로 원격 DB에 반영하기 전에 **반드시** 사용자에게 알리고 승인을 받는다
- 먼저 `supabase db push --dry-run`으로 적용될 마이그레이션을 확인해 보여준다
- 컬럼 삭제처럼 배포된 코드를 깨는 마이그레이션은 새 코드 배포가 끝난 뒤에 push한다
- 마이그레이션은 로컬 Supabase(`supabase db reset`)에서 먼저 적용해 본다

### Verification (커밋 전)

- 타입체크와 린트는 pre-commit hook에 맡긴다 — `pnpm build`는 사용자가 요청할 때만 실행
- `lib/`, `store/`, `packages/shared` 변경 시 관련 단위 테스트 통과 확인
- UI 변경 시 다크/라이트 모드 양쪽 확인

---

## Git 워크플로우

> 1인 개발을 전제로 설계된 워크플로우. 작업 순서와 형식은 `docs/guides/commit-convention.md`가 원본

- **커밋할 때마다** 변경 내용을 요약해 보여주고 승인받은 뒤 커밋과 push를 한 세트로 진행, 브랜치명을 응답에 명시
- 브랜치 생성이나 계획을 승인받았어도 커밋 승인은 따로 받는다
- PR 생성 전 **반드시** feature 브랜치에서 rebase, PR과 squash merge는 각각 승인 후 Claude가 처리
- 커밋, PR, 문서에는 무엇을 바꿨는지만 쓰고 대화 속 의도나 대상 독자는 드러내지 않는다
- 커밋, PR, 문서, 로드맵 문구는 `docs/guides/commit-convention.md`의 문체 규칙을 따른다

### 로드맵 상태 관리 (docs/roadmap.md)

로드맵에 있는 작업일 때만 적용

- **브랜치 생성 시** → 해당 항목 `[ ]` → `[>]` 로 변경 후 feature 브랜치에 커밋
- **사용자 승인 후, squash merge 실행 전** → 해당 항목 `[>]` → `[x]` 로 변경 후 feature 브랜치에 커밋·push → 그 다음 merge
  - `[x]` 변경이 squash commit 안에 포함되어 PR 번호와 함께 main에 기록됨

---

## 하네스

| 위치 | 동작 |
|---|---|
| `.claude/settings.json` UserPromptSubmit | 로드맵의 진행 중 항목 표시 |
| `.claude/settings.json` Stop | git status와 로드맵 다음 작업 표시 |
| `.claude/hooks/check-pr-style.sh` | `gh pr create`, `gh pr edit` 명령에 중간점이 있으면 차단 |
| `lefthook.yml` | pre-commit 포맷, 웹 타입체크와 린트, 앱과 shared 타입체크, pre-push main 직접 push 차단 |
| `.github/workflows/` | PR마다 단위 테스트, e2e, 앱 타입체크와 린트 |

---

## 참조 문서

@docs/guides/glossary.md
@docs/guides/data-models.md
@docs/guides/conventions.md
@docs/guides/commit-convention.md
@docs/guides/testing.md

## 주요 결정사항

- AI API 없이도 완전히 작동 (Claude API는 MVP 이후 선택적 추가)
