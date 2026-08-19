---
skill: jongmin-dev-conductor
observed-version: 1.8.2
skill-version: conductor v4.1 (v4 이후 두 번째 실전 웨이브)
severity: major
status: pending
---
## 실패 형태
레인 프롬프트가 400~600줄 — "에이전트는 컨텍스트를 못 보니 전부 복제" 규칙만 있고 복제
비용을 줄이는 장치가 없다.
## 실측 증거
YNprinting: 쓰기 레인 15개 전건 400~600줄 프롬프트.
## 재현/반증법
현행 executor-prompt 5~6요소를 실제 규약 있는 repo에서 채워 보면 재현된다.
## 제안 (배치에서 판정)
웨이브 시작 시 scratchpad에 immutable brief(환경 전제·규약 전문·게이트 명령·baseline·금지선)
1회 생성, 레인 프롬프트는 브리프 경로+해시 + 임무/소유권/계약 델타만. 발진 베이스 변경 시
brief revision 상승.
적용 조건: **실 프로브 선행 필수** — 에이전트 환경에서 scratchpad 파일 접근이 실제로 되는지,
"해시 확인 후 필독"을 실제로 따르는지. 프로브 실패 시 기각.
