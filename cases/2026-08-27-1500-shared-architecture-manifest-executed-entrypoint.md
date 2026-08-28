---
skill: shared/
project: jongmin-skills 전면 구조 리뷰 (T1+CX, 2026-08-27 — pending 57건·실전 보고 3건 공통 결론 입력)
observed-version: 1.9.1
severity: major
status: pending
related: 2026-08-27-1000-shared-family-budget-and-conditional-load, 2026-08-27-1000-jongmin-dev-conductor-lane-resource-mutex, 2026-08-27-1000-jongmin-dev-conductor-worktree-bootstrap, 2026-08-27-1000-jongmin-dev-conductor-gate-baseline-single-source, 2026-08-27-1000-jongmin-warplan-conductor-compile-block, 2026-08-26-0930-shared-hypothesis-fact-gate
---
## 실패 형태
세 실전 보고서가 독립적으로 같은 결론: "규칙이 없어서 난 건 0건 — 늦거나·먼 곳에·좁게 있어서 났다",
"잘 읽으면 알 수 있음에는 강하고 빠뜨릴 수 없음에는 약하다". 반복 축: 자원 경합 3세션·worktree 환경
4회·기준선 복제 3회·warplan→conductor 2프로젝트. **산문을 앞으로 옮기는 처방은 이미 1.9.0에서 썼고
(sentinel 이동) 그 뒤에도 같은 축이 재발** — 텍스트 층의 한계.
## 실측 증거
pending 57 = critical 2·major 44·minor 11 (guardrail 4건 포함 — 결함 아닌 보존 조건이 같은 큐에 섞임).
## 재현/반증법
매니페스트·wrapper 없이 서로 다른 프로젝트 3개 이상의 후속 웨이브에서 resource/worktree/baseline 누락이
0이면 스크립트 강제 비용을 재판단 — 현재 3~4회 반복은 그 반대 증거.
## 제안 (2차 배치 설계 — T1·CX 접합)
**아키텍처 층 변화: 매니페스트 = 상태의 정본 / 스크립트 = 집행점 / 텍스트 = 판단 경계.** 매니페스트만
추가하면 또 하나의 안 읽는 문서 — 발진 wrapper가 유효한 매니페스트 없이는 실패해야 "빠뜨릴 수 없음"이
된다. 축별 분담:
| 축 | 텍스트 | 결정론 층 |
|---|---|---|
| 자원 경합 | 무엇을 배타로 볼지, 애매하면 배타 | 자원 ID·capacity 매니페스트, 발진 전 lock·충돌 차단 |
| worktree 환경 | 링크/복사/읽기전용 중 프로젝트 정책 | toolchain·fixture 실존 검사, bootstrap, 레인 baseline |
| 기준선 | 의미·허용 변화 해석 | BASE·환경 지문과 1회 측정, immutable revision, brief 자동 렌더 |
| warplan→conductor | 분해·의존성·사용자 결정 | compile-block 스키마 검증 |
| 문서 위생 | keep/merge/delete 판단 | allowlist·required-doc-update 대조 (doc-audit 확장) |
| 주장 전 검증 | 반대 설명·FACT/HYPOTHESIS 판정 | 모집단·단위·원자료·반증 필드 존재 검사 |
- **mutex는 DAG 간선이 아니다** — 인과 의존이 아니라 스케줄링 제약. 별도 capacity/lock으로 모델링
  (lane-resource-mutex 케이스의 "DAG mutex 간선" 처방 정정).
- 스크립트는 산발 확대 대신 **웨이브 진입점 하나**(매니페스트 검증·bootstrap·acquire/release·compile-block
  검증·immutable brief·baseline 기록). 구체 명령명은 구현·프로브 전 문서에 쓰지 않는다.
- frontmatter 조건부 로드는 우선순위 아님 — loader가 소비하지 않으면 inert metadata, 누락 방지가 아니라
  비용 최적화.
- 총량: 관리 대상은 **런타임 로드되는 Markdown 1,531줄**(scripts LOC는 별도 — 공식 규약 "결정론은
  로드 안 되는 스크립트로"). 목표 순감축 40줄 이상. 삭제 후보: conductor Preflight 체크리스트(→매니페스트
  검증+질문 sentinel) 10~16 / 웨이브 진행 1·2절 환경·기준선·소유권 설명 20~30 / 착지·문서 관리 재서술
  8~12 / parallel-write 전제(executor 중복) 8~12 / landing-check 검증 함정 측정 서사 8~10 / ledger 유예
  예시 3→1 15~20 / codex-lane 날짜·SHA 판정 서사 7~10 / executor worktree 결손 경고 4~6 / question-policy
  이력 5~7. measurement-evidence.md 장문 신설은 목표에 반함 — 스키마+검사기로.
- **2차 배치 첫 3축·불변식**: ① 발진 계약(환경·자원·기준선) — "BASE 고정 매니페스트 검증 + 자원 lock +
  bootstrap 전에는 어떤 실행 레인도 발진하지 않는다" ② 계획→실행 무변환 컴파일 — "동일 BASE의 유효한
  compile-block을 재작성하지 않으며 스키마 불충분·revision 불일치면 발진하지 않는다" ③ 주장 생명주기 —
  "보고·변경·측정·설계를 유발하는 주장은 provenance와 반대 설명·최소 반증 통과 전 FACT로 표현하지 않는다".
- **케이스 간 충돌 8건(큐레이터 해소 필요)**: immutable brief vs 변하는 baseline·소유권(→ revision+base_sha+
  hash, 영향 레인만 재발행) / mutex를 DAG 간선으로 / commit-granular landing vs 레인=착지 단위 불변식
  (→ 처음부터 별도 태스크 분할) / worktree 공유 bootstrap vs 자원 격리(toolchain 읽기전용 공유, mutable
  cache·DB·생성물은 레인별 분리·lock) / docs-only 면제 금지 vs impact-scope(→ 기록된 게이트에서 제외 안
  함이지 full 강제 아님) / handle-only 정지 vs PID 처방(handoff·stalled-thread — 1.9.2에서 정합) / 중단
  즉시 worktree 제거 vs 산출물 수명 감사(→ 잡 종료→보존 판정→비강제 제거) / guardrail 4건 타입 혼합
  (→ type: guardrail 분리).
**T1 접합 의견**: 방향 동의. 두 가지 경계를 추가한다 — ① 스크립트 층은 Node 단일(이 세션 실측: cmd 캐럿·
heredoc·PIPESTATUS 함정 3종 — Bash 의존 스크립트는 Windows에서 깨진다), OMC 비의존·새 도구 설치 금지
유지 ② 진입점은 **얇은 검증기**(매니페스트 검증·bootstrap·lock)까지만 — 레인 편성·착지를 스크립트가
하기 시작하면 프레임워크가 되고 T1 판정 불변식과 충돌한다. 채용 순서: 축 ① 프로토타입을 프로젝트 2개에서
실측 후 ②③.
