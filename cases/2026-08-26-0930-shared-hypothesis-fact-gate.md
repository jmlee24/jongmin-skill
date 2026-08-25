---
skill: shared/
project: YNprinting (12커밋 웨이브 2026-08-25~26 — 쓰기 4·리뷰 1·CX 5·동시 4)
observed-version: 1.9.1
severity: major
status: pending
related: 2026-08-19-2347-jongmin-dev-conductor-briefing-evidence-gate (전제 검증 축 — 같은 프로젝트), 2026-08-24-0154-jongmin-dev-conductor-domain-rule-cx-spec-first (chess-masterplan — 전제 검증 축, 독립 2건 후보)
---
## 실패 형태
스킬은 "착지 전 검증"은 촘촘한데 **"주장하기 전 검증"이 없다**. T1 사실 오류 7건 중 T1이 스스로
잡은 4건도 전부 후속 질문·편집 직전·추가 실험에서 늦게 발견 — 출력 원문 판정은 강하지만 최초
주장에 대한 선행 제동이 약하다 (CX 지적). 오류 1·5·6은 사용자에게 단언한 뒤 뒤집혔다.
## 실측 증거
오류 1: n=1 관측을 "패키지화 차단 요인"으로 단언, 반증 실험(8런)은 그 뒤에 수행 — 순서 역전.
## 재현/반증법
새 진단이 파일 변경·측정 캠페인·설계 결정을 유발한 시점과 반대 설명·반증 실험 시점의 순서를 장부에서 대조.
## 제안 (배치에서 판정 — 우선순위 1)
새 진단이 파일 변경·측정 캠페인·설계 결정을 유발하면 먼저 **반대 설명 하나 + 최소 반증 실험 하나**를
수행하고, 통과 전에는 장부에 FACT가 아니라 HYPOTHESIS로 기록한다. 위치는 배치에서 판정
(landing-check 검증 함정 vs evidence-liveness vs conductor 1절).
