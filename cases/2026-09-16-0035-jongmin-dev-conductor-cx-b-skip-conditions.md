---
skill: jongmin-dev-conductor
project: YNprinting (2026-09-14~15 오버레이 웨이브 — CX-B 2회 실행, F2 생략)
observed-version: 1.12.1
severity: minor
status: pending
related: 2026-08-26-0930-shared-codex-lane-conditional-launch-fact-check, 2026-09-16-0035-shared-batch-guardrails-2026-09-15
---
## 실패 형태
두 갈래.
① conductor 3절 CX-B는 "착지물당 1회"(:140)다. F2를 "접합 전용 레인"이라며 CX-B를 생략하고 ledger 5절
「검증 게이트 생략」란에 사유·대체 통제를 적었다. 그러나 F2에는 `_paint_scene` 추출·정지 배치 변경 등
**동작 변경**이 있었다 — 생략 기록이 있어도 면제가 아니다. 구조적 원인: "생략 가능한 착지물"의 조건이
어디에도 없어서 장부의 생략 기록란이 사실상 자유 면제권으로 작동한다.
② CX-B 소견은 LOW·심각도 과대(raster 한정 문제를 HIGH)가 많았지만 numerics·DPR·수명주기에서 **가족
리뷰어(lane-reviewer)가 못 본 고유 검출**을 냈다. 초안은 범위를 세 축으로 제한하자고 했고 Codex가 기각 —
제한하면 고유 검출도 잃는다. 대신 프롬프트 문구로 우선순위만 준다.
## 실측 증거
보고서 미비 #2(Codex 지적, T1 확인)와 정책 표 CX-B 행. 장부는 이 기기에 없음.
## 재현/반증법
- conductor 3절·ledger 5절에 CX-B 생략 허용 조건 grep — 없음(ledger는 기록란만).
- 반증: 생략 조건을 "diff가 docs·test 전용"으로 두고 한 웨이브를 돌려, 생략된 착지물에서 리뷰·실기가 동작
  결함을 내면 조건이 틀린 것.
## 제안 (배치에서 판정)
1. conductor 3절 CX-B 1줄: **"생략은 diff가 문서·시험 전용(소스 변경 0)일 때만 — 소스가 한 줄이라도 있으면
   착지물당 1회 유지."** ledger 「검증 게이트 생략」란에 "생략 조건 충족 근거(`git diff --stat` 원문)" 요구.
2. CX-B 프롬프트 표준(codex-lane.md 산출 형식)에 1줄: "가족 리뷰어(lane-reviewer)가 보기 어려운 축 —
   numerics·DPR·수명주기·플랫폼 의존 — 을 우선한다". 범위 제한은 하지 않는다.
