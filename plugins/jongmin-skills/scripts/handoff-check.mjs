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
const shaCache = new Map();
function shaExists(sha) {
  if (!shaCache.has(sha)) {
    const r = spawnSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
    shaCache.set(sha, r.status === 0);
  }
  return shaCache.get(sha);
}
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

// 후보 추출 — 줄 단위, 종류별. 자리표시자(<...>)·URL·글롭·옵션은 건너뛴다
const results = [];
const seen = new Set();
function push(kind, item, lineNo, status, note = "") {
  const key = `${kind}|${item}`;
  if (seen.has(key)) return;
  seen.add(key);
  results.push({ kind, item, line: lineNo, status, note });
}

const shaRe = /(?<![\w/])([0-9a-f]{7,40})(?![\w/])/g;
const tokenRe = /`([^`]+)`|(\S+)/g;

lines.forEach((raw, idx) => {
  const lineNo = idx + 1;
  // 1) SHA — 7~40 hex. 순수 숫자 토큰(타임스탬프 등)은 repo에 실존할 때만 OK로 보고하고 없으면 조용히 넘긴다
  //    (짧은 SHA가 순수 숫자일 확률 약 4% — 놓치지 않으면서 숫자 오탐도 내지 않는 절충)
  for (const m of raw.matchAll(shaRe)) {
    const sha = m[1];
    if (sha.length < MIN_SHA || sha.length > MAX_SHA) continue;
    const digitsOnly = !/[a-f]/.test(sha);
    if (!isGitRepo) { if (!digitsOnly) push("sha", sha, lineNo, "SKIP", "not a git repo"); continue; }
    const exists = shaExists(sha);
    if (digitsOnly && !exists) continue;
    push("sha", sha, lineNo, exists ? "OK" : "MISSING");
  }
  // 2) 백틱 명령 / 경로 / 파일:라인
  for (const m of raw.matchAll(tokenRe)) {
    const span = m[1];
    const bare = m[2];
    if (span) {
      const words = span.trim().split(/\s+/);
      const head = words[0];
      if (KNOWN_BINS.has(head)) {
        push("cmd", head, lineNo, binExists(head) ? "OK" : "MISSING");
        const script = words.slice(1).find((w) => SCRIPT_EXT.test(w) && !/[<>*]/.test(w));
        if (script) checkPath(script.replace(/^["']|["']$/g, ""), lineNo);
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
  // 오탐 제외(실전 표본 2026-09-10): 한글 조사가 붙은 토큰 / 스킴 없는 호스트명 / 슬래시 명령
  if (/[^\x00-\x7F]/.test(t)) return;
  if (/^[\w.-]+\.(com|net|org|io|dev|ai|kr|co)(\/|$)/i.test(t)) return;
  if (/^\/[a-z][\w-]*(:[\w-]+)*$/i.test(t)) return;
  if (!/[\\/]/.test(t) && !FILE_EXT.test(t)) return;
  if (/^[\\/]+$/.test(t) || /^\.{1,2}[\\/]?$/.test(t)) return;
  // 파일:라인 / 파일:라인-라인
  const fl = t.match(/^(.+?):(\d+)(?:-(\d+))?$/);
  if (fl && !/^[A-Za-z]:$/.test(fl[1])) {
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
