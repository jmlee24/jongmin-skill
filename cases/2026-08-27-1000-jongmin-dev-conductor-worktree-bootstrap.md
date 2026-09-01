---
skill: jongmin-dev-conductor
project: YNprinting (2026-08-27 웨이브 — warplan 2·conductor 1(13커밋)·handoff 2·lane-reviewer 2; 원문 experiments/session_20260827_measurements/는 타 기기 로컬 미커밋 — 이 PC 접근 불가)
observed-version: 1.9.1
severity: major
status: pending
related: 2026-08-26-0930-shared-executor-prompt-lane-asset-availability, 2026-08-20-1526-jongmin-dev-conductor-worktree-env-manifest, 2026-08-19-2347-shared-executor-prompt-lane-local-baseline — worktree 환경 축 4회째
---
## 실패 형태
C: worktree를 만들되 실행 환경을 준비하지 않는다. 레인 5개 전부 .venv 심볼릭 링크를 각자 만들었고
TestCases/ 결손으로 같은 사전 존재 실패를 독립적으로 진단 — **4번 반복된 낭비**. conductor는 곧바로
git worktree add로 들어가고 bootstrap 계약이 없다.
## 실측 증거
레인 5개 × (.venv 링크 생성 + TestCases 결손 진단) 중복.
## 재현/반증법
venv·미추적 자산 의존 레포에서 worktree 레인 발진 → 각 레인 bootstrap 행위 기록.
## 제안 (배치에서 판정 — 보고 P0-3·P2-10)
Preflight 매니페스트에 공유 실행 환경(venv/toolchain 경로)·gitignored fixture의 worktree 제공 방식
명시 → **worktree bootstrap을 스크립트·매니페스트로 위임**, 레인 즉흥 링크 생성 금지. 이 축은 4회
관측(1.9.0 표준 문구로도 미해결) — 문구가 아니라 스크립트 층이 필요하다는 근거.

**관측 추가 (2026-09-01 YNprinting)**: 5회째 — 레인 5개 전부 .env·TestCases/ 결손으로 같은 테스트 1건
red 보고, T1이 프롬프트마다 "환경 갭이니 고치지 마라"를 수동 복제. 보고 제안: executor 4)규약 복제에
**환경 갭 선언 슬롯** 표준화 — Preflight에서 "worktree에 없는 것" 1회 측정 → 전 레인 자동 복제.
