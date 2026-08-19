---
skill: shared/executor-prompt.md
observed-version: 1.8.2
skill-version: conductor v4.1 (v4 이후 두 번째 실전 웨이브)
severity: major
status: pending
---
## 실패 형태
worktree가 gitignore 자산(TestCases/ 등)을 못 봐서 레인 베이스라인이 지휘부가 준 것과
구조적으로 다름. 문서에 "환경 결손 구분 보고"는 있으나 "레인이 자기 베이스라인을 먼저
재라"가 없다 — 안 재면 레인이 환경 차이를 자기 변경 탓으로 오인한다.
## 실측 증거
YNprinting: 레인 15개 매 프롬프트에 수동 삽입, 레인 베이스라인 불일치 매번 발생.
## 재현/반증법
gitignore 자산을 읽는 테스트가 있는 repo에서 worktree 레인 발진 — 변경 0에서 red 발생 확인.
## 제안 (배치에서 판정)
executor 첫 단계 = worktree에서 지정 게이트(impact-scope 명령만, full suite 아님) 1회 실행해
레인 시작 기준선 기록. 변경 후 판정은 그 기준선과 우선 비교. 감축 짝: CSV 예시 축약 →
4줄 baseline contract.
