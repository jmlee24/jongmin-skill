---
skill: jongmin-warplan
project: YNprinting (2026-08-31~09-01 웨이브 — warplan→conductor→handoff, 24커밋·쓰기 5·리뷰 2·CX 11프롬프트/18산출·스윕 15런)
observed-version: 1.9.2
severity: major
status: pending
related: 2026-09-01-0900-shared-codex-lane-capacity-retry (원인 축)
---
## 실패 형태
warplan 절차 3 편성표 → 4 CX 2차 → 5 제시에서 **4가 실패했을 때** 규정이 없다. T1이 v1을 제시하고
나중에 v2로 대폭 개정 — 사용자가 두 번 읽음. 결과적으로 "미검증 제시 후 갱신"을 했지만 임기응변.
## 실측 증거
편성표 v1→v2 (CX 2차가 v1의 전제를 STALE로 반증, 레인 분할 오류 3건).
## 재현/반증법
절차 4 실패 상태에서 절차 5의 다음 행동이 하나로 결정되는지.
## 제안 (배치에서 판정)
절차 5 게이트: CX 2차 미도착이면 제시하되 **미검증 표기 필수**, 도착 후 갱신본. 사용자 결정을 요구하는
항목은 도착 전 확정 요청 금지.
