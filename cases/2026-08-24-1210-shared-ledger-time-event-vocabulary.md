---
skill: shared/ledger.md
project: jongmin-skills 구조 감사 (CX 전문 리뷰, 2026-08-24)
observed-version: 1.9.1
status: pending
severity: minor
related: 2026-08-24-0154-shared-ledger-time-ledger-cli (applied 1.9.0 — 그 어휘 한계)
---
## 실패 형태
시간 이벤트 8종에 review/fix/재확인/문서 관리/full 게이트/배타 측정 구간이 없고
land_done→verify_start 공백 미계측. 같은 이벤트 재기록은 마지막 값으로 덮어써 재검증·재착지
이력이 사라진다.
## 실측 증거
CX 구조 분석 (n=0 — 첫 실전 계측 전). time-ledger.mjs:20 덮어쓰기 확인.
## 재현/반증법
한 레인에 verify 2회 기록 → report 합계와 원 타임라인 총시간 비교.
## 제안 (배치에서 판정)
첫 실전 웨이브 계측 후 판정 — 어휘 확장은 실제 병목 질문이 생긴 뒤에 (선제 확장은 과설계).
덮어쓰기는 회차 suffix 허용 정도의 최소 수정 후보.