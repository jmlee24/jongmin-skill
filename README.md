# jongmin-skill

개인 스킬 패밀리. 우산 플러그인 하나(`jongmin-skills`)에 스킬을 계속 추가하는 구조 —
머신마다 설치는 한 번, 이후 스킬 추가는 push → autoUpdate로 전파된다.

## 설치 (머신당 1회)

```
/plugin marketplace add https://github.com/jmlee24/jongmin-skill.git
/plugin install jongmin-skills@jongmin-skill
```

플러그인 없이 쓰려면 `plugins/jongmin-skills/skills/<이름>/` 폴더를 `~/.claude/skills/`에,
`plugins/jongmin-skills/agents/*.md`를 `~/.claude/agents/`에 복사해도 동작한다.
전제 도구: Claude Code + Codex CLI (Codex 미인증 시 교차검증 레인은 Claude 감사로 자동 강등).

## 패밀리 공통 구조

모든 스킬이 같은 3층 구조 위에서 돈다:

1. **모델 3중주** — T1(세션 모델)이 지휘·판정, T2(`opus` 별칭)가 실행·리뷰, CX(Codex)가
   명세 생성·반박 자문. 바인딩은 [shared/model-tiers.md](plugins/jongmin-skills/shared/model-tiers.md)
   한 파일에서만 정의 — 모델 세대가 바뀌면 그 파일만 수정.
   CX 소견은 자문이며 자동 반영 금지, T2와 갈리면 T1이 실측으로 판정한다.
2. **결정론 오라클 층** — LLM들은 맹점을 공유하므로(두 모델이 모두 틀릴 때 60%가 같은 오답,
   ICML 2025) 판정은 기계에 맡긴다: 착지마다 프로젝트의 타입체크·린트 게이트, 등가성 작업엔
   차등 테스트, 리뷰엔 뮤테이션 검증(선택). 새 도구 설치 없이 기존 도구 + 검증 스크립트로.
3. **질문 배치 정책** ([shared/question-policy.md](plugins/jongmin-skills/shared/question-policy.md)) —
   질문은 뭉텅이로: 발진 시 1콜 최대 4문항(실행 결과를 바꾸는 결정만), 런 중 무질문
   (유예 3분류 defer/gate/block), 종료 시 유예 결정 배치 1세트. 즉문즉답 금지.
4. **공용 부품** ([shared/](plugins/jongmin-skills/shared/)) — model-tiers(티어 정의) /
   codex-lane(Codex CLI 실행 패턴 + 산출 Top 5 표준·freshness rule) / executor-prompt(쓰기
   레인 5요소 템플릿) / landing-check(착지 검증 체크리스트) / question-policy(질문 배치) /
   ledger(진행·유예 장부 규격, `~/.claude/jongmin-ledgers/`)

## 스킬 목록

### [jongmin-dev-conductor](plugins/jongmin-skills/skills/jongmin-dev-conductor/SKILL.md) — 다중 레인 개발 편성

**수행**: 병렬 접합기. 지휘부(메인 세션)는 구현을 직접 하지 않고 레인을 편성한다 — 쓰기
레인(T2 에이전트, 구현+테스트+커밋, 한 번에 1개), 읽기 레인(CX 상시 2슬롯: 다음 태스크 명세 +
착지물 반박), 리뷰 레인(lane-reviewer, SHA 범위 독립 리뷰). 착지 검증(테스트 직접 재실행 +
결정론 게이트) → 리뷰 → 지적사항 접합 → 최종 보고까지 7단계. 발진 시 배치 질문 1콜(커밋 권한
포함), 이후 런 중 무질문. 쓰기 병렬은 실험 모드(계약 동결+소유권 맵)로만.

**쓸 때**: 커밋 3건 이상 예상되는 다중 파일 웨이브 / 무손실 최적화·리팩토링처럼 등가성 검증이
핵심인 작업 / 회귀 비용이 큰 고위험 변경(데이터 정합성, 마이그레이션). 판단 기준은 저장소
크기가 아니라 "웨이브 규모 × 회귀 리스크".

**안 쓸 때**: 단일 파일·소규모 수정, 일상적 멀티파일 리팩토링, 프로토타입.

**호출**: 자동 발동(조건 충족 시) 또는 "conductor", "레인 편성", "웨이브로 진행" 요청.

### [jongmin-loop](plugins/jongmin-skills/skills/jongmin-loop/SKILL.md) — 완료 조건 반복 실행

**수행**: 완료 조건 폐쇄기. 완료 조건을 오라클(실행 가능한 검증 명령)로 확정한 뒤, 루프 1회 =
태스크 1개로 완료까지 반복한다. quick 게이트(critical만)만 동기, deep 리뷰·CX(리스크 트리거
기반)는 백그라운드 누적 → 종료 게이트 일괄 접합 (태스크 간 파일·계약이 겹치면 파이프라이닝
자동 해제). **플러그인 Stop 가드**(상태 파일 기반)가 미완료 상태의 자의적 턴 종료를 되민다 —
중간 질문도 frontmatter로 차단. 이중 종료 게이트(장부 완료+리뷰 큐 0 AND 독립 리뷰어 판정)
통과 후에만 exit_signal 기록·정지. 백스톱: no-progress 3회·최대 50회·데드라인(기본 4h).
스코프 고정 — 발견물은 기록만, 확장 금지. 완료 조건이 모호해지면 blocked 종료. `cancel`로 중단.

**쓸 때**: 완료 조건이 명확하고 검증 명령으로 표현 가능한 작업을 끝까지 밀어붙일 때 (취침·부재 전 안전).

**안 쓸 때**: 완료 조건을 오라클로 못 만드는 작업, 탐색·리서치. 시간 기준이면 sortie.

**호출**: **슬래시 전용** — `/jongmin-skills:jongmin-loop <작업>`. 자연어로는 발동하지 않는다.

### [jongmin-sortie](plugins/jongmin-skills/skills/jongmin-sortie/SKILL.md) — 시간 박스 자율 출격

**수행**: 부재 중 전진기 — 시간 박스 안에서 되돌릴 수 있는 전진을 최대화하고, 넘지 못할
결정만 모아 귀환한다. 발진 계약 1회 확정 후 질문 도구 자체가 차단되고(`disallowed-tools`),
loop와 같은 **Stop 가드**가 데드라인 전 자의적 정지를 되민다. 판단 필요 지점은 보수적 기본값 +
유예 장부(defer/gate/block 3분류), **중대 판단은 CX가 결정 유예 감시자로 반박+되돌리는 법 생성**
(결정 대행 금지). 귀환 보고는 사용자 배치 질문 1세트(지금 답할 것 vs 나중에 바꿀 것 분리).

**쓸 때**: 외출·회의 전 "묻지 말고 최대한 진행해" 상황. 데드라인 미지정 시 기본 2시간.

**안 쓸 때**: 실시간으로 지켜보는 일반 작업. 완료 조건 기준이면 loop.

**호출**: **슬래시 전용** — `/jongmin-skills:jongmin-sortie <작업> [귀환 시각]`.

### [jongmin-warplan](plugins/jongmin-skills/skills/jongmin-warplan/SKILL.md) — 편성표형 계획

**수행**: 결정 압축기 — 계획 = 실행 프롬프트의 묶음 + 사용자 결정의 최소 집합. CX 위험
스카우트 선발진 + 모호성 인터뷰 배치(기본 0~2문항, 최대 4, 1콜) → 근거 수집 → 단계마다
{실행 주체 라우팅(직접/executor/conductor/sortie/loop), 크기, 검증 오라클, 결정 지점}이 붙은
편성표 작성 → CX 2차 반박(resume) → 채팅 제시(유예 결정은 종료 배치 1세트). 각 단계는
executor-prompt 5요소로 즉시 컴파일 가능해야 계획 완성으로 친다. 계획만 산출하고 실행하지 않는다.

**쓸 때**: 다단계 작업의 실행 계획이 필요할 때. 산출물이 그대로 conductor/sortie/loop 입력이 된다.

**안 쓸 때**: 단일 단계 작업, 이미 계획이 확정된 작업.

**호출**: 자동 발동 또는 "warplan", "계획 짜줘".

### [jongmin-deep-audit](plugins/jongmin-skills/skills/jongmin-deep-audit/SKILL.md) — 이중 모델 전면 구조 감사

**수행**: read-only 고정(편집 도구 frontmatter 차단). 4축 의심 카탈로그(경계 위반/중복·죽은
코드/데이터 흐름 위험/테스트 오라클 강도) → 항목별 T2 심층 분석 ∥ CX 독립 감사(서로 결과를
못 봄) → 불일치는 T1이 실측(재현 스크립트)으로 판정. 모든 판정에 반증 방법 필수,
등급은 CONFIRMED/PLAUSIBLE/REFUTED. CONFIRMED major/critical은 conductor 수정 웨이브 입력이
되고, 그 웨이브는 회귀 가드 동일 착지가 성공 기준.

**쓸 때**: "어딘가 구조가 이상하다"는 의심의 전수 조사, 주기적 건강검진, 인수한 코드베이스 파악.

**안 쓸 때**: 특정 버그 하나의 원인 추적(직접 디버깅으로), 단일 파일 리뷰, 수정 작업.
**주의**: 단독 턴에서 실행 — 도구 차단이 같은 턴의 후속 스킬에 전파된다.

**호출**: 자동 발동 또는 "deep audit", "전면 감사", "아키텍처 점검".

### [skill-forge](plugins/jongmin-skills/skills/skill-forge/SKILL.md) — 스킬 제작·검증 메타 스킬

**수행**: 4모드. `create` — 제작 전 게이트(베이스라인 실패 확인, 기존 스킬로 해결 불가 확인,
경계 소유권 확인) 통과 시에만 규약 준수 초안 생성. `eval` — 발동 6프롬프트(발동 3 + 비발동 3)
데스크 판정, 릴리스 전엔 헤드리스 실 프로브. `pressure` — 시간 압박·매몰 비용 시나리오에서
금지선이 버티는지 확인(자율성 높은 스킬 필수). `improve` — T1 평가 + CX 2차 → 교차 비교 →
불일치 실측 판정 → 반영 및 이력 기록.

**쓸 때**: 이 패밀리에 스킬을 추가·평가·개선할 때. 아래 "새 스킬 추가하기"의 실행자.

**안 쓸 때**: 스킬이 아닌 일반 코드·문서 작업.

**호출**: 자동 발동 또는 `forge <create|eval|pressure|improve> <대상>`.

### [handoff](plugins/jongmin-skills/skills/handoff/SKILL.md) — 세션·계정 인수인계

**수행**: `save` — 기준 SHA·워킹트리 상태·진행/유예 장부·활성 레인·다음 단계·계정 회계를
`~/.claude/jongmin-ledgers/`에 스냅샷. 기본은 이탈 저장(레인 정지), `--keep-lanes`는 레인을
살린 중간 체크포인트. `restore` — 스냅샷과 현재 상태를 대조(SHA·더티 차이 보고)하고 "다음
단계"부터 재개 제안, 유예된 결정을 먼저 제시.

**쓸 때**: 컨텍스트 압축(컴팩션) 임박, 개인↔법인 계정 전환, 기기 이동, 웨이브 중단·재개.

**안 쓸 때**: 단순 작업 요약 요청.

**호출**: 자동 발동 또는 "handoff", "스냅샷 떠줘", "이어서 할 수 있게".

## 검증된 조합 패턴 (2026-08-08 실전)

- **deep-audit → conductor**: 감사 CONFIRMED 항목이 웨이브 입력으로 직결, 수정 시 회귀 가드 동일 착지
- **warplan → conductor/sortie/loop**: 편성표 단계가 executor 프롬프트로 무변환 컴파일,
  CX 계획 반박이 executor 품질을 올림 (선행 CX 산출물은 conductor가 재발진 없이 인정)
- **handoff --keep-lanes**: 긴 웨이브 중간 체크포인트 (컴팩션 대비)
- **주의**: deep-audit과 쓰기 필요 스킬을 같은 턴에 섞지 말 것 (도구 차단 턴 전파)

## 릴리스 검증

repo 루트에서 한 명령으로 전 항목을 검사한다:

```
node plugins/jongmin-skills/scripts/validate.mjs
```

① `claude plugin validate` — stdout warning 0건 판정 (이 명령은 warning이 있어도 exit 0을
   반환하므로 exit code를 신뢰하지 않는다). **①의 실제 검증 범위는 마켓플레이스 매니페스트
   1건뿐이다** — 스킬 본문·frontmatter는 검사하지 않는다.
② Stop 가드·state CLI 회귀 테스트 (guard-test + state-test, tmpdir 격리·실장부 불변 단언 포함)
③ 링크 무결성 — shared 상호참조·동일 디렉터리·README 상대 링크 (디렉터리 링크 허용)
④ description 검사 — 변경 스킬은 확정 문자열 완전 일치(④-A), 미변경 스킬은 회귀 lint(④-B:
   단일 라인·비발동 절 존재·트리거 부분문자열 중첩 0건)

부분 실행 `--only=3,4`, 다른 트리 검사 `--root=<dir>` (픽스처 음성 확인용).

## 새 스킬 추가하기

`/jongmin-skills:skill-forge create <요구사항>` 사용 권장 — 제작 게이트·규약을 자동 강제한다.
수동으로 하려면:

1. `plugins/jongmin-skills/skills/<스킬이름>/SKILL.md` 생성
   - frontmatter `name`(소문자·숫자·하이픈) + `description`(**무엇+언제**, 제3인칭 — 하는 일
     한 줄 + 트리거 어휘 + 부정 조건. 워크플로 상세 요약 금지, "언급하면" 금지·"요청하면"으로.
     발동 조건이 길면 `when_to_use` 필드로 분리, 합산 1,536자 한도)
   - 본문 500줄 이하, 참조는 SKILL.md에서 **1단계 깊이만**(보조 파일의 재참조 금지), 경로는
     포워드슬래시, 모델은 티어명(T1/T2/CX)으로만, shared/ 부품은 참조(복붙 금지)
   - 결정론 필요 절차는 `scripts/` 실행 스크립트로 (로드되지 않고 실행만 됨), 예제는
     input/output 쌍으로
   - 질문은 question-policy.md 규약(발진 배치 1콜·런 중 유예 3분류·종료 배치) — 즉문즉답 지시 금지
   - CLI 명령·플래그는 실행으로 확인 후 기재, 이력은 `<details>` v절
   - 슬래시 전용 스킬만 `disable-model-invocation: true` (안전장치가 아니라 자연어 발동 차단임)
2. 전용 에이전트가 필요하면 `plugins/jongmin-skills/agents/<이름>.md`
3. skill-forge eval(발동 6프롬프트) + 실전 1회 후 이력 기록 → commit & push
