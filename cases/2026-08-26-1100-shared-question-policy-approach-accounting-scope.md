---
skill: shared/question-policy.md
project: 미상 — 2026-08-26 웨이브 (warplan→conductor×2→handoff, 25커밋·쓰기 3·리뷰 1·CX 6·측정 3캠페인 22런; D75 회귀 언급)
observed-version: 1.9.1
severity: major
status: pending
---
## 실패 형태
F5: 임기응변에서 방향을 두 번 뒤집음. 범위 실패 — "서로 다른 접근 3회 후 정지" 회계가 conductor·loop에만
구현돼 있고 공용 질문 정책의 즉시 질문 예외("3접근 소진")에는 정지 전이가 없다.
## 실측 증거
방향 전환 2회 후에도 정지·보고 없이 진행.
## 재현/반증법
공용 정책에서 3접근 소진 시 다음 상태가 결정되는지 확인.
## 제안 (배치에서 판정 — 3~5줄)
question-policy 즉시 질문 예외의 "3접근 소진"에 정지·보고 전이를 명시해 스킬 무관하게 적용.
