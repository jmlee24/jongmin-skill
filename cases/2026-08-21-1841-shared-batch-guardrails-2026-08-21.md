---
skill: shared/
observed-version: 1.8.3
severity: minor
status: pending
---
## 실패 형태
(결함이 아니라 배치 지침) 2026-08-21 개발 세션 스킬 평가의 금지선과 순증 목표 — 같은 날짜 케이스
5건(history-freshness-burn / landing-check-guard-gate / claim-closure / handoff-fact-conclusion /
executor-prompt-no-new-md)을 한 배치로 처리할 때 넘지 말 것.
## 실측 증거
순서: ① 소각(약 −128줄) → ② 삽입(+40줄) → ③ 집행 수정(+12줄). 순증 약 −76줄 — **순증은 음수여야 한다.**
## 재현/반증법
배치 후 `git diff --stat` 합계 줄 수가 음수인지 확인.
## 제안 — 넣지 말 것 (명시 기각)
| 제안 | 기각 사유 |
|---|---|
| "T1 실측은 항상 레인보다 우선" | T1도 틀린 인과 결론을 냈다 — 타이머 용의자 가설이 15/15로 반증. 우선권이 아니라 전파 절차 |
| REFUTED를 evidence-liveness 5번째 상태로 | 근거 생존성 ↔ 명제 진위, 축이 다르다 |
| 모든 시험에 3시험 강제 | 가드·검사기·CI 규칙 한정 |
| 모든 리뷰 자동 재발진 | overlap 시 diff 재판정과 재발진 중 싼 쪽을 고르는 현행이 맞다 |
| 문서 전용 소유권 체계 | 관리 대상 2배 |
| "사양 이탈 시 예산 초과 자율 허용" | 한 사례의 일반화 — 스코프 통제가 무너진다 |
