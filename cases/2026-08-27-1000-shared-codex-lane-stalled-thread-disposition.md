---
skill: shared/codex-lane.md
project: YNprinting (2026-08-27 웨이브 — warplan 2·conductor 1(13커밋)·handoff 2·lane-reviewer 2; 원문 experiments/session_20260827_measurements/는 타 기기 로컬 미커밋 — 이 PC 접근 불가)
observed-version: 1.9.1
severity: major
status: pending
related: 2026-08-20-1526-shared-codex-lane-cx-deadline-conflict (applied 1.9.0 — 점검 시점은 정했으나 점검 후 처분 미정)
---
## 실패 형태
I: events.jsonl이 253KB에서 멈춘 채 프로세스만 6개 남는 상태. "15분은 kill이 아니라 점검 시점"은
있는데 **점검 후 무엇을 하는지가 판정 가능하지 않다** — T1이 즉흥 판단.
## 실측 증거
정지 스레드 6프로세스 잔존.
## 재현/반증법
생존 판정 절의 각 분기에서 다음 행동이 하나로 결정되는지 상태표 대입.
## 제안 (배치에서 판정)
점검 결과별 처분표: 진척 있음→연장 / 무진척+부분 산출→회수 후 resume 1회 / resume 실패→PID kill +
강등 보고 / 중복성 취소 해당→즉시 정지. 각 분기에 벽시계 상한.

**정정 (1.9.2 handle-only 계약)**: "resume 실패 → PID kill" 처방은 "resume 잡 핸들 TaskStop"으로 교정 —
표준 발진 식별자는 PID가 아니라 run_in_background 잡 핸들.
