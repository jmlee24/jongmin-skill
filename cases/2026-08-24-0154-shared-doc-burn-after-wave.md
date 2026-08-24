---
skill: shared/
project: chess-masterplan (1단계 웨이브 — 쓰기 11·리뷰 3·CX 5·커밋 23·3h03m)
observed-version: 1.8.2
severity: major
status: applied
applied-version: 1.9.0
related: 2026-08-21-1841-shared-history-freshness-burn, 2026-08-21-1841-shared-executor-prompt-no-new-md-default (YNprinting — 문서 위생 축, 독립 2건째)
---
## 실패 형태
사용자 방향: 문서 규약을 강화 — 웨이브(conductor 등) 이후 **필요 없어진 문서를 검증하고 내용을
삭제**하는 단계가 규약에 없다. 현행은 "새 문서 생성 금지"(예방)만 있고 "이미 있는 문서의 소각"
(사후)이 없어, 웨이브가 끝나도 설계 메모·중간 보고·stale 절이 남는다.
## 실측 증거
사용자 결정(2026-08-24). YNprinting 케이스 2건(이력 절 비대·새 md 기본 금지)과 같은 축.
## 재현/반증법
웨이브 종료 후 repo 내 md 중 해당 웨이브가 만들거나 갱신한 파일 목록 → 코드·git 이력으로 대체
가능한 것이 남아 있는지 확인.
## 제안
conductor 7절 최종 보고 또는 landing-check full 게이트에 "문서 소각" 항목: 웨이브가 만든·갱신한
문서 전건에 대해 ① 코드/테스트/git 이력으로 대체되는가 ② 다음 세션이 읽어야 하는가 판정 →
대체 가능하면 삭제(mv .old/), 유지는 사유 1줄. 스킬 본문의 이력 절도 같은 기준으로 주기 소각.
