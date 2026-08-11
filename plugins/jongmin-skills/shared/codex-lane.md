# CX 레인 — codex exec 자동화 어댑터

역할 정의는 [model-tiers.md](model-tiers.md) 참조: CX는 명세 생성·대안·반박 자문. 리뷰 소견은 자동 반영 금지.

## 산출 형식 표준 (전 레인 공통)

T1 접합의 병목은 CX 실행이 아니라 **독해**다. CX 프롬프트에 다음 형식을 요구한다:

- **Top 5 findings 이내** + 항목별 severity(critical/major/minor) + T1이 실측할 검증법
- 장문 서술 금지 — 근거는 항목당 2~3문장
- 자문 지위 명시: "자동 채택되지 않으며 T1이 실측으로 접합한다"

산출 형식 실물 예시 (판정 가능한 수준의 축약본):

```markdown
1. **major** — retire()가 빈 completed를 은퇴시킬 때 exit_signal을 stalled로
   덮지 않아 .stale에 허위 완료 기록이 남는다.
   T1 검증법: 필드 없는 completed로 run()을 4회 호출 후 .stale JSON의 exit_signal 확인.
2. **minor** — 로그는 실패 환경에서 무한 증가하나 수십 KB/day 수준.
   T1 검증법: node를 숨긴 채 훅 100회 반복 후 wc -l hook.log.
(이하 Top 5까지 — 항목당 2~3문장, 자동 채택되지 않음)
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

동시 프로세스 기본 3, 예외 4. T1 접합 큐가 `critical > 0`, `major > 5`,
`deferred > 12` 중 하나라도 넘으면 새 CX 발진을 멈추고 먼저 접합한다.
백그라운드는 벽시계 비용이 0이지만 접합 비용은 숨겨지지 않는다.

## 기본 패턴 (백그라운드 실행)

```bash
codex exec --sandbox read-only --json \
  --output-last-message "<scratchpad>/codex-out.md" \
  "<프롬프트>" > "<scratchpad>/codex-events.jsonl" 2> "<scratchpad>/codex-err.log" < /dev/null
```

`run_in_background`로 실행하고, 완료 알림 후 `codex-out.md`만 읽으면 된다.

- `< /dev/null` 필수 — stdin이 열려 있으면 "Reading additional input from stdin..."으로 행 (실측 확인)
- `--sandbox read-only`는 기본값이어도 **명시 고정**한다
- `-m`/`--model` 지정 금지 — 티어 규칙([model-tiers.md](model-tiers.md))
- stdout(JSONL 이벤트)과 stderr(진행 로그)를 **분리 캡처**한다 — 섞으면 파싱이 깨진다
- 최종 답변은 `--output-last-message` 파일에서 회수한다
- 실행 전 모델 식별자를 장부에 기록: `grep '^model' ~/.codex/config.toml`

## 후속 턴 (resume)

`codex-events.jsonl`의 `thread.started` 이벤트에서 `thread_id`를 파싱해 두고 (실측 확인: `{"type":"thread.started","thread_id":"..."}`):

```bash
codex exec resume <THREAD_ID> --sandbox read-only --json \
  --output-last-message "<scratchpad>/codex-out-2.md" "<후속 프롬프트>" < /dev/null
```

`resume --last`는 레인이 겹칠 수 있으므로 금지 — 항상 ID를 지정한다.

## 데드라인·생존 판정 — kill은 최후 수단

codex에는 타임아웃 플래그가 없다. 기본 15분은 **점검 시점**이지 kill 시점이 아니다
(큰 diff 리뷰는 15분을 정상적으로 넘긴다 — 실측된 사망 오판 사례에서 개정):

1. **생존 판정**: `codex-events.jsonl` 크기/mtime 증가, stderr 로그 변화 = 살아 있음 → 15분 연장
2. **무신호 시에도 kill 전에**: `--output-last-message` 부분 산출 확인 → `thread_id` 회수 후
   resume으로 이어받기 시도. 부분 산출(반례·의심 축·초안)도 회수 가치가 있다 — 버리지 말고 접합
3. **kill·강등은 최후 수단** — Claude 감사로 강등하면 보고에 반드시 명시:
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
- **인코딩**: CX가 한글 주석·docstring을 오독할 수 있다 (실측: UTF-8 파일을 깨진 것으로 판단해
  오탐 발생). 원문 판독이 걸린 판정은 UTF-8 고정 확인(`py -3`로 `open(f, encoding='utf-8')` 파싱)
  후 T1이 내린다. 검증 스크립트의 한글 stdout도 콘솔 cp949에서 깨질 수 있으니 판정 문자열은
  영문/ASCII로 출력하는 편이 안전하다.
- read-only 샌드박스는 **파일 쓰기만** 막는다 — codex에 MCP/네트워크가 설정돼 있으면
  부수효과는 별개다. 민감 저장소에서는 제한 프로필 사용을 검토한다.
- codex 미설치/미인증 환경: CX 레인을 Claude 에이전트(read-only 도구 제한 + 반박 지향 감사
  프롬프트)로 강등한다. 타 모델 교차검증 이점은 줄지만 독립 컨텍스트 검증 이점은 유지된다.
