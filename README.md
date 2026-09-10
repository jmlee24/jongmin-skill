# jongmin-skill

개인 스킬 패밀리. 우산 플러그인 하나(`jongmin-skills`)에 스킬을 계속 추가하는 구조 —
머신마다 설치는 한 번, 이후 스킬 추가는 push → autoUpdate로 전파된다.

## 설치 (머신당 1회)

```
/plugin marketplace add https://github.com/jmlee24/jongmin-skill.git
/plugin install jongmin-skills@jongmin-skill
/jongmin-skills:hud-setup
```

세 번째 줄은 선택 — 상태줄에 사용량 HUD(5h·주간·모델별·ctx)를 심는다. 설치 부속이라 이후 컨텍스트를
차지하지 않는다. 자세한 내용은 [hud-setup](plugins/jongmin-skills/skills/hud-setup/SKILL.md).

플러그인 없이 쓰려면 `plugins/jongmin-skills/skills/<이름>/` 폴더를 `~/.claude/skills/`에,
`plugins/jongmin-skills/agents/*.md`를 `~/.claude/agents/`에 복사해도 동작한다.
전제 도구: Claude Code + Codex CLI (Codex 미인증 시 교차검증 레인은 Claude 감사로 자동 강등).

## 패밀리 공통 구조

모든 스킬이 같은 3층 구조 위에서 돈다:

1. **모델 3중주** — T1(세션 모델)이 지휘·판정, T2(`opus` 별칭)가 실행·리뷰, CX(Codex)가
   명세 생성·반박 자문. 바인딩은 [shared/model-tiers.md](plugins/jongmin-skills/shared/model-tiers.md)
   와 에이전트 frontmatter(`agents/lane-reviewer.md`) 2지점에서 정의 — 세대 교체 시 함께 수정.
   CX 소견은 자문이며 자동 반영 금지, T2와 갈리면 T1이 실측으로 판정한다.
2. **결정론 오라클 층** — LLM들은 맹점을 공유하므로(두 모델이 모두 틀릴 때 60%가 같은 오답,
   ICML 2025) 판정은 기계에 맡긴다: 착지마다 프로젝트의 타입체크·린트 게이트, 등가성 작업엔
   차등 테스트, 리뷰엔 뮤테이션 검증(선택). 새 도구 설치 없이 기존 도구 + 검증 스크립트로.
3. **질문 배치 정책** ([shared/question-policy.md](plugins/jongmin-skills/shared/question-policy.md)) —
   질문은 뭉텅이로: 발진 시 1콜 최대 4문항(실행 결과를 바꾸는 결정만), 런 중 무질문
   (유예 3분류 defer/gate/block), 종료 시 유예 결정 배치 1세트. 즉문즉답 금지.
4. **공용 부품** ([shared/](plugins/jongmin-skills/shared/)) — model-tiers(티어 정의) /
   codex-lane(Codex CLI 실행 패턴 + 산출 Top 5 표준·freshness rule) / executor-prompt(쓰기
   레인 5요소 템플릿) / reviewer-prompt(리뷰 레인 호출 템플릿 — change·completion 모드) /
   doc-hygiene(문서 생성·배치·참조·소각 정본) / evidence-liveness(인용 근거 생존성 검증 — LIVE만
   확정 전제) / landing-check(착지 검증
   체크리스트) / question-policy(질문 배치) / ledger(진행·유예 장부 규격, `~/.claude/jongmin-ledgers/`)

## 스킬 목록

**호출 규약(2026-09-10부터)**: 전 스킬 **슬래시 전용** — `/jongmin-skills:<이름>`. 자연어로는 어느 스킬도 발동하지
않고, 스킬 설명이 세션 컨텍스트에 적재되지 않는다(컨텍스트 0). 단독 운영자가 스킬명을 알고 있다는 전제.

### [jongmin-dev-conductor](plugins/jongmin-skills/skills/jongmin-dev-conductor/SKILL.md) — 다중 레인 개발 편성

**수행**: 병렬 접합기. 지휘부(메인 세션)는 구현을 직접 하지 않고 레인을 편성한다 — 쓰기
레인(T2 에이전트, 구현+테스트+커밋, DAG 분리 태스크는 worktree 병렬), 읽기 레인(CX 상시 2슬롯: 다음 태스크 명세 +
착지물 반박), 리뷰 레인(lane-reviewer, SHA 범위 독립 리뷰). 착지 검증(테스트 직접 재실행 +
결정론 게이트) → 리뷰 → 지적사항 접합 → 문서 관리(종료 감사 5판정) → 최종 보고까지 8단계. 발진 시 배치 질문 1콜(커밋 권한
포함), 이후 런 중 무질문. 쓰기 병렬(parallel-write)이 기본 모드 — 안전 전제는 계약 동결+소유권 맵.

**쓸 때**: 커밋 3건 이상 예상되는 다중 파일 웨이브 / 무손실 최적화·리팩토링처럼 등가성 검증이
핵심인 작업 / 회귀 비용이 큰 고위험 변경(데이터 정합성, 마이그레이션). 판단 기준은 저장소
크기가 아니라 "웨이브 규모 × 회귀 리스크".

**안 쓸 때**: 단일 파일·소규모 수정, 일상적 멀티파일 리팩토링, 프로토타입.

**호출**: **슬래시 전용** — `/jongmin-skills:jongmin-dev-conductor <작업 또는 warplan 편성표>`.

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

**호출**: **슬래시 전용** — `/jongmin-skills:jongmin-warplan <작업>`.

### [jongmin-deep-audit](plugins/jongmin-skills/skills/jongmin-deep-audit/SKILL.md) — 이중 모델 전면 구조 감사

**수행**: read-only 고정(편집 도구 frontmatter 차단). 4축 의심 카탈로그(경계 위반/중복·죽은
코드/데이터 흐름 위험/테스트 오라클 강도) → 항목별 T2 심층 분석 ∥ CX 독립 감사(서로 결과를
못 봄) → 불일치는 T1이 실측(재현 스크립트)으로 판정. 모든 판정에 반증 방법 필수,
등급은 CONFIRMED/PLAUSIBLE/REFUTED. CONFIRMED major/critical은 conductor 수정 웨이브 입력이
되고, 그 웨이브는 회귀 가드 동일 착지가 성공 기준.

**쓸 때**: "어딘가 구조가 이상하다"는 의심의 전수 조사, 주기적 건강검진, 인수한 코드베이스 파악.

**안 쓸 때**: 특정 버그 하나의 원인 추적(직접 디버깅으로), 단일 파일 리뷰, 수정 작업.
**주의**: 단독 턴에서 실행 — 도구 차단이 같은 턴의 후속 스킬에 전파된다.

**호출**: **슬래시 전용** — `/jongmin-skills:jongmin-deep-audit [범위·의심 축]`.

### [skill-forge](plugins/jongmin-skills/skills/skill-forge/SKILL.md) — 스킬 제작·검증 메타 스킬

**수행**: 4모드. `create` — 제작 전 게이트(베이스라인 실패 확인, 기존 스킬로 해결 불가 확인,
경계 소유권 확인) 통과 시에만 규약 준수 초안 생성. `eval` — 발동 6프롬프트(발동 3 + 비발동 3)
데스크 판정, 릴리스 전엔 헤드리스 실 프로브. `pressure` — 시간 압박·매몰 비용 시나리오에서
금지선이 버티는지 확인(자율성 높은 스킬 필수). `improve` — T1 평가 + CX 2차 → 교차 비교 →
불일치 실측 판정 → 반영 및 이력 기록.

**쓸 때**: 이 패밀리에 스킬을 추가·평가·개선할 때. 아래 "새 스킬 추가하기"의 실행자.

**안 쓸 때**: 스킬이 아닌 일반 코드·문서 작업.

**호출**: **슬래시 전용** — `/jongmin-skills:skill-forge <create|eval|pressure|improve> <대상>`.

### [handoff](plugins/jongmin-skills/skills/handoff/SKILL.md) — 세션·계정 인수인계

**수행**: `save` — 기준 SHA·워킹트리 상태·진행/유예 장부·활성 레인·다음 단계·계정 회계를
**자기완결 응답 본문**(새 세션 첫 프롬프트)으로 스냅샷 — 파일은 사용자가 명시 요청할 때만
장부 경로에. 기본은 이탈 저장(레인 정지), `--keep-lanes`는 레인을 살린 중간 체크포인트. `restore` — 스냅샷과 현재 상태를 대조(SHA·더티 차이 보고)하고 "다음
단계"부터 재개 제안, 유예된 결정을 먼저 제시.

**쓸 때**: 컨텍스트 압축(컴팩션) 임박, 개인↔법인 계정 전환, 기기 이동, 웨이브 중단·재개.

**안 쓸 때**: 단순 작업 요약 요청.

**호출**: **슬래시 전용** — `/jongmin-skills:handoff <save|restore> [메모]`.

### [jongmin-coproduce](plugins/jongmin-skills/skills/jongmin-coproduce/SKILL.md) — 비개발 산출물 공동 제작

**수행**: 견적·계약 검토문·제작안·의사결정 메모·사실 브리프를 T1(Claude)과 CX(Codex)가 **공동 저자**로 만든다 —
같은 원자료로 상대 초안을 보지 않고 각자 핵심 초안 → 대조해 절 단위 분담 집필 → 상호 검수(대체 문안 포함) →
T1 통합(핵심 수치·인용은 원자료 재확인) → CX 통합본 검수 1회. 인도는 산출물 1개 + 중대 이견 시 짧은 부록.
두 모델의 동의는 증거가 아니다. 실행(발주·서명·송금)으로 확장하지 않는다.

**쓸 때**: 오답 비용이 큰 비개발 산출물. **안 쓸 때**: 코드·repo·아키텍처(→ warplan/deep-audit/conductor), 단순 질의응답, 잡학·취향.

**호출**: **슬래시 전용** — `/jongmin-skills:jongmin-coproduce <산출물·질문> [자료 경로…]`.

### [hud-setup](plugins/jongmin-skills/skills/hud-setup/SKILL.md) — 사용량 HUD 설치 부속

**수행**: `scripts/hud-setup.mjs`를 실행해 `<configDir>/hud/jongmin-hud.mjs` 래퍼를 심고 `settings.json`의
`statusLine`을 등록한다(기존 값은 백업 후 교체, 보고에 명시). 래퍼는 매 실행마다 플러그인 캐시의 **최신
버전** 렌더러(`scripts/usage-hud.mjs`, 의존성 0)를 찾으므로 autoUpdate 뒤에도 경로가 깨지지 않는다.
표시(2줄): [1] 클로드 모델 effort | 5h · 주간 · 모델별 주간 버킷 | ctx  [2] codex 모델 effort(config.toml) 5h · 주간(Spark 등 부가 한도 제외). 5h 창은 계정 응답에 있을 때만(prolite는 주간만 옴, 2026-09-10 실측). 5h·주간·ctx는 클코 statusline stdin만 사용(네트워크 0),
모델별 버킷만 `/api/oauth/usage`를 60초당 1회 호출(실패 시 마지막 성공값 유지).

**쓸 때**: 플러그인 설치 직후 머신당 1회. `check`(상태 확인), `uninstall`(제거)도 같은 명령.

**안 쓸 때**: 개발 작업 전반 — 이 스킬은 설치기다. 설치 후 상태줄은 모델 컨텍스트에 0토큰, 훅 0개.

**호출**: **슬래시 전용** — `/jongmin-skills:hud-setup [check | uninstall]`. 자연어로는 발동하지 않는다.
WSL과 Windows는 config 디렉터리가 다르므로 각각 실행한다.

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
② Stop 가드·state CLI·발진 검증기·HUD 회귀 테스트 (guard-test + state-test + launch-check-test + hud-test, tmpdir 격리·실장부 불변 단언 포함)
③ 링크 무결성 — shared 상호참조·동일 디렉터리·README 상대 링크 (디렉터리 링크 허용)
④ description 검사 — 변경 스킬은 확정 문자열 완전 일치(④-A), 미변경 스킬은 회귀 lint(④-B:
   단일 라인·비발동 절 존재·트리거 부분문자열 중첩 0건)
⑤ 용어 정합 — 규약 정본 용어(유예 3분류, 리뷰 큐, 이중 종료 게이트, freshness)의
   금지 변형어 탐지
⑥ cases/ 스키마 — 케이스 frontmatter 필수 키·enum·applied 교차 조건 (case-lint.mjs,
   검토 트리거 충족 시 NOTE 출력)

부분 실행 `--only=3,4`, 다른 트리 검사 `--root=<dir>` (픽스처 음성 확인용).

## 변경 이력

### v1.12.0 (2026-09-10) — 전 스킬 슬래시 전용 · jongmin-coproduce 신설 · 네이티브 리뷰 접점 · HUD codex

- **전 스킬 슬래시 전용**(disable-model-invocation) — 상시 적재 description 5건 제거(약 1.5KB/세션), 트리거 어휘 폐기.
  skill-forge 정책: 슬래시 기본, 자연어 예외는 근거 기록. 반론(handoff 컴팩션 안전망)은 클코 자체 컨텍스트 요약으로 대체.
- **jongmin-coproduce** — 비개발 산출물 공동 제작(독립 초안 → 분담 집필 → 상호 검수 → T1 통합). 초안 이름 crosscheck는
  "검증"이 아니라 "공동 작업"이라는 사용자 요구로 재설계. CX 2회 자문 접합.
- **네이티브 리뷰 접점**(케이스 2026-09-10 applied): 리뷰 항목 필드 계약(short_summary·failure_scenario·verdict, 외부 판정은
  source_verdict), landing-check 「선택 외부 리뷰 — /code-review ultra」(권고만·사용자 실행분만 큐 등록), conductor §6 외부
  리뷰 재확인 경로, 쓰기 레인 격리 Agent `isolation: "worktree"` 기본, codex-lane 생존 판정 알림 우선. 기각: quick/deep
  개명, ultra 자동화, 네이티브 CONFIRMED 승격.
- **HUD**: codex 사용량 세그먼트(ChatGPT 사용량 백엔드, auth.json 토큰), 모델 옆 effort 레벨. hud-test 37건.

### v1.11.0 (2026-09-10) — hud-setup: OMC HUD 대체 설치 부속

oh-my-claudecode 제거 전제에서 유일하게 남은 효용(상태줄 사용량 HUD)을 패밀리 안으로 이관. 자체 렌더러
`scripts/usage-hud.mjs`(의존성 0, 항상 exit 0) + 고정 경로 래퍼 2단 구조 — 플러그인이 `statusLine`을 설정할
수 없고 캐시 경로에 버전이 박히는 제약은 OMC와 동일. 모델별 주간 버킷은 `/api/oauth/usage` 응답의
`limits[].kind === "weekly_scoped"`에서 읽는다(2026-09-10 실측). 슬래시 전용(disable-model-invocation)이라
설치 후 컨텍스트 비용 0. hud-test 31건이 validate ②에 합류 (CX 맹검 리뷰 5건 중 4건 접합: 실패 TTL 스탬프·관리 판정 토큰화·프리릴리스 정렬·라벨 개행).

### v1.10.0 (2026-09-08) — 2차 배치 1차분: 발진 내용 검증기 · improve 입력 규약 · 이력 소각

Preflight의 실존 확인 산문을 집행점으로 이동 — `scripts/lane-launch-check.mjs`가 Owned BASE 실존·신규 파일
부재+부모 정책·Frozen SHA·worktree 등록·브랜치·게이트 전건·프롬프트 원문 포함을 판정하고 `launch_check`
장부 이벤트로 pass/block을 계측한다(exit 0 전 Agent 호출 금지, 테스트 20건). skill-forge improve 입력은
pending만 + 인용 조항 생존 확인 + 축 단위 세션 분할. loop·sortie·deep-audit 이력 절 규약 소각(−66줄).
근거: 실전 보고 3건 + Claude Code Workflow(ultracode) 비교 분석(케이스 2026-09-08)이 같은 축에 독립 도달.
보류(케이스 기록): PreToolUse 훅 차단, Workflow 실행 백엔드, bootstrap·자원 lock·compile-block.

### v1.9.2 (2026-08-27) — 긴급 수정 2건: CX 프롬프트 stdin 전달 · 잡 핸들 전용 정지

critical 케이스 2건 즉시 반영(긴급 예외). codex-lane 기본 패턴을 셸 인라인 문자열에서 **파일 stdin(`-`)**
으로 교체 — 백틱·달러 기호 손상 재현 후 stdin 경로 exec·resume 실측 통과. 중단 절차는 PID가 아니라
**run_in_background 잡 핸들(TaskStop)** 전용 명령 형태로(conductor·handoff 동일 계약) — `pkill -f` 자기
살해 2회 실측. 구조 리뷰(T1+CX) 결과는 케이스로 등록, 2차 배치 설계 입력.

### v1.9.1 (2026-08-24) — handoff v1.4: 진입 게이트를 전달 경로 기준으로

save 게이트의 분기 기준을 "소비자가 사람/기계냐"에서 **전달 경로**(사용자가 나를 수 있는가)로
교체 — 파일은 명시 요청만, 무인 중단도 귀환 보고 응답으로. restore 입력도 붙여넣은
텍스트가 기본.

### v1.9.0 (2026-08-24) — 1차 케이스 배치: 문서 위생 정본 · conductor v4.2 · 소각 우선

첫 배치 갱신 (pending 33 → applied 17 · rejected 1 · pending 15). 적용 근거: 독립 2건 축 4개
(심볼 삭제 drift / fix 레인 재확인·접합 종료 / 시간 이벤트 장부 / 문서 소각) + 명백한 규약
모순 + 사용자 방향(문서 위생). 주요 변경:
- **shared/doc-hygiene.md 신설** — 생성·배치·용량 초과 처리·참조·정본·소각의 유일한 정본.
  집행은 분리: executor sentinel(항상 복제 2항) + landing-check(.md 전 모드 대조·소각 판정)
- **conductor v4.2** — 착지·리뷰 절을 landing-check/reviewer-prompt 참조로 압축, T1 재분류
  severity·fix 레인 경량 재확인(원 리뷰어 SHA 범위 확인)·접합 종료 조건, CX 데드라인 정본 일원화
- **소유권 재승인 프로토콜** — executor 자율 최소 침범을 침범 제안(보고→T1 승인→재개)으로 강등,
  승인 기록 없는 Owned 밖 변경은 착지 차단. 최상위 심볼 삭제·시그니처 변경은 커밋 전 보고
- **시간 이벤트 장부** — scripts/time-ledger.mjs (8이벤트 append/report, 큐 대기·판정 구간 자동 계산)
- 소각 우선: 이력 4파일 압축·중복 예시 축약·shared 순환 참조 2쌍 해소. 런타임 순증 음수

### v1.8.3 (2026-08-19) — 케이스 수집 체계: 실시간 수정 → 배치 갱신 전환

사용자 결정(즉시 반영이 낳은 소탐대실 실측에서) + Claude/CX 교차:

- **repo 루트 `cases/`** — 실측 결함은 즉시 수정하지 않고 케이스 파일로 수집 (frontmatter
  status 정본, 파일명 `YYYY-MM-DD-HHMM-<스킬>-<slug>.md` = case-id, 두 기기는 git으로 합류,
  플러그인 설치본에는 미포함). 긴급 예외는 작업을 능동적으로 망치는 critical 해당 건만
- **검토 ≠ 적용** — 검토 트리거(pending 5건/최고령 14일/critical)와 적용 근거(재현 성공/독립
  사례 2건/명백한 규약 모순)를 분리. 무관한 5건이 모여도 각 건은 여전히 n=1이다 (CX 지적 수용)
- **validate ⑥** — case-lint.mjs(분리 모듈)로 케이스 스키마 검사 + 트리거 충족 NOTE.
  음성 픽스처 4종 검출 실측
- **skill-forge improve** — 케이스 우선 규약 + pending 전건을 배치 입력으로, 배치 커밋에
  케이스 목록(이중 배치 멱등 방지)

### v1.8.2 (2026-08-14) — 측정 판독 독립 게이트 · 타 기기 세션 실패 5종 반영

타 기기 세션(1.7.1 캐시로 실전 웨이브)의 실패 분석과 그 세션 Codex 의견을 이 기기 Codex와
다시 교차 대조 (Claude 2회 + Codex 2회):

- **v1.8.1 모순 정정** — model-tiers의 "매 커밋 상시 투입 금지"가 conductor "CX 상시 2슬롯"과
  충돌 (타 세션 Codex가 1.7.1 기준으로 예측, 실제로 v1.8.1이 들여옴). 빈도 소유권을 스킬로 이관,
  경계에 **측정 판독 확정** 추가
- **측정 판독 독립 게이트** (landing-check 검증 함정) — 수량·인과 판독을 정본·handoff에 넣기 전
  독립 T2에 맹검 입력, **같은 집계 코드 재실행이 아닌 전체 모집단 독립 계산 + 비중첩 반대
  슬라이스 재검산** 요구, 유지 안 되면 UNSUPPORTED. 실측: 저자 자기검증만 거친 판독 2건이
  기계 게이트 전부 green인 채 정본 등재 → handoff로 다음 세션 전파 → 사용자 질문으로만 발견.
  타 세션이 제안한 reviewer-prompt 새 모드는 기각(SHA 범위 리뷰 불변식 파괴) — 이 bullet이 최소
- **conductor 브리핑 전제 확인** (Preflight) — 인용은 evidence-liveness, 산술·최악값·하니스 능력
  주장은 dry-run 실측 (실측: 전제 6건 오류, "60런"이 120런). evidence-liveness에 넣지 않은 이유:
  LIVE=참이라는 오의미 방지. 최종 보고에 판독 게이트 통과분만 등재 + 원문 판정 조항
- **게이트 실행 중 트리 동결** (landing-check) — 출력 회수까지 착지·소스 편집 금지 (실측: 가짜 실패)
- **백그라운드 잡은 PID·핸들로만 종료** (conductor 중단 정리·handoff save) — 패턴 일괄 종료가
  호출 셸까지 매칭한 실측. 기존 문장 교체라 순증 0
- **warplan 측정 단계 설계 조항** — 답할 질문/못 할 후속 질문 명시 + dry-run 조인 키 확인
  (실측: 3.2시간 캠페인이 다음 질문에 답 못 함 — 착지 시점 방어보다 설계 시점이 싸다)
- **ledger 측정 판독 provenance** 1줄 — 결론별 모집단·산출물·집계 코드·독립 검산·verdict

### v1.8.1 (2026-08-14) — CX 검증 경계 명문화 · 스킬별 구멍 보강

사용자 관찰("제작 → 자체 검증 → CX 검증"을 전 작업에 쓰고 있음)을 Claude+CX 교차 대조.
사용자 방향대로 **패밀리 기조는 큰 단위 원칙만, 구체는 스킬별**로:

- **model-tiers 기조 1항** — CX 검증은 큰 단위 산출 경계(계획 완성·착지·완료 선언·스킬 릴리스)
  마다, 시간 순서가 아니라 논리 게이트(병렬·선행 가능), 접합 큐 포화는 면제가 아니라 유예.
  각 경계에서 무엇을 반박시키는지는 스킬 본문이 정한다
- **lane-reviewer 리뷰의 리뷰는 기각** — 리뷰 소견은 T1이 실측할 주장이며, CX 병행 시 리뷰
  보고서를 주지 않고 같은 착지물을 맹검 교차한다 (앵커링·무한 회귀 방지). reviewer-prompt에 명시
- **deep-audit CONFIRMED 강화** — major/critical은 T2·CX 양측 일치만으로 CONFIRMED가 되지
  않는다(두 모델은 맹점을 공유 — 패밀리 자체 원칙과 모순이었음). T1 실측 필수, 불가면 PLAUSIBLE
- **conductor CX-B 중복 정합** — 3절 상시 CX-B와 5절 CX adversarial이 같은 착지물을 이중
  발진할 수 있던 모순 해소 (착지물당 1회, 추가분은 CX-C만)
- **sortie 산출물 반박 트리거** — 결정 유예 자문과 별도로 착지물 맹검 반박(저위험 배치 1회 /
  고위험 즉시), `--review`는 접합 판정만
- **skill-forge create 릴리스 게이트** — 완료 선언 직전 1회 CX 맹검 반박 (improve와 동일 절차)
- **장부 실행 메타에 검증 게이트 생략 필드** — 생략은 사유·대체 통제·잔여 위험과 함께만
- handoff·loop는 추가 변경 없음 (이미 정합)

### v1.8.0 (2026-08-14) — 근거 생존성 검증 · 리뷰 호출 템플릿

사용자 제안 2건을 Claude+CX 독립 판단 후 교차 대조해 반영 (핵심 판정 일치):

- **근거 생존성 검증 신설** ([shared/evidence-liveness.md](plugins/jongmin-skills/shared/evidence-liveness.md)) —
  계획·편성·재개의 전제가 되는 인용(파일:라인·함수·문서 조항)은 실존만이 아니라 **살아 있어야**
  한다. 기계 층(SHA·경로·심볼 실존 — T1 grep/git 필수) + 판단 층(실행 경로 연결·코드 성격·
  문서 현행성 — T1 판정 + CX 반박 필수 축) → `LIVE/STALE/DEAD/UNVERIFIED`. **LIVE만 확정
  전제**, 나머지는 가정·위험·유예. 실측 근거: 소유권 맵에 없는 파일 배정, 다른 큐 수치 인용 —
  "확인 안 하고 인용"이 공통 원인. 적용: warplan 근거 수집 + CX 2차 반박 축, conductor DAG
  전제 + CX-A, deep-audit 카탈로그 + T2 독립 확인, executor 근거 반박, codex-lane 산출 요구
- **handoff는 save 무투입 · restore 조건부 CX** — save는 SHA·경로 실존만 기계 확인(컴팩션 임박에
  CX 분 단위 지연 불가), 검증 못 한 주장은 UNVERIFIED 보존. restore는 "다음 단계"를 결정하는
  주장을 기계 검증하고, HEAD 겹침·구조 의존·STALE일 때만 CX 백그라운드 발진 (실측: 다음 단계
  2회 오류 사례)
- **리뷰 레인 호출 템플릿** ([shared/reviewer-prompt.md](plugins/jongmin-skills/shared/reviewer-prompt.md)) —
  executor-prompt의 리뷰 쪽 대칭. conductor quick/deep(`change`)·loop 독립 판정(`completion`)이
  같은 템플릿을 채워 lane-reviewer를 발진. **lane-reviewer의 스킬 승격은 기각** — 스킬은 T1
  세션 컨텍스트에서 돌아 구현자와 컨텍스트를 공유하게 되고, 그것은 자기승인이다. 에이전트
  격리가 리뷰 독립성의 본질이라 agents/lane-reviewer.md는 단일 정의점으로 유지

### v1.7.1 (2026-08-14) — 실전 피드백 배치: v4 첫 16레인 웨이브의 결함 반영

사용자가 체감하는 동작 변화 단위로 기록 (타 PC 실전 웨이브 피드백 25건에서 도출):

- **handoff save 진입 게이트** — 수신자가 사람이고 지금 전달 가능하면 파일을 만들지 않고
  응답 본문으로 낸다. 파일은 명시 요청·전달 불가 상황(컴팩션·계정 전환·중단)만.
  기기 이동은 파일이 따라가지 않으므로 자기완결 응답 본문으로. 스냅샷은 장부 사본을
  담되 "불일치 시 장부 우선" 표기 (무손실 이전 계약 유지)
- **파일 가치 기준·정본 단일화(ledger)** — 파일로 남기는 것은 기계·다음 세션용과 재계산
  비용 큰 산출물뿐. 웨이브 상태의 정본은 진행 장부 1개, 복제 금지
- **완료 보고 위조 방어(landing-check)** — 보고된 SHA 전건 `git cat-file -e "<sha>^{commit}"`
  커밋 실존 확인 (실측: 허구 SHA 4건 보고), 모순 보고는 저장소에서 직접 판정. 파이프 종료 코드
  함정, 기준선 수치 SHA 라벨, 검증 함정 3종(집계≠항목 대응·측정 전 드라이런·항등식 뮤턴트) 추가
- **conductor 실측 배타 구간** — T1 실측 중 측정 자원과 경합하는 실행 레인 발진 금지
  (실측: 리뷰 레인 pytest 경합으로 측정 8벌 폐기). 소유권 맵 기존/생성 구분 실존 확인,
  게이트 명령 전수 수집, 에이전트 수는 동시 실행 기준
- **executor 권한·생성 통제** — 임무-소유권 모순 시 보고+최소 침범 진행(레인 전용 Forbidden
  한정 — Frozen·공용·타 레인 Owned는 gate, 착지 시 T1 판정),
  지휘부가 전달한 근거·리뷰 소견도 실측 반박 가능 (실측: 반박 5회 전부 실질 가치),
  worktree gitignore 데이터 결손 표준 문구, 6요소에 **신규 파일 허용 목록**(미기재 생성 금지,
  착지 시 --diff-filter=A 대조) — 문서 슬롭을 삭제가 아니라 생성 시점에 차단
- **CX 절차는 정적 설계(codex-lane)** — 실행 절차는 실행 전 T1이 플래그·대기 조건·기본값
  검증 (실측: 영구 대기 함정), 명세형 임무는 산출 형식 별도 지정, 모델 식별자 대체 회수
- **질문 품질(question-policy)** — 질문의 전제·수치는 저장소로 확인 후 묻기, 권장에는
  반증 조건 1줄

### v1.7.0 (2026-08-12) — 성능 배치 2: parallel-write 기본 승격

사용자가 체감하는 동작 변화 단위로 기록:

- **parallel-write가 기본 모드로** — DAG에서 파일군이 분리되는 태스크는 worktree 병렬 쓰기가
  기본 (사용자 결정: 검증 층이 오류를 잡으므로 병렬 확대의 리스크는 재작업 비용).
  v3.1 실험 모드의 계약 동결·소유권 맵·drift 확인은 차단 게이트에서 표준 전제로 흡수
- **DAG 편성** — 웨이브 계획을 선형 커밋 목록 대신 의존성 그래프 + 소유권 맵으로 산출,
  전 레인 프롬프트 선행 작성 → 착지 즉시 다음 레인 발진
- **결정론적 착지 프로토콜** — T1 직렬 착지(cherry-pick 또는 rebase+ff), 착지 전 범위·HEAD
  확인, 충돌 시 abort 후 레인 재발진, 검증·리뷰는 착지 후 SHA 범위 기준, 착지 매핑 장부 기록
- **검증 실행/판정 분리** — 검증 실행은 통합 트리 백그라운드, T1은 diff 검토 병행 후 출력
  원문 판정 (강도 동일, T1 실행 대기만 제거). 착지·검증 단위는 레인 커밋 범위로 확정
- **발행 전 검증** — CX 교차검증 15건 전건 접합 + git 역학 스모크 7건 PASS(Windows,
  이식성 있는 git 기본기라 Linux 동일) + 공식 스킬 규약 대조 통과. 실전 병렬 웨이브는
  미검증 — 첫 웨이브 시간 장부로 실측 예정

### v1.6.0 (2026-08-11) — 신뢰성 배치

사용자가 체감하는 동작 변화 단위로 기록 (실착지 커밋에서 도출):

- **루프 상태 CLI 신설** — loop/sortie 상태 파일을 손 JSON 대신
  `scripts/loop-state.mjs`(init/tick/complete/block/status)로만 조작. 스키마 위반 원천 차단
- **completed 이중 게이트 기계 강제** — 오라클·리뷰 상태 기록 없는 완료 선언은 Stop 가드가
  되밀고, 백스톱 은퇴 시에도 stalled로 정정 기록. 취소 경로(cancelled)는 보존
- **훅 실패 가시화** — node 탐색 실패 시 hook.log에 기록 (가드 무음 무력화 감지)
- **릴리스 검증 단일 진입점** — `scripts/validate.mjs` 5항(매니페스트·회귀 테스트 42종·링크·
  description·용어) + 가드/state 회귀 테스트 repo 편입
- **description 정합** — loop·sortie 서술형 통일, dev-conductor 압축. 변경 3종은 확정 문자열
  완전 일치 게이트로 이후 드리프트 차단
- **규약 실물 예시** — 유예 3분류(defer/gate/block)·CX Top5 산출·freshness 판정 예시 추가
- **마켓플레이스 표면 정비** — marketplace.json 최상위 description 추가 (validate warning 0)

## 새 스킬 추가하기

`/jongmin-skills:skill-forge create <요구사항>` 사용 권장 — 제작 게이트·규약을 자동 강제한다.
수동으로 하려면:

1. `plugins/jongmin-skills/skills/<스킬이름>/SKILL.md` 생성
   - frontmatter `name`(소문자·숫자·하이픈) + `description`(**무엇+언제**, 제3인칭 — 하는 일
     한 줄 + 트리거 어휘 + 부정 조건. 워크플로 상세 요약 금지, "언급하면" 금지·"요청하면"으로.
     발동 조건이 길면 `when_to_use` 필드로 분리, 합산 1,536자 한도)
   - 본문 500줄 이하, 참조는 SKILL.md에서 **1단계 깊이만**(보조 파일의 재참조 금지 —
     shared 정본 간 위임 참조는 허용, 순환 금지), 경로는
     포워드슬래시, 모델은 티어명(T1/T2/CX)으로만, shared/ 부품은 참조(복붙 금지)
   - 결정론 필요 절차는 `scripts/` 실행 스크립트로 (로드되지 않고 실행만 됨), 예제는
     input/output 쌍으로
   - 질문은 question-policy.md 규약(발진 배치 1콜·런 중 유예 3분류·종료 배치) — 즉문즉답 지시 금지
   - CLI 명령·플래그는 실행으로 확인 후 기재, 이력은 `<details>` v절
   - 슬래시 전용 스킬만 `disable-model-invocation: true` (안전장치가 아니라 자연어 발동 차단임)
2. 전용 에이전트가 필요하면 `plugins/jongmin-skills/agents/<이름>.md`
3. skill-forge eval(발동 6프롬프트) + 실전 1회 후 이력 기록 → commit & push
