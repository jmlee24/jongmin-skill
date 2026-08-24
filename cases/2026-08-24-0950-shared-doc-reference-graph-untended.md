---
skill: shared/
project: YNprinting
observed-version: 1.8.3
severity: major
status: applied
applied-version: 1.9.0
related: 2026-08-19-2347-shared-doc-inconsistency-bundle, 2026-08-24-0154-shared-doc-burn-after-wave (문서 위생 축)
---
## 실패 형태
문서 간 참조를 만드는 데 아무 게이트가 없어 참조 그래프가 무관리로 자란다. 런북 절 앵커를
CLAUDE.md·decisions.md·deprecated-history.md(3곳)·history/ 3건이 물고, configs/*.yaml
주석까지 md 절을 참조한다. 결과: ① 절 하나를 지우려면 참조 전수 조사가 선행돼야 해서 삭제
비용이 폭증(사용자: "런북은 런북이지 왜 여기에 참조가 걸려있지") ② 참조가 사실상 결합도라
정본 개편이 잠긴다 ③ 이력·폐기 문서가 현행 정본을 참조해 stale 문서의 수명을 연장한다.
## 실측 증거
YNprinting(2026-08-24): grep "install-runbook" → 참조 22곳+. §0~§7 삭제 시도가
check_doc_refs --strict red + CLAUDE.md가 가리키는 NG4 소유권 근거 소실로 차단됨.
## 재현/반증법
정본 문서에서 임의 절 1개 삭제를 시도 → 참조 조사 없이 안전하게 지울 수 있는지 확인.
참조 생성 게이트 도입 후 신규 참조 수 증가율 비교.
## 제안
doc-hygiene 정본에 참조 규칙: ① 참조는 의존성이다 — 걸기 전에 "이 링크가 없으면 독자가
길을 잃는가" 판정, 편의 참조 금지 ② 방향 제한: 이력·폐기·일회성 문서 → 현행 정본 참조
금지(스냅샷 시점 SHA로 고정 인용), 코드·설정 파일 → md 절 앵커 참조 금지 ③ 절 앵커(#heading)
대신 문서 단위 참조 우선 — 절 개편이 참조를 깨지 않게 ④ 배치·소각 시 참조 인벤토리를 만들어
불필요 참조를 콘텐츠와 같이 제거.
