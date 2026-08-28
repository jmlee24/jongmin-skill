---
skill: shared/codex-lane.md
project: YNprinting (2026-08-27 웨이브 — warplan 2·conductor 1(13커밋)·handoff 2·lane-reviewer 2; 원문 experiments/session_20260827_measurements/는 타 기기 로컬 미커밋 — 이 PC 접근 불가)
observed-version: 1.9.1
severity: critical
status: applied
applied-version: 1.9.2
related: 2026-08-26-1100-shared-codex-lane-cwd-probe-sentinel (codex-lane 집행점 축)
---
## 실패 형태
G (critical, 이번 세션 2회): 표준 패턴이 프롬프트를 **셸 문자열로 인라인** 전달 — `codex exec ...
"<프롬프트>"`. 프롬프트에 백틱·\$가 있으면 셸이 먹는다. 실제로 \`src/io/CLAUDE.md\` 같은 코드 인용이
명령 치환으로 실행돼 **프롬프트가 손상된 채 발진**. 파일 경로·코드 심볼 인용은 이 스킬의 일상이라
재발 확률 높음. (큐레이터 실측: 이 세션은 처음부터 `"$(cat 프롬프트파일)"` 경유를 써서 무사고 —
문서의 기본 예시만 인라인.)
## 실측 증거
2회 손상 발진.
## 재현/반증법
백틱 포함 프롬프트를 인라인 패턴으로 발진 → events.jsonl의 수신 프롬프트 대조.
## 제안 (배치에서 판정 — 보고 P0-1. 규약상 critical=즉시 수정 대상, 사용자 결정 대기)
기본 패턴을 **프롬프트 파일 경유**로 교체(파일 작성 → `"$(cat file)"`), 인라인 문자열 예시 제거.
heredoc을 쓰면 quoted delimiter(<<'EOF') 강제 — 단 이 환경의 Bash 도구는 heredoc 자체가 불안정
(큐레이터 실측 2회 실패)이라 파일 경유가 더 안전.

**적용 기록 (1.9.2, 긴급 예외)**: T1 셸 프로브로 인라인 손상 재현 → CX 반박에서 stdin(-) 대안 제시 → T1이
codex-cli 0.150 exec·resume 모두 실측(exit 0, 백틱·$·$(sub) 원문 수신, 행 없음) → stdin 형태 채택.
`$(cat)`는 후행 개행 제거·argv 한도 문제로 미채택.
