---
skill: handoff
project: YNprinting (2026-08-27 웨이브 — warplan 2·conductor 1(13커밋)·handoff 2·lane-reviewer 2; 원문 experiments/session_20260827_measurements/는 타 기기 로컬 미커밋 — 이 PC 접근 불가)
observed-version: 1.9.1
severity: major
status: pending
related: 2026-08-24-1210-shared-file-lifecycle-missing (repo 밖 파일 수명 축)
---
## 실패 형태
F: handoff가 산출물 수명 전환을 보존하지 않는다. 세션 scratchpad에 측정 원자료·Codex 리포트 4건이
쌓였는데 영구화 항목이 체크리스트에 없어 T1이 즉흥으로 experiments/session_20260827_measurements/로
옮겼다 — 그 결과 **타 기기 로컬에만 존재, 미커밋**(이 케이스 작성 시 접근 불가로 실증). doc-hygiene
3목적지("재계산 비용 큰 산출물은 장부 경로")가 있지만 handoff가 집행하지 않는다.
## 실측 증거
즉흥 이동 1회 → 원문 접근 불가(2026-08-27 큐레이터 실측).
## 재현/반증법
handoff save 시 scratchpad 잔존물 목록·판정 기록 유무.
## 제안 (배치에서 판정 — 보고 P0-5)
handoff save에 「산출물 수명 감사」: scratchpad 전건 목록 → discard / reproducible / promote 판정 →
promote 목적지(장부 경로 — repo experiments/가 아님)·checksum → scratch 제거 전 실존 확인. 응답 본문
스냅샷에 그 목록을 싣는다.
