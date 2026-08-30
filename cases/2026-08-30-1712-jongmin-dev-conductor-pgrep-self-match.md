---
skill: jongmin-dev-conductor
observed-version: 1.9.2
project: YNprinting (2026-08-29~30 세션 — 착지 9커밋·쓰기 레인 5·리뷰 1·CX 6(+샌드박스 실패 2)·접합 major 5·minor 1·nit 1; 설치본 1.9.2 — conductor:207 pkill 경고 문구 인용으로 확인)
severity: minor
status: pending
---
## 실패 형태
실패·중단 정책이 `pkill -f "codex"` 자기 셸 종료(실측 2회)만 경고하는데, `pgrep -f`도 같은
자기매칭을 한다. 활성 잡을 세다가 T1 자신의 명령줄(codex exec·pytest 포함)을 잡으로 오판.
## 실측 증거
활성 잡 실제 0인데 pgrep 결과로 "도는 중"으로 판정 → 핸드오프 "활성 레인" 항목을 틀리게 적을 뻔.
## 재현/반증법
`pgrep -f codex` 를 codex 문자열이 든 셸에서 실행 — 자기 PID가 나오면 재현.
## 제안 (배치에서 판정) — 보고서 우선순위 6
pkill 경고를 pgrep·`ps | grep`까지 확장하고 안전형 명시: `ps -eo args --no-headers | grep -v grep`.
8/14 v1.8.2 "백그라운드 잡은 PID·핸들로만 종료"의 조회 쪽 대칭 — 기존 문장 교체로 순증 0 가능.
