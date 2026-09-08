#!/usr/bin/env node
// 쓰기 레인 발진 전 내용 검사 — 산문 체크리스트("실존 확인 후 배정")를 집행점으로 옮긴 것.
// 형식·실존·금지 경로처럼 답이 하나인 것만 판정한다. 의미·효과 판정은 T1 몫 (검증 스크립트 비대화 경계).
// usage: node lane-launch-check.mjs <manifest.json> [--prompt <file>] [--ledger <events.tsv> --lane <id>]
// manifest: { repo, base, owned[], allowedNew[], gates[], frozenSha?, worktree?, branch? }
//   owned      : BASE에 실존해야 하는 파일 (없는 파일을 Owned로 주면 executor가 임의 위치에 만든다 — 실측)
//   allowedNew : BASE에 없어야 하는 신규 파일. 부모 디렉터리는 BASE에 실존하거나 allowedNew에 "dir/"로 명시
//   gates      : 게이트 명령 전건 — 비어 있으면 실패. --prompt가 있으면 각 항목이 프롬프트에 원문으로 있어야 함
// exit 0 = 전부 통과 / 1 = 하나라도 실패 / 3 = 사용법·매니페스트 형식·git 오류 (부재 판정과 구분 — 오류가 통과로 둔갑하지 않는다). 출력 ASCII.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const LEDGER_EVENT = "launch_check";
const args = process.argv.slice(2);
const OPTS = new Set(["--prompt", "--ledger", "--lane"]);
function opt(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; }
const manifestPath = args.find((a, i) => !a.startsWith("--") && !(i > 0 && OPTS.has(args[i - 1])));
function die(msg) { console.log("ERROR " + msg); process.exit(3); }

if (!manifestPath) die("usage: lane-launch-check.mjs <manifest.json> [--prompt <file>] [--ledger <tsv> --lane <id>]");
let m;
try { m = JSON.parse(fs.readFileSync(manifestPath, "utf8")); } catch (e) { die("manifest unreadable: " + e.message); }
for (const k of ["repo", "base"]) if (typeof m[k] !== "string" || !m[k]) die("manifest field must be non-empty string: " + k);
for (const k of ["owned", "allowedNew", "gates"]) {
  if (!Array.isArray(m[k]) || m[k].some((x) => typeof x !== "string")) die("manifest field must be string[]: " + k);
}
for (const k of ["frozenSha", "worktree", "branch"]) if (m[k] !== undefined && typeof m[k] !== "string") die("manifest field must be string: " + k);

const failures = [];
const pass = (tag, msg) => console.log(`PASS ${tag} ${msg}`);
const fail = (tag, msg) => { failures.push(tag); console.log(`FAIL ${tag}: ${msg}`); };
const norm = (p) => p.replace(/\\/g, "/").replace(/\/+$/, "");
// 저장소 밖 경로(절대 경로·..)는 소유권 대상이 될 수 없다 — 검사 전에 거른다
const insideRepo = (p) => { const n = norm(p); return !(path.isAbsolute(n) || /^[A-Za-z]:/.test(n) || n.split("/").includes("..")); };

// git 실패는 두 종류다: 대상 부재(판정 결과)와 실행 오류(판정 불가 → exit 3). cat-file은 둘 다 128이라 stderr로 가른다.
const MISSING_RE = /Not a valid object name|does not exist in|exists on disk, but not in|needed a single revision|unknown revision/i;
function git(argv, cwd = m.repo) {
  try { return { ok: true, out: execFileSync("git", argv, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString().trim() }; }
  catch (e) {
    const err = (e.stderr || "").toString();
    if (e.code === "ENOENT") die("git not found on PATH");
    if (MISSING_RE.test(err) || (argv[0] === "ls-tree" && e.status === 128 && /not a tree object/i.test(err))) return { ok: false, out: "" };
    if (argv[0] === "rev-parse" && argv.includes("-q") && e.status === 1) return { ok: false, out: "" }; // --verify -q: 부재는 exit 1, 그 외는 오류
    die(`git ${argv.join(" ")} failed (${e.status}): ${err.trim().split("\n")[0] || e.message}`);
  }
}
const existsAtBase = (p) => git(["cat-file", "-e", `${m.base}:${norm(p)}`]).ok;
const isDirAtBase = (p) => { const r = git(["ls-tree", "-d", m.base, "--", norm(p)]); return r.ok && r.out.length > 0; };

// 1. 저장소·BASE
if (!fs.existsSync(m.repo)) die("repo dir missing: " + m.repo);
if (!git(["rev-parse", "--is-inside-work-tree"]).ok) die("not a git repo: " + m.repo);
if (git(["cat-file", "-e", `${m.base}^{commit}`]).ok) pass("base", m.base);
else fail("base", "commit not found: " + m.base);

// 2. Owned 실존
for (const p of m.owned) {
  if (!insideRepo(p)) { fail("owned", "path outside repo: " + p); continue; }
  if (existsAtBase(p)) pass("owned", p);
  else fail("owned", "not in BASE: " + p);
}

// 3. 신규 파일 — 부재 + 부모 정책
// 직접 부모가 BASE에 실존하거나, 조상 중 하나가 allowedNew 디렉터리("pkg/")로 명시돼야 한다.
// 루트까지 올라가며 실존을 찾으면 안 된다 — 없는 중간 디렉터리가 항상 통과한다 (테스트로 잡힌 결함).
const newDirs = new Set(m.allowedNew.filter((p) => p.endsWith("/")).map((p) => norm(p)));
function parentAllowed(p) {
  const direct = path.posix.dirname(norm(p));
  if (direct === ".") return "repo root";
  if (isDirAtBase(direct)) return "exists at BASE " + direct + "/";
  for (let d = direct; d !== "." && d !== "/" && d !== ""; ) {
    if (newDirs.has(d)) return "allowedNew dir " + d + "/";
    const up = path.posix.dirname(d); if (up === d) break; d = up;
  }
  return null;
}
for (const p of m.allowedNew) {
  if (!insideRepo(p)) { fail("new", "path outside repo: " + p); continue; }
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

// 5. worktree — 디렉터리 실존 + 이 저장소에 등록된 worktree (대소문자 무시는 Windows에서만)
const fold = (s) => process.platform === "win32" ? s.toLowerCase() : s;
if (m.worktree) {
  const wt = norm(path.resolve(m.worktree));
  const listed = git(["worktree", "list", "--porcelain"]).out.split("\n")
    .filter((l) => l.startsWith("worktree ")).map((l) => fold(norm(l.slice(9))));
  if (!fs.existsSync(wt)) fail("worktree", "dir missing: " + wt);
  else if (!listed.includes(fold(wt))) fail("worktree", "not registered in `git worktree list`: " + wt);
  else pass("worktree", wt);
}

// 6. 레인 브랜치
if (m.branch) {
  if (git(["rev-parse", "--verify", "-q", `refs/heads/${m.branch}`]).ok) pass("branch", m.branch);
  else fail("branch", "no such branch: " + m.branch);
}

// 7. 게이트 명령 전건
if (m.gates.length === 0 || m.gates.some((g) => !g.trim())) fail("gates", "empty gate command");
else pass("gates", m.gates.length + " command(s)");

// 8. 프롬프트 대조 — 게이트·소유권·신규 목록·Frozen SHA·worktree·브랜치가 원문으로 들어 있는가.
// 부분 문자열("a.txt.bak", "npm testing")은 증거가 아니다 — 토큰 경계를 요구한다.
const promptPath = opt("--prompt");
if (promptPath) {
  let text;
  try { text = fs.readFileSync(promptPath, "utf8").replace(/\\/g, "/"); } catch (e) { die("prompt unreadable: " + e.message); }
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // 디렉터리 항목("pkg/")은 슬래시까지 원문이다 — norm으로 벗기면 뒤 경계가 "/"를 거부해 정상 발진을 막는다 (CX 재확인 지적)
  const hasToken = (needle) => new RegExp(`(^|[\\s"'\`(\\[<])${esc(needle.replace(/\\/g, "/"))}(?=$|[\\s"'\`)\\]>,;:])`, "m").test(text);
  const must = [
    ...m.gates.map((g) => ["prompt.gate", g]),
    ...m.owned.map((p) => ["prompt.owned", p]),
    ...m.allowedNew.map((p) => ["prompt.new", p]),
    ...(m.frozenSha ? [["prompt.frozen", m.frozenSha]] : []),
    ...(m.branch ? [["prompt.branch", m.branch]] : []),
    ...(m.worktree ? [["prompt.worktree", path.resolve(m.worktree)]] : []),
  ];
  for (const [tag, needle] of must) {
    if (hasToken(needle)) pass(tag, needle);
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
