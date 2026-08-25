---
skill: jongmin-dev-conductor
project: YNprinting (12커밋 웨이브 2026-08-25~26 — 쓰기 4·리뷰 1·CX 5·동시 4)
observed-version: 1.9.1
severity: major
status: pending
---
## 실패 형태
저장소에 전용 측정 도구(tools/run_testcases_sweep.py — 양품/결함 시나리오·원점수 JSONL·추종 여부를
같은 런에서 산출)가 이미 있었는데 T1이 하네스를 새로 짰다. 두 경로가 같은 입력·바이트 동일 골든에서
6~11배 다른 결과를 냈고 그 차이를 쫓느라 세션의 큰 부분을 소모 — 이번 세션 최대 낭비.
## 실측 증거
차이 자체가 진짜 결함(KI-76)이라 헛수고는 아니었으나 전용 도구를 먼저 썼다면 훨씬 일찍 갈렸다.
## 재현/반증법
측정 설계 전 tools/·scripts/ 인벤토리 수행 여부를 장부에서 확인.
## 제안 (배치에서 판정 — 우선순위 2)
Preflight(landing이 아니라 측정 설계 전)에 "이 측정을 이미 하는 도구가 저장소에 있는가"를 넣는다 —
하네스를 새로 짜기 전에 tools/·scripts/를 훑고, 없다고 판단했으면 그 근거를 장부에 남긴다.
