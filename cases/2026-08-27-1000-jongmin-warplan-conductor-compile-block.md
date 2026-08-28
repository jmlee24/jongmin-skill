---
skill: jongmin-warplan
project: YNprinting (2026-08-27 웨이브 — warplan 2·conductor 1(13커밋)·handoff 2·lane-reviewer 2; 원문 experiments/session_20260827_measurements/는 타 기기 로컬 미커밋 — 이 PC 접근 불가)
observed-version: 1.9.1
severity: major
status: pending
related: 2026-08-26-1100-jongmin-dev-conductor-warplan-decision-reuse, 2026-08-24-0154-jongmin-warplan-design-change-recompile — warplan→conductor 인계 축
---
## 실패 형태
D: warplan 편성표를 짰는데 conductor에서 DAG·소유권 맵을 처음부터 다시 짰다. warplan 단계 필수 항목이
실행주체·크기·오라클·결정지점 4개뿐 — task-id·deps·Owned/Forbidden·신규 파일·exclusive-resource가
없어 conductor가 "무변환 컴파일"할 수 없다.
## 실측 증거
warplan 2회 → conductor에서 DAG 재작성.
## 재현/반증법
warplan 산출을 conductor 1절 입력으로 그대로 넣었을 때 추가 작성이 필요한 항목 수.
## 제안 (배치에서 판정 — 보고 P1-6)
warplan 단계 스키마에 conductor 컴파일 블록: task-id / depends-on / owned / forbidden / new-files /
required-doc-updates / exclusive-resources / frozen-contracts. conductor는 기준 SHA 동일 + LIVE면
재작성 금지·가져오기. 1.9.0 "5요소(병렬은 6요소) 컴파일 가능" 문구로는 부족 — 스키마가 필요.
