---
skill: jongmin-dev-conductor
project: 미상 — 2026-08-26 웨이브 (warplan→conductor×2→handoff, 25커밋·쓰기 3·리뷰 1·CX 6·측정 3캠페인 22런; D75 회귀 언급)
observed-version: 1.9.1
severity: major
status: pending
---
## 실패 형태
B1: warplan에서 사용자가 확정한 결정표를 conductor가 재사용할 수 없게 돼 있다 — 선행 스킬 산출물 인정
조항이 CX 산출물만 인정하고 사용자 확정 결정은 불인정. 보고 T1은 규약을 어기고 재사용했다 —
텍스트대로 했으면 재질문했을 것.
## 실측 증거
warplan→conductor 연계에서 결정표 재사용 (규약 위반으로 성립).
## 재현/반증법
conductor 3절 "선행 스킬 산출물 인정" 대상 목록 확인.
## 제안 (배치에서 판정 — 3~4줄)
선행 산출물 인정에 "warplan에서 사용자가 확정한 결정표"를 포함 — 발진 배치 질문에서 재질문하지 않는다.
