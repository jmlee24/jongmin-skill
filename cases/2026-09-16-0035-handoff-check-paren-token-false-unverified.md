---
skill: handoff
project: YNprinting (2026-09-14~15 오버레이 웨이브 종료 handoff — handoff-check --annotate 실행)
observed-version: 1.12.1
severity: minor
status: pending
related: 2026-09-15-2127-handoff-closure-consistency (같은 웨이브군 handoff), 64e00b5 대문자 열거 오탐 수정(1.12.1 — 같은 토큰 분류기의 직전 오탐)
---
## 실패 형태
`handoff-check.mjs`가 산문 속 파일 언급을 경로로 오인해 `[UNVERIFIED: …]`를 붙였다. 보고서는 두 형태를 지목:
① 괄호에 붙은 토큰(`(Qt` 류) ② 디렉터리 없는 basename만 적힌 파일명. 오탐이 스냅샷 원문에 그대로 박히므로
(--annotate 계약) 다음 세션이 실존 항목을 의심하게 된다. 1.12.1 직전 수정(대문자 열거 오탐, 64e00b5)과 같은
분류기의 후속 오탐.
Codex 판정: 토큰 끝 괄호 절단은 채택, **basename 재귀 탐색은 채택 금지** — 동명 파일을 오승인(VERIFIED)해
코드 층의 존재 이유를 무너뜨린다.
## 실측 증거
보고서 마찰 표 "handoff-check" 행. **이 repo 1.12.1 코드로 재현 시도(2026-09-16)**:
- ② basename: `doc-audit.mjs 사용법` → `[UNVERIFIED: path doc-audit.mjs]`, exit 1 — **재현**.
- ① 괄호: `(README.md) 갱신` / `(cases/README.md 참조)` / `(Qt.QLabel) 삭제` / `(…/doc-audit.mjs:3)` 전부 통과 —
  **미재현**. `checkPathToken`이 앞뒤 `(`·`)`·따옴표·`,;:`를 이미 절단한다(handoff-check.mjs:114, 58bbad8부터
  존재). 보고서의 `(Qt` 표본은 원문 형태가 달랐거나(예: `Qt(`·중간 괄호) 타 기기 설치본 차이일 수 있음 —
  원문 스냅샷이 이 기기에 없어 UNVERIFIED.
## 재현/반증법
```
printf 'doc-audit.mjs 사용법\n' > s.md
node plugins/jongmin-skills/scripts/handoff-check.mjs s.md --cwd <repo> --annotate   # → UNVERIFIED (재현)
```
괄호 형태는 원문 스냅샷의 해당 줄을 그대로 넣어 재실행해야 판정 가능 — 타 기기 장부 합류 시.
## 제안 (배치에서 판정 — 코드 층이라 긴급 예외 아님, 오탐은 fail-safe 방향)
1. basename(슬래시 없는 파일명)은 `--cwd` 직속 또는 **스냅샷 안에서 이미 OK 판정된 디렉터리** 밑에서만 찾고,
   그 외는 UNVERIFIED 유지 — 재귀 탐색 금지(Codex). 찾은 경우 어느 디렉터리로 해석했는지 주석에 남긴다.
2. 괄호 형태는 원문 표본 확보 전 변경 없음 — 확보되면 handoff-check-test.mjs에 표본 추가 후 판정.
3. handoff-check-test.mjs에 basename 표본 1건(현재 코드로 UNVERIFIED → 수정 후 해석 경로 주석).
