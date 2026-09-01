---
skill: jongmin-dev-conductor
project: YNprinting (2026-08-31~09-01 웨이브 — warplan→conductor→handoff, 24커밋·쓰기 5·리뷰 2·CX 11프롬프트/18산출·스윕 15런)
observed-version: 1.9.2
severity: minor
status: pending
---
## 실패 형태
"T1은 구현 코드 직접 작성 금지(검증 스크립트는 예외)"에서 설정값·문서가 "구현 코드"인지 미명시.
세션 후반 컨텍스트가 찬 상태에서 inspection.yaml 임계값과 CLAUDE.md·ARCHITECTURE.md를 T1이 직접
수정 — 2줄 변경에 레인을 띄우는 게 비합리적이라 직접 했으나 규약상 회색지대.
## 실측 증거
T1 직접 수정 3파일 (설정 1·문서 2).
## 재현/반증법
규약 원문에서 "구현 코드" 정의 유무 확인.
## 제안 (배치에서 판정)
예외를 "검증 스크립트·설정값·문서"로 명시하거나, 판단 기준 "레인 발진 비용이 변경 규모를 넘으면 T1
직접(단 착지 게이트는 동일)". 8단계 문서 관리가 T1 직접인 것과 정합.
