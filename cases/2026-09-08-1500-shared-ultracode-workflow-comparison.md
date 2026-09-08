---
skill: shared/
project: jongmin-skills 설계 비교 (T1 Workflow 13에이전트 4렌즈→반박→종합 + CX gpt-5.6-sol 자문 + T1 실측, 2026-09-08)
observed-version: 1.9.2
severity: major
status: applied
applied-version: 1.10.0
related: 2026-08-27-1500-shared-architecture-manifest-executed-entrypoint, 2026-09-01-0900-shared-batch-guardrails-2026-09-01
---
## 실패 형태
Claude Code 내장 Workflow 도구(ultracode 키워드 옵트인 — JS 스크립트가 서브에이전트 팬아웃·pipeline·
schema 반환·runId 캐시 재개를 결정론으로 지휘)와 conductor를 비교. 워크플로우 렌즈 4개가 낸 권고 8건 중
Claude 반박으로 5건 기각, 생존 3건(A 발진 내용 검증기 / B PreToolUse 훅 차단 / C 차단 계측)은 architecture-
manifest 축의 **4번째 독립 도달**. CX가 생존분에서 추가 결함 2건 검출 — A의 "신규 allowlist 파일 BASE 실존"이
현행 신규 파일 계약과 충돌, B의 "차단이 같은 턴 후속에 전파"는 disallowed-tools 실측이지 PreToolUse
실측이 아님(UNVERIFIED). **동종(Claude-only) 적대적 검증을 통과한 권고도 이종 CX가 잡았다** — 앙상블 원칙 ③ 실증.
## 실측 증거
Workflow 실행: 에이전트 13·1,016k 토큰·514s. CX thread 01a07fd7-7583-7353-9896-2e62f8badc8b. 훅 이벤트는
hooks.json에 Stop 1종뿐(HEAD ac15628). 기각 사유 원문은 워크플로우 journal.jsonl.
## 재현/반증법
Workflow를 패밀리 실행 백엔드로 채택하려면 실측 웨이브 1회에서 peak completed-unlanded·T1 접합 시간·
범위 밖 변경·full 게이트 결과를 conductor 대비 기록해야 한다. 발견 팬아웃(deep-audit) 외 채용 근거 없음.
## 제안 (판정 결과)
채택 1.10.0: A(정정판 — owned 실존 / allowedNew 부재+부모 정책 분리) + C → scripts/lane-launch-check.mjs.
보류: B(훅 — 전파·Agent matcher·Workflow 내부 agent 훅 발생 여부 실측 후), 하이브리드(같은 발진 베이스·
파일군 분리 묶음 = 워크플로우 1개, 착지·판정은 밖), deep-audit 발견 단계 팬아웃. 기각: 레이어별 세마포어,
리뷰 3벌 parallel+schema, 검증법 실행 팬아웃, 토큰·누적 상한, shared/workflow.md 류 API 복제 문서.
CX 반대 증거 채택: "마찰은 전부 기계 강제 부재"(09-01)는 과일반화 — 잘못된 강제 범위·빈 오라클·
불완전 계측 스키마도 손실을 냈다. 정확한 명제는 "형식·실존·금지 경로만 기계 강제, 의미 판정은 증거 수집까지".
