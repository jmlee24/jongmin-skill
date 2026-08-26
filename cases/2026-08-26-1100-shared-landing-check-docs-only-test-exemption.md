---
skill: shared/landing-check.md
project: 미상 — 2026-08-26 웨이브 (warplan→conductor×2→handoff, 25커밋·쓰기 3·리뷰 1·CX 6·측정 3캠페인 22런; D75 회귀 언급)
observed-version: 1.9.1
severity: major
status: pending
---
## 실패 형태
F2: 문서 커밋에 pytest를 생략해 게이트 red — 6건 중 유일한 명백한 규칙 위반. T1이 docs-only를 임의
면제했는데 프로젝트 테스트가 문서 계약을 강제하고 있었다.
## 실측 증거
문서 커밋 착지 후 게이트 red (보고 세션).
## 재현/반증법
docs-only 착지 단위에서 impact-scope 테스트 실행 기록 유무.
## 제안 (배치에서 판정 — 2~3줄, CX 문안)
커밋 게이트: "docs-only 포함 모든 착지 단위에 기록된 impact-scope 테스트를 실행한다. 문서 검사기·린트가
green이어도 프로젝트 테스트가 문서 계약을 강제할 수 있으므로, 발진 전 수집한 게이트에서 T1 임의 면제를
만들지 않는다." (full suite 강제는 아님 — 2단 구조 유지)
