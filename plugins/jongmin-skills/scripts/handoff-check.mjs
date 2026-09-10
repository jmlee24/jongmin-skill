#!/usr/bin/env node
// handoff 스냅샷의 결정론 검증 — 컴팩션 직전 T1이 지어낼 수 있는 것(SHA·경로·파일:라인·명령)의 실존만 기계 검사한다.
// 의미 주장("완료됐다", "원인은 X")은 검사하지 않는다 — 그건 restore의 빈 컨텍스트 T2 검증 몫.
//
//   node handoff-check.mjs <snapshot.md|-> [--cwd <repo>] [--annotate] [--json]
//
// 출력(ASCII 판정 문자열): OK|MISSING|RANGE|SKIP <kind> <item> @L<line>. 마지막 줄 요약. MISSING/RANGE가 있으면 exit 1.
// --annotate: 스냅샷 원문을 그대로 출력하되 문제 항목이 있는 줄 끝에 " [UNVERIFIED: ...]"를 붙인다 — 그대로 스냅샷에 넣는다.
// 실행만 되고 컨텍스트에 로드되지 않는다. 검사는 2초 안에 끝나야 한다 (컴팩션 임박 전제) — 네트워크 없음.

import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const KNOWN_BINS = new Set(["node", "npm", "npx", "pnpm", "git", "codex", "claude", "python", "py", "gh"]);
const SCRIPT_EXT = /\.(mjs|cjs|js|py|sh|ps1)$/i;
const FILE_EXT = /\.(md|mjs|cjs|js|ts|json|txt|py|toml|ya?ml|sh|ps1|sql|csv|html|css)$/i;
const MIN_SHA = 7;
const MAX_SHA = 40;
// 확장자 뒤에 붙은 한글 조사(`README.md를`, `scripts/가짜.mjs를`) — 경로 판정 전에 떼어낸다
const EXT_JOSA = /(\.[A-Za-z0-9]{1,8})[가-힣]+$/;
const NON_ASCII = /[^\x00-\x7F]/;
const LINE_REF = /:\d+(?:-\d+)?$/;

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const input = argv.find((a) => !a.startsWith("--") && a !== opt("--cwd")) ?? "-";
const cwd = resolve(opt("--cwd") ?? process.cwd());
const annotate = flag("--annotate");
const asJson = flag("--json");

const text = input === "-" ? readFileSync(0, "utf-8") : readFileSync(input, "utf-8");
const lines = text.split(/\r?\n/);

const isGitRepo = spawnSync("git", ["rev-parse", "--git-dir"], { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).status === 0;
// SHA는 후보를 모아 git cat-file --batch-check 1회로 판정한다 — 후보당 프로세스 1개면 긴 스냅샷에서 컴팩션 창을 넘긴다 (CX#5)
const MAX_SHA_CANDIDATES = 500;
const shaCache = new Map();
function resolveShas(shas) {
  const todo = [...new Set(shas)].filter((s) => !shaCache.has(s)).slice(0, MAX_SHA_CANDIDATES);
  if (!todo.length) return;
  const r = spawnSync("git", ["cat-file", "--batch-check"], { cwd, encoding: "utf-8", input: todo.join("\n") + "\n", stdio: ["pipe", "pipe", "ignore"] });
  const lines = (r.stdout ?? "").split("\n");
  todo.forEach((s, i) => shaCache.set(s, !!lines[i] && !/ missing$| ambiguous$/.test(lines[i]) && / commit /.test(lines[i])));
}
const shaExists = (sha) => shaCache.get(sha) === true;
const binCache = new Map();
function binExists(bin) {
  if (!binCache.has(bin)) {
    const r = spawnSync(process.platform === "win32" ? "where" : "which", [bin], { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
    binCache.set(bin, r.status === 0);
  }
  return binCache.get(bin);
}
function expandPath(p) {
  let x = p.replace(/^~(?=[\\/]|$)/, homedir());
  return isAbsolute(x) ? x : resolve(cwd, x);
}
function lineCount(file) {
  return readFileSync(file, "utf-8").split(/\r?\n/).length;
}
const stripQuotes = (w) => w.replace(/^["']+|["']+$/g, "");

// 후보 추출 — 줄 단위, 종류별. 자리표시자(<...>)·URL·글롭·옵션은 건너뛴다
const results = [];
const seen = new Set();
function push(kind, item, lineNo, status, note = "") {
  const key = `${kind}|${item}|${lineNo}`;
  if (seen.has(key)) return;
  seen.add(key);
  results.push({ kind, item, line: lineNo, status, note });
}

const shaRe = /(?<![\w/])([0-9a-f]{7,40})(?![\w/])/g;
const tokenRe = /`([^`]+)`|(\S+)/g;

// 1) SHA 후보 수집 — 7~40 hex. 순수 숫자 토큰(타임스탬프 등)은 "SHA/HEAD/commit/기준/커밋" 문맥 뒤에 올 때만 후보로,
//    그 외 순수 숫자는 repo에 실존할 때만 OK로 보고하고 없으면 조용히 넘긴다 (CX#3: 명시된 커밋 주장은 놓치지 않는다)
const explicitRe = /(sha|head|commit|기준|커밋)\s*[:=]?\s*[(]?\s*$/i;
const shaCands = [];
lines.forEach((raw, idx) => {
  for (const m of raw.matchAll(shaRe)) {
    const sha = m[1];
    if (sha.length < MIN_SHA || sha.length > MAX_SHA) continue;
    const digitsOnly = !/[a-f]/.test(sha);
    const explicit = explicitRe.test(raw.slice(Math.max(0, m.index - 16), m.index));
    shaCands.push({ sha, lineNo: idx + 1, digitsOnly, explicit });
  }
});
if (isGitRepo) resolveShas(shaCands.map((c) => c.sha));
for (const c of shaCands) {
  if (!isGitRepo) { if (!c.digitsOnly || c.explicit) push("sha", c.sha, c.lineNo, "SKIP", "not a git repo"); continue; }
  const exists = shaExists(c.sha);
  if (c.digitsOnly && !c.explicit && !exists) continue;
  push("sha", c.sha, c.lineNo, exists ? "OK" : "MISSING");
}

lines.forEach((raw, idx) => {
  const lineNo = idx + 1;
  // 2) 백틱 명령 / 경로 / 파일:라인
  for (const m of raw.matchAll(tokenRe)) {
    const span = m[1];
    const bare = m[2];
    if (span) {
      const words = span.trim().split(/\s+/);
      const head = words[0];
      if (KNOWN_BINS.has(head)) {
        push("cmd", head, lineNo, binExists(head) ? "OK" : "MISSING");
        // 따옴표를 먼저 벗겨야 `node "scripts/x.mjs"`의 닫는 따옴표가 SCRIPT_EXT의 $ 앵커를 막지 않는다
        const script = words.slice(1).map(stripQuotes).find((w) => SCRIPT_EXT.test(w) && !/[<>*]/.test(w));
        if (script) checkPath(script, lineNo);
        continue;
      }
      for (const w of words) checkPathToken(w, lineNo);
    } else if (bare) {
      checkPathToken(bare, lineNo);
    }
  }
});

function checkPathToken(tok, lineNo) {
  let t = tok.replace(/^[("'\[<]+|[)"'\],;:>]+$/g, "");
  if (!t || /^--?[a-z]/i.test(t) || /:\/\//.test(t) || /[<>*{}$|]/.test(t)) return;
  // 한글이 든 토큰은 조사를 뗀 뒤 확장자가 남을 때만 경로로 본다 — `scripts/가짜.mjs`는 검사하고
  // 실전 표본 2026-09-10의 산문(`파일을`, `account/rateLimits/read와`, `5h/주간/ctx는`)은 계속 제외한다
  t = t.replace(EXT_JOSA, "$1");
  if (NON_ASCII.test(t) && !FILE_EXT.test(t.replace(LINE_REF, ""))) return;
  // 오탐 제외(실전 표본 2026-09-10): 스킴 없는 호스트명 / 슬래시 명령
  if (/^[\w.-]+\.(com|net|org|io|dev|ai|kr|co)(\/|$)/i.test(t)) return;
  if (/^\/[a-z][\w-]*(:[\w-]+)*$/i.test(t)) return;
  if (/^[A-Z0-9_]+(\/[A-Z0-9_]+)+$/.test(t)) return; // 대문자 열거 VERIFIED/UNVERIFIED (실전 표본)
  if (/^[\\/]+$/.test(t) || /^\.{1,2}[\\/]?$/.test(t)) return;
  // 파일:라인 / 파일:라인-라인 — 구분자 없는 루트 파일(README.md:12)도 여기서 잡는다 (CX#1)
  const fl = t.match(/^(.+?):(\d+)(?:-(\d+))?$/);
  if (fl && !/^[A-Za-z]:$/.test(fl[1]) && (/[\\/]/.test(fl[1]) || FILE_EXT.test(fl[1]))) {
    const file = expandPath(fl[1]);
    if (existsSync(file) && statSync(file).isFile()) {
      const n = lineCount(file);
      const want = Number(fl[3] ?? fl[2]);
      push("file:line", t, lineNo, want <= n ? "OK" : "RANGE", `file has ${n} lines`);
    } else {
      push("path", fl[1], lineNo, "MISSING");
    }
    return;
  }
  if (!/[\\/]/.test(t) && !FILE_EXT.test(t)) return;
  checkPath(t, lineNo);
}
function checkPath(t, lineNo) {
  // 확장자·디렉터리 구분자·홈/드라이브 접두 중 하나는 있어야 경로로 본다 (a/b 같은 비율 표기 오탐 방지)
  if (!/^(~|[A-Za-z]:|\.{1,2}[\\/]|[\\/])/.test(t) && !FILE_EXT.test(t) && !/[\\/].*[\\/]/.test(t)) return;
  push("path", t, lineNo, existsSync(expandPath(t)) ? "OK" : "MISSING");
}

// 출력
const bad = results.filter((r) => r.status === "MISSING" || r.status === "RANGE");
if (asJson) {
  console.log(JSON.stringify({ cwd, gitRepo: isGitRepo, results, ok: bad.length === 0 }, null, 1));
} else if (annotate) {
  const byLine = new Map();
  for (const r of bad) byLine.set(r.line, [...(byLine.get(r.line) ?? []), `${r.kind} ${r.item}`]);
  const out = lines.map((l, i) => (byLine.has(i + 1) ? `${l} [UNVERIFIED: ${byLine.get(i + 1).join(", ")}]` : l));
  process.stdout.write(out.join("\n"));
  console.error(`handoff-check: ${results.length} checked, ${bad.length} unverified${isGitRepo ? "" : " (not a git repo: sha checks skipped)"}`);
} else {
  for (const r of results) console.log(`${r.status} ${r.kind} ${r.item} @L${r.line}${r.note ? ` (${r.note})` : ""}`);
  console.log(`handoff-check: ${results.length} checked, ${results.filter((r) => r.status === "OK").length} ok, ${bad.length} unverified${isGitRepo ? "" : " (not a git repo: sha checks skipped)"}`);
}
process.exit(bad.length ? 1 : 0);
