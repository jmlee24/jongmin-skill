#!/usr/bin/env node
// 쓰기 레인 발진 전 내용 검사 — 산문 체크리스트("실존 확인 후 배정")를 집행점으로 옮긴 것.
// 형식·실존·금지 경로처럼 답이 하나인 것만 판정한다. 의미·효과 판정은 T1 몫 (검증 스크립트 비대화 경계).
// usage: node lane-launch-check.mjs <manifest.json> [--prompt <file>] [--ledger <events.tsv> --lane <id>]
// manifest: { repo, base, owned[], allowedNew[], gates[], frozenSha?, worktree?, branch? }
//   owned      : BASE에 실존해야 하는 파일 (없는 파일을 Owned로 주면 executor가 임의 위치에 만든다 — 실측)
//   allowedNew : BASE에 없어야 하는 신규 파일. 부모 디렉터리는 BASE에 실존하거나 allowedNew에 "dir/"로 명시
//   gates      : 게이트 명령 전건 — 비어 있으면 실패. --prompt가 있으면 각 명령이 프롬프트에 원문으로 있어야 함
// exit 0 = 전부 통과 / 1 = 하나라도 실패 / 3 = 사용법·git 오류. 출력 ASCII.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const LEDGER_EVENT = "launch_check";
const args = process.argv.slice(2);
const manifestPath = args.find((a) => !a.startsWith("--") && !isOptValue(a));
function isOptValue(a) { const i = args.indexOf(a); return i > 0 && args[i - 1].startsWith("--"); }
function opt(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; }
function die(msg) { console.log("ERROR " + msg); process.exit(3); }

if (!manifestPath) die("usage: lane-launch-check.mjs <manifest.json> [--prompt <file>] [--ledger <tsv> --lane <id>]");
let m;
try { m = JSON.parse(fs.readFileSync(manifestPath, "utf8")); } catch (e) { die("manifest unreadable: " + e.message); }
for (const k of ["repo", "base", "owned", "allowedNew", "gates"]) if (!(k in m)) die("manifest missing field: " + k);

const failures = [];
const pass = (tag, msg) => console.log(`PASS ${tag} ${msg}`);
const fail = (tag, msg) => { failures.push(tag); console.log(`FAIL ${tag}: ${msg}`); };
const norm = (p) => p.replace(/\\/g, "/").replace(/\/+$/, "");

function git(argv, cwd = m.repo) {
  try { return { ok: true, out: execFileSync("git", argv, { cwd, stdio: ["ignore", "pipe", "ignore"] }).toString().trim() }; }
  catch (e) { return { ok: false, out: (e.stdout || "").toString() }; }
}
const existsAtBase = (p) => git(["cat-file", "-e", `${m.base}:${norm(p)}`]).ok;
const isDirAtBase = (p) => { const r = git(["ls-tree", "-d", m.base, "--", norm(p)]); return r.ok && r.out.length > 0; };

// 1. 저장소·BASE
if (!git(["rev-parse", "--is-inside-work-tree"]).ok) die("not a git repo: " + m.repo);
if (git(["cat-file", "-e", `${m.base}^{commit}`]).ok) pass("base", m.base);
else fail("base", "commit not found: " + m.base);

// 2. Owned 실존
for (const p of m.owned) {
  if (existsAtBase(p)) pass("owned", p);
  else fail("owned", "not in BASE: " + p);
}

// 3. 신규 파일 — 부재 + 부모 정책
const newDirs = new Set(m.allowedNew.filter((p) => p.endsWith("/")).map((p) => norm(p)));
// 직접 부모가 BASE에 실존하거나, 조상 중 하나가 allowedNew 디렉터리("pkg/")로 명시돼야 한다.
// 루트까지 올라가며 실존을 찾으면 안 된다 — 없는 중간 디렉터리가 항상 통과한다 (테스트로 잡힌 결함).
function parentAllowed(p) {
  const direct = path.posix.dirname(norm(p));
  if (direct === ".") return "repo root";
  if (isDirAtBase(direct)) return "exists at BASE " + direct + "/";
  for (let d = direct; d && d !== "."; d = path.posix.dirname(d)) {
    if (newDirs.has(d)) return "allowedNew dir " + d + "/";
  }
  return null;
}
for (const p of m.allowedNew) {
  const isDir = p.endsWith("/");
  if (existsAtBase(p)) { fail("new", "already in BASE: " + p); continue; }
  const why = parentAllowed(isDir ? norm(p) + "/x" : p);
  if (why) pass("new", `${p} (parent: ${why})`);
  else fail("new", "parent dir neither in BASE nor listed as allowedNew dir: " + p);
}

// 4. Frozen contracts SHA
if (m.frozenSha) {
  if (git(["cat-file", "-e", `${m.frozenSha}^{commit}`]).ok) pass("frozen", m.frozenSha);
  else fail("frozen", "commit not found: " + m.frozenSha);
}

// 5. worktree — 디렉터리 실존 + 이 저장소에 등록된 worktree
if (m.worktree) {
  const wt = norm(path.resolve(m.worktree));
  const listed = git(["worktree", "list", "--porcelain"]).out.split("\n")
    .filter((l) => l.startsWith("worktree ")).map((l) => norm(l.slice(9)).toLowerCase());
  if (!fs.existsSync(wt)) fail("worktree", "dir missing: " + wt);
  else if (!listed.includes(wt.toLowerCase())) fail("worktree", "not registered in `git worktree list`: " + wt);
  else pass("worktree", wt);
}

// 6. 레인 브랜치
if (m.branch) {
  if (git(["rev-parse", "--verify", "-q", `refs/heads/${m.branch}`]).ok) pass("branch", m.branch);
  else fail("branch", "no such branch: " + m.branch);
}

// 7. 게이트 명령 전건
if (!Array.isArray(m.gates) || m.gates.length === 0 || m.gates.some((g) => typeof g !== "string" || !g.trim()))
  fail("gates", "empty or non-string gate command");
else pass("gates", m.gates.length + " command(s)");

// 8. 프롬프트 대조 — 게이트·소유권·worktree·브랜치가 원문으로 들어 있는가
const promptPath = opt("--prompt");
if (promptPath) {
  let text;
  try { text = fs.readFileSync(promptPath, "utf8"); } catch (e) { die("prompt unreadable: " + e.message); }
  const must = [
    ...m.gates.map((g) => ["prompt.gate", g]),
    ...m.owned.map((p) => ["prompt.owned", p]),
    ...(m.branch ? [["prompt.branch", m.branch]] : []),
    ...(m.worktree ? [["prompt.worktree", norm(m.worktree)]] : []),
  ];
  for (const [tag, needle] of must) {
    if (text.includes(needle) || (tag === "prompt.worktree" && text.replace(/\\/g, "/").includes(needle))) pass(tag, needle);
    else fail(tag, "not found verbatim in prompt: " + needle);
  }
}

// 9. 장부 — 차단·통과를 계측해야 이 검사기의 유지·철회를 실측으로 정할 수 있다
const ledger = opt("--ledger"), lane = opt("--lane");
if (ledger && lane) {
  const note = (failures.length ? "block " : "pass ") + failures.length + (failures.length ? " " + failures.join(",") : "");
  fs.appendFileSync(ledger, [new Date().toISOString(), lane, LEDGER_EVENT, note].join("\t") + "\n");
}

console.log(failures.length ? `RESULT FAIL (${failures.length})` : "RESULT PASS");
process.exit(failures.length ? 1 : 0);
