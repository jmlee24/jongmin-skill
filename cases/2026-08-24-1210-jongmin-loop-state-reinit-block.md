---
skill: jongmin-loop
project: jongmin-skills 구조 감사 (CX 전문 리뷰, 2026-08-24)
observed-version: 1.9.1
status: applied
applied-version: 1.9.1
severity: minor
---
## 실패 형태
loop 정상 complete가 상태 JSON을 남기고, 같은 이름 재init이 기존 파일 존재로 실패한다
(loop-state.mjs:73·:86). 완료 잔존물이 다음 실행을 막는 역방향 수명 문제.
## 실측 증거
CX 코드 경로 분석 → T1 격리 USERPROFILE에서 재현 성공(2026-08-24): init→complete→재init이 already exists로 차단됨. 수정 후 정방향(재init OK)·역방향(활성은 차단 유지) 프로브 통과.
## 재현/반증법
임시 HOME에서 init → complete → 같은 이름 init 순서 실행.
## 제안 (배치에서 판정)
loop 동결 해제 시 함께: complete/block 시 종료 요약 후 상태 파일 제거 또는 재init이 완료
상태를 감지해 대체.