#!/usr/bin/env node
// 릴리스 검증 묶음 — 단일 진입점 (PRD S6). 출력 ASCII.
// 사용: node validate.mjs [--only=1,...,6] [--root=<repo root>]
// 항목: 1) claude plugin validate (stdout warning 판정 — exit code 신뢰 금지)
//       2) guard-test + state-test + launch-check-test + hud-test + handoff-check-test
//       3) 링크 무결성 (shared 상호참조 + 동일 디렉터리 + README, 디렉터리 링크 허용)
//          한계: inline 링크만 검사 — reference-style([x][id])·anchor-only(#a)·<> 감싼 링크는
//          미검사 (현 repo는 inline만 사용, cx-s6 defer)
//       4) description 검사 — 4-A 변경 3종 확정 문자열 일치(UTF-8 + \r 제거 정규화 후 비교,
//          그 외 정규화 금지 — PRD 확정) / 4-B 미변경 4종 회귀 lint
import { execFileSync, spawnSync } from "node:child_process";
import { lintCases } from "./case-lint.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, "..", "..", "..");

// 4-A 확정 문자열 테이블 — S6 시점에는 빈 테이블(도입 순서 규약: S7이 loop·sortie 2건,
// S8이 dev-conductor 1건을 각자 description 변경과 같은 커밋에서 채운다).
// 이 테이블은 validate.mjs 상수와 SKILL.md의 내부 일관성만 보증한다 — PRD 확정 문자열과의
// 대조는 루프 종료 게이트(§5-6)가 수행한다.
export const EXPECTED_DESCRIPTIONS = {
  "handoff": "세션 경계에서 작업 상태를 인수인계할 때 사용한다 — 슬래시 명령(/jongmin-skills:handoff)으로만 시작되며 자연어 요청으로는 발동하지 않는다 (disable-model-invocation). 컨텍스트 압축 임박·계정 전환(개인/법인)·기기 이동·웨이브 중단 시 save, 재개 시 restore. 단순 작업 요약 요청에는 사용하지 않는다.",
  "jongmin-deep-audit": "코드베이스 전반의 구조적 문제를 전면 감사할 때 사용한다 — 슬래시 명령(/jongmin-skills:jongmin-deep-audit)으로만 시작되며 자연어 요청으로는 발동하지 않는다 (disable-model-invocation). 특정 버그 하나의 원인 추적, 단일 파일 리뷰, 수정 작업에는 사용하지 않는다 — 이 스킬은 read-only다.",
  "jongmin-warplan": "다단계 작업의 실행 계획을 세울 때 사용한다 — 슬래시 명령(/jongmin-skills:jongmin-warplan)으로만 시작되며 자연어 요청으로는 발동하지 않는다 (disable-model-invocation). 단일 단계 작업, 이미 계획이 확정된 작업에는 사용하지 않는다.",
  "skill-forge": "jongmin-skills 패밀리의 스킬을 제작·평가·개선할 때 사용한다 — 슬래시 명령(/jongmin-skills:skill-forge)으로만 시작되며 자연어 요청으로는 발동하지 않는다 (disable-model-invocation). 스킬이 아닌 일반 코드·문서 작업에는 사용하지 않는다.",
  "jongmin-loop": "완료 조건이 명확한 작업을 오라클 통과까지 반복 실행할 때 사용한다 — 슬래시 명령(/jongmin-skills:jongmin-loop)으로만 시작되며 자연어 요청으로는 발동하지 않는다 (disable-model-invocation). 완료 조건을 오라클(테스트·검증 명령)로 표현할 수 없는 작업, 탐색·리서치성 작업에는 사용하지 않는다.",
  "jongmin-sortie": "사용자가 자리를 비운 동안 시간 박스 안에서 자율 실행할 때 사용한다 — 슬래시 명령(/jongmin-skills:jongmin-sortie)으로만 시작되며 자연어 요청으로는 발동하지 않는다 (disable-model-invocation). 사용자가 실시간으로 지켜보는 일반 작업에는 사용하지 않는다.",
  "jongmin-dev-conductor": "커밋 3건 이상이 예상되는 다중 파일 구현 웨이브, 등가성 검증이 결과의 핵심인 무손실 최적화·리팩토링, 독립 교차검증과 리뷰 분리가 필요한 고위험 변경에 사용한다 — 슬래시 명령(/jongmin-skills:jongmin-dev-conductor)으로만 시작되며 자연어 요청으로는 발동하지 않는다 (disable-model-invocation). 단일 파일 수정, 소규모 작업, 일상적인 멀티파일 리팩토링에는 사용하지 않는다.",
  "hud-setup": "Claude Code 상태줄(statusline)에 5h·주간·모델별 사용량과 컨텍스트 게이지를 표시하는 HUD를 설치·점검·제거한다 — 슬래시 명령(/jongmin-skills:hud-setup)으로만 시작되며 자연어 요청으로는 발동하지 않는다 (disable-model-invocation). 개발 작업·코드 변경·사용량 분석에는 사용하지 않는다.",
  "jongmin-coproduce": "견적·계약 검토문·제작안·의사결정 메모·사실 브리프 등 비개발 산출물을 Claude(T1)와 Codex(CX)가 공동 제작하고 서로 검수할 때 사용한다 — 슬래시 명령(/jongmin-skills:jongmin-coproduce)으로만 시작되며 자연어 요청으로는 발동하지 않는다 (disable-model-invocation). 코드·저장소·아키텍처가 대상인 작업, 단순 질의응답, 오답 비용이 낮은 잡학·취향 질문에는 사용하지 않는다.",
};

const LINT_SKILLS = ["handoff", "jongmin-deep-audit", "jongmin-warplan", "skill-forge", "jongmin-loop", "jongmin-sortie", "jongmin-dev-conductor", "hud-setup", "jongmin-coproduce"];
const ALL_SKILLS = [...LINT_SKILLS];
const NON_INVOCATION_PHRASE = "사용하지 않는다";

let failures = 0;
function pass(tag, msg) { console.log(`PASS [${tag}] ${msg}`); }
function fail(tag, msg) { failures++; console.log(`FAIL [${tag}] ${msg}`); }

// UTF-8 고정 + \r 전량 제거 — 그 외 정규화 금지 (PRD 확정)
function normText(s) { return s.replace(/\r/g, ""); }
function readMd(p) { return normText(fs.readFileSync(p, "utf-8")); }

function descriptionOf(root, skill) {
  const p = path.join(root, "plugins", "jongmin-skills", "skills", skill, "SKILL.md");
  const txt = readMd(p);
  const m = txt.match(/^description:[ \t]*(.*)$/m);
  return m ? m[1] : null;
}
function descriptionIsSingleLine(root, skill) {
  const p = path.join(root, "plugins", "jongmin-skills", "skills", skill, "SKILL.md");
  const lines = readMd(p).split("\n");
  const i = lines.findIndex((l) => l.startsWith("description:"));
  if (i < 0) return false;
  const v = lines[i].slice("description:".length).trim();
  if (v === "" || v.startsWith("|") || v.startsWith(">")) return false;
  const next = lines[i + 1] ?? "";
  return !(next.startsWith(" ") || next.startsWith("\t"));
}

function check1(root) {
  // spawnSync로 stdout+stderr를 모두 판정 대상에 포함 — execSync 반환값은 stdout뿐이라
  // stderr로 나오는 warning을 놓친다 (cx-s6)
  const r = spawnSync("claude", ["plugin", "validate", "."], { cwd: root, encoding: "utf-8", shell: true });
  if (r.error || r.status === null) {
    fail(1, `claude plugin validate spawn failed: ${r.error?.message ?? "unknown"}`);
    return;
  }
  // 비영 종료도 실패 — warning 정규식만 보면 "ERROR …" + exit 1이 PASS로 둔갑한다 (cx-release 2026-09-10)
  if (r.status !== 0) {
    fail(1, `claude plugin validate exited ${r.status}`);
    return;
  }
  const out = (r.stdout || "") + (r.stderr || "");
  if (/warning|⚠/i.test(out)) fail(1, "plugin validate emitted warnings (exit code is not trusted)");
  else pass(1, "plugin validate: no warnings");
}

function check2(root) {
  for (const t of ["guard-test.mjs", "state-test.mjs", "launch-check-test.mjs", "hud-test.mjs", "handoff-check-test.mjs"]) {
    const p = path.join(root, "plugins", "jongmin-skills", "scripts", t);
    try {
      execFileSync("node", [p], { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
      pass(2, `${t} green`);
    } catch (e) {
      fail(2, `${t} failed: ${String((e.stdout || "") + (e.stderr || "")).split("\n").filter(Boolean).pop()}`);
    }
  }
}

function mdFiles(root) {
  const base = path.join(root, "plugins", "jongmin-skills");
  const acc = [path.join(root, "README.md")];
  const walk = (d) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) walk(p);
      else if (f.name.endsWith(".md")) acc.push(p);
    }
  };
  walk(base);
  return acc;
}
function check3(root) {
  let links = 0, broken = 0;
  for (const file of mdFiles(root)) {
    const txt = readMd(file);
    for (const m of txt.matchAll(/\]\(([^)#\s]+?)(#[^)]*)?\)/g)) {
      const target = m[1];
      if (/^[a-z]+:\/\//i.test(target) || target.startsWith("mailto:")) continue;
      links++;
      const resolved = path.resolve(path.dirname(file), decodeURI(target));
      let ok = false;
      try { const st = fs.statSync(resolved); ok = st.isFile() || st.isDirectory(); } catch {}
      if (!ok) { broken++; fail(3, `broken link in ${path.relative(root, file)}: ${target}`); }
    }
  }
  if (!broken) pass(3, `link integrity: ${links} relative links resolve`);
}

function extractTriggers(desc) {
  // ASCII 큰따옴표 + 곡선 따옴표 모두 추출 (cx-s6 — 한글 문서에서 “...”가 유입될 수 있다)
  return [...(desc ?? "").matchAll(/["“]([^"”]+)["”]/g)].map((m) => m[1]);
}
function check4(root) {
  // 4-A 확정 문자열 완전 일치 (byte 비교, \r 제거 외 정규화 금지)
  const entries = Object.entries(EXPECTED_DESCRIPTIONS);
  if (!entries.length) {
    pass("4A", "exact-match table empty (filled by S7/S8; final coverage asserted by loop exit gate)");
  }
  for (const [skill, expected] of entries) {
    const actual = descriptionOf(root, skill);
    if (actual === normText(expected)) pass("4A", `${skill} description matches constant`);
    else fail("4A", `${skill} description differs from constant`);
  }
  // 4-B 미변경 4종 회귀 lint
  for (const skill of LINT_SKILLS) {
    if (!descriptionIsSingleLine(root, skill)) fail("4B", `${skill}: description not single-line`);
    else pass("4B", `${skill}: single-line`);
    const d = descriptionOf(root, skill) ?? "";
    if (!d.includes(NON_INVOCATION_PHRASE)) fail("4B", `${skill}: missing non-invocation clause`);
    else pass("4B", `${skill}: non-invocation clause present`);
  }
  // 4-C 슬래시 전용 계약 — 플래그 실값 + description의 슬래시 절 (description만 맞고 플래그가 빠지면 자연어 발동이 되살아난다)
  for (const skill of LINT_SKILLS) {
    const fm = readMd(path.join(root, "plugins", "jongmin-skills", "skills", skill, "SKILL.md")).split("\n---")[0];
    const flag = /^disable-model-invocation:\s*true\s*$/m.test(fm);
    const clause = (descriptionOf(root, skill) ?? "").includes(`슬래시 명령(/jongmin-skills:${skill})`);
    if (flag && clause) pass("4C", `${skill}: slash-only flag + clause`);
    else fail("4C", `${skill}: slash-only contract broken (flag=${flag}, clause=${clause})`);
  }
  // 4-B(c) 트리거 부분문자열 중첩 — 7종 전체 교차 (도입 시점 실패는 실재 결함: 완화 금지)
  const map = new Map(ALL_SKILLS.map((s) => [s, extractTriggers(descriptionOf(root, s))]));
  let overlaps = 0;
  for (const [a, ta] of map) for (const [b, tb] of map) {
    if (a === b) continue;
    for (const x of ta) for (const y of tb) {
      if (x.includes(y) || y.includes(x)) { overlaps++; fail("4B", `trigger overlap: ${a}"${x}" ~ ${b}"${y}"`); }
    }
  }
  if (!overlaps) pass("4B", "trigger substring overlap: none across all skills");
}

// 5) 용어 정합 — 규약 정본 용어의 금지 변형어를 탐지한다 (S10).
//    변형어 자체를 매칭하므로 한국어 조사 결합에 영향받지 않는다 (변형어 뒤에 조사가
//    붙어도 앞부분이 그대로 매칭됨). 정본 표기는 매칭되지 않도록 정규식을 좁게 유지.
const TERM_VARIANTS = [
  // 같은 줄 공백([ \t])만 허용 — \s는 개행을 먹어 정상 줄바꿈("유예 3\n분류")을 오탐한다 (cx-s10)
  [/유예[ \t]*삼분류/g, "유예 3분류"],
  [/유예[ \t]*3[ \t]+분류/g, "유예 3분류"],
  [/리뷰큐/g, "리뷰 큐"],
  [/이중종료[ \t]*게이트/g, "이중 종료 게이트"],
  [/이중[ \t]+종료게이트/g, "이중 종료 게이트"],
  [/프레시니스/g, "freshness"],
];
function check5(root) {
  let hits = 0;
  for (const file of mdFiles(root)) {
    // fenced code block은 스캔 제외 — 음성 확인 예시·금지어 인용이 릴리스를 막지 않게 (cx-s10)
    const txt = readMd(file).replace(/```[\s\S]*?```/g, "");
    for (const [re, canonical] of TERM_VARIANTS) {
      for (const m of txt.matchAll(re)) {
        hits++;
        fail(5, `term variant "${m[0]}" in ${path.relative(root, file)} (canonical: "${canonical}")`);
      }
    }
  }
  if (!hits) pass(5, "term consistency: no forbidden variants");
}

// 7) 런타임 로드 Markdown 예산 — 총행 보고 + 스킬별 500행 미만 (doc-hygiene 예산 규약의 집행점)
const SKILL_LINE_CAP = 500;
function check7(root) {
  const base = path.join(root, "plugins", "jongmin-skills");
  const groups = { skills: [], shared: [], agents: [] };
  for (const s of fs.readdirSync(path.join(base, "skills"))) {
    const p = path.join(base, "skills", s, "SKILL.md");
    if (fs.existsSync(p)) groups.skills.push(p);
  }
  for (const g of ["shared", "agents"]) {
    for (const f of fs.readdirSync(path.join(base, g))) if (f.endsWith(".md")) groups[g].push(path.join(base, g, f));
  }
  const count = (p) => readMd(p).split("\n").length - 1;
  let total = 0, over = 0;
  for (const [g, files] of Object.entries(groups)) {
    const n = files.reduce((a, p) => a + count(p), 0);
    total += n;
    if (g === "skills") for (const p of files) {
      const c = count(p);
      if (c >= SKILL_LINE_CAP) { over++; fail(7, `${path.relative(root, p)}: ${c} lines >= ${SKILL_LINE_CAP}`); }
    }
    console.log(`INFO [7] ${g}: ${n} lines`);
  }
  if (!over) pass(7, `runtime markdown total ${total} lines; every SKILL.md < ${SKILL_LINE_CAP}`);
}

function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const m = a.match(/^--([a-z]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a, true];
  }));
  const root = args.root ? path.resolve(String(args.root)) : DEFAULT_ROOT;
  const VALID_CHECKS = [1, 2, 3, 4, 5, 6, 7];
  const only = args.only !== undefined ? String(args.only).split(",").map(Number) : VALID_CHECKS;
  // 무효한 --only는 빈 검사 집합 = 공허 ALL PASS가 된다 — 즉시 거부 (cx-s6)
  if (!only.length || only.some((n) => !VALID_CHECKS.includes(n))) {
    console.log(`FAIL [args] invalid --only value (valid: ${VALID_CHECKS.join(",")})`);
    process.exit(1);
  }
  if (only.includes(1)) check1(root);
  if (only.includes(2)) check2(root);
  if (only.includes(3)) check3(root);
  if (only.includes(4)) check4(root);
  if (only.includes(5)) check5(root);
  if (only.includes(7)) check7(root);
  if (only.includes(6)) failures += lintCases(root).failures; // cases/ 스키마 — 상세는 case-lint.mjs
  console.log(failures ? `\nRESULT: FAIL (${failures})` : "\nRESULT: ALL PASS");
  process.exit(failures ? 1 : 0);
}

// 진입 가드 — import 시 부작용 없음 (종료 게이트가 EXPECTED_DESCRIPTIONS만 읽을 수 있게)
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main();
}
