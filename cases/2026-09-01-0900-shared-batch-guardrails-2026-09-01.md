---
skill: shared/
project: YNprinting (2026-08-31~09-01 웨이브 — warplan→conductor→handoff, 24커밋·쓰기 5·리뷰 2·CX 11프롬프트/18산출·스윕 15런)
observed-version: 1.9.2
severity: minor
status: pending
---
## 실패 형태
(결함이 아니라 배치 지침) 2026-09-01 24커밋 웨이브에서 **검증 층이 실제로 잡은 것 — 축소 금지**:
① executor "사양 이탈 보고" 조항 — T1 사양(광도 게이트를 _process_label에만 배선)을 executor가 실측
반박(기본 구성은 _process_frame_batched, :268 조기 return) — 이 조항 하나가 웨이브 전체를 구함 ② 리뷰
레인 독립성 — T1이 못 본 major 1(.env 무시)·critical 1(evaluated 소비처 8곳 미도달), 뮤테이션으로 검출 —
"다른 오류 분포의 추가" 서술 실증 ③ 뮤테이션 요구 — executor가 자기 가드의 위장 통과 발견(다른 가드에
먼저 걸려 검사 미도달) ④ warplan CX 2차 — T1 전제 STALE 반증 + 레인 분할 오류 3건 ⑤ evidence-liveness —
인용 11건 LIVE, CX가 T1 측정 주장을 UNVERIFIED로 정확히 판정 ⑥ handoff 전달 경로 게이트 — 파일 0건,
다음 세션이 최우선 항목을 실제로 해결(핸드오프 목적 달성 실증).
**반증된 의심**: "parallel-write 기본 선언과 실제 2레인 직렬이 어긋난다" — 계약 신설 루트 웨이브는
구조적으로 pipeline이며 conductor에 "분리 불가면 ② pipeline 폴백"이 이미 있음(스킬 결함 아님, 작업 성격).
## 실측 증거
24커밋(fix 14·docs 6·feat 3·test 3·refactor 1), 에이전트 7, CX 18산출.
## 재현/반증법
해당 조항 약화 제안 시 이 실적을 반증해야 한다.
## 제안
보고 공통 진단 — 마찰은 전부 "규약이 산문에만 있고 기계 강제가 없는 지점"(소유권 맵 실존 확인·환경 갭
복제·CX 실패 처리). 처방은 스킬을 길게 쓰는 게 아니라 **Preflight 체크리스트를 실행 가능한 명령으로**
(architecture-manifest 케이스와 동일 결론, 3번째 독립 보고).
