# 장부 형식 — 진행·유예·실행 메타 통일 규격

## 경로 규칙

`~/.claude/jongmin-ledgers/<프로젝트명>/<YYYY-MM-DD>-<스킬명>.md`

- repo 밖, 세션 scratchpad 밖 — 세션이 끝나도 skill-forge Improve 모드가 읽을 수 있어야 한다
- 보존: 사용자가 주기적으로 정리
- **민감정보(토큰·키·비밀번호) 기재 금지**

산출물의 목적지 판정(3목적지 분류)·정본 단일화·소각은 [doc-hygiene.md](doc-hygiene.md)가
유일한 정본이다 — 웨이브 상태의 정본은 진행 장부 1개이고, handoff 사본에는 "불일치 시 장부
우선"을 명시한다 (실측: 4곳 복제 → "다음 단계" 2회 어긋남).

## 1. 진행 장부

```markdown
## 진행
- [x] 태스크 1 — 완료 (커밋 abc1234, 테스트 green)
- [ ] 태스크 2 — 진행 중 | 시도 2/3 | 마지막 실패: <에러 지문>
- [ ] 태스크 3 — 대기
```

상태는 대기/진행 중/완료/중단 4종. 실패 시 시도 횟수와 에러 지문(실패 테스트명 또는 exit code + stderr 핵심 라인)을 남긴다.

## 2. 결정 유예 장부 (sortie 등 무질문 모드)

항목마다 4요소 + 분류 태그 필수 ([question-policy.md](question-policy.md)의 유예 3분류):

```markdown
## 유예된 결정
### D1: <결정 제목> [defer|gate|block]
- 선택지: A) ... B) ...
- 내 선택: A (보수적 기본값)
- 근거: <왜 A가 되돌리기 쉬운 쪽인가>
- 되돌리는 법: <B로 바꾸려면 무엇을 하면 되는가>
```

원칙: 몰래 결정하지 않고(전부 기록), 정지하지도 않는다(보수적 기본값 또는 해당 갈래 보류).
`defer`=기본값으로 전진, `gate`=그 갈래만 보류, `block`=중단·보고.

실물 예시 (2026-08-11 백로그 루프에서 발췌 — 분류별 1건):

```markdown
### D1: 가드 미커버 분기 테스트 추가 여부 [defer]
- 선택지: A) 이번 루프에서 확장 테스트 3종 추가 B) 차기 개선으로 유예
- 내 선택: B (보수적 기본값 — 확장분은 완료 조건에 포함되지 않았고, 기존 오라클은 전부 green 유지)
- 근거: 현행 테스트가 핵심 계약을 커버하고, 스코프 고정 원칙상 확장은 기록만
- 되돌리는 법: guard-test.mjs에 CX 소견의 미커버 시나리오(cwd fallback·경로 정규화·다중 파일 순회)를 추가하면 됨

### D2: config 파일 수정이 필요한 리팩토링 갈래 [gate]
- 선택지: A) tsconfig 수정 포함 진행 B) 갈래 보류, 다른 작업 전진
- 내 선택: B (config 변경은 금지선 — 갈래만 보류)
- 근거: sortie 금지선이 config 변경을 유예 불가로 규정, 나머지 갈래는 독립적
- 되돌리는 법: 귀환 보고에서 사용자가 A를 승인하면 보류 갈래 재개

### D3: 런 중 완료 조건이 두 해석으로 갈라짐 [block]
- 선택지: A) 좁은 해석으로 전진 B) 넓은 해석으로 전진 C) blocked 종료
- 내 선택: C (loop는 질문 없이 목적지를 바꾸지 않는다)
- 근거: 어느 해석이든 오라클이 달라짐 — 보수 전진이 성립하지 않는 유형
- 되돌리는 법: 사용자가 해석을 확정하면 같은 명령으로 루프 재발진
```

## 3. 시간 장부 (conductor 웨이브 필수)

수동 표 대신 **append-only 이벤트 로그**로 기록한다 — 수동 기록은 큐 대기·판정 구간을 남기지
못한다 (실측 2웨이브: duration만 남고 대기·충돌 계측 0). 고정 스크립트를 쓴다:

```bash
node <플러그인루트>/scripts/time-ledger.mjs append <장부디렉터리>/time-events.tsv <레인> <이벤트> [메모]
node <플러그인루트>/scripts/time-ledger.mjs report <장부디렉터리>/time-events.tsv
```

이벤트 8종: `lane_start / lane_done / land_start / land_done / verify_start / verify_output /
decision_done / conflict`. report가 레인 작업·미착지 큐 대기(lane_done→land_start)·착지·검증
실행 대기·T1 판정 구간(verify_output→decision_done)·충돌 횟수를 자동 계산한다 — 발진 게이트
튜닝·머지 트레인 도입 여부는 추정이 아니라 이 실측으로 판단한다.

## 4. 백그라운드 리뷰 큐 (파이프라이닝 모드 — conductor·loop)

```markdown
## 리뷰 큐
| SHA | touched files | 계약 변경 | 레인 | 상태 | 접합 |
|---|---|---|---|---|---|
| abc1234 | src/a.py | 없음 | deep | 진행 중 | 대기 |
```

종료 게이트 조건: 큐의 전 항목이 접합 완료(adjudicated)여야 완료 선언 가능.
접합 전 [codex-lane.md](codex-lane.md) freshness rule로 stale 여부를 확인한다.

## 5. 실행 메타

```markdown
## 실행 메타
- 기준 SHA: <BASE>
- 착지 매핑 (병렬 웨이브): lane/<task> <레인 TIP> → 착지 후 <직전 TIP>..<새 TIP>
- CX 모델: <config.toml model 값> / codex --version: <버전>
- 승격 이력: <T2→T1 승격 시 사유·재시도 기록, 없으면 "없음">
- 검증 게이트 생략: <생략한 CX·리뷰 게이트 | 사유 | 대체 통제 | 잔여 위험, 없으면 "없음">
- 측정 판독 provenance (측정 웨이브): <결론 | 모집단·포함 규칙 | 산출물 경로 | 집계 코드 SHA·명령 | 독립 검산 산출 경로 | verdict>
- 중단 원인: <서킷 브레이커·데드라인·범위 밖 변경 등, 정상 종료면 "정상">
- 계정: <개인|법인> (2계정 한도 회계용)
- 문서 변경: <신규 .md allowlist | 없음> / <이 작업이 갱신한 문서 목록> — 종료 시 소각 판정
  대상 (doc-hygiene.md)
```
