---
skill: jongmin-dev-conductor
project: YNprinting (2026-08-27 웨이브 — warplan 2·conductor 1(13커밋)·handoff 2·lane-reviewer 2; 원문 experiments/session_20260827_measurements/는 타 기기 로컬 미커밋 — 이 PC 접근 불가)
observed-version: 1.9.1
severity: major
status: pending
related: 2026-08-26-1100-jongmin-dev-conductor-exclusive-window-resource-model, 2026-08-26-0930-jongmin-dev-conductor-exclusive-window-load-record, 2026-08-20-1526-shared-executor-prompt-exclusive-resources (applied 1.9.0) — 자원 경합 축 3세션째
---
## 실패 형태
B (보고 critical) + K (major): 레인 3개가 각자 pytest tests/unit을 돌렸는데 이 저장소엔 **실 카메라
테스트**가 있어 경합 → 거짓 실패, T1이 단독 재실행으로 판별. executor 6요소에 Exclusive resources
필드(1.9.0)는 있지만 conductor 배타 구간은 "지휘부가 실측을 돌리는 동안"만 적용 — **레인 간 경합은
규칙이 없고** Preflight에 자원 인벤토리가 없다. 리뷰어에게도 "절대 pytest 돌리지 마라 — 실 카메라"를
2건 모두 수동 지시 — reviewer-prompt에 자원 제약 축 부재(K, 같은 뿌리).
## 실측 증거
거짓 실패 → T1 단독 재실행 판별. 리뷰 프롬프트 2건 수동 삽입.
## 재현/반증법
배타 자원 공유 테스트가 있는 레포에서 레인 2개 동시 pytest.
## 제안 (배치에서 판정 — 보고 P0-3)
Preflight 「환경·자원 매니페스트」: 하드웨어·포트·DB·캐시별 자원 ID + 동시 실행 한도, 테스트 분류
lane-safe / exclusive / integration-only → 같은 exclusive 자원을 가진 레인 사이 **DAG mutex 간선**
자동 생성. reviewer-prompt에 자원 제약 필드. 축 3세션 관측 — 독립 2건 성립.

**정정 (CX 구조 리뷰, 2026-08-27)**: "같은 exclusive 자원 레인 사이 DAG mutex 간선 생성" 처방은 철회 —
mutex는 인과 의존이 아니라 스케줄링 제약이라 DAG에 넣으면 임의 선후관계와 stale BASE를 만든다. 별도
capacity/lock 제약으로 모델링 (architecture-manifest-executed-entrypoint 케이스 참조).
