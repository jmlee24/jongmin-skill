---
skill: jongmin-dev-conductor
project: YNprinting
observed-version: 1.8.3
skill-version: conductor v4.1 (YNprinting 32커밋 웨이브, 2026-08-20)
severity: major
status: pending
---
## 실패 형태
레인 프롬프트 3~4천 자, 절반 이상이 반복 블록. 복제 중 게이트 수치 전사 오류 실측(plan
1982줄 vs 실측 1984줄 — 레인이 잡아 줌). **독립 사례 2건째** —
2026-08-19-2347-jongmin-dev-conductor-common-brief-delta.md와 같은 축.
## 실측 증거
YNprinting 32커밋 웨이브: 쓰기 레인 8개 전건, 전사 오류 1건.
## 재현/반증법
현행 6요소를 규약 있는 repo에서 채워 레인 2개 이상의 프롬프트를 diff — 공통 블록 비율 측정.
## 제안 (배치에서 판정)
공통 wave briefing 1회 생성 + 레인별 델타. CX 단서: **브리핑은 발진 후 불변, SHA/해시로 고정**
— 아니면 레인마다 다른 브리핑을 본 것이 된다. 에이전트는 세션 컨텍스트를 못 보므로 결국
복제된다 — 실효는 "T1이 한 번 만들어 그대로 붙인다" + 전사 오류 제거. 6요소 폐지가 아니라
중복 제거. 반복되는 전체 Forbidden 목록도 여기로 압축(소유권 이득의 핵심은 Owned 명시 ·
공용/타 레인 금지 · 모순 시 멈추고 보고 · 신규 파일 허용 넷).
선행 케이스의 적용 조건(에이전트 scratchpad 접근 실 프로브) 유지.
