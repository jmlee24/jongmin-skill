---
skill: jongmin-dev-conductor
project: YNprinting (2026-09-14 웨이브 — warplan→conductor→handoff, 13커밋·리뷰 6회 450k·재확인 591k)
observed-version: 1.12.1
severity: minor
status: pending
related: 2026-08-24-0154-jongmin-dev-conductor-fix-lane-review-path (applied 1.9.0 — "경량 재확인" 경로를 만든 케이스, 첫 비용 실측), 2026-08-20-1526-jongmin-dev-conductor-splice-termination-severity (접합 종료 조건)
---
## 실패 형태
conductor 6절의 "재확인은 경량 경로 — 원 리뷰어에게 SendMessage로 「지적 N건 접합, 범위 SHA..SHA 확인」"
(:187-188)이 **최초 리뷰(450k)보다 큰 591k**를 썼다. 원 리뷰어가 범위 전체를 다시 리뷰하고 새 지적까지
냈다 — 새 지적이 전부 중복은 아니어서 낭비만은 아니지만, "경량"이라는 이름과 실측이 어긋난다.
규약 쪽 구멍: 6절은 메시지 **한 줄 예시**만 있고 재확인 입력·출력 계약이 없다. reviewer-prompt.md는
`change | completion` 두 모드뿐이고(:8) lane-reviewer.md에도 재확인 출력 계약이 없다 — 리뷰어 입장에선
"확인"이 무엇인지(닫힘 판정인지 재리뷰인지) 정의되지 않아 가장 넓은 해석을 택했다.
1.9.0이 fix 레인 미리뷰 착지(chess 6개)를 막으려고 경량 경로를 넣었고, 이번이 그 경로의 첫 비용
계측이다 — 방향은 맞았고 템플릿만 비어 있다.
## 실측 증거
보고서 원문 문제 #3: 최초 리뷰 450k vs 재확인 591k, 초과분 약 141k = Opus 지출의 6%. 새 지적 발생.
장부는 이 기기에 없음.
## 재현/반증법
- reviewer-prompt.md 모드 목록에 recheck grep — 없음. conductor 6절 SendMessage 문구에 지적 ID·닫힘
  증거 요구 grep — 없음.
- 반증: 아래 템플릿으로 재확인을 돌렸는데도 토큰이 최초 리뷰의 절반을 넘으면 템플릿이 아니라 범위
  (fix 커밋이 원 범위 대부분을 다시 만짐)가 원인 — 그때는 fix 레인 자체를 새 deep 리뷰로 취급.
## 제안 (배치에서 판정)
reviewer-prompt.md에 세 번째 모드 **`recheck`** — 입력: `지적 ID 목록 | 각 지적의 수정 커밋 SHA | 닫힘
증거(테스트명·diff 위치)`, 범위는 **fix 커밋 범위만**(원 범위 재리뷰 금지). 출력: 지적별
`CLOSED / OPEN(사유)` + **새 지적은 별도 절**로, fix 범위 안에서만. conductor 6절 문구는 "reviewer-prompt
recheck 모드로" 참조 1줄로 축약. 새 지적을 금지하진 않는다 — 이번에도 실지적이 나왔다.
