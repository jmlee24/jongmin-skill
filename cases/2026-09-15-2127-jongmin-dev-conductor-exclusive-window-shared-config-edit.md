---
skill: jongmin-dev-conductor
project: YNprinting (2026-09-14 웨이브 — W2 측정 레인 9m + 드라이런 15m, 백그라운드 4런 killed)
observed-version: 1.12.1
severity: minor
status: pending
related: 2026-08-30-1700-jongmin-dev-conductor-t1-self-measurement-exclusivity (배타 구간 주어 — 같은 축 3건째, 전부 YNprinting), 2026-08-26-0930-jongmin-dev-conductor-exclusive-window-load-record (경합 실증), 2026-08-24-0154-jongmin-dev-conductor-measure-lane-timing (chess — 측정 순서), 2026-08-26-0930-jongmin-dev-conductor-measurement-tool-inventory
---
## 실패 형태
두 갈래다.
① **측정 전제를 측정 중에 발견** — WAITING 재검출·지터 오검·offscreen 800×800·메모리 kill 4건.
드라이런 15분(벽시계 7%), 백그라운드 4런 killed. landing-check "측정 캠페인 전 드라이런 1벌"(:90-91)과
warplan 측정 단계 dry-run(:54-55)은 **조인 키·원자료 보존**만 확인 대상으로 적어, 드라이버·뷰포트·정상
종료·복원·단일 전경 같은 **실행 환경 전제**는 드라이런 목록에 없다. 결과적으로 드라이런이 있었는데도
전제를 하나씩 부딪혀 찾았다.
② **공유 설정(yaml) 임시 편집이 배타 구간 밖** — 실측 배타 구간(:129-133)은 "측정을 돌리는 동안"이
시작점이라, 측정 준비로 워킹트리의 공유 설정을 편집한 구간이 규율되지 않았다. 병행 리뷰어가 편집된
설정을 읽고 오독 → 환경 경고 1건. reviewer-prompt는 리뷰어에 SHA 범위를 주지만(:11) Bash 권한이 있는
리뷰어는 워킹트리 파일을 읽을 수 있다 — T1의 미커밋 편집이 리뷰 입력을 오염시키는 경로.
## 실측 증거
보고서 원문 문제 #4(근인: T1 판단·환경). 드라이런 15분·4런 killed·리뷰어 환경 경고 1건. 측정 템플릿은
"메모리에 저장함"이라 적혀 있으나 **이 기기의 프로젝트 메모리에서 미발견** — 타 기기 메모리로 추정,
UNVERIFIED. 장부 없음.
## 재현/반증법
- conductor 배타 구간 조항의 시작 조건 grep — "실측을 돌리는 동안"만(:129). 공유 설정 편집 언급 없음.
- landing-check·warplan 드라이런 항목에 환경 전제 어휘 grep — 없음.
- 반증: 다음 측정에서 배타 구간을 설정 편집부터 열고 리뷰어 경고가 0인지, 저장된 측정 템플릿 재사용으로
  드라이런이 1벌 안에 끝나는지 본다.
## 제안 (배치에서 판정)
1. 배타 구간 시작점 1줄: **"측정을 위해 워킹트리의 공유 설정·환경을 편집하는 순간부터 배타 구간이다** —
   편집 전 상태와 복원 여부를 장부에 기록하고, 구간 중 리뷰어·CX 발진 금지(진행 중인 것은 SHA 범위 밖
   파일을 읽지 말라고 통보)". t1-self-measurement-exclusivity의 주어 확장 제안과 한 조항으로 합친다.
2. landing-check 드라이런 항목에 환경 전제 어휘 추가: "드라이런은 조인 키뿐 아니라 **드라이버·뷰포트·
   정상 종료·복원·단일 전경** 전제를 확인한다 — 확정된 전제는 프로젝트 메모리의 측정 템플릿으로 저장해
   다음 캠페인이 재사용". 템플릿 본문은 프로젝트 몫, 스킬은 항목명만.
