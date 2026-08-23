---
skill: shared/model-tiers.md
project: YNprinting
observed-version: 1.8.3
skill-version: conductor v4.1 (YNprinting 32커밋 웨이브, 2026-08-20)
severity: major
status: pending
---
## 실패 형태
model-tiers.md가 「단일 정의 지점」이 아니다 — 실제로는 model-tiers.md + agents/lane-reviewer.md
frontmatter 이중 갱신. 더 큰 문제: executor-prompt는 "general-purpose + T2"라 하는데 발진 API가
모델을 명시하지 않으면 T1 상속이 된다 — **쓰기 레인이 실제 T2에 바인딩됐다는 기계 확인이 없다.**
## 실측 증거
README "바인딩은 model-tiers 한 파일에서만" ↔ lane-reviewer.md frontmatter model 필드 — 원문 대조
(규약 모순). T2 바인딩 미확인은 이번 웨이브 8레인 전건 해당.
## 재현/반증법
`grep -n model plugins/jongmin-skills/agents/lane-reviewer.md plugins/jongmin-skills/shared/model-tiers.md`
로 이중 정의 확인. 쓰기 레인 발진 호출에서 model 인자 유무 점검.
## 제안 (배치에서 판정)
README/model-tiers 문구를 "정의 2지점(문서 + 에이전트 frontmatter), 변경 시 동시 갱신 + validate
검사"로 정정하거나 validate에 정합 검사 추가. executor 발진 템플릿에 model 명시 필수 + 착지
보고에 실행 모델 식별자 기재.
연관 minor: 리뷰 상한 "3~4개"의 단위 모호(T2 quick/deep+CX 합산인지·CX만인지·커밋별인지
웨이브 전체인지·미접합 결과가 슬롯을 차지하는지) → 「실행 슬롯」과 「미접합 결과 큐」 분리 정의.
