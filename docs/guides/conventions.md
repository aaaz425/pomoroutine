# 컨벤션

절대 규칙은 CLAUDE.md에 있고, 이 문서는 코드를 어디에 두고 어떻게 나누는지 정리

## 코드 위치

| 코드 종류 | 웹 `apps/web/` | 모바일 `apps/mobile/src/` |
|---|---|---|
| 라우트, 레이아웃 | `app/` | `app/` — Expo Router |
| 기능별 컴포넌트 | `components/<feature>/` | `components/<feature>/` |
| 여러 기능이 쓰는 컴포넌트 | `components/shared/` | `components/shared/` |
| shadcn/ui 원본 | `components/ui/` | 없음 |
| Zustand 스토어 | `store/` | `store/` |
| 훅 | `hooks/` | `hooks/` |
| 상수 | `lib/constants/` | `constants/` |
| Supabase 조회와 저장 | `lib/supabase/` | `lib/supabase/` |
| 도메인 순수 함수 | `lib/` | `lib/` |
| 타입과 스키마 | `types/` | `types/` |

- 웹과 모바일이 함께 쓰는 순수 로직은 `packages/shared`로 옮김 — 타이머 스토어 팩토리, 작업과 설정 조회와 변경, 통계 집계, 뱃지, 입력 제한 상수, 공용 타입
- 한쪽 앱에만 쓰이는 로직은 그 앱의 `lib/`에 둠
- 토스트, 안내 화면, 인증 에러 문구는 화면에 직접 쓰지 않고 shared `TOAST_MESSAGES`, `NOTICE_MESSAGES`, `AUTH_ERROR_MESSAGES`에 둠 — 토스트는 성공, 정보, 실패 중 종류를 함께 지정

**위치별 주의점**
- `app/`에는 라우팅과 레이아웃만 두고 비즈니스 로직은 넣지 않음
- `components/shared/layout/`은 반응형 내비게이션 전용으로 `app/`의 레이아웃에서만 사용
- `StoreProvider`는 `app/(main)/layout.tsx`와 `app/embed/layout.tsx`에 마운트
- `config/`는 사이트 메타 정보 같은 앱 설정 선언만

## 네이밍

| 대상 | 규칙 | 예시 |
|---|---|---|
| 컴포넌트 파일 | PascalCase | `TimerRing.tsx` |
| 스토어 파일 | camelCase + Store | `timerStore.ts` |
| 훅 파일 | use 접두사 | `useTimer.ts` |
| 유틸 파일 | camelCase | `storage.ts` |
| 타입 | PascalCase | `TimerSnapshot` |
| 함수, 변수 | camelCase | `remainingSeconds` |

## 컴포넌트

- 서버 컴포넌트가 기본, 상태나 이벤트가 필요할 때만 `'use client'`
- props 타입은 파일 상단에 `interface Props`로 정의
- shadcn/ui 컴포넌트를 먼저 찾고, 없을 때만 직접 작성
- `button`, `[role="button"]`, `select`, `label[for]`의 `cursor: pointer`는 `globals.css`에 전역으로 걸려 있어 클래스를 따로 붙이지 않음, `disabled`에는 `cursor-not-allowed`를 명시

**분리 기준** — 하나라도 해당하면 분리 검토
- 200줄 초과
- 폼 로직, 표시, 애니메이션처럼 역할이 둘 이상 섞임
- 같은 패턴이 두 곳 이상에서 반복
- 따로 단위 테스트하고 싶은 조각

**분리 위치**
- 한 기능 안에서만 쓰면 같은 `components/<feature>/` 폴더
- 두 기능 이상에서 쓰면 `components/shared/`
