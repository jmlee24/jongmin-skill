---
skill: handoff
project: YNprinting (2026-08-29 1세션 실측 — Codex 3스레드 교차; 큐레이터 T1+CX 선별)
observed-version: 1.9.2
severity: major
status: pending
related: 2026-08-24-1120-handoff-save-delivery-path (applied 1.9.1), 2026-08-26-0930-handoff-mission-question-deferral
---
## 실패 형태
P5: handoff save가 계정 전환·기기 이동·계획된 세션 종료까지 전부 "컴팩션 임박"으로 취급해 교차검증을
상시 금지한다 (handoff:44-46 "CX는 발진하지 않는다: 컴팩션 임박에 분 단위 지연은 스냅샷 자체를
실패시킨다"). 발동 원인 목록(description)에 계정·기기 이동이 있으므로 전제가 내부적으로도 과일반화.
시간 여유가 있던 standard 상황에서 잘못된 상태가 다음 세션의 확정 전제로 넘어간다.
## 실측 증거
2026-08-29 YNprinting: 시간 여유 있는 handoff에서 교차검증이 오류 5건 검출(줄 번호 3·개수 1·인용 1).
## 재현/반증법
컴팩션 경고 없고 잔여 5분 초과인 save를 T1 단독본 vs 맹검 사실표 대조본으로 각각 수행. 여러 독립
handoff에서 대조본이 오류를 추가로 못 잡고 지연만 내면 standard 검증 철회.
## 제안 (배치에서 판정)
모드 판정 분기: **emergency**(플랫폼 컴팩션 경고 / 이탈·데드라인 5분 이하 — 추측으로 선언 금지)는
현행대로 T1 기계 확인 후 즉시 반환. **standard**는 초안 후 독립 T2에 사실표(SHA·경로·개수·다음 단계)만
맹검 대조, 고위험 해석은 CX 반박까지(T2는 동일 벤더라 원칙 3의 이종 요건은 CX가 채움). 초안 뒤 diff가
바뀌면 인용 전건 재확인. "5분"은 사례 1건의 제안값(UNVERIFIED).

**반대 관측 (2026-09-01)**: 컨텍스트가 찬 시점의 handoff에서 "CX 발진 안 함"이 적절했다 — 띄웠으면
스냅샷 자체가 실패. emergency 판정 기준에 컴팩션 경고·5분 외에 **컨텍스트 포화**도 포함해야 함.
standard 모드는 시간·컨텍스트 둘 다 여유일 때만.
