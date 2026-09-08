---
skill: shared/
project: YNprinting
observed-version: 1.8.3
severity: minor
status: applied
applied-version: 1.9.0
---
## 실패 형태
런타임 SKILL 본문의 이력 절이 세션 서사까지 싣고 있어 컨텍스트를 소비한다 — conductor 이력
77줄(본문 24%). freshness rule 정의가 3곳(codex-lane / conductor / ledger)에 중복.
executor-prompt 실물 예시 33줄이 이미 구체적인 템플릿을 반복한다.
## 실측 증거
- skills/jongmin-dev-conductor/SKILL.md:246-322 (77줄) / skills/handoff/SKILL.md:68-95 (28줄)
  / skills/jongmin-warplan/SKILL.md:72-94 (23줄) / skills/skill-forge/SKILL.md:86-108 (23줄)
- freshness: shared/codex-lane.md:29-33 (정본) / conductor:180-181 / shared/ledger.md:98-99
- shared/executor-prompt.md:37-69 예시 33줄 (템플릿 :6-35)
- 2026-08-21 평가 세션에서 줄 번호 전건 현행 대조 완료
## 재현/반증법
`wc -l` + 위 범위 `sed -n` 대조. 컨텍스트 과포화 근거: ETH Zurich AGENTbench 2026-02.
## 제안 (배치에서 판정 — 삽입보다 먼저 실행, 순증 음수 유지)
1-a. 이력 4파일 압축. 각 이력 절 머리에 아래 규칙을 두고 압축:
> 이력에는 **현재 행동을 설명하는 주요 변경과 폐기 결정만 최대 10줄** 유지한다.
> 상세 릴리스 기록은 런타임 SKILL 본문에 싣지 않는다 — 필요하면 저장소 git 이력을 본다.
⚠️ skill-forge:46 "폐기한 패턴은 이유와 함께 남긴다"는 유효 — 지우는 건 세션 서사이지 폐기 근거가 아니다.
1-b. freshness 단일 정의는 codex-lane.md:29-33에만. 나머지 둘은 참조 한 줄:
   `접합 전 freshness 필드 완료 확인 ([codex-lane.md](../../shared/codex-lane.md) freshness rule)`
1-c. executor-prompt 예시 15줄 이하로, 절약분에 규약 복제 기본문(별도 케이스) 삽입.
예상: 약 −128줄.

**잔여 (2026-08-29 실측)**: 1.9.0 소각은 conductor·handoff·warplan·skill-forge 4파일만 — loop(111-144,
34줄)·sortie(91-120, 30줄)·deep-audit(61-80, 20줄) 이력 84줄이 skill-forge 10줄 규약 위반 상태로 잔존.
validate가 이력 절 존재를 요구하지 않고 직접 참조 0 — 동작 불변 소각 가능 (재집행 대상).

**재집행 (1.10.0, 2026-09-08)**: loop 33·sortie 29·deep-audit 19줄 이력을 폐기 결정만 남기는 규약 형태로 −66줄.
