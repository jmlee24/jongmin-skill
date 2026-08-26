---
skill: jongmin-dev-conductor
project: 미상 — 2026-08-26 웨이브 (warplan→conductor×2→handoff, 25커밋·쓰기 3·리뷰 1·CX 6·측정 3캠페인 22런; D75 회귀 언급)
observed-version: 1.9.1
severity: major
status: pending
related: 2026-08-20-1526-shared-executor-prompt-exclusive-resources (applied 1.9.0 — 자원 모델은 있음), 2026-08-26-0930-jongmin-dev-conductor-exclusive-window-load-record (같은 날 타 세션 — 배타 구간 축)
---
## 실패 형태
F1: 실측 배타 구간을 **CPU 경합으로만** 읽어 측정 오염. 집행점 위치 오류 — executor-prompt 6요소에
이미 올바른 자원 모델(테스트 DB·포트·캐시·생성물 경로)이 있는데 conductor 「실측 배타 구간」 규칙이
그 모델을 참조하지 않아 측정 시점에 전달 안 됨. 지식 부재가 아니라 sentinel 위치 문제.
## 실측 증거
측정 캠페인 3회 중 공유 가변 자원 경합으로 오염된 런 발생 (보고 세션 실측).
## 재현/반증법
배타 구간 선언 시 공유 가변 자원 인벤토리 기재 유무.
## 제안 (배치에서 판정 — 4~6줄)
conductor 배타 구간 항목에 "측정 시작 직전 공유 가변 자원 inventory(6요소 Exclusive resources와 동일
모델)를 sentinel로" — 규칙 추가가 아니라 기존 모델의 집행점 이동.
