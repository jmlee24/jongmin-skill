---
skill: skill-forge
project: jongmin-skills 케이스 체계 설계 논의 (T1+CX, 2026-08-26 — 사용자 우려: 케이스가 맨날 보는 문서에 쌓여 오염)
observed-version: 1.9.1
severity: major
status: pending
related: 2026-08-26-1400-skill-forge-case-handoff-intake-contract (같은 논의)
---
## 실패 형태
pending 43건(52KB·921줄)을 배치 세션이 **전건 본문**으로 읽어야 한다 — skill-forge improve의 "pending
전건 입력" 계약이 컨텍스트 부담의 실제 원인. 사용자 우려("케이스가 맨날 보는 문서에 쌓임")의 실체는 항상
로드되는 문서가 아니라(런타임 오염 경로 0 — 실측) ① improve의 전건 본문 계약 ② 채팅에 붙는 200줄
보고서 두 가지다. 또 1파일=1결함 규약 아래서 같은 축의 재관측이 새 파일로 늘어난다(같은 날 두 세션이
배타 구간·측정 주장 정의 축을 각각 새 파일로).
## 실측 증거
cases/ 63건·83KB. 평균 22.8줄·최대 39줄(본문 상한만으론 절감 제한적 — CX 실측). 런타임 문서 중 cases/
참조는 skill-forge 1곳(T1·CX 동일 실측).
## 재현/반증법
배치 세션에서 pending 전건 읽기 토큰 측정. 축별 dossier 도입 후 서로 다른 원인이 잘못 병합되거나 선택
축 밖 케이스를 안 읽어 판정이 뒤집히는 비율이 유의미하면 전건 검토로 복귀.
## 제안 (배치에서 판정 — T1·CX 합의)
사용자 직관 "가장 최근만 남기기"를 **"축마다 활성 dossier 하나만 보이게"**로 구현 — pending TTL 삭제는
금지(오래됨은 반증이 아니고 독립 2건의 첫 관측을 지운다):
- (a) **생성형 인덱스** — 추적 문서가 아니라 스크립트 stdout: `case-id | severity | age | skill |
  axis-id | project-ids | observations | summary`. 배치는 인덱스 전건 → `critical → 독립 project 2개 이상
  → 최고령` 순으로 축 선택 → 그 축 본문+직접 related만 열기 → 축 단위 판정 → 다음 배치에서 다음 축.
- **축별 dossier** — 같은 축 재관측은 새 파일이 아니라 활성 dossier에 관측 추가(axis-id·first/last-observed·
  독립 project-id 목록·관측별 날짜·근거·재현 포인터·현재 반증 상태). 원인·재현법이 다르면 축 분리.
- frontmatter 분리: `project-id`(저장소명 정규 키) / `run-id`(날짜·웨이브) / `axis-id` — 독립 2건
  집계는 project-id로만.
- (b) resolved(applied/rejected)는 1회 릴리스 또는 14일 유예 후 `cases/archive/YYYY/`로 이동 — 삭제
  않음, related는 archive까지 찾는 resolver로 경로 이동 무관.
- (d) 본문 soft cap ~25~30줄/2.5KB, 4KB 초과 시 lint NOTE — 명령 출력 전체 대신 SHA·명령·핵심 출력만.
**T1 접합 의견**: dossier 모델이 오늘 실측(같은 축 2세션 2파일)을 정확히 해결하고, "최근만 남기기"의
의도(보이는 것을 줄인다)를 삭제 없이 달성한다. 우선순위 (a) 인덱스 > dossier > archive > cap.
주의: 이 두 케이스는 케이스 체계 자체의 개편이라 2차 배치의 **첫 축**으로 처리해야 나머지 41건 판정
비용이 내려간다.

**관측 추가 (2026-08-29)**: cases 78건·1,778줄·114KB, pending 56건 1,230줄 — 런타임 md(1,489줄)와 같은
규모. P2 자기 적용 경고: 인용률(related 수)은 사용 증거가 아니다 — 출처 편중률·자기 유지율은 삭제 검토
**신호**로만(임계 정하면 차단 게이트가 되어 P1 재현). 반증 조건: dossier/index 후 큐레이션 벽시계·본문
읽기량 감소, applied가 실제 규칙 변경·재작업 방지에 연결된 비율 기록.

**판정 (1.10.0, 2026-09-08, 사용자)**: 배치 세션 비용은 허용 — 인덱스·dossier·archive는 **보류**. 대신
skill-forge improve 입력 규약을 "resolved 제외 / pending은 인용 조항 생존 확인 후 STALE이면 본문 미독해로
rejected / 축 단위 세션 분할"로 교체. 첫 적용: 1.8.x pending 15건 신선도 검사 — 인용 조항이 바뀐 건 0건(전부
LIVE, pending 유지). 케이스 README 템플릿의 `status: pending` 예시가 집계에 잡혀 pending 수가 1 과다.
