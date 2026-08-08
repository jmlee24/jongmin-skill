---
name: skill-forge
description: jongmin-skills 패밀리의 스킬을 제작·평가·개선할 때 사용한다 ("forge", "스킬 만들어", "스킬 평가", "스킬 개선"). 스킬이 아닌 일반 코드·문서 작업에는 사용하지 않는다.
argument-hint: "<create|eval|pressure|improve> <스킬명 또는 요구사항>"
---

# skill-forge — 스킬 제작·검증 메타 스킬

정체성: **규약을 강제하는 제작 게이트**. skill-creator의 4모드 구조를 차용하되,
패밀리 규약(3중주·실측 검증·장부)을 통과 조건으로 삼는다.

티어: 평가 T1 직접 + CX 2차 → 불일치는 T1 실측 판정 — [model-tiers.md](../../shared/model-tiers.md).

## 모드

### create — 규약 준수 초안

제작 전 게이트 (하나라도 실패하면 제작하지 않는다):

```
- [ ] 베이스라인 실패 확인 — 스킬 없이 실패하는 시나리오를 재현·기록했는가
      (얇은 절차형 스킬은 실패 사례 서술로 대체 가능 — DoD 티어링)
- [ ] 기존 스킬로 해결 불가 확인 — 계약이 다른가? 강도만 다르면 기존 스킬의 옵션으로
- [ ] 경계 소유권 확인 — warplan=계획만 / conductor=편성 / sortie=시간박스 / loop=완료조건.
      새 스킬이 이 경계를 흐리면 재설계
```

초안 규약:
- description은 **발동 조건만** ("~할 때 사용한다" + 트리거 어휘 + 부정 조건). 워크플로 요약 금지 —
  모델이 본문 대신 요약만 따라가는 실패 방지 (superpowers 원칙). "언급하면" 금지, "요청하면"으로.
- 본체 500줄 미만 + 상세는 보조 파일 분리. shared/ 부품은 참조하고 복붙하지 않는다.
- 모델은 티어명(T1/T2/CX)으로만. 부작용 큰 스킬은 `disable-model-invocation: true`,
  질문 금지류 계약은 `disallowed-tools`로 하드 강제.
- 문서에 적는 모든 CLI 명령·플래그·이벤트명은 **실행으로 확인 후 기재** (실측 검증).
- 이력은 `<details>` v절로. 폐기한 패턴은 이유와 함께 남긴다.

### eval — 발동 테스트

발동해야 하는 프롬프트 3개 + 발동하면 안 되는 프롬프트 3개를 작성·실행하고 혼동을 기록한다.
과발동/미발동 0이 목표지만, 실패 시 차단이 아니라 **description 개선 + 사례 축적**으로 대응한다.
shared/ 문서 변경 시 참조하는 전 스킬의 eval을 재실행한다 (회귀 체크리스트).

### pressure — 압박 테스트

자율성 높은 스킬(loop·sortie·conductor) 필수. 시간 압박·매몰 비용·피로 조합 시나리오에서
금지선·게이트가 유지되는지 확인한다. 예: sortie에 "데드라인 5분 전, push하면 끝나는 상황"을 주고
push 금지선이 버티는지 본다.

### improve — 교차 평가·개선

1. T1 직접 평가 (발동 게이트·구조 무게·기술 정확성·실패 정책 항목별 점수)
2. CX 2차 평가 ([codex-lane.md](../../shared/codex-lane.md))
3. 교차 비교 — 불일치 지점은 T1이 실측으로 판정 (CX 지적은 반증 없이 기각 금지)
4. 수용·기각 판정 목록과 함께 개선 반영, 이력에 v절 추가
5. 장부(`~/.claude/jongmin-ledgers/`)의 실패 패턴·중단 원인을 개선 입력으로 소비

## DoD (완성 정의)

자율성 높은 스킬: create 게이트 + eval + pressure + 실전 1회 + 이력 기록.
얇은 절차형 스킬: create 게이트(완화) + eval + 실전 1회.

## 이력

<details><summary>v1 (2026-08-08)</summary>

family-plan-v2 기반 초판. skill-creator 4모드(Create/Eval/Improve/Benchmark) 차용,
Benchmark는 improve에 흡수. "베이스라인 실패 먼저"는 superpowers NO SKILL WITHOUT A FAILING TEST 채용.
교차 평가 절차는 2026-08-08 dev-conductor 평가 세션(Claude+CX, thread.started 실측 판정)의 표준화.
</details>
