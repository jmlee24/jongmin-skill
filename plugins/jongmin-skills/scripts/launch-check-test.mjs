// lane-launch-check.mjs 양/음성 테스트 — 임시 git 저장소에서 전 판정 분기 커버. 출력 ASCII.
// 3시험 규약: 정상 green / 정확한 위반 red / 현실적 변형 red (무매치 뮤턴트가 green이면 검사기가 이빨이 없는 것)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "lane-launch-check.mjs");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "llc-"));
const repo = path.join(tmp, "repo");
fs.mkdirSync(repo);
const git = (...a) => execFileSync("git", a, { cwd: repo, stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } }).toString().trim();
git("init", "-q", "-b", "main");
fs.writeFileSync(path.join(repo, "a.txt"), "a\n");
fs.mkdirSync(path.join(repo, "src"));
fs.writeFileSync(path.join(repo, "src", "b.txt"), "b\n");
git("add", "."); git("commit", "-q", "-m", "base");
const base = git("rev-parse", "HEAD");
const wt = path.join(tmp, "lane-x");
git("worktree", "add", "-q", wt, "-b", "lane/x", base);
const notWt = path.join(tmp, "plain-dir"); fs.mkdirSync(notWt);

let n = 0, failed = 0;
function run(name, manifest, expectExit, extra = []) {
  n++;
  const mp = path.join(tmp, `m${n}.json`);
  fs.writeFileSync(mp, JSON.stringify({ repo, base, owned: ["a.txt"], allowedNew: [], gates: ["npm test"], ...manifest }));
  const r = spawnSync(process.execPath, [SCRIPT, mp, ...extra], { encoding: "utf8" });
  const ok = r.status === expectExit;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name} (exit ${r.status}, expected ${expectExit})`);
  if (!ok) console.log(r.stdout + r.stderr);
  return r;
}

// 정상 green
run("positive minimal", {}, 0);
run("positive full", { owned: ["a.txt", "src/b.txt"], allowedNew: ["src/new.txt", "pkg/", "pkg/init.txt"],
  frozenSha: base, worktree: wt, branch: "lane/x" }, 0);
// 정확한 위반 red
run("owned missing at BASE", { owned: ["ghost.txt"] }, 1);
run("new already exists", { allowedNew: ["a.txt"] }, 1);
run("new parent missing", { allowedNew: ["nowhere/x.txt"] }, 1);
run("frozen sha missing", { frozenSha: "0000000000000000000000000000000000000000" }, 1);
run("branch missing", { branch: "lane/none" }, 1);
run("worktree not registered", { worktree: notWt }, 1);
run("worktree dir missing", { worktree: path.join(tmp, "absent") }, 1);
run("gates empty", { gates: [] }, 1);
run("gates blank string", { gates: ["  "] }, 1);
// 현실적 변형 red — 경로 오타·백슬래시·프롬프트 누락
run("owned typo", { owned: ["src/b.tx"] }, 1);
run("owned backslash ok", { owned: ["src\\b.txt"] }, 0);
const pp = path.join(tmp, "prompt.md");
fs.writeFileSync(pp, `[임무] x\nOwned files: a.txt\nbranch lane/x\nworktree ${wt}\n3) 검증: npm test\n`);
run("prompt complete", { branch: "lane/x", worktree: wt }, 0, ["--prompt", pp]);
fs.writeFileSync(pp, `[임무] x\nOwned files: a.txt\nbranch lane/x\n3) 검증: npm tets\n`);
run("prompt gate typo", { branch: "lane/x" }, 1, ["--prompt", pp]);
fs.writeFileSync(pp, `[임무] x\nbranch lane/x\n3) 검증: npm test\n`);
run("prompt owned omitted", { branch: "lane/x" }, 1, ["--prompt", pp]);
// 리뷰 지적(1.10.0 CX): 저장소 밖 경로·부분 문자열 우회·신규/Frozen 누락·타입 오류·git 오류
run("owned outside repo (..)", { owned: ["../a.txt"] }, 1);
run("new outside repo (abs)", { allowedNew: ["/outside/x.txt"] }, 1);
run("new escapes via ../ dir", { allowedNew: ["../", "../x.txt"] }, 1);
fs.writeFileSync(pp, "[임무] x\nOwned files: a.txt.bak\n3) 검증: npm testing\n");
run("prompt suffix mutant (a.txt.bak / npm testing)", {}, 1, ["--prompt", pp]);
fs.writeFileSync(pp, `[임무] x\nOwned: "a.txt"\nFrozen: ${base}\n검증: \`npm test\`\n`);
run("prompt tokens in quotes/backticks ok", { frozenSha: base }, 0, ["--prompt", pp]);
fs.writeFileSync(pp, `[임무] x\r\nOwned: a.txt, src/b.txt\r\n신규 허용: pkg/, pkg/init.txt, src/new.txt\r\nFrozen: ${base}\r\nbranch lane/x\r\nworktree ${wt}\r\n검증: npm test\r\n`);
run("prompt full with dir entry (pkg/) ok", { owned: ["a.txt", "src/b.txt"], allowedNew: ["pkg/", "pkg/init.txt", "src/new.txt"], frozenSha: base, worktree: wt, branch: "lane/x" }, 0, ["--prompt", pp]);
fs.writeFileSync(pp, "[임무] x\nOwned: a.txt\n검증: npm test\n");
run("prompt new-file list omitted", { allowedNew: ["src/new.txt"] }, 1, ["--prompt", pp]);
run("prompt frozen sha omitted", { frozenSha: base }, 1, ["--prompt", pp]);
run("prompt branch omitted", { branch: "lane/x" }, 1, ["--prompt", pp]);
run("prompt worktree omitted", { worktree: wt }, 1, ["--prompt", pp]);
run("manifest gates not array -> exit 3", { gates: null }, 3);
run("manifest owned has non-string -> exit 3", { owned: [1] }, 3);
run("manifest base missing -> exit 3", { base: "" }, 3);
run("repo dir missing -> exit 3", { repo: path.join(tmp, "no-repo") }, 3);
run("base sha unknown -> exit 1 (absence, not error)", { base: "0000000000000000000000000000000000000000" }, 1);
// git 실행 오류 주입: PATH를 비워 git 자체를 못 찾게 한다 → 부재가 아니라 exit 3
{
  n++;
  const mp = path.join(tmp, "m-nogit.json");
  fs.writeFileSync(mp, JSON.stringify({ repo, base, owned: ["a.txt"], allowedNew: ["z.txt"], gates: ["npm test"] }));
  const r = spawnSync(process.execPath, [SCRIPT, mp], { encoding: "utf8", env: { ...process.env, PATH: "", Path: "" } });
  if (r.status === 3) console.log("PASS git unavailable -> exit 3"); else { failed++; console.log("FAIL git unavailable -> exit " + r.status + "\n" + r.stdout); }
}
// 사용법·오류 exit 3
const r3 = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8" });
n++; if (r3.status !== 3) { failed++; console.log("FAIL usage exit 3 (got " + r3.status + ")"); } else console.log("PASS usage exit 3");
// 장부 기록 — pass/block 양쪽
const ledger = path.join(tmp, "events.tsv");
run("ledger pass row", {}, 0, ["--ledger", ledger, "--lane", "L1"]);
run("ledger block row", { owned: ["ghost.txt"] }, 1, ["--ledger", ledger, "--lane", "L2"]);
const rows = fs.readFileSync(ledger, "utf8").trim().split("\n");
n++;
if (rows.length === 2 && rows[0].includes("\tL1\tlaunch_check\tpass 0") && rows[1].includes("\tL2\tlaunch_check\tblock 1 owned")) console.log("PASS ledger rows");
else { failed++; console.log("FAIL ledger rows\n" + rows.join("\n")); }

git("worktree", "remove", "--force", wt);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${failed ? "RESULT: FAIL" : "RESULT: ALL PASS"} (${n - failed}/${n})`);
process.exit(failed ? 1 : 0);
