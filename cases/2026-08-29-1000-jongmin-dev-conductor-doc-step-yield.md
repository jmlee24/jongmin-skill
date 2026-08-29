---
skill: jongmin-dev-conductor
project: YNprinting (2026-08-29 1세션 실측 — Codex 3스레드 교차; 큐레이터 T1+CX 선별)
observed-version: 1.9.2
severity: minor
status: pending
related: 2026-08-24-0154-shared-doc-burn-after-wave (applied 1.9.0 — 8단계 문서 관리의 실효 관측)
---
## 실패 형태
8단계 문서 관리(5판정)의 순효과가 아직 미입증 — CX가 장부를 실측: YNprinting 웨이브 touched 문서
24건 전부 keep·삭제 0, chess-masterplan 최근 웨이브 1건 keep·삭제 0. 상시 5판정이 T1 벽시계만 쓰고
소각 0이면 원칙 4(시간) 위반 후보.
## 실측 증거
~/.claude/jongmin-ledgers 2프로젝트 장부 (CX 실측 2026-08-29). 단 표본 2웨이브 — 결론 아님.
## 재현/반증법
다음 3웨이브의 5판정 결과 분포(keep/merge/delete/follow-up)와 소요 시간 기록. delete·merge가 계속
0이면 조건부 실행으로.
## 제안 (배치에서 판정)
allowlist hard gate(doc-audit)는 유지하되, 5판정 의미 감사는 **신규 문서·정본 복제·참조 변화가 있을
때만** 실행하는 조건부로 검토. 시간 장부에 docs phase 계측 선행.
