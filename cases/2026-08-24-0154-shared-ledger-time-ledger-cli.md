---
skill: shared/ledger.md
project: chess-masterplan (1단계 웨이브 — 쓰기 11·리뷰 3·CX 5·커밋 23·3h03m)
observed-version: 1.8.2
severity: minor
status: pending
related: 2026-08-20-1526-shared-ledger-time-event-log (YNprinting — 독립 2건째)
---
## 실패 형태
시간 장부가 수동 echo — 레인 시작/종료만 손으로 적고, 규격이 요구하는 미착지 큐 대기·검증 실행
대기·판정 구간은 기록 불가.
## 실측 증거
이번 웨이브 시간 장부에 큐 대기·판정 구간 공란.
## 재현/반증법
ledger.md 3절 요구 항목과 실제 장부 대조.
## 제안
`lane start <id>` / `lane land <id> <sha>` 고정 스크립트로 자동 계산. YNprinting 케이스와 동일 축 —
독립 2건 성립.
