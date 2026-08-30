---
skill: jongmin-dev-conductor
observed-version: 1.9.2
project: YNprinting (2026-08-29~30 세션 — 착지 9커밋·쓰기 레인 5·리뷰 1·CX 6(+샌드박스 실패 2)·접합 major 5·minor 1·nit 1; 설치본 1.9.2 — conductor:207 pkill 경고 문구 인용으로 확인)
severity: major
status: pending
---
## 실패 형태
접합 배칭 지침이 없어 사이클을 낭비 — "언제 모아 보낼지"를 안 다룬다. 8/20
splice-termination-severity는 v4.2(4883ca5)에서 **T1 재분류 severity·접합 종료 조건으로 적용됨**
(conductor 5·6절 확인) — 이 케이스는 그 적용 이후 관측이며, 잔여분은 **전송 시점 배칭**뿐이다.
## 실측 증거
T-B에 major 1건 → 나중에 major 3건+nit을 따로 보내 2사이클. 리뷰·CX 결과를 기다렸다 한 번에
보냈으면 1사이클. (접합 지적 총 major 5·minor 1·nit 1)
## 재현/반증법
conductor 6절에서 "대기 후 묶음 전송" 조항 grep — 없음.
## 제안 (배치에서 판정) — 보고서 우선순위 5
"살아있는 레인이 있고 추가 검토가 진행 중이면, critical이 아닌 한 도착을 기다려 1회로 묶는다.
critical만 즉시." — 현행 5절 "critical 즉시 / major 다음 쓰기 전 / minor 종료 묶음" 스케줄에
"진행 중 검토 대기" 1구를 붙이는 형태로 순증 1~2줄.
