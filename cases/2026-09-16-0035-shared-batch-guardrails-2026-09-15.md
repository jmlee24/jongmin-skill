---
skill: shared/
project: YNprinting (2026-09-14~15 화면 채움·오버레이 웨이브 — conductor, 15커밋 feat4·fix2·test4·docs5, 쓰기 R1/R2/F1/F2 1h55m, deep 2·재확인 2·CX-A 1·CX-B 2, 벽시계 2h11m, Codex 반박 5건 접합판)
observed-version: 1.12.1
severity: minor
status: pending
related: 2026-09-15-2127-shared-batch-guardrails-2026-09-14 (직전 웨이브 — 이 웨이브는 그 "다음 웨이브 실험 3건"의 결과), 2026-09-16-0035-shared-landing-check-full-promotion-mechanize, 2026-09-16-0035-jongmin-dev-conductor-cx-b-skip-conditions, 2026-09-16-0035-shared-landing-check-nondeterminism-base-tip-compare, 2026-09-16-0035-agents-lane-reviewer-time-varying-input-axis, 2026-09-16-0035-jongmin-dev-conductor-skill-vs-runbook-precedence, 2026-09-16-0035-handoff-check-paren-token-false-unverified, 2026-09-16-0035-jongmin-dev-conductor-procedure-discoverability
---
## 실패 형태
(결함이 아니라 배치 지침) 1.12.1 두 번째 실전 웨이브. 보고서는 T1 초안을 Codex 반박 5건(major 4·minor 1)으로
정정한 접합판이며, **초안이 과대 서술한 3곳을 Codex가 뒤집었다** — 이 자체가 "CX 소견은 자문·T1 대조"
규약의 실효 사례다.

**검증 층 실적 — 축소 금지**
① lane-reviewer 뮤테이션 축이 최대 가치 — 비등가 생존 뮤턴트 13 → 전건 KILLED. 경계(s+H==end_row)·절삭
위장·throttle 전이·GL 오버레이 그리기/재도장·글자·색이 전부 "green인데 안 잠겨 있음"으로 드러남. 리뷰어가
"offscreen은 GL을 못 잠근다"는 **문서 주장을 직접 프로브로 반증**.
② CX-A 설계 반박 5건 전부 코드로 확인돼 R2 프롬프트에 반영. 단 Codex 정정: GL 재도장·공허 시험 2건은 착지
후 리뷰에서 다시 잡혔으므로 "예방"이 아니라 **절반 사전 반영·절반 이중 검출**. "최고 ROI·의무화" 철회.
③ executor 사양 이탈 보고 3회 옳음(P ≤ H 단일 placement / qtbot.mouseClick은 형제 겹침을 못 봄 /
_paint_scene 추출 없이는 뮤턴트가 안 죽음) — 직전 웨이브·08-30·09-01에 이어 이 조항의 실효 4회째.
④ 발진 검증기 4회 PASS, 재확인 SendMessage 5·8분(신규 deep 대신), disjoint fix 레인 병렬(F1 ∥ R2), 충돌 0,
착지 대기 0 — 전부 **기존 규약 안의 적용 사례**(초안이 "신설 제안"으로 오인한 것을 Codex가 재분류).
⑤ Codex 기각이 옳았던 건: "R2를 R1 게이트 전에 발진" 의혹은 TSV상 R1 판정 14:40 → R2 발진 14:43으로 반증.
pkill 실행은 장부에 명령 원문이 없어 UNVERIFIED 처리(실제는 런북 §5.1 원문 실행 — 보고서에 기록).

**직전 웨이브 실험 3건의 결과**
- 실험 1(구현 1레인·커밋 2~3개): R1→R2 직렬 + fix F1·F2. 쓰기 합계 1h55m, 벽시계 2h11m(직전 3.5h 대비).
- 실험 2(오버레이 실기 확인 초반 통과 조건): 실기 데모는 종료 시점 1회 — 실기 발견 4건(피치 지터 커서 리셋·
  삭제된 QLabel 접근·셸 여백·페이서 block 모드 오해)이 **전부 데모 후**에 나왔다. 초반 확인이 실행됐는지
  보고서에 없음 → 미실행 또는 미기록.
- 실험 3(통합 리뷰 1회 + 재확인 1회): deep 2회 + 재확인 2회(5·8분). 재확인 비용이 직전 591k에서 정상 범위로 —
  단 범위 축소 효과인지 절차 효과인지 미분리(recheck-template-cost 관측 추가 참조).

**규약 준수 실패(스킬 결함 아님 — 기존 조항 위반, 배치에서 "기계 강제 여부"만 판정)**
- full 자동 승격 누락(landing-check :69-72 위반) → 별도 케이스(기계화 제안).
- F2 CX-B 생략을 "접합 전용"으로 정당화 — F2에 동작 변경 있었음 → 별도 케이스.
- T1 docs 커밋 2건 중 검증 범위 주장을 고친 e7789559는 "정본 의미 변경"(conductor 7절 :196 — fix 레인 몫).
  조항은 있으나 경계 판정 기준이 없다 — doc-hygiene 5판정에 "검증 범위·수치 주장 변경 = 의미 변경" 1줄 후보.
- "동작 오류 0" 주장은 리뷰 범위 안에서만 성립 — 시변 입력·종료 경로 미검출 3건 → lane-reviewer 축 케이스.

**프로젝트 측(스킬 무관, 기록만)**: document-lifecycle-recheck Stop 훅이 문서 변경 없는 턴에도 약 25회 발화 —
턴 단위 diff 조건 또는 연속 발화 억제. 프로젝트 훅.
## 실측 증거
사용자가 붙여넣은 접합판 보고서 원문(2026-09-15, 응답 본문이 정본 — 파일 미생성). 근거는 그 웨이브의
장부·time-events.tsv·게이트 원문이나 **이 기기에는 없음**(타 기기 실행). SHA e7789559는 보고서 인용.
## 재현/반증법
위 ①~④ 조항 약화 제안 시 이 실적을 반증해야 한다. 실험 2는 다음 웨이브에서 "초반 실기 확인" 실행·기록
여부를 장부 이벤트로 남겨 재판정.
## 제안
배치 시 이 웨이브를 **"규약은 있고 준수가 빠진" 유형의 표본**으로 쓴다 — 산문 추가가 아니라 게이트 기계화
(full 승격·CX-B 생략 조건)로 처리. 다음 웨이브 실험: 실기 확인을 R1 착지 직후 이벤트(`verify_output` 메모
"demo")로 강제 기록.
