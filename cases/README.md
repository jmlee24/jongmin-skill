# cases/ — 스킬 결함 케이스 수집

실측 결함을 즉시 스킬에 반영하지 않고 여기 모아 **배치로** 갱신한다.
근거: 하루 5버전 릴리스 + 확정 소탐대실 2건이 전부 n=1 즉시 반영에서 발생 (2026-08-14 실측).
이 폴더는 플러그인 설치본에 실리지 않는다 (plugins/ 밖) — git이 두 기기 케이스의 합류 채널이다.

## 케이스 작성 (결함을 발견한 세션이 즉시)

파일명: `YYYY-MM-DD-HHMM-<스킬>-<slug>.md` — 시각 포함(두 기기 동일 slug 충돌 방지), 파일명이 case-id.
status는 파일 이동 없이 frontmatter에서 갱신한다 (git blame·링크 안정 — 검색은 `rg '^status: pending' cases/`).

```markdown
---
skill: jongmin-dev-conductor        # shared 파일이면 shared/<파일명>
observed-version: 1.8.2
severity: critical | major | minor
status: pending                     # pending | applied | rejected
---
## 실패 형태
<무엇이 어떻게 잘못됐나 — 1~3문장>
## 실측 증거
<명령·출력·SHA — 재현 가능한 수준>
## 재현/반증법
<배치 시 T1이 확인할 방법>
## 제안 (선택 — 배치에서 자동 채택되지 않음)
```

작성 후 커밋은 즉시 가능 (push는 사용자 지시 규약 유지).
자가 점검: `node plugins/jongmin-skills/scripts/case-lint.mjs`

## 긴급 예외

**작업을 능동적으로 망치는 critical**(잘못된 명령·데이터 손상을 유발하는 조항)만 해당 건을
즉시 수정하고, 케이스를 `status: applied`로 소급 기록한다. 긴급 수정은 그 건만 — 일반 배치를
당기지 않는다. 그 외는 전부 pending으로 대기.

## 배치 갱신

- **검토 트리거** (먼저 오는 것): pending 5건 / 최고령 pending 14일 / critical 발생.
  validate.mjs ⑥이 충족 시 NOTE를 출력한다 — 릴리스 검증을 돌릴 때마다 보인다.
- **검토 ≠ 적용.** 적용 근거는 케이스별로 별도: 재현 성공 / 독립 사례 2건(다른 기기·세션) /
  명백한 규약 모순 — 중 하나. 서로 무관한 5건이 모여도 각 건은 여전히 n=1일 수 있다.
  근거 미충족은 pending 유지 또는 rejected(+사유).
- **절차**: 시작 전 `git pull` → skill-forge improve 1회에 pending 전건 입력(CX 교차 포함) →
  버전 bump 1회 → 반영 케이스 `status: applied` + `applied-version`, 기각은 `rejected` + 사유 →
  배치 커밋 메시지에 처리한 케이스 파일 목록(이중 배치 멱등 방지). 마지막 배치일은 별도 상태
  파일 없이 applied 케이스의 git 이력으로 산출한다.
- 트리거 수치(5건·14일)는 초기값 — 배치 2~3회 후 대기시간·채택률 실측으로 재조정.
