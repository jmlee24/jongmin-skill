---
skill: jongmin-dev-conductor
project: jongmin-skills 구조 감사 (CX 전문 리뷰, 2026-08-24)
observed-version: 1.9.1
status: pending
severity: major
related: 2026-08-19-2347-shared-executor-prompt-ownership-reapproval (applied 1.9.0 — 그 후속 구멍)
---
## 실패 형태
소유권 재승인(1.9.0)이 맵을 갱신하고 요청 레인만 재개한다 — 갱신 시점에 이미 떠 있는 다른
레인들의 프롬프트 속 소유권 스냅샷이 stale해진다. 영향 레인 정지·재발행 단계도, 착지 판정이
어느 맵 버전 기준인지도 미정.
## 실측 증거
CX 구조 분석 (실전 사고 없음 — n=0). executor:70·landing-check:17·conductor:98 대조.
## 재현/반증법
활성 레인 A·B에서 A가 B의 Owned를 요청 → 승인 후 B의 기존 프롬프트 유효성·착지 판정 기준 관찰.
## 제안 (배치에서 판정)
맵에 버전 번호, 승인 시 영향받는 활성·대기 레인 식별 → 겹치는 레인만 정지·프롬프트 재발행,
착지 판정은 장부에 기록된 맵 버전 기준.