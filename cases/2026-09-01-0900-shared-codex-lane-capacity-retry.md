---
skill: shared/codex-lane.md
project: YNprinting (2026-08-31~09-01 웨이브 — warplan→conductor→handoff, 24커밋·쓰기 5·리뷰 2·CX 11프롬프트/18산출·스윕 15런)
observed-version: 1.9.2
severity: major
status: pending
related: 2026-08-27-1000-shared-codex-lane-stalled-thread-disposition (처분표 축 — capacity는 별 분기)
---
## 실패 형태
CX 모델 용량 초과(capacity) 실패에 재시도 규약이 없다 — 무응답·중복 데드라인 규약은 있으나 다른 종류.
18회 중 6회 실패(33%). warplan CX 2차가 2회 연속 실패 후 3회차 성공했고, 그 사이 T1이 편성표 v1을
사용자에게 제시했다가 v2로 크게 뒤집음.
## 실측 증거
capacity 실패 6/18. 사용자가 계획을 두 번 읽음.
## 재현/반증법
codex 응답의 capacity 오류 코드를 events/err에서 식별 → 현행 문서에 분기 없음 확인.
## 제안 (배치에서 판정 — 보고 우선순위 2)
capacity 오류 분기: ⓐ 즉시 1회 재시도 ⓑ 실패 시 지연 후 백그라운드 재시도 ⓒ 결과 도착 전까지 그 CX에
의존하는 산출물을 사용자에게 제시하지 않는다(제시하면 UNVERIFIED 표기 필수). 처분표 케이스와 함께 판정.
