---
skill: jongmin-warplan
project: YNprinting (2026-08-27 웨이브 — warplan 2·conductor 1(13커밋)·handoff 2·lane-reviewer 2; 원문 experiments/session_20260827_measurements/는 타 기기 로컬 미커밋 — 이 PC 접근 불가)
observed-version: 1.9.1
severity: major
status: pending
---
## 실패 형태
E: warplan "실행 금지" 경계가 측정을 분류 못 한다. warplan 중 사용자가 즉시 패킷 측정을 지시 →
experiments/에 산출물을 쓰는 실행을 했는데, 이게 위반인지 아닌지 스킬로 판정 불가 — "워킹트리를
변경하는 순간 위반" 이분법만 있어 scratch·장부에 쓰는 계획용 계측이 범주 밖.
## 실측 증거
warplan 중 측정 실행 1회 (분류 불가).
## 재현/반증법
warplan 절차 중 dry-run 측정(1.8.2 조항)이 워킹트리 변경 규칙과 충돌하는지 대조.
## 제안 (배치에서 판정 — 보고 P1-7)
3분류: inspection(파일·외부 상태 변화 0) / **epistemic probe**(계획 전제 검증용 실행 — scratch·장부
쓰기 허용, 제품 코드·정본 변경 금지, 시간·비용·부수효과 상한과 산출물 수명 선언) / planned
execution(금지).
