---
skill: jongmin-dev-conductor
project: YNprinting
observed-version: 1.8.3
skill-version: conductor v4.1 (YNprinting 32커밋 웨이브, 2026-08-20)
severity: major
status: applied
applied-version: 1.9.0
---
## 실패 형태
접합 종료 조건이 없다 — 문서 웨이브에서 리뷰→접합→리뷰→접합 3사이클, 매 사이클이 새
minor를 낳았다. 현행 스케줄 "critical 즉시 / major 다음 쓰기 전 / minor 종료 묶음"은 **최초
보고 severity를 그대로 신뢰**하는데, 리뷰어가 이번에 3번 틀렸다. 또 conductor 본문이 CX
불일치만 강조해 "T2 리뷰는 더 권위 있다"로 오독되기 쉽다 — reviewer-prompt에는 "리뷰 지적도
T1이 실측할 주장"이 이미 있으므로 규칙 부재가 아니라 강조 위치 문제.
## 실측 증거
YNprinting 32커밋 웨이브: 리뷰 레인 5회, severity 오판 3건, 접합 3사이클.
## 재현/반증법
리뷰 소견이 minor→major 승격되는 픽스처로 현행 문서가 어느 시점에 접합을 끝내는지 확인 —
종료 조건이 없어 결정 불가.
## 제안 (배치에서 판정)
최소 규칙: 스케줄 기준은 도착 severity가 아니라 **T1 재분류 severity**(재현 전까지
provisional) / critical·major 수정은 변경 범위 재리뷰 / 재리뷰에서 새 critical·major 0 &&
full gate green이면 종료 / 새 minor는 기록 + 수용·유예 판정 후 종료 가능.
미정 항목: 다음 쓰기가 이미 시작된 뒤 major로 승격됐을 때의 처리 · stale 리뷰의 severity 유지
여부. conductor 본문의 리뷰 독립성 설명은 "더 높은 권위"가 아니라 "다른 오류 분포 추가"로.
