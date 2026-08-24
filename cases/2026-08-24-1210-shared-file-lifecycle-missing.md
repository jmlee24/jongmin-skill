---
skill: shared/
project: jongmin-skills 구조 감사 (CX 전문 리뷰, 2026-08-24)
observed-version: 1.9.1
status: pending
severity: major
related: 2026-08-24-0154-shared-doc-burn-after-wave (문서 위생 축 — repo 밖 파일로 확장)
---
## 실패 형태
repo 밖 영속 산출물(장부 .md·time-events.tsv·loop 상태 .stale·hook.log)에 종료·소각 수명이
없다 — "사용자가 주기적으로 정리"뿐. doc-hygiene 소각은 repo 문서만 다룬다. 사용자 방향:
"파일을 최대한 없애는 게 낫다".
## 실측 증거
CX 전수 도전 (2026-08-24). ledger:8 보존 조항 대조.
## 재현/반증법
loop/sortie/CX 모의 10회 후 잔존 파일 전수 나열 → 활성 reader 없는 파일 개수 확인.
## 제안 (배치에서 판정)
장부는 active 1개 + 종료 시 응답·cases 승격 후 정리, tsv는 report 산출 후 정리, .stale TTL·
hook.log rotation. 단 improve 배치가 과거 장부를 실제 소비하는지 먼저 실측 — 소비 실적이
있으면 보존 유지.