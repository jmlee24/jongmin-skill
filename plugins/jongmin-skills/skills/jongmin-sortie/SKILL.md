---
name: jongmin-sortie
description: 사용자가 자리를 비운 동안 시간 박스 안에서 자율 실행할 때 사용한다 — 슬래시 명령(/jongmin-skills:jongmin-sortie)으로만 시작되며 자연어 요청으로는 발동하지 않는다 (disable-model-invocation). 사용자가 실시간으로 지켜보는 일반 작업에는 사용하지 않는다.
disable-model-invocation: true
disallowed-tools: AskUserQuestion
argument-hint: "<작업> [귀환 예정 시각]"
---

# jongmin-sortie — 시간 박스 자율 출격

정체성: **부재 중 전진기** — 시간 박스 안에서 **되돌릴 수 있는 전진**을 최대화하고, 넘지
못할 결정만 모아 귀환 보고로 가져온다. 완료 조건이 아니라 시간 박스로 달린다
(완료 조건 반복은 jongmin-loop). **슬래시 명령으로만 시작한다** — 자연어로 요청받으면
`/jongmin-skills:jongmin-sortie` 입력을 안내하라. 질문 금지는 프롬프트 지시가 아니라 frontmatter의
`disallowed-tools: AskUserQuestion`으로 하드 강제된다 (동일 권한 계층의 차단이 실측 확인됨).

> 턴 전파 주의: `disallowed-tools` 차단은 같은 턴의 **후속 스킬에도 전파**된다 (실측).
> sortie 턴 안에서 다른 스킬을 발동해도 AskUserQuestion은 계속 차단된다 — sortie에서는 의도된 동작.

티어: 지휘 T1(세션), 실행 위임 T2, CX 백그라운드 자문 — [model-tiers.md](../../shared/model-tiers.md).

## 현재 상태 (로드 시점 자동 주입)

!`git status --short`

!`codex login status`

## 발진 계약 (발동 직후 1회, 이후 무질문)

인자와 현재 컨텍스트에서 확정한다. 인자에 없는 항목은 **묻지 말고** 보수적 기본값을 채택해 장부에 기록:

```
- [ ] 스코프: 명시된 작업 + 그 작업의 착지에 필요한 최소 범위 (기본값: 요청 문장에 명시된 것만)
- [ ] 데드라인: 귀환 예정 시각 (기본값: 미지정 시 **2시간** — 시간 박스가 이 스킬의 정체성이므로
      데드라인 없는 발진은 없다. 작업이 먼저 끝나면 그 시점에 정지)
- [ ] 기준 SHA 기록, 유예 장부 생성 (ledger.md 규격, ~/.claude/jongmin-ledgers/)
- [ ] 워킹트리 더티 여부 확인 — 더티면 기존 변경 목록을 장부에 기록해 이번 작업 변경과 구분
- [ ] 권한 매니페스트 — 이번 작업이 쓸 도구·명령 범주 나열, 허용 안 된 갈래는 처음부터 보류 예정으로 표시
- [ ] Stop 가드 상태 파일 생성 — **CLI로만** (손 JSON 금지, S3):
      `node "<스킬 base dir>/../../scripts/loop-state.mjs" init <프로젝트명>-sortie --mode sortie
      --cwd "<프로젝트 절대경로>" --token "<기준 SHA>" [--deadline-h 2]`
      이것이 자의적 턴 종료를 되미는 가드를 활성화한다 (데드라인 기본 2h).
      매 갈래 착지마다 `tick <프로젝트명>-sortie --token <갈래 커밋해시>` 로 갱신.
```

## 절대 금지선 (유예 불가 — 마주치면 그 갈래 보류)

- push
- 파일 삭제 — `mv <대상> .old/`만 허용
- config 파일 변경 (package.json, tsconfig 등) — 변경이 필요한 갈래는 보류하고 장부 기록
- 스코프 밖 파일 수정
- 외부 발행 행위 (배포, 공개 API 호출로 상태 변경)

## 진행 규칙

- 판단 필요 지점 → **보수적 기본값 선택 + 유예 장부 4요소 + 3분류 태그** (defer/gate/block —
  [question-policy.md](../../shared/question-policy.md)). 몰래 결정하지 않고, 정지하지도 않는다.
  보수 기준: 되돌리기 쉬운 쪽, 기존 동작 보존 쪽. block 판정(금지선·불가역)이면 그 갈래 보류.
- **중대 판단에는 CX를 결정 유예 감시자로 투입** — 되돌리기 어려움·스코프 경계·데이터 정합성이
  걸린 결정은 CX([codex-lane.md](../../shared/codex-lane.md), 백그라운드)에 **보수 기본값의
  반박과 되돌리는 법만** 생성시킨다. CX가 결정을 대행하지 않는다 — 소견·채택 여부를 장부에
  기록하고 T1이 판단. 자동 채택 금지는 동일. CX 불가 환경이면 보수 기본값으로.
- CX 교차검증·테스트는 백그라운드 병렬 — [codex-lane.md](../../shared/codex-lane.md)
- 착지 검증은 [landing-check.md](../../shared/landing-check.md) — 시간이 없어도 생략 금지,
  검증 못 한 작업은 완료가 아니라 "보류"로 분류
- 데드라인 도달 → 새 작업 착수 금지, 진행 중 갈래만 착지시키고 귀환 보고 작성 → 종료 기록 후 정지
  (기록 전에는 가드가 정지를 되민다). 기록은 CLI로만:
  완료는 `loop-state.mjs complete <프로젝트명>-sortie --oracle <검증 결과> --review <판정>` —
  CLI가 두 필드를 필수로 강제하며, 없는 completed는 가드가 빈 완료 선언으로 보고 계속 되민다
  (loop의 이중 종료 게이트와 같은 계약). 보류·실패는 `block --signal blocked|failed --reason <사유>`.
  가드 백스톱 은퇴는 `stalled`로 자동 기록되며, 빈 completed도 은퇴 시 `stalled`로 정정된다

## 귀환 보고 (한 화면 — 사용자 배치 질문 1세트)

귀환 보고는 상황 나열이 아니라 **돌아온 사용자가 답할 결정의 배치 1세트**다
([question-policy.md](../../shared/question-policy.md) 종료 배치):

```
완료: <검증까지 끝난 것 — 커밋·테스트 결과>
보류·실패: <갈래와 이유>

지금 답해야 전진 가능한 것: <gate·block 항목 — 선택지와 함께, 항목당 한 줄>
나중에 바꿔도 되는 것: <defer 항목 — 채택된 기본값과 되돌리는 법 요약>
```

## 이력

<details><summary>v1.3 (2026-08-11, 부재 중 전진기 특화 — 유예 3분류·귀환 배치 질문)</summary>

사용자 피드백(질문 뭉텅이화) + Claude+CX 합의 반영. 정체성을 부재 중 전진기(되돌릴 수 있는
전진 최대화)로 재정의. 유예 장부에 defer/gate/block 3분류 태그 (question-policy.md 신설).
CX 역할을 결정 유예 감시자로 명확화 — 보수 기본값의 반박+되돌리는 법만 생성, 결정 대행 금지.
귀환 보고를 사용자 배치 질문 1세트로 재구성 (지금 답할 것 vs 나중에 바꿀 것 분리).
</details>

<details><summary>v1.2 (2026-08-09, Stop 가드·CX 공동 판단)</summary>

loop v2와 같은 Stop 가드 공유(mode:"sortie", 데드라인 기반) — 부재 중 자의적 턴 종료를 되민다.
사용자 방향 반영: 중대 유예 결정은 CX 반박 자문을 곁들인 공동 판단으로 격상 (소견·채택 여부
장부 기록, 자동 채택 금지 유지). 권한 매니페스트 preflight 추가.
</details>

<details><summary>v1.1 (2026-08-08, 실전 검증 반영)</summary>

description·본문을 슬래시 전용으로 정합 (발동 게이트 실측). disallowed-tools 차단이 동일 권한
계층에서 실제 작동함을 deep-audit Edit/Write 거부로 간접 실측 — 턴 전파 주의 추가.
AskUserQuestion 직접 차단 실측은 사용자 슬래시 호출 대기 중.
</details>

<details><summary>v1 (2026-08-08)</summary>

family-plan-v2 기반 초판. 질문 금지를 disallowed-tools로 하드 강제 (공식 문서의 autonomous loop
예시 패턴), preflight 일부를 dynamic context injection으로 자동화. 유예 장부 4요소 규격은 ledger.md.
런타임 차단 실측(질문 유도 프롬프트 3종)은 첫 실전 전 수행 예정 — 미작동 시 프롬프트 계약 폴백.
</details>
