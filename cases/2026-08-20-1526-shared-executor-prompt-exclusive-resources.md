---
skill: shared/executor-prompt.md
observed-version: 1.8.3
skill-version: conductor v4.1 (YNprinting 32커밋 웨이브, 2026-08-20)
severity: major
status: pending
---
## 실패 형태
병렬 쓰기 안전 전제가 「파일 disjoint」뿐이다. 서로 다른 파일을 만져도 같은 테스트 DB·포트·
캐시·GPU·생성물 디렉터리를 공유할 수 있고, 포맷터·코드 생성기가 소유권 밖을 간접 수정할 수
있으며, rename/delete의 소유권 의미가 약하다. (CX 발견 — 사용 세션 T1이 놓친 구조 취약점)
## 실측 증거
이번 웨이브에서 사고는 없었음 — 구조 분석 기반. 배치 적용 근거는 "명백한 규약 모순"이 아닌
재현 픽스처 필요.
## 재현/반증법
파일 disjoint인 레인 2개가 같은 테스트 DB/출력 디렉터리를 쓰는 픽스처로 병렬 발진 — 간섭 확인.
## 제안 (배치에서 판정)
6요소를 늘리지 말고 「소유권·계약」 안에 **Exclusive resources 선택 필드**(DB·포트·캐시·
생성물 경로·생성기/포맷터 영향 범위) + rename/delete 소유권 의미 한 줄.
