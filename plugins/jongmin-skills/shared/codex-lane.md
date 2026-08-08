# CX 레인 — codex exec 자동화 어댑터

역할 정의는 [model-tiers.md](model-tiers.md) 참조: CX는 명세 생성·대안·반박 자문. 리뷰 소견은 자동 반영 금지.

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

## 데드라인

codex에는 타임아웃 플래그가 없다. 지휘부가 데드라인(기본 15분)을 관리한다:
초과 시 잡을 정지하고, 부분 로그(`codex-events.jsonl`)는 보존해 원인을 확인한다.

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
- read-only 샌드박스는 **파일 쓰기만** 막는다 — codex에 MCP/네트워크가 설정돼 있으면
  부수효과는 별개다. 민감 저장소에서는 제한 프로필 사용을 검토한다.
- codex 미설치/미인증 환경: CX 레인을 Claude 에이전트(read-only 도구 제한 + 반박 지향 감사
  프롬프트)로 강등한다. 타 모델 교차검증 이점은 줄지만 독립 컨텍스트 검증 이점은 유지된다.
