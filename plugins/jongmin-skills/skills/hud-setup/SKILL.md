---
name: hud-setup
description: Claude Code 상태줄(statusline)에 5h·주간·모델별 사용량과 컨텍스트 게이지를 표시하는 HUD를 설치·점검·제거한다 — 슬래시 명령(/jongmin-skills:hud-setup)으로만 시작되며 자연어 요청으로는 발동하지 않는다 (disable-model-invocation). 개발 작업·코드 변경·사용량 분석에는 사용하지 않는다.
disable-model-invocation: true
argument-hint: "[check | uninstall]"
---

# hud-setup — 사용량 HUD 설치 부속

이 스킬은 **슬래시 명령으로만 시작한다**. 정체성: **설치 유틸** — 플러그인 설치 후 머신당 1회
실행해 statusline을 잡는다. 개발 워크플로 스킬이 아니며, 설치 후에는 어떤 컨텍스트도 차지하지
않는다 (statusline은 클코가 별도 프로세스로 실행해 터미널 하단에만 그린다 — 모델 입력 0 토큰,
훅 0개).

왜 스킬이 필요한가: 플러그인은 `settings.json`의 `statusLine`을 설정할 수 없고, 플러그인 캐시
경로에는 버전이 박혀 있어 autoUpdate마다 경로가 바뀐다. 그래서 버전 없는 고정 경로의 **래퍼**를
한 번 심고, 래퍼가 매 실행마다 최신 버전의 렌더러를 찾는다. 이 절차는 결정론이 필요하므로
`scripts/hud-setup.mjs`가 전부 수행하고, 스킬은 실행·보고만 한다.

## 절차

인자에 따라 아래 명령 **하나**를 실행하고 stdout을 그대로 보고한다. 파일을 직접 편집하지 않는다.

| 인자 | 명령 | 하는 일 |
|---|---|---|
| (없음) | `node "<스킬 base dir>/../../scripts/hud-setup.mjs"` | 래퍼 생성 → settings.json 백업 → statusLine 등록 → 렌더 테스트 |
| `check` | `node "<스킬 base dir>/../../scripts/hud-setup.mjs" --check` | 현재 statusLine·래퍼 상태와 렌더 결과만 출력 (변경 없음) |
| `uninstall` | `node "<스킬 base dir>/../../scripts/hud-setup.mjs" --uninstall` | 이 스킬이 등록한 statusLine 제거 + 래퍼 삭제 (타 도구가 등록한 statusLine은 건드리지 않음) |

보고에 반드시 포함:
- `REPLACED previous statusLine: …` 줄이 있으면 **기존 statusline이 교체되었음**과 `BACKUP` 경로.
  되돌리려면 백업 파일의 `statusLine` 값을 settings.json에 복원하면 된다
- `RENDER OK/FAIL` 줄 — FAIL이면 stderr 내용과 함께 보고하고 설치 완료를 선언하지 않는다
- 새 세션(또는 클코 재시작)부터 HUD가 보인다는 안내

## 입력/출력 예시

입력: `/jongmin-skills:hud-setup`

기대 출력(요지):
```
WROTE wrapper C:\Users\me\.claude\hud\jongmin-hud.mjs
BACKUP C:\Users\me\.claude\settings.json.bak-hud-2026-09-10T05-27-21-445Z
SET statusLine.command = "C:\Program Files\nodejs\node.exe" "C:/Users/me/.claude/hud/jongmin-hud.mjs"
RENDER OK: RenderTest | 5h [##------]21%(3h0m) | wk [####----]46%(1d6h) | ctx [###-----]42%
DONE - restart Claude Code (or open a new session) to see the HUD
```

## 표시 항목과 데이터 출처

- 모델명 옆 effort 레벨과 `5h`, `wk`, `ctx`: 클코가 statusline stdin으로 주는 `effort.level`·`rate_limits`·`context_window` — 네트워크 없음
- codex(2줄째): `~/.codex/config.toml`의 model·effort를 머리에, `auth.json` 토큰으로 ChatGPT 사용량 백엔드를 60초당 최대 1회 호출해 5h·주간 창을 표시(계정 응답에 있는 창만, Spark 등 부가 한도 제외). auth.json이 없으면 생략, `JONGMIN_HUD_NO_CODEX=1`로 끌 수 있다
- 모델별 주간 버킷(예: `Fable 78%`): stdin에 없어 `api.anthropic.com/api/oauth/usage`를 60초당
  최대 1회 호출 (`limits[].kind === "weekly_scoped"`). 토큰은 `<configDir>/.credentials.json`
  (macOS는 Keychain). 실패하면 마지막 성공값을 유지하고, 토큰이 없으면 항목을 생략한다
- 색: 50% 미만 녹색 / 80% 미만 노랑 / 이상 빨강 (ctx는 60/85)

## 실패 정책

- `ERROR …`로 끝나면 settings.json이 파싱 불가한 경우가 대부분 — 스크립트는 **깨진 설정을 덮어쓰지
  않는다**. 사용자에게 파일 확인을 요청하고 종료
- 훅 실행 셸에 node가 없는 환경(WSL dash) 문제는 여기 해당 없음 — statusLine은 절대 경로
  node(`process.execPath`)로 등록된다. 다만 **WSL과 Windows는 config 디렉터리가 다르므로 각각
  설치**한다

## 이력

- v1 (2026-09-10): OMC HUD 대체로 신설. 자체 렌더러(의존성 0) + 래퍼 2단 구조는 OMC와 같은
  방식 — 플러그인이 statusLine을 못 만지는 제약이 동일하기 때문
