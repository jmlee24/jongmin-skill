---
skill: shared/codex-lane.md
project: 미상 — 2026-08-26 웨이브 (warplan→conductor×2→handoff, 25커밋·쓰기 3·리뷰 1·CX 6·측정 3캠페인 22런; D75 회귀 언급)
observed-version: 1.9.1
severity: major
status: pending
related: 2026-08-24-0154-shared-codex-lane-resume-flag-stale (applied 1.9.0 — 같은 파일 실환경 불일치 축)
---
## 실패 형태
F6: 문서화된 함정(--skip-git-repo-check)에 그대로 걸림. 집행점 부재 — 「주의」 절에만 있어 복사해서
실행하는 기본 패턴 경로에서 탈락. 이미 문서화된 뒤 반복 위반 — 재발 가능성 매우 높음.
B7 병합: codex CLI 버전 고정 실측이 집행과 분리(자동 업데이트 전제와 긴장) — 같은 probe 스크립트로
묶으면 더 작고 강하다.
## 실측 증거
비 git 경로에서 CX 발진 exit 1 (문서 주의 절 존재에도).
## 재현/반증법
기본 패턴을 그대로 복사해 scratchpad worktree 밖에서 실행.
## 제안 (배치에서 판정 — 3~5줄 or 스크립트, CX 문안)
기본 패턴 앞: "실행 직전 git rev-parse --is-inside-work-tree로 실제 codex cwd를 판정한다. false면 아래
모든 호출에 --skip-git-repo-check를 붙인다. 이 판정 없이 발진하지 않는다." + codex --version 기록을
같은 probe에.
