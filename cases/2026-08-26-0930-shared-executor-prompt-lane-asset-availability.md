---
skill: shared/executor-prompt.md
project: YNprinting (12커밋 웨이브 2026-08-25~26 — 쓰기 4·리뷰 1·CX 5·동시 4)
observed-version: 1.9.1
severity: major
status: pending
related: 2026-08-19-2347-shared-executor-prompt-lane-local-baseline, 2026-08-20-1526-jongmin-dev-conductor-worktree-env-manifest (같은 프로젝트 — 3회째 반복 관측)
---
## 실패 형태
git 미추적 자산(TestCases/ 약 27GB)이 worktree에 없어 레인 테스트 기준선이 본체와 달랐다
(본체 3,878 passed·0 skipped ↔ worktree 3,876 passed·1 failed·1 skipped). 1.9.0의 worktree 표준
문구("환경 결손과 신규 실패를 구분해 보고")는 있었고 레인 2개가 각각 스스로 차이를 발견해
git stash -u로 베이스 대조까지 하고 정확히 보고했다.
## 실측 증거
YNprinting 3회째 같은 축 관측 (lane-local-baseline·worktree-env-manifest 후속).
## 재현/반증법
미추적 자산 의존 테스트가 있는 레포에서 worktree 레인 발진 → 기준선 차이 보고 여부.
## 제안 (배치에서 판정 — T1·CX 갈림 기록)
CX: "레인 기준선은 발진 SHA·추적 파일·필수 외부 자산 지문이 같은 환경에서 측정, 불일치면 수치를
전달하지 않는다". T1: 레인이 실제로 스스로 처리했으니 **preflight에서 필수 외부 자산 목록만
프롬프트에 넣고 기준선은 레인이 재게 하라** — 수치 전달 금지는 과함. 갈림의 근거는 레인 2개의
자율 처리 실측.
