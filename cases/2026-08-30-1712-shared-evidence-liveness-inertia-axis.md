---
skill: shared/evidence-liveness.md
observed-version: 1.9.2
project: YNprinting (2026-08-29~30 세션 — 착지 9커밋·쓰기 레인 5·리뷰 1·CX 6(+샌드박스 실패 2)·접합 major 5·minor 1·nit 1; 설치본 1.9.2 — conductor:207 pkill 경고 문구 인용으로 확인)
severity: major
status: pending
---
## 실패 형태
**세 스킬(warplan·conductor·handoff) 공통 구멍** — "이 제약이 진짜인가, 물려받은 관성인가"를
묻는 단계가 없다. LIVE는 "인용이 살아 있다"만 보증하지 "제약이 필연이다"를 보증하지 않는데,
실사용에서 둘이 붙어버린다. 세션 최대 오류가 여기서 났고 **기존 검사 전부를 통과**했다:
evidence-liveness LIVE ✅(코드 실재·현행) / warplan 5요소 컴파일 ✅(즉시 발진 가능) / CX 1차
스카우트 ✅(묻지 않았으니 답 없음) / CX 2차 반박 ✅("계획이 실패할 이유"만 물음) / conductor
착지 검증 해당 없음(계획 오류). 잡은 것은 사용자 한마디("이미 구현된 로더나 코드·문서에
끌려서 강제되는 방향이진 않은지").
## 실측 증거
T1이 thresholds.yaml에 중첩 블록 불가로 판정 → "artwork를 두 파일로 갈라 보내라" 권고 →
핸드오프까지 기재. 실제는 `_YamlSource.__call__` 14줄 구현 선택이며 필드 선언만으로 현행 로더가
먹음(worktree 주입 실증). 재질문 후 2파일 분리의 기둥 셋 전부 붕괴: 변경 주기 논거(policy 71커밋
vs thresholds 82로 반증) / "thresholds만 experiment override"(거짓, config.py:137 합집합 검사) /
"policy에 판정 임계 금지"(policy.yaml:398에 이미 문자적 예외).
## 재현/반증법
evidence-liveness.md에 "필연/관성" 구분 조항이 있는지 grep — 없음. 반증: 위 권고를 현행
규약으로 다시 판정시켜 LIVE 외 경고가 나오는지 확인.
## 제안 (배치에서 판정) — 보고서 우선순위 1, 아래 4·7을 포괄
evidence-liveness에 판정 축 1개: **LIVE 판정 후, 그 인용을 설계 전제로 쓸 때만** 한 번 더
묻는다 — 이 제약은 물리·계약·외부 의존인가, 아니면 지금 코드가 그렇게 돼 있을 뿐인가?
후자면 `INERTIA` 표기 + "고치는 비용"을 함께 적어야 전제로 쓸 수 있다.
적용 지점: ④ warplan/executor-prompt 5요소에 6번째 "이 단계의 전제 중 코드·문서 현황에서 온
것"을 필연|관성 표기, 관성 1건 이상이면 CX 2차 반박 필수 축 / ⑦ handoff save 체크리스트 —
다음 세션 행동을 바꾸는 결정·권고의 근거가 필연인지 관성인지 표기, 관성이면 고치는 비용
("로더가 못 먹는다(관성, 2줄)"로 적혔으면 다음 세션이 바로 의심).
주의: 8/21 케이스가 REFUTED를 liveness 5번째 상태로 넣지 말라 했음(근거 생존성 ↔ 명제 진위).
INERTIA는 생존성 판정 뒤의 **전제 사용 조건**이므로 축이 같지 않다 — 배치에서 상태 enum 확장이
아니라 별도 절로 둘지 판정.
