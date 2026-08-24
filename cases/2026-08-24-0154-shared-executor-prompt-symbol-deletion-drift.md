---
skill: shared/executor-prompt.md
project: chess-masterplan (1단계 웨이브 — 쓰기 11·리뷰 3·CX 5·커밋 23·3h03m)
observed-version: 1.8.2
severity: major
status: applied
applied-version: 1.9.0
related: 2026-08-20-1526-shared-executor-prompt-exclusive-resources (YNprinting — 독립 2건째)
---
## 실패 형태
계약 drift 정의가 좁다 — landing-check는 공개 API·스키마·픽스처·lockfile만 보는데, 실제 깨진 것은
**동결되지 않은 Owned 모듈의 최상위 함수 삭제**(다른 레인이 그 사이 import). executor-prompt에
"Owned 파일이라도 공개 심볼 삭제·시그니처 변경은 보고 후 진행" 조항이 없다.
## 실측 증거
L3fix가 데드 코드 norm_name 제거, L4가 같은 함수 import — 각자 worktree green, 통합 트리 12 errors.
이 웨이브 유일한 red.
## 재현/반증법
두 레인에 같은 모듈의 삭제/import를 배정하고 통합 게이트 결과 확인.
## 제안
executor 6요소: Owned라도 최상위 심볼 삭제·시그니처 변경은 보고 후 진행. landing-check drift 확인에
"삭제된 최상위 심볼의 타 레인 import grep" 추가. YNprinting 케이스(파일 disjoint만으로 부족)와 같은 축.
