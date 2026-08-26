---
skill: jongmin-dev-conductor
project: 미상 — 2026-08-26 웨이브 (warplan→conductor×2→handoff, 25커밋·쓰기 3·리뷰 1·CX 6·측정 3캠페인 22런; D75 회귀 언급)
observed-version: 1.9.1
severity: major
status: pending
related: 2026-08-24-0154-jongmin-dev-conductor-fix-lane-review-path (applied 1.9.0 — 리뷰 지적 fix 경로는 있음, T1 자체 발견 경로는 없음)
---
## 실패 형태
B2: T1이 스스로 회귀를 발견했을 때의 전이 경로가 없다 (D75 회귀 — 임기응변 처리). 4항목 불명확:
잘못 착지분 유지/revert · 리뷰를 어디에 붙이나 · 후속 DAG 중단 여부 · fix 레인 여부. 1.9.0의 fix 레인
경로는 "리뷰 지적"에서 출발한다.
## 실측 증거
25커밋 웨이브에서 T1 자체 발견 회귀 1건 임기응변.
## 재현/반증법
conductor 본문에서 "T1이 발견한 회귀" 상태 전이 탐색 — 없음.
## 제안 (배치에서 판정 — 4~6줄)
신규 회귀 전이: revert vs fix 판정 기준(착지분이 다른 레인 베이스면 fix, 아니면 revert) · 리뷰는 fix
레인 경량 재확인 경로 재사용 · 영향받는 후속 DAG 노드만 보류.
