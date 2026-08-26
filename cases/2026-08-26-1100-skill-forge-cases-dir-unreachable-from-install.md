---
skill: skill-forge
project: 미상 — 2026-08-26 웨이브 (warplan→conductor×2→handoff, 25커밋·쓰기 3·리뷰 1·CX 6·측정 3캠페인 22런; D75 회귀 언급)
observed-version: 1.9.1
severity: major
status: pending
---
## 실패 형태
**P0 (보고 세션·CX 합의: 다른 모든 개선의 전제조건).** skill-forge는 실전 결함을 cases/에 기록하고
pending 전건을 improve 입력으로 소비하라고 강제하는데, 설치본(플러그인 캐시)으로 도는 세션에는
cases/가 없고 case-lint.mjs가 부재를 PASS로 처리한다 — 개선 데이터 파이프라인이 조용히 비고 릴리스
검증이 그걸 안 잡는다. 실체: cases/는 설계상 repo 루트(캐시 밖)에 두었고 각 기기의 마켓플레이스
클론(~/.claude/plugins/marketplaces/jongmin-skill/cases/)에 실재한다 — 설치본 세션이 그 경로를
안내받지 못한 것 + 부재를 삼킨 lint가 결함.
## 실측 증거
2026-08-26 웨이브 리뷰 6건이 정식 목적지 없이 채팅으로만 전달됨. case-lint: cases/ 없음 → PASS.
## 재현/반증법
캐시 설치 경로에서 validate 실행 → [6] PASS 출력 확인. skill-forge 본문에 cases/ 물리 경로 부재 확인.
## 제안 (배치에서 판정 — P0, 5~12줄)
① skill-forge improve·케이스 우선 규약에 cases/ 물리 경로(마켓플레이스 클론) 명시 ② case-lint는
cases/ 부재를 FAIL(또는 최소 NOTE 강조)로 전환 — "0건"과 "디렉터리 없음"을 구분.

**재판정 (T1·CX 접합, 2026-08-26 14:00)**: P0 해제 → major. "설치본에서 cases/ 직접 쓰기 불가"는 설계대로
(캐시 밖 배치, 런타임 오염 0 실측). 실제 결함은 ① 2단계 토폴로지에 1단계 계약 문구 ② 부재 PASS 표기.
①은 2026-08-26-1400-skill-forge-case-handoff-intake-contract로, ②는 scripts-validate-root-install-mismatch
케이스(lint 실행 모드 결함)로 이관. 이 파일은 관측 기록으로 유지.
