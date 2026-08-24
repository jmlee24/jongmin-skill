---
skill: shared/codex-lane.md
project: YNprinting
observed-version: 1.8.3
skill-version: conductor v4.1 (YNprinting 32커밋 웨이브, 2026-08-20)
severity: major
status: applied
applied-version: 1.9.0
---
## 실패 형태
CX 데드라인 정본이 둘이다 — conductor 「실패·중단 정책」은 "15분 초과 시 잡 정지",
codex-lane.md 「데드라인·생존 판정」은 "15분은 kill이 아니라 점검 시점, 살아 있으면 연장".
어느 쪽을 따를지 결정 불가. 더 큰 원인: **중복성 취소 판정 기준이 없다** — CX-A가 답하려던
질문을 리뷰 레인 셋이 먼저 전부 답했는데, CX를 죽일 근거 조항이 없어 계속 돌렸다.
(사용 세션 T1의 "데드라인 조항이 없다"는 관찰은 CX 정정으로 철회 — 부재가 아니라 충돌.)
## 실측 증거
YNprinting 32커밋 웨이브: CX 6회 중 중복 CX 방치로 벽시계 약 2.5시간 실낭비.
## 재현/반증법
두 문서의 해당 절 원문 대조 — 한쪽은 정지, 한쪽은 연장. 그리고 "이미 답해진 질문의 CX를
취소하라"는 조항이 어느 파일에도 없음을 grep으로 확인.
## 제안 (배치에서 판정)
- conductor의 "15분 초과 시 잡 정지" 삭제, codex-lane "15분 무진척 점검"으로 정본 일원화
- 없는 기구: deadline_at 자동 계산 · 연장 횟수 상한/총 벽시계 상한 · 레인별 마지막 진척
  시각 · **중복성 취소 판정**(다른 리뷰가 그 질문을 이미 답했으면 CX kill)
- 스킬은 프로세스를 감시할 수 없어 결국 T1 폴링 → 호출 형태(timeout 래퍼)에 흡수가 현실적.
  codex-lane 표준 호출 1줄: `timeout <N> codex exec --sandbox read-only "$(cat <프롬프트파일>)" < /dev/null`
  + 종료 코드 124/137과 codex 자체 실패 구분 · timeout이 자식 codex를 남기는지 확인 절차 ·
  강제 timeout과 "15분 점검 후 연장" 정책의 관계 명시. (< /dev/null 자체는 이미 문서에 있음 —
  빠진 건 timeout 래퍼와의 결합 규약뿐)

**적용 기록 (1.9.0)**: 정본 일원화(conductor→codex-lane) + 중복성 취소 조항. timeout 래퍼
결합 규약은 미검증(자식 프로세스 잔존 여부)으로 불채택 — 재관측 시 별도 케이스로.
