// loop-state.mjs CLI 테스트 — 왕복·필수 인자·atomic·가드 상호운용
// 격리: 자식 프로세스의 HOME/USERPROFILE을 mkdtemp 샌드박스로 치환 (§0.3), 출력 ASCII
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(DIR, "loop-state.mjs");
const GUARD = path.join(DIR, "loop-stop-guard.mjs");
const SANDBOX = fs.mkdtempSync(path.join(os.tmpdir(), "state-test-"));
const ACTIVE = path.join(SANDBOX, ".claude", "jongmin-ledgers", "active");
const CWD = "C:\\Users\\jongm\\proj-x";

const REAL_ACTIVE = path.join(os.homedir(), ".claude", "jongmin-ledgers", "active");
function realLedgerSnapshot() {
  try {
    return fs.readdirSync(REAL_ACTIVE).map((f) => {
      const s = fs.statSync(path.join(REAL_ACTIVE, f));
      return `${f}:${s.size}:${s.mtimeMs}`;
    }).sort().join("|");
  } catch { return "ABSENT"; }
}
const realBefore = realLedgerSnapshot();

let pass = 0, fail = 0;
const results = [];
function check(name, cond, detail = "") {
  if (cond) { pass++; results.push(`PASS ${name}`); }
  else { fail++; results.push(`FAIL ${name} ${detail}`); }
}
const ENV = { ...process.env, USERPROFILE: SANDBOX, HOME: SANDBOX };
function cli(args) {
  try {
    const out = execFileSync("node", [CLI, ...args], { env: ENV, encoding: "utf-8" });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") };
  }
}
function guardRun(input = {}) {
  const inp = JSON.stringify({ cwd: CWD, ...input });
  const out = execFileSync("node", [GUARD], { input: inp, env: ENV, encoding: "utf-8" });
  return out.trim() ? JSON.parse(out) : null;
}
function stateFile(name) { return path.join(ACTIVE, `${name}.json`); }
function read(name) { return JSON.parse(fs.readFileSync(stateFile(name), "utf-8")); }

let crashed = null;
try {

// ST01 init 왕복 — 파일 생성, 스키마, tmp 잔여 0
let r = cli(["init", "proj-x-loop", "--mode", "loop", "--cwd", CWD, "--token", "t0"]);
const st0 = read("proj-x-loop");
check("ST01 init", r.code === 0 && st0.schema_version === 1 && st0.active === true && st0.mode === "loop" && st0.progress_token === "t0" && st0.exit_signal === null);
check("ST02 no tmp leftover", !fs.existsSync(stateFile("proj-x-loop") + ".tmp"));

// ST03 중복 init 거부
r = cli(["init", "proj-x-loop", "--mode", "loop", "--cwd", CWD]);
check("ST03 duplicate init rejected", r.code !== 0);

// ST04 잘못된 mode 거부
r = cli(["init", "bad", "--mode", "banana", "--cwd", CWD]);
check("ST04 bad mode rejected", r.code !== 0);

// ST05 tick — progress_token 갱신
r = cli(["tick", "proj-x-loop", "--token", "t1"]);
check("ST05 tick", r.code === 0 && read("proj-x-loop").progress_token === "t1");

// ST06 tick 토큰 누락 거부
r = cli(["tick", "proj-x-loop"]);
check("ST06 tick w/o token rejected", r.code !== 0);

// ST07 가드 상호운용 — active 상태는 block
let g = guardRun();
check("ST07 guard blocks active", g?.decision === "block");

// ST08 complete 필수 인자 — oracle 누락 거부
r = cli(["complete", "proj-x-loop", "--review", "approved"]);
check("ST08 complete w/o oracle rejected", r.code !== 0 && read("proj-x-loop").exit_signal === null);

// ST09 complete 필수 인자 — review 누락 거부
r = cli(["complete", "proj-x-loop", "--oracle", "green"]);
check("ST09 complete w/o review rejected", r.code !== 0 && read("proj-x-loop").exit_signal === null);

// ST10 complete 정상 — S2 계약 필드 기록, 가드 allow
r = cli(["complete", "proj-x-loop", "--oracle", "green", "--review", "approved"]);
const done = read("proj-x-loop");
check("ST10 complete", r.code === 0 && done.exit_signal === "completed" && done.oracle_status === "green" && done.review_status === "approved" && done.active === false);
check("ST11 guard allows after complete", guardRun() === null);

// ST12 block — 사유 필수, 신호 enum
r = cli(["init", "proj-x-sortie", "--mode", "sortie", "--cwd", CWD]);
const sortieInit = r.code === 0 && read("proj-x-sortie").mode === "sortie";
r = cli(["block", "proj-x-sortie"]);
const noReason = r.code !== 0;
r = cli(["block", "proj-x-sortie", "--signal", "bogus", "--reason", "x"]);
const badSignal = r.code !== 0;
r = cli(["block", "proj-x-sortie", "--signal", "cancelled", "--reason", "user cancel"]);
check("ST12 block contract", sortieInit && noReason && badSignal && r.code === 0 && read("proj-x-sortie").exit_signal === "cancelled");
check("ST13 guard allows after cancel", guardRun() === null);

// ST14 status 실행
r = cli(["status", "proj-x-loop"]);
check("ST14 status", r.code === 0 && r.out.includes("completed"));

} catch (e) {
  crashed = e;
} finally {
  fs.rmSync(SANDBOX, { recursive: true, force: true });
}

const realAfter = realLedgerSnapshot();
console.log(results.join("\n"));
if (realBefore !== realAfter) {
  console.log(`\nREAL LEDGER MUTATED:\n before=${realBefore}\n after=${realAfter}`);
  console.log(`\nTOTAL: ${pass} passed, ${fail + 1} failed`);
  process.exit(1);
}
if (crashed) {
  console.log(`\nCRASH: ${crashed.message}`);
  console.log(`\nTOTAL: ${pass} passed, ${fail + 1} failed`);
  process.exit(1);
}
console.log(`\nTOTAL: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
