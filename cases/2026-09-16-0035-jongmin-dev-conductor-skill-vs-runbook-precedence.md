---
skill: jongmin-dev-conductor
project: YNprinting (2026-09-14~15 오버레이 웨이브 — 실기 데모 절차에서 프로젝트 런북 §5.1의 pkill 실행)
observed-version: 1.12.1
severity: major
status: pending
related: 2026-08-30-1712-jongmin-dev-conductor-pgrep-self-match (같은 명령군 — pkill/pgrep -f 자기매칭), 2026-08-19-2347-jongmin-dev-conductor-common-brief-delta
---
## 실패 형태
conductor 실패·중단 정책은 `pkill -f`·`killall`·패턴 일괄 종료를 금지한다(:212-215, 실측 자기 셸 종료 2회).
프로젝트 런북 §5.1은 데모 절차에 pkill을 원문으로 적어 두었고, T1은 **런북 원문을 실행**했다. 규약 위반이
아니라 **두 정본이 충돌할 때의 우선순위가 스킬에 없다** — Preflight "프로젝트 규약 수집"(:50)은 프로젝트 규약을
복제하라고만 하고, 스킬 금지선과 갈릴 때 어느 쪽이 이기는지 말하지 않는다. 이번엔 사고가 없었지만 같은 명령이
셸 자신을 죽인 실측이 이미 2회다. Codex는 장부에 명령 원문이 없어 UNVERIFIED로 두었고 T1이 보고서에서 실행
사실을 확인했다 — 장부에 실행 명령 원문이 안 남는 것도 부수 결함.
## 실측 증거
보고서 미비 #6·Codex 접합 "기각·보류" 절. 장부는 이 기기에 없음.
## 재현/반증법
- conductor에 "프로젝트 규약과 스킬 금지선 충돌 시" 우선순위 조항 grep — 없음.
- 프로젝트 런북(YNprinting §5.1)에 pkill 원문 grep — 보고서 인용(이 기기 미검증).
## 제안 (배치에서 판정)
1. Preflight 규약 수집 항목(:50)에 1줄: **"프로젝트 정본이 스킬 금지선(pkill -f·killall·rm 일괄·push 등)과
   충돌하면 금지선이 이긴다 — 명령을 안전 등가(`pgrep`로 PID 확인 후 개별 kill, 장부 잡 핸들 TaskStop)로
   치환해 실행하고, 런북 수정은 유예 결정(defer)으로 장부에 남긴다."** 금지선은 실측 사고에서 나온 것이라
   프로젝트 산문보다 우선.
2. 실기 데모·측정 절차에서 T1이 실행한 프로세스 제어 명령은 원문을 시간 장부 메모에 남긴다 — CX가 UNVERIFIED로
   둘 수밖에 없었던 공백.
