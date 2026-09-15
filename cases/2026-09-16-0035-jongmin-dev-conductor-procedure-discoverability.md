---
skill: jongmin-dev-conductor
project: YNprinting (2026-09-14~15 오버레이 웨이브 — T1이 기존 절차 3건을 "신설 제안"으로 오인, Codex가 재분류)
observed-version: 1.12.1
severity: minor
status: pending
related: 2026-09-15-2127-jongmin-dev-conductor-recheck-template-cost (재확인 절차 — 발견성 문제의 같은 대상), 2026-08-29-1000-jongmin-dev-conductor-doc-step-yield
---
## 실패 형태
스킬 본문에 있는 절차를 T1이 못 찾아 초안 보고서에 "신설 제안"으로 적었고, Codex가 "이미 문서에 있는 절차의
적용 사례"로 재분류했다(발진 검증기·재확인 SendMessage·disjoint fix 레인 병렬). 사용 결과는 옳았으니 결함은
실행이 아니라 **발견성**이다. 같은 축에서 실제 누락 2건:
① `scripts/doc-audit.mjs`의 사용법(`<repo> <BASE> [--allow]`, 스크립트 :3)이 conductor 7절(:193)에 없다 —
   스크립트 이름만 있고 인자가 없어 T1이 파일을 열어야 했다.
② Bash 전경 `sleep`이 하니스에서 차단되고 until-루프·Monitor로 대체해야 한다는 사실이 4절 "검증 실행
   백그라운드"(:161-163) 옆에 없다 — 대기 절차를 T1이 매번 재발견.
③ 5·6절의 재확인 SendMessage 문구(:187-188)와 자리표시자 템플릿이 긴 문단 안에 묻혀 있어 절차 이름으로
   검색되지 않는다.
## 실측 증거
보고서 마찰 표 "스킬 문서" 3행 + Codex 접합 요약 "신설 제안 3건의 기존 절차 재분류". conductor :193에 doc-audit
인자 없음은 이 repo에서 확인.
## 재현/반증법
- `grep -n "doc-audit" SKILL.md` → 인자 없음. `grep -n "sleep\|until" SKILL.md landing-check.md` → 0건.
- 반증: 세 줄을 넣은 뒤 다음 웨이브 보고서에 "신설 제안"으로 오인된 기존 절차가 0건인지.
## 제안 (배치에서 판정 — 합계 3줄, 행수 예산 안)
1. 7절: `node <플러그인루트>/scripts/doc-audit.mjs <repo> <BASE> [--allow a.md,b.md]` 1줄.
2. 4절 검증 실행 옆 1줄: "전경 sleep은 하니스가 차단한다 — 완료 알림·Monitor(until 조건)로 대기".
3. 5·6절 문단 앞에 절차명 굵게(**quick/deep 발진**, **재확인 SendMessage**) — 내용 추가 없이 검색 가능하게.
