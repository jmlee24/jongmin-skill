---
skill: jongmin-dev-conductor
project: YNprinting (2026-08-27 웨이브 — warplan 2·conductor 1(13커밋)·handoff 2·lane-reviewer 2; 원문 experiments/session_20260827_measurements/는 타 기기 로컬 미커밋 — 이 PC 접근 불가)
observed-version: 1.9.1
severity: major
status: pending
related: 2026-08-24-0154-shared-executor-prompt-symbol-deletion-drift (applied 1.9.0 — 파일 disjoint 부족 축), 2026-08-19-2347-jongmin-dev-conductor-claim-closure (문서 정본 갱신 소유 축)
---
## 실패 형태
A (보고 severity critical): 병렬 안전 모델이 **파일 소유권만** 본다. src/io/CLAUDE.md를 camlock 레인에
배정 → manifest 레인이 자기 신규 파일을 그 문서의 파일표에 등재할 수 없어 check_doc_facts red.
공용 문서는 전 레인 Forbidden으로 충돌은 막지만 **그 정합 작업의 소유자를 만들지 않는다**.
## 실측 증거
13커밋 웨이브 중 문서 가드 red 1회 — 원인은 소유권 맵의 공용 정본 미배정.
## 재현/반증법
레인 2개가 각각 신규 파일을 만들고 공용 문서 파일표에 등재해야 하는 DAG로 재현.
## 제안 (배치에서 판정 — 보고 P0-4)
소유권 맵을 「변경 계약 맵」으로 확장: Owned files / Published artifacts·new files / **Required
registry·doc updates** / Consumers / Exclusive resources. 공용 정본 갱신은 별도 직렬 integration-doc
태스크로 자동 편성(DAG 말단).
