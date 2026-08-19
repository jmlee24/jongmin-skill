---
skill: shared/executor-prompt.md
observed-version: 1.8.2
skill-version: conductor v4.1 (v4 이후 두 번째 실전 웨이브)
severity: major
status: pending
---
## 실패 형태
뮤테이션이 reviewer-prompt·lane-reviewer·landing-check(리뷰 경로)에만 있고 executor에는 없다.
실전 값은 전부 쓴 사람의 자기 뮤테이션에서 났다.
## 실측 증거
YNprinting 3건: 도착 CSV 레인이 자기 배선이 아무 시험에도 안 잡히는 것을 1차 뮤테이션에서
발견해 시험 보강 / 캠페인 배선 레인이 지시 2종→4종 확대 / 정본 경로 레인이 자기 인용 중
안 잠기는 것 발견.
## 재현/반증법
executor 프롬프트에 뮤테이션 요구가 없는 상태로 새 배선 임무 발진 — 미검출 배선이 green으로
통과하는지 확인.
## 제안 (배치에서 판정)
트리거 4종 명문화(새 배선·등록·호출 경로 / 전후 모두 green인 계약 변경 / 하니스·오라클 자체
변경 / 부재 주장 의존 삭제) + executor 자기 뮤테이션을 3) 검증 요구에 추가.
감축 짝: 일반 설명을 4트리거 표로 치환.
