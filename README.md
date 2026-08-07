# jongmin-claude-kit

개인용 Claude Code 플러그인 마켓플레이스.

## 설치

```
/plugin marketplace add <이 repo 경로 또는 GitHub URL>
/plugin install dev-conductor@jongmin-claude-kit
```

플러그인 없이 쓰려면 `plugins/dev-conductor/skills/jongmin-dev-conductor/` 폴더를
`~/.claude/skills/`에, `plugins/dev-conductor/agents/lane-reviewer.md`를
`~/.claude/agents/`에 복사해도 동작한다.

## 플러그인

### dev-conductor

다중 레인 개발 편성 오케스트레이터. vanilla Claude Code + Codex CLI만으로 동작.

- 지휘부(메인 세션)는 코드를 쓰지 않고 스코프·배선·검증·접합만
- 쓰기 레인: Opus 별칭(항상 최신 Opus)
- 읽기 레인: `codex exec` read-only (`config.toml` 모델 추종)
- 리뷰 레인: read-only 독립 리뷰어 (자기승인 금지)

적합: 커밋 3건+ 웨이브, 등가성 검증이 핵심인 무손실 작업, 고위험 변경.
부적합: 단일 파일·소규모 수정, 일상적 리팩토링.
