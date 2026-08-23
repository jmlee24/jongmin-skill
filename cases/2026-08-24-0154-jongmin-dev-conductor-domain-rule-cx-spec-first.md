---
skill: jongmin-dev-conductor
project: chess-masterplan (1단계 웨이브 — 쓰기 11·리뷰 3·CX 5·커밋 23·3h03m)
observed-version: 1.8.2
severity: major
status: pending
related: 2026-08-19-2347-jongmin-dev-conductor-briefing-evidence-gate (전제 검증 축 — 관련)
---
## 실패 형태
지휘부가 도메인 규칙(체스 구조 정의)을 프롬프트에 직접 썼는데 틀렸고 critical이 됐다. 스킬은
"근거 수집의 질이 프롬프트의 질"이라 말하지만, 전문 규칙을 박는 레인은 CX-A 명세 검증 후 발진하라는
지시가 없다.
## 실측 증거
CX-A를 L3 명세에만 썼고 L2에는 안 썼다 — 그 L2(칼스바드 규칙)에서 critical. 리뷰어가 뮤테이션 21종 +
체스 지식으로 반증.
## 재현/반증법
도메인 규칙 포함 프롬프트의 CX-A 선행 여부와 critical 발생의 상관을 웨이브 장부에서 확인.
## 제안
지휘부가 전문 규칙을 직접 쓰는 레인은 CX-A 선행 필수.
