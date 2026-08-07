# jongmin-skill

개인 스킬 컬렉션. 우산 플러그인 하나(`jongmin-skills`)에 스킬을 계속 추가하는 구조 —
머신마다 설치는 한 번, 이후 스킬 추가는 push → autoUpdate로 전파된다.

## 설치 (머신당 1회)

```
/plugin marketplace add https://github.com/jmlee24/jongmin-skill.git
/plugin install jongmin-skills@jongmin-skill
```

플러그인 없이 쓰려면 `plugins/jongmin-skills/skills/<이름>/` 폴더를 `~/.claude/skills/`에,
`plugins/jongmin-skills/agents/*.md`를 `~/.claude/agents/`에 복사해도 동작한다.

## 스킬 목록

| 스킬 | 설명 |
|---|---|
| [jongmin-dev-conductor](plugins/jongmin-skills/skills/jongmin-dev-conductor/SKILL.md) | 다중 레인 개발 편성 — 지휘부/쓰기/교차검증(Codex)/리뷰 레인 분리. 커밋 3건+ 웨이브·등가성 검증 작업용. vanilla Claude Code + Codex CLI만으로 동작 |

## 새 스킬 추가하기

1. `plugins/jongmin-skills/skills/<스킬이름>/SKILL.md` 생성
   - frontmatter `name`(소문자·숫자·하이픈, 64자 이하) + `description`(무엇을 + 언제, 3인칭, 1024자 이하)
   - 본문 500줄 이하, 참조 파일은 같은 폴더에 1단계 깊이로만
2. 전용 에이전트가 필요하면 `plugins/jongmin-skills/agents/<이름>.md`
3. 위 스킬 목록 표에 한 줄 추가 → commit & push
