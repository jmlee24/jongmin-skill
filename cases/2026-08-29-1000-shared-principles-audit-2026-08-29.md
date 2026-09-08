---
skill: shared/
project: YNprinting (2026-08-29 1세션 실측 — Codex 3스레드 교차; 큐레이터 T1+CX 선별)
observed-version: 1.9.2
severity: minor
status: pending
---
## 실패 형태
(결함이 아니라 배치 지침 — 사용자가 명문화한 핵심 원칙 4개의 준수 감사, T1+CX 접합 2026-08-29)
① Claude 공식 스킬 제작법 참고 ② 명확·간결 — 코드 개발물에도 동일(최악은 문서만 잔뜩) ③ Claude
최상위(T1)·차상위(T2)·Codex 최상위의 **이종 모델 앙상블** ④ 토큰은 낭비돼도 되지만 **개발 시간**은 아님.
## 실측 증거 (판정표)
| 원칙 | 판정 | 근거 |
|---|---|---|
| ① 공식 제작법 | **지킴** | 7 SKILL 전부 500줄 미만(최대 conductor 253), progressive disclosure·결정론 스크립트화 반영. UNVERIFIED: description 합산 한도 — 패밀리 1,536자 vs CX "공식 현재 1,024자"(실제 최대 194자라 안전, 문구만 대조 필요) |
| ② 명확·간결 | **부분** | 런타임 md 1,489줄로 감축했으나 cases 78건·114KB, pending 56건 1,230줄(런타임 md와 같은 규모), 잔여 이력 84줄(loop 34·sortie 30·deep-audit 20 — skill-forge 10줄 규약 위반, 동작 불변 소각 가능) |
| ③ 앙상블 | **부분** | 바인딩 실측: T1 claude-fable-5 / T2 opus(lane-reviewer) / CX gpt-5.6-sol high — 배치 맞음. 이종 교차가 성립하는 지점: warplan·conductor 착지물·deep-audit·loop 종료·skill-forge. **동종/자기검증만 남는 표면**: handoff save(CX 금지), T1 최초 주장·최종 보고, 측정 판독(T2 독립 재계산은 동일 벤더), lane-reviewer↔executor(Opus↔Opus — 컨텍스트 독립이지 오류 분포는 동종). P6 "자기 검출 0"은 이 표면들의 구조적 귀결. 보강: alias가 해석된 실제 모델 ID를 실행마다 기록 |
| ④ 시간 | **위반** | 시간이 1급 지표가 아님 — time-ledger가 review·recheck·docs·exclusive·**curation**을 기록하지 않고 실전 계측 0. 알려진 손실: 중복 CX 2.5h(1.9.0 수정), 배타 구간 T1 대기 15분, 4레인 중복 bootstrap. 오늘 큐레이션 시간은 측정 불가 |
## 재현/반증법
다음 배치 후 같은 4항 재감사. 원칙 ④는 time-ledger 실전 계측 1회 이상이 선행돼야 판정 가능.
## 제안 (2차 배치 지침 — 순증 0 목표)
- 시간을 늘리는 게이트 판정: 원 리뷰어 재확인 = **유지**(chess 장부에서 fix 뒤 신규 major·critical 반복
  검출 — 재작업 방지 실증) / CX 상시 2슬롯 = **"미답 질문 최대 2개"로 교체**(슬롯 채우기 발진 금지 — 중복
  CX 2.5h) / 배타 구간 = 필요 비용(15분 대기는 스케줄링 손실로 분리 기록) / 8단계 문서 관리 = 조건부 검토
  (doc-step-yield 케이스) / 케이스 큐레이션 = **시간 장부 대상에 포함**
- time-ledger 최소 개정: 이벤트 8종 대신 `timestamp | actor | phase | start|done|caught | work-id`,
  phase = write/land/verify/judge/review/recheck/docs/exclusive/curation/rework, report에 makespan·phase별
  임계경로·T1 순수 대기·rework 시간. "방지했을 시간"은 사실값과 분리(UNMEASURED_COUNTERFACTUAL)
- 08-29 보고서 처방 중 (a) 패밀리 일반 = P5·P6 2건만 신규, 나머지는 기존 축 관측 추가(P1 반증 → 스크립트
  확대 제한, P2 → growth-control, P3·P4 → hypothesis-fact·unverifiable-citations). YNprinting 특화(문서
  강제 코드 1,811줄·색인 591줄)는 그 프로젝트의 선택 — 패밀리 규약으로 일반화하지 않음
- 즉시 가능한 동작 불변 소각: 이력 84줄 (history-freshness-burn 재집행)

**관측 추가 (1.10.0, 2026-09-08)**: ① UNVERIFIED 해소 — 공식 문서(code.claude.com/docs/en/skills) 원문 "combined
description and when_to_use text is truncated at 1,536 characters" — 패밀리 규약 정확, CX "1,024자"는 오류.
② 이력 84줄 소각 집행(loop·sortie·deep-audit −66줄). ③ 앙상블: Claude-only 적대적 검증 생존 권고를 CX가 2건
정정(ultracode 비교 케이스) — 이종 교차의 실증. ④ 시간 장부 tsv는 이 PC에 0건 — 계측 선행 조건 미충족 지속.
