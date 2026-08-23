---
skill: jongmin-dev-conductor
project: chess-masterplan (1단계 웨이브 — 쓰기 11·리뷰 3·CX 5·커밋 23·3h03m)
observed-version: 1.8.2
severity: major
status: pending
related: 없음
---
## 실패 형태
대형 레인이 끝날 때까지 후속 레인이 기다린다 — "동기 대기 금지"를 말하지만 T1은 sleep 백그라운드
12회 반복, 병목은 T1 판정이 아니라 레인 벽시계 자체(28분·36분).
## 실측 증거
L3 28분 동안 L4 대기. 편성표 크기 추정("중")이 실측(L3 = L1의 2배, 215k 토큰)과 어긋남.
## 재현/반증법
시간 장부에서 T1 순수 대기 구간 합산.
## 제안
2커밋 이상 레인은 커밋 1 착지 시점에 후속 레인 발진 허용. warplan 크기 추정에 실측 단위(분·토큰) 도입.
