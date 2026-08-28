---
skill: jongmin-dev-conductor
project: YNprinting (2026-08-27 웨이브 — warplan 2·conductor 1(13커밋)·handoff 2·lane-reviewer 2; 원문 experiments/session_20260827_measurements/는 타 기기 로컬 미커밋 — 이 PC 접근 불가)
observed-version: 1.9.1
severity: critical
status: applied
applied-version: 1.9.2
---
## 실패 형태
H (critical, 이번 세션 2회): 중단 정책에 "명령·경로 패턴 일괄 종료 금지 — 호출 셸까지 매칭한 실측"이
**이미 적혀 있는데** 두 번 걸렸다: `pkill -f "cx-skill"` → 그걸 실행한 셸을 죽여 heredoc 작성 중단 /
`pkill -9 -f "codex"` → 명령줄에 codex가 들어 있어 자기 자신 사망(exit 1). 규칙이 산문에 묻혀 실행
시점에 안 떠오른다.
## 실측 증거
자기 살해 2회.
## 재현/반증법
중단 절차를 그대로 따를 때 pkill 패턴이 등장하는지 — 현행은 명령 예시가 없다.
## 제안 (배치에서 판정 — 보고 P0-2. critical — 사용자 결정 대기)
정지 절차를 **명령 예시로 고정**: 발진 시 PID 기록 → `kill <PID>`만. pkill -f 금지를 산문이 아니라
금지 명령 형태로. (time-ledger lane_start 이벤트에 PID를 함께 기록하는 결합 가능.)

**적용 기록 (1.9.2, 긴급 예외)**: T1 초안 "PID 기록 → kill <PID>"는 CX 반박으로 기각 — 표준 발진이
run_in_background면 식별자는 잡 핸들이고 `& echo $!`는 이중 백그라운드화로 도구 잡과 실제 프로세스를
분리시킨다. handle-only(TaskStop) 명령 형태로 conductor·handoff 동일 적용. 반증 조건: TaskStop 뒤 자식
codex가 반복 잔존하면 프로세스 그룹을 소유하는 단일 launcher/stop 스크립트 도입.
