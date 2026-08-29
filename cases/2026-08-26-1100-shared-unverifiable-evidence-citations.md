---
skill: shared/
project: 미상 — 2026-08-26 웨이브 (warplan→conductor×2→handoff, 25커밋·쓰기 3·리뷰 1·CX 6·측정 3캠페인 22런; D75 회귀 언급)
observed-version: 1.9.1
severity: minor
status: pending
---
## 실패 형태
B8 (P2): 재현 불가 근거 문구 6건 — doc-hygiene "59건:0건", arxiv 2607.21656, deep-audit "ICML 2025"
(식별자 없음) 등. 규약이 executor에게 요구하는 근거 생존성을 스킬 자신이 안 지킨다.
## 실측 증거
CX 탐지 6건.
## 재현/반증법
각 인용에 검증 버전/날짜/재현 명령 유무.
## 제안 (배치에서 판정 — 8~20줄, 서사 확장 금지)
각 주장에 검증 버전·날짜·재현 명령 중 하나 또는 UNVERIFIED 표기 하나만. 늘리지 않고 표기만.

**관측 추가 (2026-08-29)**: 인용 기본형을 `<SHA>:<path>:<symbol 또는 heading>`으로, 줄 번호는 보조값
(같은 세션 리팩터로도 썩는다 — :808→:1024 실측). evidence-liveness 표기 교체 후보.
