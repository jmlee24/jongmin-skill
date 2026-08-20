---
skill: jongmin-dev-conductor
observed-version: 1.8.3
skill-version: conductor v4.1 (YNprinting 32커밋 웨이브, 2026-08-20)
severity: major
status: pending
---
## 실패 형태
worktree 환경 결손(gitignore 자산)이 레인마다 재발했고, 레인이 임의로 만든 잘못된 링크
(TestCases/TestCases)가 새로운 가짜 증상까지 만들었다. 현행은 프롬프트 문장("환경 결손 구분
보고")으로만 대응 — 기구가 아니라 기억에 의존.
**독립 사례 2건째** — 2026-08-19-2347-shared-executor-prompt-lane-local-baseline.md와 같은 축
(다른 웨이브, 같은 repo). 표준 문구 "실패한다"는 1.8.2에 이미 있으나 **해결 절차가 없다**.
## 실측 증거
YNprinting 32커밋 웨이브: 쓰기 레인 8개에서 반복, 오링크 1건이 레인 판정 오염.
## 재현/반증법
gitignore 자산 의존 테스트가 있는 repo에서 worktree 레인 발진 — 변경 0에서 red, 레인이
자구책 링크를 만드는지 관찰.
## 제안 (배치에서 판정)
worktree environment manifest — T1이 웨이브당 1회 준비(원본·목적·유형·해시 검증),
executor 임의 링크·심볼릭 생성 금지, 환경 결손과 코드 회귀를 동시에 구분 보고 가능한 형식.
lane-local-baseline 케이스(레인 자기 기준선 측정)와 한 묶음으로 판정할 것.
