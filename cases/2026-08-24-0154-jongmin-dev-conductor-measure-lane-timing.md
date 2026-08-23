---
skill: jongmin-dev-conductor
project: chess-masterplan (1단계 웨이브 — 쓰기 11·리뷰 3·CX 5·커밋 23·3h03m)
observed-version: 1.8.2
severity: major
status: pending
related: 없음
---
## 실패 형태
측정 레인과 수정 레인의 순서 규칙이 없다. 측정 레인을 대상 착지 직후 발진했는데 그 대상의 deep
리뷰가 critical을 내면서 측정 보고서가 즉시 stale — 측정을 2회 더 재실행.
## 실측 증거
L4 발진 후 L3 리뷰 critical → L5·L6 재측정, 벽시계 약 25분 낭비.
## 재현/반증법
측정 레인 발진 시점과 대상 범위 리뷰 접합 시점을 시간 장부에서 대조.
## 제안
측정 레인은 대상 범위 deep 리뷰 접합 후 발진 — 또는 측정 스크립트 커밋과 보고서 JSON 커밋을
분리해 JSON만 재생성.
