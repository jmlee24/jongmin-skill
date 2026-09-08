---
skill: jongmin-dev-conductor
project: YNprinting (2026-08-27 웨이브 — warplan 2·conductor 1(13커밋)·handoff 2·lane-reviewer 2; 원문 experiments/session_20260827_measurements/는 타 기기 로컬 미커밋 — 이 PC 접근 불가)
observed-version: 1.9.1
severity: major
status: pending
related: 2026-08-20-1526-jongmin-dev-conductor-common-wave-briefing, 2026-08-19-2347-jongmin-dev-conductor-common-brief-delta — 공통 브리핑 축 3회째
---
## 실패 형태
J: 게이트 기준선(pytest 3672 passed / mypy 140 / ruff 1+7)을 executor 5개 전부에 손으로 복제. 웨이브
중 3672→3711로 바뀌자 프롬프트마다 갱신 필요 — 한 번 어긋나면 에이전트가 잘못된 기준으로 판정.
## 실측 증거
프롬프트 5건 수동 복제 + 중간 갱신.
## 재현/반증법
Preflight 기준선이 장부 한 곳에 있고 프롬프트가 참조하는지 확인.
## 제안 (배치에서 판정 — 보고 P1-8)
Preflight 측정값을 장부(실행 메타)에 기록하고 executor 프롬프트는 그 경로를 참조 — 손 복제 금지.
공통 브리핑 축(YNprinting 3회)과 결합 판정.

**관측 추가 (1.10.0, 2026-09-08)**: 게이트 명령 **전건 포함**은 발진 검증기가 매니페스트 gates ↔ 프롬프트
원문으로 대조한다. 기준선 수치의 손 복제는 여전히 미해결 — pending 유지.
