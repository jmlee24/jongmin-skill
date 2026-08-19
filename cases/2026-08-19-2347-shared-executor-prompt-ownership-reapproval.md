---
skill: shared/executor-prompt.md
observed-version: 1.8.2
skill-version: conductor v4.1 (v4 이후 두 번째 실전 웨이브)
severity: major
status: pending
---
## 실패 형태
소유권 예외가 3중 충돌: executor "논리적 동시 성립 불가면 최소 침범 진행" ↔ conductor 실패
정책 "범위 밖 변경 즉시 중단" ↔ landing-check "모순 보고 첨부 침범은 T1 사후 판정". 실전에서
안전했던 패턴은 「중단 → T1 소유권 맵 갱신 → SendMessage로 같은 레인 재개」였는데 이건 어느
조항에도 없다.
## 실측 증거
YNprinting: 레인이 소유권 경계에서 중단 2회, 두 번 다 재승인 후 재개가 쌌고 안전했다.
## 재현/반증법
병렬 웨이브에서 Owned 밖 변경이 필요한 레인 픽스처로 세 조항 중 어느 것이 이기는지 관찰 —
현행 문서로는 결정 불가.
## 제안 (배치에서 판정)
예외 3문단을 단일 재승인 프로토콜로 치환: executor는 Owned 밖이 필요하면 항상 멈춤 → T1이
소유권 맵 갱신 → 같은 레인 재개. 자율 최소 침범 금지.
주의: v1.8.1 최소 침범 조항의 근거는 타 PC 실측 1건(침범 판단이 옳았던 사례) — 배치에서 두
실측(침범 1승 vs 재승인 2승)을 대조해 판정할 것. n=1 vs n=2.
