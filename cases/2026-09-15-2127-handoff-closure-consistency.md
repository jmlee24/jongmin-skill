---
skill: handoff
project: YNprinting (2026-09-14 웨이브 종료 handoff — 다음 세션이 기록 차이를 재해석해야 했음)
observed-version: 1.12.1
severity: major
status: pending
related: 2026-08-21-1841-handoff-fact-conclusion-refutation (추정/측정 분리 — 같은 축 3회째, 전부 YNprinting), 2026-08-30-1712-handoff-decision-basis-inertia (같은 축 2회째), 2026-08-24-1210-shared-ledger-time-event-vocabulary (덮어쓰기 — 레인 ID 재사용의 장부 측 결과)
---
## 실패 형태
종료 절차 산출물(최종 보고·handoff)에 네 가지 불일치가 실렸다:
① 검증 전 환산("1 %≈11 px")을 기록했다가 철회 — 추정/측정/반증 표시 없이 같은 층에 적힘.
   08-21·08-30 케이스와 **같은 축 3회째**. handoff-check.mjs(1.12.0)는 SHA·경로·명령 실존만 보므로
   이 유형은 구조적으로 못 잡는다 — 스킬 본문(:52)이 스스로 인정한 사각.
② 리뷰 큐 표·잡 핸들 상태가 산문과 어긋남 — 표는 "진행 중", 산문은 "전 리뷰 접합". 큐 정리 없이 종료.
③ 레인 이름 F·G를 같은 웨이브 안에서 재사용 — time-ledger.mjs는 같은 레인·이벤트를 **마지막 값으로
   덮어쓰므로**(time-ledger.mjs:20) 시간 장부 report의 F·G 행이 앞 레인 것을 잃는다. conductor·ledger
   어디에도 레인 ID 유일성 규칙이 없다(lane-launch-check --lane도 ID를 기록만 하고 중복 검사는 안 함).
④ 트레일러(커밋 Co-Authored-By로 추정 — 보고서 표현 "트레일러 모델 표기") 모델 표기가 실행 모델과 불일치 — 실행 모델을 장부 실행 메타에 적는
   항목이 없다(ledger.md 5절은 CX 모델만, T2 모델 표기 항목 없음).
## 실측 증거
보고서 원문 문제 #5(근인: T1 판단·인계 설계, 결과: 다음 세션이 기록 차이를 재해석). 장부·handoff 파일은
이 기기에 없음. ③의 덮어쓰기 기제는 이 repo의 time-ledger.mjs:20 주석("같은 이벤트 재기록 시 마지막
값")으로 확인.
## 재현/반증법
- handoff save 체크리스트(:38-53)에 "큐 표 대조"·"추정/측정 표시"·"레인 ID" grep — 없음.
- ③: time-events.tsv에 같은 레인 ID로 lane_start 2회 append 후 report — 첫 레인 구간이 사라진다.
- ④: ledger.md 5절 실행 메타에 T2 모델 항목 grep — 없음.
## 제안 (배치에서 판정)
1. **08-21 제안(사실/결론 2층)을 이번 3회째 재현으로 채택 판정** — 새 조항이 아니라 pending 결정.
   적용 근거 "재현 성공"에 해당(프로젝트 키로는 여전히 n=1이지만 반복 3회).
2. save 체크리스트 1줄: **"종료 전 큐 정리 — 리뷰 큐 표·잡 핸들 상태를 산문 결론과 1회 대조, 어긋나면
   표를 고친다(정본은 장부)"**. handoff-check가 표 상태 어휘(진행 중/대기)와 "전 리뷰 접합" 문구 공존을
   경고하는 기계 검사로 승격 가능 — 산문으로 시작.
3. ledger.md 3절·conductor 2절 1줄: **레인 ID는 웨이브 접두(`W3-F`)로 유일** — time-ledger 덮어쓰기
   회피. 코드 층은 time-ledger append가 같은 lane+lane_start 재기록 시 경고(차단 아님).
4. ledger.md 5절 실행 메타에 `T2 모델: <발진 시 명시한 별칭>` 1항 — 트레일러 표기 대조용.
