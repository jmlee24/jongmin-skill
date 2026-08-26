---
skill: shared/
project: 미상 — 2026-08-26 웨이브 (warplan→conductor×2→handoff, 25커밋·쓰기 3·리뷰 1·CX 6·측정 3캠페인 22런; D75 회귀 언급)
observed-version: 1.9.1
severity: minor
status: pending
---
## 실패 형태
B5: validate.mjs DEFAULT_ROOT가 3단계 위라 캐시 설치본에서는 잘못된 경로를 가리킨다. 보고 세션 관측:
설치본의 plugin.json 위치가 CX 전제(.claude-plugin/)와 달랐다 — 캐시 레이아웃 실측 필요.
## 실측 증거
설치본에서 validate 실행 시 root 오판 (보고 세션). 이 PC 캐시 1.9.0은 .claude-plugin/plugin.json 실존
확인됨 — 보고와 불일치, 배치에서 재실측.
## 재현/반증법
캐시 경로에서 validate 실행, DEFAULT_ROOT 해석 결과와 plugin.json 위치 확인.
## 제안 (배치에서 판정 — 8~15줄)
root 자동 판정(마켓플레이스 클론 vs 캐시) 또는 설치본에서는 --root 필수로 명시.

**추가 관측 (2026-08-26 14:00)**: case-lint의 cases/ 부재 PASS도 같은 "실행 모드 미구분" 결함 — 설치 캐시
SKIP / 큐레이터·릴리스 저장소 --require-cases FAIL / 0건 PASS+NOTE 3모드 제안 (intake-contract 케이스 참조).
CX 실측: 캐시 1.9.1 validate --only=6 ALL PASS(부재), 클론 63건 정확.
