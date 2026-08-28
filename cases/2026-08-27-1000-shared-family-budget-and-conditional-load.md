---
skill: shared/
project: YNprinting (2026-08-27 웨이브 — warplan 2·conductor 1(13커밋)·handoff 2·lane-reviewer 2; 원문 experiments/session_20260827_measurements/는 타 기기 로컬 미커밋 — 이 PC 접근 불가)
observed-version: 1.9.1
severity: major
status: pending
related: 2026-08-26-1100-shared-duplicate-sentinel-audit, 2026-08-19-2347-jongmin-dev-conductor-core-reference-split (applied 1.9.0)
---
## 실패 형태
6절: skill-forge가 본체 500줄·1단계 참조·shared 복붙 금지·이력 10줄을 규정하지만 **패밀리 전체
(1,531줄)에 대한 기준이 없다** — 스킬별 자동로드 범위, 호출당 최소 shared 로드셋, 문서별 예산, 예시
이관 기준, 중복 탐지. Codex 전수 리뷰: "잘 읽으면 알 수 있음"에는 강하고 "빠뜨릴 수 없음"에는 약함.
## 실측 증거
conductor 본문의 shared 재진술(CX 규칙·질문 예외·문서 정책), landing-check의 측정 방법론 혼재.
## 재현/반증법
스킬 1회 발동 시 로드되는 shared 총 줄수 측정; 중복 문장 grep.
## 제안 (배치에서 판정 — 보고 P2-9·6절)
처분표: 존치(불변식·게이트·실패 정책·스키마) / 축소(conductor의 공통 정책 재서술) / 이관(날짜·횟수
붙은 실측 서사 → cases/) / 스크립트화(worktree bootstrap·자원 충돌 검사·DAG 스키마 검증·문서
allowlist 대조) / 조건부 로드(스킬 frontmatter에 필요 shared 목록 명시). landing-check 분할:
착지 검증만 남기고 측정 방법론(dry-run·조인 키·모집단·독립 재계산·provenance)을
measurement-evidence.md로 — warplan·handoff에서도 필요한데 현 위치는 발견성이 낮다.
주의(큐레이터): "규칙 위치 승격"과 "총량 감소"를 같은 배치에서 — 순증 음수 조건 유지.
