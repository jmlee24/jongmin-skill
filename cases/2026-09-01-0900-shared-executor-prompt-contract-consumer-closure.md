---
skill: shared/executor-prompt.md
project: YNprinting (2026-08-31~09-01 웨이브 — warplan→conductor→handoff, 24커밋·쓰기 5·리뷰 2·CX 11프롬프트/18산출·스윕 15런)
observed-version: 1.9.2
severity: major
status: pending
related: 2026-08-27-1000-jongmin-dev-conductor-change-contract-map (Consumers 필드 제안 — 같은 축 2회째), 2026-08-24-0154-shared-executor-prompt-symbol-deletion-drift (applied 1.9.0 — 삭제 방향; 이 케이스는 신설 방향)
---
## 실패 형태
계약을 **신설**할 때 소비처 전수를 범위에 넣는 규칙이 없다. T1이 Owned를 판정 경로로만 한정 →
evaluated 계약을 만들었는데 그걸 읽는 8곳이 그대로 남음 → 화면 "정상"·DB PASS·부트스트랩 가짜
ssim_score=0.0. 리뷰가 안 잡았으면 "오검을 고쳤다"고 보고했을 critical. 6요소는 "내가 만질 파일"
관점이지 "내가 만드는 계약을 누가 읽는가" 관점이 없다 (1.9.0 심볼 삭제 보고는 삭제 방향만).
## 실측 증거
리뷰 레인 critical 1건(뮤테이션으로 검출: 배선 삭제 → red → 복원). 이번 웨이브 최대 결함.
## 재현/반증법
DTO 필드·플래그·이벤트 신설 태스크에서 프롬프트의 Owned가 소비처를 포함하는지 grep 대조.
## 제안 (배치에서 판정 — 보고 우선순위 1)
6요소에 7번째: "이 변경이 신설·변경하는 계약과 그 소비처 전수" — grep으로 소비처를 찾아 Owned에
포함하거나 후속 태스크로 DAG에 명시. change-contract-map의 Consumers 필드와 같은 축 → 배치에서 하나로.
