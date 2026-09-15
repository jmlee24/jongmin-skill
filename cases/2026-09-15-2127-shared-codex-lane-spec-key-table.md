---
skill: shared/codex-lane.md
project: YNprinting (2026-09-14 웨이브 — warplan→conductor→handoff, 13커밋·쓰기 6레인·CX 4회)
observed-version: 1.12.1
severity: major
status: pending
related: 2026-08-24-0154-jongmin-dev-conductor-domain-rule-cx-spec-first (chess-masterplan — CX-A 명세 자체가 틀린 축, 독립 2건째), 2026-08-30-1700-shared-executor-prompt-t1-derived-numbers (T1 유도 전제 오류 — 인접 축)
---
## 실패 형태
CX-A(명세 생성)가 설정 계약을 잘못 명세했고 T1이 그대로 컴파일해 발진했다 — `still_min_score`를
피치 게이트에 매핑(생산자·소비자 오배정), "7키" 요구가 프로젝트의 **임계값 외부화 규약**과 충돌.
S3 레인 발진 뒤에야 정정했고 8번째 키는 사후 통보로 처리됐다.
규약 쪽 구멍: codex-lane.md 산출 형식은 반박형(Top 5)만 표준이고 **명세형은 "임무별 지정"**으로
비워 뒀다(:9-10). 그래서 명세 산출물에 키별 의미·생산자·소비자·규약 충돌을 요구하는 최소 필드가
없고, conductor Preflight가 수집한 프로젝트 규약(:50)과 CX-A 명세를 **대조하는 단계**가 3절에 없다 —
규약 복제(executor-prompt 4)는 executor에게 규약을 넘길 뿐, 명세가 그 규약과 충돌하는지는 아무도 안 본다.
chess 케이스(도메인 규칙 오류)는 "CX-A를 안 써서" 틀렸고, 이번은 "CX-A를 썼는데" 틀렸다 — CX-A
선행만으로는 부족하고 산출 형식·대조 게이트가 필요하다는 독립 2건째.
## 실측 증거
보고서 원문 문제 #1(근인: 프롬프트·T1 판단, 결과: S3 발진 뒤 정정·8번째 키 사후 통보). 장부·SHA는 이
기기에 없음(batch-guardrails-2026-09-14 참조).
## 재현/반증법
- codex-lane.md에서 명세형 산출 형식 grep — "임무별 지정" 외 필드 없음(:9-10).
- conductor 3절 CX-A(:139)와 Preflight 규약 수집(:50) 사이에 대조 조항 grep — 없음.
- 반증: 다음 명세형 CX 산출물에 아래 표를 요구했는데도 규약 충돌이 발진 후 발견되면 형식이 아니라
  대조 게이트가 문제다.
## 제안 (배치에서 판정)
1. codex-lane.md 산출 형식에 **명세형 최소 필드** 1줄: 계약(키·필드·플래그)마다
   `이름 | 의미 | 생산자 | 소비자 | 기존 규약과의 충돌 여부(근거 파일:라인)` 표 — 반박형 Top 5와 대칭.
2. conductor 3절 CX-A 한 줄: "명세 산출물은 Preflight 규약 목록과 대조한 뒤 executor 프롬프트로
   컴파일한다 — 충돌 항목은 발진 전 T1 판정". 산문 조항으로 시작하고, 재발 시 lane-launch-check가
   프롬프트의 계약 키를 매니페스트와 대조하는 기계 검사로 승격 검토.
