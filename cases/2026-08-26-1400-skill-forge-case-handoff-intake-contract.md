---
skill: skill-forge
project: jongmin-skills 케이스 체계 설계 논의 (T1+CX, 2026-08-26 — 사용자 우려: 케이스가 맨날 보는 문서에 쌓여 오염)
observed-version: 1.9.1
severity: major
status: pending
related: 2026-08-26-1100-skill-forge-cases-dir-unreachable-from-install (P0 → 이 케이스로 축소 재판정)
---
## 실패 형태
케이스 체계의 **토폴로지는 2단계**(실전 세션 → 채팅 보고 → 큐레이터 세션이 마켓플레이스 클론에 등록)인데
**계약 문구는 1단계**(cases/README·skill-forge: "결함 발견 세션이 즉시 cases/에 기록")다. 그래서 설치본
세션이 "정식 목적지가 없다"를 P0 결함으로 보고했다. 실측(오늘 4회): 큐레이터 등록 시점에 중복 제거·
related 부여·project 정규화가 일어나며, 이는 직접 쓰기로는 얻을 수 없다. 반면 project 키는 이미 6가지
표기로 흩어져 있어(YNprinting / YNprinting (…) / 미상 — …) case-lint의 독립 프로젝트 집계가 문자열
차이에 오인될 수 있다.
## 실측 증거
설치 캐시 1.9.1에 cases/ 없음·validate --only=6 ALL PASS(CX 실측) / 마켓플레이스 클론에서는 63건 정확
(pending 43·applied 19·rejected 1). 런타임 오염 경로 0 — cases/를 읽는 스킬은 skill-forge improve뿐.
## 재현/반증법
설치본 세션에서 케이스 발견 → 문서가 지시하는 목적지가 존재하는지 확인. 채팅 보고가 실제로 유실되거나
ACK 없이 릴리스가 진행된 사례가 생기면 intake 계약을 P0로 재승격.
## 제안 (배치에서 판정 — T1·CX 합의, 스킬 미수정 상태로 기록)
직접 쓰기 도입 없음. 큐레이터 단일 등록 지점을 **설계로 승격**하고 계약을 문서화:
- 실전 세션의 정식 산출물은 채팅 `CASE-HANDOFF` 패킷 (공통 envelope 1회: report-id·project-id·run-id·
  observed-version + 후보 반복: candidate-id·skill·axis-hint·severity-hint·failure 1~3문장·evidence·
  falsifier·proposal(선택)·cx-delta(T1과 갈릴 때만)). reporter는 최종 status·canonical project·related를
  정하지 않는다 — 큐레이터의 품질 게이트.
- 큐레이터는 registered / merged-into / rejected-at-intake + case-id로 ACK. report-id로 멱등(같은 텍스트
  2회 붙여넣기 안전).
- 위치는 handoff가 아니라 **skill-forge**(케이스 판정 소유자) — improve 절의 중복 문장(케이스 우선 설명 +
  5항 pending 소비 설명)을 합친 자리에 6~10줄 계약으로, 총량 중립. 전체 스키마 정본은 cases/README.
- case-lint 부재 처리: 설치 캐시 → `SKIP [6] cases unavailable in installed artifact` / 큐레이터·릴리스
  저장소 `--require-cases` → 부재 FAIL / 디렉터리 있고 0건 → PASS + 큐 NOTE. 부재를 PASS로 표기 금지.
**T1 접합 의견**: 전부 동의. 오늘 세션이 이미 이 흐름으로 4회 돌았고 유실 0 — 계약만 없었다.
