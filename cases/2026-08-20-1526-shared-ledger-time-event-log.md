---
skill: shared/ledger.md
observed-version: 1.8.3
skill-version: conductor v4.1 (YNprinting 32커밋 웨이브, 2026-08-20)
severity: minor
status: pending
---
## 실패 형태
스킬이 "레인별 시작/종료/대기"를 요구하는데 수집 기구가 없어 duration만 모였다 — 큐 대기·
착지 충돌 빈도를 못 쟀다. 연관: 머지 트레인 보류 판단에 결정식이 없다("대기가 병목이면 깊이 1
검토"뿐 — 대기 비율 임계·red 빈도와 재실행 비용 상쇄·contract drift 커밋 제외 여부 미정).
## 실측 증거
YNprinting 32커밋 웨이브: 시간 장부에 duration 열만 존재, 대기·충돌 계측 0.
## 재현/반증법
ledger.md 시간 장부 규격과 실제 남은 장부 대조 — 이벤트 타임스탬프 필드 부재 확인.
## 제안 (배치에서 판정)
append-only 시간 이벤트 장부(레인 발진·착지 요청·착지 완료·대기 시작/끝·충돌). 머지 트레인
결정식은 이 계측 데이터가 쌓인 뒤에만.
**배치 금지선: 머지 트레인 도입 금지** — CX: "32커밋에서 T1 대기가 거의 없었다면 도입 근거가
없다." 계측이 선행.
