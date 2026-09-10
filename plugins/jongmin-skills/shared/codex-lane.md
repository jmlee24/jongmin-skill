# CX 레인 — codex exec 자동화 어댑터

역할 정의는 [model-tiers.md](model-tiers.md) 참조: CX는 명세 생성·대안·반박 자문. 리뷰 소견은 자동 반영 금지.

## 산출 형식 표준 (전 레인 공통)

T1 접합의 병목은 CX 실행이 아니라 **독해**다. CX 프롬프트에 다음 형식을 요구한다:

- 반박·리뷰형은 **Top 5 이내**, severity(critical/major/minor) 내림차순. 명세 생성·규명형 임무는
  프롬프트에서 산출 형식을 별도 지정한다 (실측: 리뷰 형식만 있어 매번 형식을 지어 줘야 했던 사례)
- 항목 = `short_summary(60자, 주장만)` + `파일:라인 @ SHA [생존성]` + 근거 2~3문장 +
  `failure_scenario: 구체 입력·상태 → 기대와 다른 결과`(비동작 지적은 구체 영향 또는 N/A+사유) +
  `T1 verify: 재현/반증 절차`. CX 정적 소견의 verdict는 항상 PLAUSIBLE — T1 실측 판정과 섞지 않는다
- 자문 지위 명시: "자동 채택되지 않으며 T1이 실측으로 접합한다"
- 생존성(LIVE/STALE/DEAD/UNVERIFIED)은 [evidence-liveness.md](evidence-liveness.md). freshness rule(아래)은
  산출 시점의 신선도, 생존성은 인용 대상 자체의 검사 — 서로 대체하지 않는다

산출 형식 실물 예시:

```markdown
1. **major** — retire()가 빈 completed 은퇴 시 exit_signal을 덮지 않음 | verdict: PLAUSIBLE
   scripts/loop-state.mjs:212 @ 7db63d5 [LIVE]; 근거: stalled 분기가 completed 비어 있음을 검사하지 않는다.
   failure_scenario: 필드 없는 completed로 run() 4회 → .stale에 exit_signal "completed" 허위 기록.
   T1 verify: 위 입력으로 실행 후 .stale JSON의 exit_signal 확인.
```

## freshness rule — 백그라운드 리뷰 접합 전 신선도 검사

접합 전에 확인한다: 리뷰 기준 SHA(review_base_sha) vs 현재 HEAD, 그리고
touched files·계약(공개 API·스키마·픽스처) overlap. **overlap이 있으면 stale** —
자동 접합 금지, T1이 재판정한다 (재발진 또는 diff 직접 확인).

판정 실물 예시 (2026-08-11 **타 프로젝트** 실전 웨이브에서 발췌 — 아래 SHA·경로는
그 프로젝트의 것이며 이 repo에서 재현되지 않는다, 판정 흐름만 참고):

```
밀린 리뷰 기준 SHA = 7db63d5, 현재 HEAD까지 커밋 3건 착지. 그중 77d10f7이
같은 파일군(orchestrator·tools)을 만짐 → stale 판정. 자동 접합 금지가 걸려
T1이 6건을 하나씩 재판정 — 6건 전부 현재 HEAD에도 유효, §8은 리뷰가 지목한
4개보다 실측이 많아(도구 7개) 범위 확대로 접합.
```

## 발진 상한 — 접합 큐가 포화되면 던지기를 멈춘다

동시 프로세스 기본 3, 예외 4 — **실행 슬롯** 기준이다 (미접합 결과는 슬롯이 아니라 접합
큐로 센다). T1 접합 큐가 `critical > 0`, `major > 5`(T1 재분류 후 미접합분 — 중복·기각분
제외), `deferred > 12` 중 하나라도 넘으면 새 CX 발진을 멈추고 먼저 접합한다.
백그라운드는 벽시계 비용이 0이지만 접합 비용은 숨겨지지 않는다.

## 기본 패턴 (백그라운드 실행)

```bash
D="<scratchpad>/cx-<레인ID>"; mkdir -p "$D"   # redirection이 codex 실행 전에 경로를 연다
# 프롬프트는 파일 쓰기 도구로 "$D/prompt.md"에 만들고 stdin(-)으로 넘긴다.
# 셸 인라인·heredoc 전달 금지 — 백틱·$가 셸에 먹혀 손상된 채 발진한다 (실측 2회)
codex exec --sandbox read-only --json --output-last-message "$D/out.md" - \
  < "$D/prompt.md" > "$D/events.jsonl" 2> "$D/err.log"
```

`run_in_background`로 실행하고 **반환된 잡 핸들을 즉시 장부에 기록**한다 — 정지·생존 판정의
식별자는 PID가 아니라 이 핸들이다. 셸 `&`를 덧붙여 이중 백그라운드화하지 않는다. 완료 알림 뒤
`out.md`를 회수한다.
**레인마다 디렉터리를 분리한다** — 병렬 CX(기본 3슬롯)가 같은 경로를 쓰면 서로의
events·out을 truncate하고 thread ID·생존 판정이 섞인다. 접합 완료 후 디렉터리 소각.

- 프롬프트는 stdin `-`로 파일에서 읽는다 — stdin이 터미널·열린 파이프면 추가 입력 대기로 행이
  걸린다 (실측 0.149~0.150: 파일 stdin은 exec·resume 모두 정상, 원문 보존)
- `--sandbox read-only`는 기본값이어도 **명시 고정**한다
- `-m`/`--model` 지정 금지 — 티어 규칙([model-tiers.md](model-tiers.md))
- stdout(JSONL 이벤트)과 stderr(진행 로그)를 **분리 캡처**한다 — 섞으면 파싱이 깨진다
- 최종 답변은 `--output-last-message` 파일에서 회수한다
- 실행 전 모델 식별자를 장부에 기록: `grep '^model' ~/.codex/config.toml` —
  키가 없으면(기본값 사용) `codex --version`만 기록하고 "모델 식별자 미회수(기본값)"를 명시한다

## 후속 턴 (resume)

`events.jsonl`의 `thread.started` 이벤트에서 `thread_id`를 파싱해 두고 (실측 확인: `{"type":"thread.started","thread_id":"..."}`):

```bash
D="<scratchpad>/cx-<레인ID>"   # 셸 호출마다 다시 선언
codex exec resume <THREAD_ID> -c 'sandbox_mode="read-only"' --json --output-last-message "$D/out-2.md" - \
  < "$D/prompt-2.md" > "$D/events-2.jsonl" 2> "$D/err-2.log"
```

`resume --last`는 레인이 겹칠 수 있으므로 금지 — 항상 ID를 지정한다.
resume은 `--sandbox`를 받지 않는다 (codex-cli 0.149 실측: unexpected argument —
`-c sandbox_mode`로 지정한다. 버전 갱신 시 재확인).

## 데드라인·생존 판정 — kill은 최후 수단

codex에는 타임아웃 플래그가 없다. 1차 신호는 `run_in_background` **완료 알림**이다 — 폴링하지 않는다.
알림 없이 15분이 지나면 **점검 시점**이지 kill 시점이 아니다 (큰 diff 리뷰는 15분을 정상적으로 넘긴다 —
실측된 사망 오판 사례에서 개정):

1. **생존 판정**: `events.jsonl` 크기/mtime 증가, stderr 로그 변화 = 살아 있음 → 15분 연장
2. **무신호 시에도 kill 전에**: `--output-last-message` 부분 산출 확인 → `thread_id` 회수 후
   resume으로 이어받기 시도. 부분 산출(반례·의심 축·초안)도 회수 가치가 있다 — 버리지 말고 접합
3. **중복성 취소**: CX가 답하려던 질문을 다른 레인(리뷰·다른 CX)이 이미 전부 답했으면 생존
   여부와 무관하게 정지할 수 있다 — 질문이 소멸했으므로 강등 보고는 불요, 정지 사유만 장부에
   기록한다 (실측: 중복 CX 방치로 벽시계 약 2.5시간 낭비)
4. **kill·강등은 최후 수단** — Claude 감사로 강등하면 보고에 반드시 명시:
   **"CX 벤더 다양성 상실, 독립 컨텍스트 검증만 유지"**. 조용한 강등 금지 — 교차검증의
   핵심 가치가 빠진 채 통과 도장이 찍히는 것을 막는다

## 쓰기 레인과 동시 실행 시 — 스냅샷 고정

쓰기 레인이 트리를 움직이는 동안 codex가 워킹트리를 읽으면 비일관 스냅샷을 보게 된다.
기준 SHA로 read-only worktree를 만들어 그 안에서 실행한다:

```bash
git worktree add "<scratchpad>/ro-snap" "$BASE"
cd "<scratchpad>/ro-snap" && codex exec --sandbox read-only ...
git worktree remove "<scratchpad>/ro-snap"
```

## 주의

- **비 git 경로에서 실행하면 exit 1로 즉시 실패** — `--skip-git-repo-check`가 필요하다 (실측 확인).
  worktree 스냅샷을 scratchpad에 만들 때 걸리기 쉽다.
- **샌드박스에서 인터프리터 실행이 실패할 수 있다** (실측: python 실행 불가 — Windows 로그온 세션
  오류). CX 산출물은 **정적 분석 한정**으로 취급하고, 실행이 필요한 주장(테스트 결과, 재현)은
  T1이 실측 판정한다. CX의 실행 기반 단정은 그 자체로 의심 대상.
  CX가 낸 **실행 절차**도 정적 설계다 — 실행 전에 T1이 ⓐ 플래그·경로 실존 ⓑ 대기·종료
  조건이 실제로 발생하는지 ⓒ 기본값이 이 환경에 맞는지 검증한다 (실측: 대기 조건 문자열이
  측정 종료 후에야 출력되는 것이라 영구 대기가 될 뻔한 사례).
- **인코딩**: CX가 한글 주석·docstring을 오독할 수 있다 (실측: UTF-8 파일을 깨진 것으로 판단해
  오탐 발생). 원문 판독이 걸린 판정은 UTF-8 고정 확인(`py -3`로 `open(f, encoding='utf-8')` 파싱)
  후 T1이 내린다. 검증 스크립트의 한글 stdout도 콘솔 cp949에서 깨질 수 있으니 판정 문자열은
  영문/ASCII로 출력하는 편이 안전하다.
- read-only 샌드박스는 **파일 쓰기만** 막는다 — codex에 MCP/네트워크가 설정돼 있으면
  부수효과는 별개다. 민감 저장소에서는 제한 프로필 사용을 검토한다.
- codex 미설치/미인증 환경: CX 레인을 Claude 에이전트(read-only 도구 제한 + 반박 지향 감사
  프롬프트)로 강등한다. 타 모델 교차검증 이점은 줄지만 독립 컨텍스트 검증 이점은 유지된다.
