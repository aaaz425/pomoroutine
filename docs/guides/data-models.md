# 데이터 모델

타입 정의는 코드가 원본이고, 이 문서는 코드만 봐서는 알 수 없는 규칙만 정리

## 위치

| 대상 | 위치 |
|---|---|
| 웹 전용 타입 | `apps/web/types/models.ts` |
| 웹 전용 Zod 스키마, `STORAGE_KEYS` | `apps/web/types/schemas.ts` — 공용 스키마도 여기서 re-export |
| 모바일 타입 | `apps/mobile/src/types/*.ts` — 대부분 shared re-export |
| 웹과 모바일 공용 타입 | `packages/shared/src/types` — `Session`, `Task`, `Category`, `AppSettings`, `TimerSettings`, `FocusPeriod` 등 |
| 웹과 모바일 공용 Zod 스키마 | `packages/shared/src/schemas.ts` — 작업, 카테고리, 설정, 활성 타이머, 인증 폼 |
| 입력 제한 상수 | `packages/shared/src/constants/limits.ts` |
| DB 스키마 | `supabase/migrations/` |

## 개념 관계

- 작업 Task — 제목과 카테고리만 가짐, 타이머 설정 없음
- 기록 Session — 타이머를 한 번 실행한 결과, 작업 연결은 선택
- 사이클 — 기록 안의 집중과 휴식 한 쌍, 별도 타입 없음
- 타이머 설정 — `AppSettings.defaultTimerSettings`에서 시작하고 시작 화면에서 그 회차만 조정

## 불변식

**집중 시간**
- 집중 시간 통계는 반드시 `focusSeconds`만 사용
- `endedAt - startedAt`은 일시정지가 포함된 경과 시간이라 집계에 쓰지 않음
- 타임라인 표시는 `focusPeriods` 사용

**기록 생성**
- 세션 전체 집중 시간이 30초 미만이면 기록을 만들지 않고 타이머 초기화 — `SESSION_LIMITS.MIN_SESSION_FOCUS_SECONDS`
- 기록 화면에서 건너뛰면 기록을 저장하지 않음
- `note`는 사이클마다가 아니라 기록 화면에서 한 번만 작성

**focusPeriods 정규화**
- 저장 전 `normalizeFocusPeriods()`를 반드시 통과 — 웹 `SessionRecordModal`, 모바일 `SessionCompleteSheet`에서 호출
- 5초 미만 구간 제거
- 5초 이하 일시정지로 나뉜 인접 구간 병합
- 최대 100개, 초과분은 뒤쪽을 버리고 병합하지 않음

**Session 필드**
- `taskId`가 null이면 미분류, 작업을 삭제해도 기록은 남고 null로 바뀜
- `title`은 작업과 별개인 기록별 라벨, 저널 상세 편집에서만 설정
- `totalCycles`는 시작 당시 설정값의 스냅샷
- `mode`가 `free`면 `completedCycles`, `totalCycles`가 0 — 사이클 수 대신 집중 시간으로 표시

## 입력 제한

- 제한 값은 Zod 스키마와 DB CHECK에 같은 값으로 들어감
- 제한을 바꿀 때는 `limits.ts`와 마이그레이션을 함께 수정
- DB 제약을 Zod보다 엄격하게 만들지 않음
- 카테고리 최대 개수처럼 여러 행에 걸친 제한은 트리거로 강제

## 서버 데이터 조회

- 작업, 카테고리, 설정은 shared `createTaskQueries`, `createSettingsQuery`로 조회하고 키는 shared `QUERY_KEYS`
- 변경은 shared `getTaskActions`, `getSettingsActions` — 화면에 먼저 반영하고 실패하면 되돌림, 진행 중인 변경이 모두 끝나면 다시 조회
- 작업과 카테고리 추가는 저장이 끝난 뒤 캐시에 넣음, 임시 id를 쓰지 않음
- 마운트할 때는 다시 조회하지 않고 화면 복귀 때만 조회 — 웹은 visibilitychange, 앱은 AppState `focusManager`

## 통계 데이터

- 전체 기록을 훑어야 하는 값은 RPC `get_dashboard_summary(p_timezone)`가 계산 — 스트릭, 월간 히트맵, 직전 기간 비교, 가장 바쁜 요일, 전체 탭 통계와 차트, 뱃지 판정값
- `lib/supabase/dashboard.ts`의 `fetchDashboardSummary()`로 호출하고 Zod 검증
- 오늘, 이번 주, 이번 달 탭은 `fetchDashboardSessions()`로 이번 주와 이번 달을 덮는 구간만 받아 클라이언트에서 계산
- 기록에서 파생된 서버 데이터는 TanStack Query로 조회, 쿼리 키는 `lib/query/keys.ts`의 `sessionKeys`
- 기록 추가, 수정, 삭제가 성공하면 `['sessions']` 접두사 쿼리를 무효화, 화면 복귀 시에는 활성 쿼리가 다시 조회
- 전체 탭의 시간대별 집중은 sessions `hourly_focus_seconds` 컬럼을 합산 — 기록 저장 시 트리거가 UTC 기준 24칸으로 계산하고, RPC가 사용자 시간대 오프셋만큼 회전
- 오프셋을 현재 시점 하나로 회전하므로 30분 단위 시간대와 서머타임 지역의 과거 기록은 근사값

## 기기 로컬 저장

- 데이터는 모두 Supabase에 저장
- localStorage에는 활성 타이머 스냅샷과 테마, 컬러 테마만 저장
- 키는 `STORAGE_KEYS`, `theme`만 예외적으로 `pomoroutine:` 접두사 없음
- 접근 규칙은 CLAUDE.md의 localStorage 항목 참고
