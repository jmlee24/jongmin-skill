---
name: jongmin-loop
description: 완료 조건이 명확한 작업을 오라클 통과까지 반복 실행할 때 사용한다 — 슬래시 명령(/jongmin-skills:jongmin-loop)으로만 시작되며 자연어 요청으로는 발동하지 않는다 (disable-model-invocation). 완료 조건을 오라클(테스트·검증 명령)로 표현할 수 없는 작업, 탐색·리서치성 작업에는 사용하지 않는다.
disable-model-invocation: true
disallowed-tools: AskUserQuestion
argument-hint: "<작업> | cancel"
---

# jongmin-loop — 완료 조건 반복 실행

이 스킬은 **슬래시 명령으로만 시작한다**. 정체성: **완료 조건 폐쇄기** — 스코프 고정 +
자의적 턴 종료 방지 + 이중 종료 게이트. 시간 박스가 아니라 완료 조건으로 달리며,
**질문 없이 목적지를 바꾸지 않는다** (시간 박스·자율 판단은 jongmin-sortie).
완료 조건을 명령·테스트·검증식으로 표현할 수 없으면 loop 부적합이다 — 발진하지 않는다.

**정지 방지의 실체**: 플러그인 Stop 가드(`scripts/loop-stop-guard.mjs`)가 상태 파일을 보고
미완료 상태의 턴 종료를 되민다. "완주 보장"이 아니다 — 권한 프롬프트·크래시·백스톱 도달·스코프
불능은 **명시적 종료 사유**로 남기고 정지하는 것까지가 계약이다.
질문은 frontmatter로 차단되어 있다 — 인자가 모호하면 보수적 해석 + 유예 장부(4요소) 기록으로 전진한다.

티어: 실행 T2, 종료 판정 T2(독립), 최종 착지 검증 T1 — [model-tiers.md](../../shared/model-tiers.md).

## Preflight (발진 직후)

```
- [ ] `cancel` 인자면: `node "<스킬 base dir>/../../scripts/loop-state.mjs" block <프로젝트명>-loop --signal cancelled --reason "사용자 취소"` 실행 후 현황 보고하고 종료
- [ ] 완료 조건을 오라클로 확정 — 실행 가능한 검증 명령. 불가능하면 상태 파일을 만들지 말고 부적합 보고
- [ ] 권한 매니페스트 — 이번 작업이 쓸 도구·경로·명령 범주를 나열하고, 허용 안 된 항목은
      발진 보고에 명시 (권한 프롬프트는 가드가 못 막는 유일한 정지 원인 — 사전에 드러내는 것이 방어)
- [ ] 진행 장부 생성 — ledger.md 형식, 전역 루프 규약의 progress.txt (repo 내 예외)
- [ ] 태스크 분해 — 루프 1회 = 태스크 1개
- [ ] 상태 파일 생성 (아래) — 이것이 Stop 가드를 활성화한다
```

상태 파일은 **CLI로만 만든다** — 손 JSON 편집 금지 (스키마 위반 원천 차단, S3):

```bash
node "<스킬 base dir>/../../scripts/loop-state.mjs" init <프로젝트명>-loop \
  --mode loop --cwd "<프로젝트 절대경로>" --token "<현재 HEAD 해시>" [--session <세션ID>] [--deadline-h 4]
```

파일은 `~/.claude/jongmin-ledgers/active/<프로젝트명>-loop.json`에 생성되며(atomic),
데드라인 기본 4h·최대 8h. 이후 갱신·종료도 같은 CLI의 `tick`/`complete`/`block` 서브커맨드로만.

## 루프 절차 — pipeline conservative

quick 게이트만 동기, deep 리뷰·CX는 백그라운드 누적 → 종료 게이트 일괄 접합.
단 **태스크 간 의존이 있으면 파이프라이닝을 자동 해제**한다 (conductor보다 보수적).

```
- [ ] 1. 장부에서 태스크 1개 (one-task-per-loop)
- [ ] 2. T2 쓰기 레인 발진 — executor-prompt.md 5요소
- [ ] 3. quick 게이트 (동기, 지휘부 직접) — landing-check.md 커밋 게이트를 **전부 수행**
       (impact-scope 테스트·결정론 게이트·diff 검토, 강도 축소 없음). 다음 태스크 진행의
       차단 판정만 critical 기준: 테스트·빌드 실패 / 범위 이탈 / 공개 API·스키마·계약 변경 /
       사용자 기존 변경 덮어쓰기. 백그라운드로 미루는 것은 분석 리뷰(deep·CX)뿐이다
- [ ] 4. deep 리뷰·CX(트리거 해당 시)를 SHA 고정 백그라운드 발진 — 리뷰 큐 기록 (ledger.md 4절)
- [ ] 5. 장부 갱신 + `loop-state.mjs tick <프로젝트명>-loop --token <커밋해시|태스크ID>` —
       갱신하지 않으면 가드가 no-progress로 3회 후 루프를 은퇴시킨다
- [ ] 6. 파이프라이닝 판별 — 다음 태스크가 이번 태스크의 파일·신규 API·픽스처·스키마·설정과
       **disjoint면 즉시 1로**. 하나라도 겹치거나 미접합 major가 그 파일에 있으면
       해당 리뷰를 먼저 접합(freshness rule 확인)한 뒤 1로
- [ ] 7. 남은 태스크 없으면 종료 게이트로 — 리뷰 큐 전 항목 접합이 선행 조건
```

**CX 투입은 상시가 아니라 리스크 트리거 기반이다** — 반복형은 산출물이 폭증해 T1 접합 큐를
오염시킨다 (시간 낭비 금지 제약). 트리거: 같은 실패 2회 / 오라클 green인데 diff가 넓음 /
보안·데이터·마이그레이션·공용 API 변경 / 완료 조건 해석이 갈릴 때. 종료 게이트에서는 상시.
산출은 [codex-lane.md](../../shared/codex-lane.md) Top 5 형식.

## 스코프 고정 (ralph의 스토리 추가와 반대)

- **완료 조건 달성에 필수**이고 스코프 안으로 해석 가능한 하위 작업만 진행 (분해는 확장이 아니다)
- 그 외 발견물은 장부에 `out_of_scope_candidate`로 **기록만** — 작업 확장 금지
- 범위 밖 수정 없이는 오라클 green이 불가능하면 `loop-state.mjs block --signal blocked --reason <사유>` 종료
- **완료 조건 자체가 런 중 모호해지면** 보수 전진이 아니라 `blocked` 종료다 — loop는 질문
  없이 목적지를 바꾸면 안 된다 (판단 지점의 유예 3분류에서 이 경우는 항상 `block`)

## 이중 종료 게이트 — 둘 다 통과해야 completed

1. **장부 게이트**: 전 항목 완료 + 오라클(완료 조건 검증 명령) green + **리뷰 큐 전 항목
   접합 완료** (백그라운드 deep·CX 결과를 freshness rule 확인 후 전부 판정 — pending 0)
2. **독립 판정 게이트**: `lane-reviewer`(T2)에 SHA 범위·diff·테스트 결과**만** 전달하고
   ([reviewer-prompt.md](../../shared/reviewer-prompt.md) `completion` 모드 템플릿),
   **동시에 CX 반박 자문을 상시 병렬 발진**한다 ([codex-lane.md](../../shared/codex-lane.md),
   "이 완료 주장을 반박하라"). CX 소견은 자문 — T2 리뷰와 갈리면 T1이 실측 판정 (비대칭 규칙).
   critical 지적은 장부에 태스크로 추가하고 루프 재진입.

반복 중 CX는 루프 절차의 리스크 트리거 기반 — 매 반복 상시 투입은 접합 큐만 오염시키고,
최대 리스크인 허위 완료는 종료 게이트의 상시 CX가 막는다.

통과 후에만 `loop-state.mjs complete <프로젝트명>-loop --oracle <오라클 결과> --review <리뷰 판정>
[--reason <요약>]`을 실행하고 정지한다 — CLI가 두 필드를 필수 인자로 강제하며, 두 필드 없는
completed는 가드가 되민다 (S2 계약). 실행자의 "완료했다"는 게이트 입력이 아니다.
진행 불능 종료는 `loop-state.mjs block <프로젝트명>-loop --signal blocked|failed --reason <사유>`.

## 종료 사유 (exit_signal)

`completed`(양 게이트 통과) / `blocked`(권한·스코프 불능) / `failed`(3접근 소진) /
`cancelled`(사용자 취소) / `stalled`(가드 백스톱 — no-progress·max·데드라인, 가드가 자동 기록).
어떤 종료든 최종 보고에 사유·장부 상태·미완료 목록을 남긴다.

## 실패·금지선

- 동일 에러 3회(테스트명 또는 exit code+stderr 지문 일치) → 접근 전환, 3접근 소진 → `failed` 종료
- 작업 범위 밖 파일 변경 감지 → 즉시 `blocked` 종료·보고 (가드는 이 종료를 막지 않는다 — exit_signal이 있으면 통과)
- push 금지, rm 금지(mv → .old/), config 변경은 장부 기록, TODO/FIXME 잔류 완료 선언 금지
- 상태·장부 파일에 민감정보(토큰·키) 기재 금지

## 이력

<details><summary>v2.1 (2026-08-11, 완료 조건 폐쇄기 특화 — pipeline conservative)</summary>

사용자 피드백(백그라운드 저활용·CX 공격적 활용) + Claude+CX 합의 반영. 정체성을 완료 조건
폐쇄기로 명시. 루프 절차를 pipeline conservative로 재편 — quick 게이트(critical만)만 동기,
deep·CX는 SHA 고정 백그라운드 + 리뷰 큐(ledger.md 4절), 태스크 간 파일·API·픽스처 겹침 시
파이프라이닝 자동 해제. CX는 매 반복 상시 대신 리스크 트리거 기반 (CX 판정: 반복형 상시
투입은 접합 큐 오염 — 사용자의 "시간 낭비 금지" 제약에 따라 T1이 CX 손을 들어줌).
종료 게이트에 리뷰 큐 pending 0 조건 추가. 완료 조건 모호화는 항상 block(목적지 변경 금지).
</details>

<details><summary>v2 (2026-08-09, Stop 가드 도입)</summary>

실측된 실패(취침 중 10분 만에 정지)에서 재설계. 원인: 절차 문서만으로는 턴 종료를 못 막음 +
질문 차단 부재. ralph(OMC)의 전역 Stop 훅+상태 파일+완료 약속 메커니즘을 자기 구현으로 이식
(`scripts/loop-stop-guard.mjs`, 플러그인 hooks.json). Codex 점검 반영: no-progress 백스톱(3회),
stale 자동 은퇴(24h·데드라인·max), 경로 정규화(POSIX↔Windows 실측), exit_signal 5종, 권한
매니페스트, AskUserQuestion frontmatter 차단(중간 질문 방지 우선), 스코프 고정(ralph의 스토리
추가 미채용 — "시킨 것만" 방향). 가드 스크립트는 샌드박스 실측 4종(no-op/차단/no-progress
은퇴/데드라인 은퇴) 통과. stop_hook_active로 allow하는 통설 방어는 기각 — 2번째 반복에서
루프가 죽는다. 무한 차단 방어는 백스톱이 담당.
</details>

<details><summary>v1.1 (2026-08-08, 실전 검증 반영)</summary>

발동 게이트 실측(모델 호출 차단 + 복제 금지 확인) 반영: description·본문을 슬래시 전용으로 정합.
</details>

<details><summary>v1 (2026-08-08)</summary>

family-plan-v2 기반 초판. ralph-claude-code의 이중 종료 게이트·서킷 브레이커, ghuntley의
one-task-per-loop 채용.
</details>
