# 리뷰 레인 프롬프트 템플릿

`lane-reviewer` 에이전트(T2 — [model-tiers.md](model-tiers.md))로 발진한다. 에이전트 정의
([agents/lane-reviewer.md](../agents/lane-reviewer.md))가 역할·도구·독립성의 단일 정의점이고,
이 템플릿은 **호출 시 채우는 입력**이다 — [executor-prompt.md](executor-prompt.md)의 리뷰 쪽 대칭.
리뷰는 스킬이 아니라 에이전트로만 실행한다: 스킬은 T1 세션 컨텍스트에서 돌아 구현자와
컨텍스트를 공유하게 되고, 그것은 자기승인이다.

```
[리뷰 모드] change (착지된 커밋 범위 리뷰) | completion (완료 조건 독립 판정 — loop)

1) 대상
   - BASE..TIP: <착지 후 SHA 범위 — HEAD·워킹트리 아님>
   - 리뷰 기준 SHA(review_base_sha): <TIP> — 접합 시 freshness rule(codex-lane.md) 판정에 쓴다

2) 집중 검증 축
   <지휘부 지정: 논증의 구멍 / 전제 성립 / 오라클 강도 / 등가성 / 계약 drift 중 이 범위에 맞는 것>
   뮤테이션: <요구 | 미요구> (요구 시 시간 상한 <분>, 비등가 지정 집합 생존 0이 오라클)

3) 전달 입력
   - diff: git diff <BASE>..<TIP>
   - 테스트 결과 원문: <출력 파일 경로 — 요약본 금지>
   - 명세·완료 조건: <completion 모드면 오라클 명령과 기대 결과>

4) 오염 차단
   executor 프롬프트·executor 자기 보고·요약은 전달하지 않는다 (동계열 편향).
   리뷰어가 요청해도 주지 않는다.

5) 출력
   lane-reviewer 정의의 심각도별 목록 (파일:라인 + 근거 + 재현/반증 방법).
   "문제 없음"도 수행한 검증 목록과 함께 — 검증 없는 승인은 산출물이 아니다.
```

## 모드 차이

- `change`: 커밋 범위의 정확성·회귀·오라클 강도. conductor 5절이 quick(critical만)·deep(전면)
  두 벌로 발진한다 — 같은 템플릿, 2)의 축과 뮤테이션 요구만 다르다.
- `completion`: "완료 조건이 정말 충족됐는가" — 오라클이 실제로 그 조건을 검증하는지,
  green이 우연이 아닌지. loop 이중 종료 게이트의 독립 판정 입력.

deep-audit은 이 템플릿을 쓰지 않는다 — SHA 범위 리뷰가 아니라 스냅샷 구조 감사이고
판정 체계(CONFIRMED/PLAUSIBLE/REFUTED)가 다르다.
