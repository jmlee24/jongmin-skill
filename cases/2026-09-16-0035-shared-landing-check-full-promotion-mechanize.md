---
skill: shared/landing-check.md
project: YNprinting (2026-09-14~15 오버레이 웨이브 — 15커밋, F1·R2·F2가 시험 변경)
observed-version: 1.12.1
severity: major
status: pending
related: 2026-08-21-1841-shared-landing-check-guard-gate-impact-scope (impact-scope 게이트 정의), 2026-08-26-0930-shared-landing-check-claim-card
---
## 실패 형태
landing-check「자동 full 승격」(:69-72)은 "오라클·테스트 하니스 변경 → 커밋 단위에서도 full 게이트"를
규정한다. F1·R2·F2 세 레인이 시험을 바꿨는데(test 커밋 4건) 착지 게이트는 unit + 일부 통합만 돌렸고 full은
최종 TIP에서 1회였다. **규칙 위반**이며 T1이 Codex 지적 전까지 인지하지 못했다.
구조적 원인: 승격 조건이 산문 목록이고, 착지 게이트 체크리스트(:16-43)에 "이 착지가 승격 조건에 해당하는가"를
묻는 항목이 없다. 게이트 명령은 매니페스트 `gates[]`에 있지만 **어느 게이트를 이 착지에 돌릴지**는 T1 판단에
맡겨져 있어, diff에 tests/·conftest·하니스가 들어 있어도 아무것도 경고하지 않는다.
## 실측 증거
보고서 "스킬 규칙 대비 미비 #1"(Codex 지적, T1 확인 "규칙 위반이 맞습니다"). 장부는 이 기기에 없음.
## 재현/반증법
- 착지 게이트 체크리스트(:16-43)에 "자동 full 승격 조건 확인" 항목 grep — 없음. 승격 절(:69-72)은 체크리스트
  밖 별도 절.
- 반증: 다음 웨이브에서 시험 파일을 만진 레인의 착지 시 T1이 full을 돌렸는지 time-events `verify_start` 메모로
  확인. 산문만으로 준수되면 기계화 불요.
## 제안 (배치에서 판정)
1. 최소: 착지 게이트 체크리스트에 1항 — "`git diff --name-only <직전 TIP>..<새 TIP>`에 테스트·픽스처·하니스·
   오라클 파일이 있으면 이 착지는 full 게이트(:69-72)" — 판정을 체크리스트 안으로.
2. 기계화 후보: lane-launch-check 또는 새 `landing-gate-check.mjs`가 diff 경로를 승격 패턴(`tests/`, `conftest`,
   프로젝트 매니페스트 `oracleGlobs[]`)과 대조해 `FULL_REQUIRED`를 출력·장부 기록. 차단이 아니라 표시 —
   "규약은 있고 준수가 빠진" 유형은 산문 추가로 안 고쳐진다(09-01 배치 지침과 동일 결론).
