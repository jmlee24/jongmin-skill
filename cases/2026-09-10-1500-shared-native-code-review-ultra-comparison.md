---
skill: shared/
project: jongmin-skills 설계 비교 (T1 문서 확인 + CX gpt-6-astra 자문, 2026-09-10 — 클코 네이티브 /code-review·ultra·ReportFindings·Agent isolation)
observed-version: 1.11.0
severity: major
status: pending
related: 2026-09-08-1500-shared-ultracode-workflow-comparison
---
## 실패 형태
클코가 리뷰 기능을 네이티브로 흡수했다 — `/code-review [low|medium|high|max]`(로컬·초 단위), `/code-review ultra`
(클라우드 병렬 리뷰어 fleet + 항목별 독립 검증·중복 제거·심각도 순위, 5~10분, 사용자만 발진, 크레딧 과금),
typed `ReportFindings`(short_summary ≤60자·failure_scenario·verdict CONFIRMED|PLAUSIBLE), `--fix`/`--comment`/`--post`.
패밀리 리뷰 계약(lane-reviewer·reviewer-prompt·codex-lane Top 5)은 "재현/반증법"만 요구해 **실패 조건과 검증
계획이 한 항목에 섞이고**, 큰 경계(웨이브 종료·loop 종료)에서 사용자가 ultra를 돌렸을 때 그 소견을 T1 접합 큐에
넣는 절차가 없다. 또 Agent 도구의 `isolation: "worktree"`(레인별 자동 worktree, 변경 없으면 자동 정리)가
worktree-bootstrap 케이스의 생성·소각 절반을 네이티브로 대체하는데 편성 표에 반영되지 않았다.
## 실측 증거
- 네이티브 사실: code.claude.com/docs/en/ultrareview.md, /code-review.md (2026-09-10 가이드 에이전트 확인). fleet 규모·
  전문화는 문서 미기재(UNVERIFIED). 모델은 ultra를 발진할 수 없다(Bash 포함) — 시스템 프롬프트 명시.
- 패밀리 현행: reviewer-prompt.md 5)출력 "파일:라인 + 근거 + 재현/반증 방법"; codex-lane.md 산출 형식 9~27행;
  conductor §5 167~181·§6 183~189; loop 종료 게이트 82~91; deep-audit 판정 CONFIRMED/PLAUSIBLE/REFUTED(T1 실측 전용).
- CX 자문 원문: scratchpad cx-ultrareview/out.md (세션 ac3acabf). 이 세션에서 실측 실행은 없음 — 전건 정적 판정.
## 재현/반증법
- 제안 ①②: 기존 리뷰 보고 표본 3건을 새 필드로 변환해 T1 독해량·재질문 횟수 비교. 비동작 지적(문서·스타일)에
  failure_scenario 강제가 가짜 시나리오를 만들면 N/A 규칙이 작동하는지 확인.
- 제안 ③: 실전 웨이브 1회 종료 시 사용자가 ultra 실행 → 알림 원문 수신 → 대상 SHA 대조 → 큐 접합까지 추적.
  유효 추가 발견 수·접합 시간·비용 기록. 0건이면 권고 조항 자체를 기각.
- 제안 ⑤: conductor 쓰기 레인 1개를 `isolation: "worktree"`로 발진해 bootstrap(toolchain·fixture) 필요 여부와
  자동 정리 동작을 확인. 수동 `git worktree add` 대비 lane-launch-check 통과 여부.
## 제안 (T1·CX 접합 — 자동 채택 아님)
**채택 후보 (배치에서 판정)**
1. **major** lane-reviewer.md 출력 계약: 항목 = `severity | 파일:라인 | short_summary(60자, 주장만) | verdict` +
   근거 + `failure_scenario(입력·상태 → 기대와 다른 동작)` + 재현/반증. verdict는 T1 실측 전 PLAUSIBLE, 실측 후
   CONFIRMED/REFUTED. 외부 출처 판정은 `source_verdict`로 보존 — 네이티브 CONFIRMED의 권위 이전 차단.
2. **minor** codex-lane.md Top 5에 같은 최소 필드. 예시 2건 → 필드 템플릿 1건 (10→6행).
3. **major** landing-check.md에 「선택 외부 리뷰 — /code-review ultra」 절 신설: 큰 경계에서 1회 **권고만**(사용자
   실행·과금 고지, 모델 발진 금지), 미선택이면 기존 게이트로 계속(대기·차단 없음), 실행분만 장부 pending 등록,
   BASE..TIP·클린 트리 대조, 소견은 provisional severity로 기존 큐·freshness 규칙에 합류. conductor §5·loop 종료
   게이트에는 참조 1줄만. loop의 AskUserQuestion 차단과 충돌 없음 — 권고는 출력이지 질문이 아니다(T1 판정).
4. **major** conductor §6: 원 리뷰어 후속 호출 불가(외부 리뷰) 시 별도 T2가 지적·수정 범위 재확인 — 유료 재실행 요구 금지.
5. **major (T1 추가)** conductor 편성 표·lane-launch-check: 쓰기 레인 격리 옵션으로 Agent `isolation: "worktree"`
   명시. bootstrap(toolchain·fixture 실존·링크)은 여전히 패밀리 몫 — 생성·소각만 네이티브로.
6. **minor (T1 추가)** codex-lane.md 데드라인·생존 판정 절: run_in_background 완료 알림·Monitor를 1차 신호로, 15분
   점검은 폴링이 아니라 알림 부재 시 후속으로 — 문구 단축 후보. README 조합 패턴에 `/simplify`(OMC ai-slop-cleaner
   대체) 1줄.
**압축 후보(CX 추정, T1 미검증)**: reviewer-prompt 3~7행 5→3 / conductor §5 15→11 / §6 7→5 / loop 종료 게이트 10→7 /
codex-lane 예시 10→6 = 47→32행. 신설 ③이 +9행이라 순감축은 약 6행 — 압축이 목적이면 ③을 참조 1줄+보조 파일로.
**기각**: quick/deep을 low/high로 개명(축이 다름 — 진행 차단 vs 커버리지) / ultra 자동·상시·필수 게이트화 /
ultra를 CX 대체재로(벤더 다양성 ≠ 독립 컨텍스트) / 네이티브 CONFIRMED 자동 승격 / ReportFindings 도구·fleet 복제 /
`--fix`·`--post` 기본 연결 / `/rc`·`/simplify`·`/security-review`를 완료 판정 대체재로.
**적용 근거 현황**: 재현 0건·독립 사례 1건(이 비교) — 배치 검토 시 실전 웨이브 1회 실측이 선행 조건. 규약 모순은
없음(ultracode 케이스와 같은 "네이티브 갭만 채움" 원칙 적용).
