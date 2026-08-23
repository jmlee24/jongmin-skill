---
skill: shared/executor-prompt.md
project: chess-masterplan (1단계 웨이브 — 쓰기 11·리뷰 3·CX 5·커밋 23·3h03m)
observed-version: 1.8.2
severity: minor
status: pending
related: 없음
---
## 실패 형태
전역 .old/ 규약(rm 금지·mv)이 worktree 레인에서 쓰레기를 만든다 — 레인마다 임시 색인을 .old/로
옮겨 수십 MB 누적, 메인 트리 .old/에도 잔류.
## 실측 증거
worktree --force 제거로 레인 쪽은 소멸, 메인 트리 .old/ 잔류.
## 재현/반증법
worktree 레인에서 대용량 임시 산출 생성 후 .old/ 크기 확인.
## 제안
레인 worktree 안 .old/는 worktree 제거와 함께 소멸하므로 규약 충족으로 간주, 메인 트리 .old/만
사용자 정리 대상으로 명시.
