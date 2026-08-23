---
skill: shared/codex-lane.md
project: chess-masterplan (1단계 웨이브 — 쓰기 11·리뷰 3·CX 5·커밋 23·3h03m)
observed-version: 1.8.2
severity: major
status: pending
related: 없음
---
## 실패 형태
codex-lane 2곳 STALE: ① `codex exec resume <ID> --sandbox read-only`가 codex-cli 0.149에서
unexpected argument — `-c sandbox_mode="read-only"`로 대체 필요. ② `< /dev/null` 조항의 서술이
"메시지가 안 뜬다"가 아니라 "행이 안 걸린다"가 정확.
## 실측 증거
codex-cli 0.149.0 / gpt-5.6-sol. 1차 resume 발진 1회 손실.
## 재현/반증법
`codex exec resume <id> --sandbox read-only` 실행 → 인자 오류 재현. (명백한 규약-실환경 불일치 —
적용 근거 즉시 충족, 단 codex 버전 의존이므로 버전 표기 병기)
## 제안
resume 패턴 갱신 + 버전 주석, < /dev/null 문구 정정.
