---
name: jongmin-deep-audit
description: 코드베이스 전반의 구조적 문제를 전면 감사할 때 사용한다 — 슬래시 명령(/jongmin-skills:jongmin-deep-audit)으로만 시작되며 자연어 요청으로는 발동하지 않는다 (disable-model-invocation). 특정 버그 하나의 원인 추적, 단일 파일 리뷰, 수정 작업에는 사용하지 않는다 — 이 스킬은 read-only다.
disable-model-invocation: true
disallowed-tools: Edit, Write, NotebookEdit
argument-hint: "[감사 범위·의심 축]"
---

# jongmin-deep-audit — 이중 모델 전면 구조 감사

정체성: **의심 카탈로그 → 항목별 이중 판정 → 반증 방법이 붙은 판정문**. read-only 고정 —
frontmatter로 편집 도구를 차단한다. 수정은 감사 결과를 입력으로 conductor 웨이브가 담당한다.

실측 기반 운용 제약 (2026-08-08 실전 검증):
- **단독 턴에서 실행하라** — `disallowed-tools` 차단은 턴 스코프로 누적되어, 같은 턴에서 발동한
  후속 스킬(예: handoff save의 Write)까지 차단된다.
- **Bash는 읽기·검증 용도만** — frontmatter는 Bash를 막지 못하므로 read-only의 실질 방어선은
  이 계약이다. 감사 대상 저장소를 변경하는 Bash(리다이렉션 포함)는 금지. 예외는 **scratchpad 한정**:
  CX 프롬프트·로그 파일은 codex-lane.md 패턴대로 scratchpad에 따옴표 heredoc(`<<'EOF'`)으로만 쓴다
  (Bash 도구 인자에서 `\\`가 한 번 풀리므로 백슬래시가 든 내용은 검증 후 발진).
- **CX 감사는 정적 분석 한정으로 취급** — codex 샌드박스에서 인터프리터 실행이 실패할 수 있고
  (실측: python 실행 불가), 실행 기반 주장은 T1 실측 판정으로 넘긴다.

티어: 카탈로그 T2 병렬, 독립 감사 CX, 불일치 판정 T1 실측 — [model-tiers.md](../../shared/model-tiers.md).

## 절차

```
- [ ] 1. 스코프 확정 — 요청·인자에 명시돼 있으면 질문 없이 채택. 없으면 기본값으로 진행:
       repo 전체 + 4축 전체, 보고 첫머리에 실제 감사 범위 명시 (question-policy.md — 스코프는
       질문이 아니라 기본값+보고 사항이다). 대형 repo면 핵심 모듈 표본화 감사를 기본값으로
       선택하고 장부에 기록
- [ ] 2. 지도·의심 카탈로그 — T2 병렬 레인
- [ ] 3. 항목별 이중 판정 — T2 심층 ∥ CX 독립 감사
- [ ] 4. 불일치 항목 T1 실측 판정
- [ ] 5. 판정문 보고 (채팅)
```

**2. 의심 카탈로그** — T2 레인을 축별로 병렬 발진 (읽기 전용이라 병렬 안전):
아키텍처 경계 위반 / 중복·죽은 코드 / 데이터 흐름 위험(정합성·경쟁 상태) / 테스트 오라클 강도
(오라클 강도 축은 [landing-check.md](../../shared/landing-check.md)의 검증 함정 3종을 점검 목록에 포함).
각 의심은 `파일:라인 + 왜 의심인가 + 확인 방법` 형식으로 수집한다 — 기준 SHA와 인용의
생존성 상태([evidence-liveness.md](../../shared/evidence-liveness.md))를 함께 적는다.
죽은 코드를 의심 근거로 삼은 항목은 판정 전에 걸러진다.

**3. 이중 판정** — 의심 항목별로 두 검증자가 **서로의 결과를 보지 못한 채** 독립 수행:
- T2: 심층 분석 (호출 경로·불변식 추적 — 인용 근거의 생존성 독립 확인 포함)
- CX: 반박 지향 독립 감사 ([codex-lane.md](../../shared/codex-lane.md), read-only,
  쓰기 작업과 병행 시 worktree 스냅샷 고정)

**4. 판정** — 등급은 3종, 모든 판정에 **반증 방법 필수**:
- **CONFIRMED** — T1 실측으로 확증 (재현 스크립트·계측 결과·실행 경로 생존 확인 첨부).
  major/critical은 양측 일치만으로 CONFIRMED가 되지 않는다 — 두 모델은 맹점을 공유한다
  (ICML 2025). 실측 불가면 양측 일치라도 PLAUSIBLE
- **PLAUSIBLE** — 실측 불가/미실시, 근거는 있으나 확증 없음
- **REFUTED** — 반증됨 (무엇이 반증했는지 기록)

양측 불일치 항목은 다수결이 아니라 **T1이 실측으로 판정**한다. CX 지적은 반증 방법 없이 기각 금지.

**5. 보고** — 채팅으로: 심각도순 판정문(항목·등급·근거·반증 방법), 수행한 검증 목록,
CONFIRMED 항목의 conductor 웨이브 입력 변환 제안 — major/critical 구조 결함은 수정 웨이브에서
**회귀 가드 동일 착지**가 성공 기준이 됨을 함께 명시 (conductor 성공 기준 참조). 신규 문서 파일 생성 금지 (전역 규약).
실행 메타(CX 모델 식별자 등)는 장부([ledger.md](../../shared/ledger.md))에 기록.

## 이력

폐기 결정만 남긴다 (릴리스 서사는 git 이력, v1 2026-08-08 ~ 현재):
- 스코프를 사용자와 확정하는 절차 폐기 — 인자 기반 + 전체 기본값 + 보고 명시 (v1.2)
- CX 소견 자동 채택 금지 유지 — 실전 1회에서 CX 오판 1건을 T1 실측으로 REFUTED (v1.1)
