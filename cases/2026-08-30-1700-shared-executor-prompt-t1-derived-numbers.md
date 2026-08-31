---
skill: shared/executor-prompt.md
project: YNprinting (설정 통합 웨이브 2026-08-30 — 쓰기 4·리뷰 3·CX 2·28커밋)
observed-version: 1.9.2
severity: major
status: pending
---
## 실패 형태
T1이 **직접 측정해 유도한 수치**를 executor 프롬프트에 근거로 실었는데 틀렸고, executor가 그것을
코드 주석으로 옮겨 적어 굳었다. 실제 사례: T1이 "통합 대상 5파일 중 policy 밖 flat 기여는
logging의 level·renderer 2개뿐"이라 브리핑 → executor가 `src/config.py` 주석에 그대로 기재 →
독립 리뷰가 실측으로 반박(구 로더는 thresholds 94키를 포함해 **160키**를 넘기고 있었고,
동작 불변의 진짜 이유는 "기여가 2개"가 아니라 `thresholds ∩ PipelineConfig 필드 = ∅`).
결론은 우연히 같았으나 **근거가 틀린 채 코드에 남았고, 그 서로소를 강제하는 가드도 없었다.**

`evidence-liveness.md`는 **인용**(파일:라인·문서 조항)의 생존성을 다루고, T1이 grep·스크립트로
**새로 유도한 수치**는 그 절차를 안 탄다. executor-prompt 4)는 "규약 복제"만 요구하고
그 복제물의 정확성은 묻지 않는다.
## 실측 증거
리뷰 major 4건 중 1건(M-3). 잘못된 전제가 `src/config.py` 주석으로 착지했고 게이트 6종
(unit·integration·mypy·ruff·doc-facts·doc-refs) 전건 green이었다 — 주석 안 명제를 보는 검사기가 없다.
같은 웨이브에서 T1의 다른 유도 수치 1건(`.py` 산문 "105건")도 Codex 검증에서 82파일/202줄로 반증됐다.
## 재현/반증법
executor 프롬프트에 실린 수치 중 "T1이 이번 세션에 유도한 것"을 표시하고, 각각에 산출 명령이
함께 실렸는지 본다. 명령 없이 결론만 실린 수치가 있으면 이 실패에 노출돼 있다.
## 제안 (배치에서 판정 — 우선순위 2)
executor-prompt 4)에 한 줄: **T1이 이번 세션에 유도한 수치는 결론이 아니라 산출 명령과 함께
싣는다.** executor가 재실행해 대조할 수 있어야 하고, 대조 결과가 다르면 그것이 사양 이탈 보고
대상이다(5)의 "지휘부가 전달한 근거도 실측으로 반박할 수 있다"에 **수치도 포함됨을 명시**).
