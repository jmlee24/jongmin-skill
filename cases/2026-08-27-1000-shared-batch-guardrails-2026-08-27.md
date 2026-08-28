---
skill: shared/
project: YNprinting (2026-08-27 웨이브 — warplan 2·conductor 1(13커밋)·handoff 2·lane-reviewer 2; 원문 experiments/session_20260827_measurements/는 타 기기 로컬 미커밋 — 이 PC 접근 불가)
observed-version: 1.9.1
severity: minor
status: pending
---
## 실패 형태
(결함이 아니라 배치 지침) 2026-08-27 13커밋 웨이브에서 **실제로 작동한 설계 — 축소 금지**: 자기승인
금지(리뷰 별도 에이전트 — 쓰기 레인이 못 본 critical 2건 검출) / SHA 범위 고정 리뷰(병렬 착지 중
대상 불변) / CX 자동 채택 금지 + T1 실측 접합(Codex 오류를 실측이 걸러냄) / CX 이중 투입(2차가 계획
초안 위험 2건 지적) / **fix 레인 경량 재확인(1.9.0 신설 — 리뷰어가 수정 전 상태 재현, 새 deep 리뷰
대비 비용 1/5)** / 완료 통지≠완료 판정(환경 결손 보고를 T1 원문 판정으로 확인).
실측 시간 장부: manifest 15.7분 / tools 36.9 / camlock 56.9 / fixmani 4.6 / wire 21.3, 리뷰 2.5·4.0·2.1분.
## 실측 증거
13커밋 착지·전 게이트 green·독립 리뷰 critical 2건.
## 재현/반증법
해당 조항 약화 제안 시 이 실적을 반증해야 한다.
## 제안
배치 원칙(보고 한 줄 결론): 규칙 추가가 아니라 **이미 있는 규칙을 빠뜨릴 수 없는 위치(Preflight
게이트·명령 예시·스키마 필드)로 승격**. 이번 실수 3건이 전부 "템플릿 말단에는 있는데 지휘부 게이트로
승격 안 됨" 형태.
