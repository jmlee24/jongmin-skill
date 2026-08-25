---
skill: shared/landing-check.md
project: YNprinting (12커밋 웨이브 2026-08-25~26 — 쓰기 4·리뷰 1·CX 5·동시 4)
observed-version: 1.9.1
severity: major
status: pending
related: 2026-08-24-0154-jongmin-dev-conductor-measure-lane-timing (측정 축 — chess-masterplan)
---
## 실패 형태
측정 주장의 모집단·축 방향·단위·측정 창·구성상 불변량이 명시되지 않아 오류 3건: capture_loss는
처분이 block이면 정의상 0인데 걸림(저장소 인수인계가 경고했는데도) / 측정 창은 벽시계가 아니라
산출물의 run_seconds — 79.2s vs 59.67s / inspection_terminal_completed는 이름과 달리 분모가 Stage 3.
## 실측 증거
오류 5·6·7. 원안 "어떤 수치든 카드"는 CX가 과하다고 깎음(테스트 개수·시간 장부까지 매번 의미론
감사 → 착지 병목).
## 재현/반증법
측정 주장이 정본·설계 변경에 쓰이기 전 카드 6항 기재 유무.
## 제안 (배치에서 판정 — 우선순위 4, 범위가 관건)
**설계 변경·인과 주장·정본 갱신에 쓰일 측정 주장만** claim card: 모집단·축 방향·단위·측정 창·구성상
불변량·표본 범위. 특히 "이 구성에서 그 축이 정의상 고정값이 되는 조건"을 적는다. 오류 1(표본
일반화)·3(도구 출력 형식 오독)은 이 카드로 안 잡힌다 — hypothesis-fact 케이스가 담당.
