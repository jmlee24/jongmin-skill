#!/usr/bin/env node
// 릴리스 검증 묶음 — 단일 진입점 (PRD S6). 출력 ASCII.
// 사용: node validate.mjs [--only=1,2,3,4] [--root=<repo root>]
// 항목: 1) claude plugin validate (stdout warning 판정 — exit code 신뢰 금지)
//       2) guard-test + state-test
//       3) 링크 무결성 (shared 상호참조 + 동일 디렉터리 + README, 디렉터리 링크 허용)
//       4) description 검사 — 4-A 변경 3종 확정 문자열 완전 일치 / 4-B 미변경 4종 회귀 lint
import { execFileSync, execSync } from "node:child_process";
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
  // "jongmin-loop": "...",
  // "jongmin-sortie": "...",
  // "jongmin-dev-conductor": "...",
};

const LINT_SKILLS = ["handoff", "jongmin-deep-audit", "jongmin-warplan", "skill-forge"];
const ALL_SKILLS = [...LINT_SKILLS, "jongmin-loop", "jongmin-sortie", "jongmin-dev-conductor"];
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
  if (v === "" || v === "|" || v === ">" || v.startsWith("|") || v.startsWith(">")) return false;
  const next = lines[i + 1] ?? "";
  return !(next.startsWith(" ") || next.startsWith("\t"));
}

function check1(root) {
  let out = "";
  try {
    out = execSync("claude plugin validate .", { cwd: root, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    fail(1, `claude plugin validate spawn failed: ${String(e.message).split("\n")[0]}`);
    return;
  }
  if (/warning|⚠/i.test(out)) fail(1, "plugin validate emitted warnings (exit code is not trusted)");
  else pass(1, "plugin validate: no warnings");
}

function check2(root) {
  for (const t of ["guard-test.mjs", "state-test.mjs"]) {
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
  return [...(desc ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
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
  // 4-B(c) 트리거 부분문자열 중첩 — 7종 전체 교차 (도입 시점 실패는 실재 결함: 완화 금지)
  const map = new Map(ALL_SKILLS.map((s) => [s, extractTriggers(descriptionOf(root, s))]));
  let overlaps = 0;
  for (const [a, ta] of map) for (const [b, tb] of map) {
    if (a === b) continue;
    for (const x of ta) for (const y of tb) {
      if (x.includes(y) || y.includes(x)) { overlaps++; fail("4B", `trigger overlap: ${a}"${x}" ~ ${b}"${y}"`); }
    }
  }
  if (!overlaps) pass("4B", "trigger substring overlap: none across 7 skills");
}

function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const m = a.match(/^--([a-z]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a, true];
  }));
  const root = args.root ? path.resolve(String(args.root)) : DEFAULT_ROOT;
  const only = args.only ? String(args.only).split(",").map(Number) : [1, 2, 3, 4];
  if (only.includes(1)) check1(root);
  if (only.includes(2)) check2(root);
  if (only.includes(3)) check3(root);
  if (only.includes(4)) check4(root);
  console.log(failures ? `\nRESULT: FAIL (${failures})` : "\nRESULT: ALL PASS");
  process.exit(failures ? 1 : 0);
}

// 진입 가드 — import 시 부작용 없음 (종료 게이트가 EXPECTED_DESCRIPTIONS만 읽을 수 있게)
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main();
}
