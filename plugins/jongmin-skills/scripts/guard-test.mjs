// loop-stop-guard.mjs 구조적 테스트 배터리 — 전 결정 분기 커버
// 출력은 ASCII (cp949 콘솔 깨짐 방지)
// 격리: 자식 프로세스의 HOME/USERPROFILE을 mkdtemp 샌드박스로 치환 — 실장부를 건드리지 않는다 (§0.3)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const GUARD = path.join(path.dirname(fileURLToPath(import.meta.url)), "loop-stop-guard.mjs");
const SANDBOX = fs.mkdtempSync(path.join(os.tmpdir(), "guard-test-"));
const ACTIVE = path.join(SANDBOX, ".claude", "jongmin-ledgers", "active");
const HOOK_LOG = path.join(SANDBOX, ".claude", "jongmin-ledgers", "hook.log");
const CWD_WIN = "C:\\Users\\jongm\\proj-a";
const CWD_OTHER = "C:\\Users\\jongm\\proj-b";
// Windows에서 chmod는 읽기 전용 속성만 토글한다 — 저장 실패 주입/복구용 (T27~T30)
const MODE_READONLY = 0o444;
const MODE_WRITABLE = 0o666;

// 자기 침습 차단 단언용 — 실장부 스냅샷(이름+크기+mtime)을 실행 전에 고정
// 파일 수만 비교하면 내용 변경·동수 rename을 놓친다 (cx-s1 반영)
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
function reset() {
  fs.rmSync(ACTIVE, { recursive: true, force: true });
  fs.mkdirSync(ACTIVE, { recursive: true });
}
function state(name, over = {}) {
  const st = {
    schema_version: 1, active: true, mode: "loop", cwd: CWD_WIN,
    owner_session_id: "s1", started_at: new Date().toISOString(),
    deadline_epoch_ms: Date.now() + 4 * 3600 * 1000,
    max_iterations: 50, iteration: 0, no_progress_limit: 3,
    progress_token: "tok-0", exit_signal: null, ...over,
  };
  fs.writeFileSync(path.join(ACTIVE, name), JSON.stringify(st));
  return st;
}
function run(input = {}) {
  const inp = JSON.stringify({ cwd: CWD_WIN, session_id: "s1", ...input });
  const out = execFileSync("node", [GUARD], { input: inp, env: { ...process.env, USERPROFILE: SANDBOX, HOME: SANDBOX }, encoding: "utf-8" });
  return out.trim() ? JSON.parse(out) : null;
}
function read(name) { return JSON.parse(fs.readFileSync(path.join(ACTIVE, name), "utf-8")); }
function exists(name) { return fs.existsSync(path.join(ACTIVE, name)); }
function raw(name) { return fs.readFileSync(path.join(ACTIVE, name), "utf-8"); }
// hook.log는 reset()이 지우지 않고 누적된다 — 실행 전후 줄 수 차이로 새 줄만 본다
function logLines() {
  try { return fs.readFileSync(HOOK_LOG, "utf-8").split("\n").filter(Boolean); } catch { return []; }
}

// 예외가 나도 샌드박스 정리와 실장부 게이트가 반드시 돈다 (cx-s1 반영)
let crashed = null;
try {

// T01 상태 없음 -> allow
reset();
check("T01 no-state allow", run() === null);

// T02 활성+일치 -> block, iteration 증가
reset(); state("a.json");
let r = run();
check("T02 block", r?.decision === "block" && /jongmin-loop/.test(r.reason));
check("T03 iteration++", read("a.json").iteration === 1);

// T04 progress_token 갱신 시 no_progress 리셋
reset(); state("a.json", { progress_token: "tok-1" });
run(); // seen tok-1
let st = read("a.json"); st.progress_token = "tok-2"; fs.writeFileSync(path.join(ACTIVE, "a.json"), JSON.stringify(st));
run();
check("T04 progress reset", read("a.json").no_progress_count === 0);

// T05 토큰 무변화 -> 리밋 도달 시 .stale 은퇴
reset(); state("a.json");
run(); run(); run(); run();
check("T05 no-progress retire", !exists("a.json") && exists("a.json.stale"));
check("T06 stale exit_signal", JSON.parse(fs.readFileSync(path.join(ACTIVE, "a.json.stale"), "utf-8")).exit_signal === "stalled");

// T07 은퇴 후 allow
check("T07 post-retire allow", run() === null);

// T08 데드라인 경과 -> 은퇴
reset(); state("a.json", { deadline_epoch_ms: Date.now() - 1000 });
check("T08 deadline retire", run() === null && exists("a.json.stale"));

// T09 max_iterations 초과 -> 은퇴
reset(); state("a.json", { iteration: 50 });
check("T09 max-iter retire", run() === null && exists("a.json.stale"));

// T10 completed + 두 필드 -> allow (정상 완료 경로 — S2 계약)
reset(); state("a.json", { exit_signal: "completed", oracle_status: "green", review_status: "approved" });
check("T10 completed allow", run() === null && exists("a.json"));

// T11 active:false -> allow (+상태 무변조 — allow 경로의 조용한 mutate 탐지, cx-s1 반영)
reset(); state("a.json", { active: false });
let snap = raw("a.json");
check("T11 inactive allow", run() === null && raw("a.json") === snap && !exists("a.json.stale"));

// T12 cwd 불일치 -> allow (타 프로젝트 오염 방지)
reset(); state("a.json", { cwd: CWD_OTHER });
check("T12 cwd-mismatch allow", run() === null && read("a.json").iteration === 0);

// T13 세션 불일치 -> allow (+무변조)
reset(); state("a.json");
snap = raw("a.json");
check("T13 session-mismatch allow", run({ session_id: "s2" }) === null && raw("a.json") === snap);

// T14 schema 불일치 -> allow (+무변조)
reset(); state("a.json", { schema_version: 99 });
snap = raw("a.json");
check("T14 schema-mismatch allow", run() === null && raw("a.json") === snap);

// T15 손상 JSON -> allow, 크래시 없음 (+파일 보존)
reset(); fs.writeFileSync(path.join(ACTIVE, "bad.json"), "{corrupt");
check("T15 corrupt allow", run() === null && raw("bad.json") === "{corrupt");

// T16 started_at 24h 초과 -> 은퇴
reset(); state("a.json", { started_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString() });
check("T16 stale-24h retire", run() === null && exists("a.json.stale"));

// T17 sortie 모드 메시지
reset(); state("a.json", { mode: "sortie" });
r = run();
check("T17 sortie message", r?.decision === "block" && /jongmin-sortie/.test(r.reason));

// T18 atomic write 잔여물 없음 (pid 포함 고유 tmp명 포함 전수 검사)
reset(); state("a.json"); run();
check("T18 no tmp leftover", !fs.readdirSync(ACTIVE).some((f) => f.includes(".tmp")));

// T19 E2E 시나리오: block(진행) -> block(진행) -> 완료 기록 -> allow
reset(); state("a.json", { progress_token: "c1" });
r = run(); const b1 = r?.decision === "block";
st = read("a.json"); st.progress_token = "c2"; fs.writeFileSync(path.join(ACTIVE, "a.json"), JSON.stringify(st));
r = run(); const b2 = r?.decision === "block";
st = read("a.json"); st.exit_signal = "completed"; st.oracle_status = "green"; st.review_status = "approved";
fs.writeFileSync(path.join(ACTIVE, "a.json"), JSON.stringify(st));
check("T19 e2e block->block->complete->allow", b1 && b2 && run() === null);

// T20 stop_hook_active여도 계속 차단 (기각한 통설 방어의 회귀 테스트)
reset(); state("a.json", { progress_token: "x1" });
run();
st = read("a.json"); st.progress_token = "x2"; fs.writeFileSync(path.join(ACTIVE, "a.json"), JSON.stringify(st));
r = run({ stop_hook_active: true });
check("T20 block despite stop_hook_active", r?.decision === "block");

// T21~T23 빈 completed 되밀기 — oracle_status/review_status 없는 완료 선언은 block (S2 계약)
reset(); state("a.json", { exit_signal: "completed", oracle_status: "green" });
r = run();
check("T21 completed w/o review_status block", r?.decision === "block");

reset(); state("a.json", { exit_signal: "completed", review_status: "approved" });
r = run();
check("T22 completed w/o oracle_status block", r?.decision === "block");

reset(); state("a.json", { exit_signal: "completed" });
r = run();
check("T23 completed w/o fields block", r?.decision === "block");

// T24 cancelled -> allow (취소 경로 보존 — completed 외 truthy exit_signal은 전부 통과)
reset(); state("a.json", { exit_signal: "cancelled" });
snap = raw("a.json");
check("T24 cancelled allow", run() === null && raw("a.json") === snap);

// T25 빈 completed 반복 -> 백스톱 은퇴 시 stalled로 정정 기록, 이후 allow (cx-s2 반영 —
// 정정 없으면 .stale에 exit_signal:"completed"가 남아 허위 완료 기록이 된다)
reset(); state("a.json", { exit_signal: "completed" });
run(); run(); run(); run();
const staleFile = path.join(ACTIVE, "a.json.stale");
const staleSt = fs.existsSync(staleFile) ? JSON.parse(fs.readFileSync(staleFile, "utf-8")) : null;
check("T25 empty-completed retires as stalled", staleSt?.exit_signal === "stalled" && staleSt?.stale_reason === "no-progress" && run() === null);

// T26 active:false로 쓴 빈 completed도 되민다 — 게이트 우회 차단 (cx-s3 반영)
reset(); state("a.json", { active: false, exit_signal: "completed" });
r = run();
check("T26 inactive empty-completed still blocked", r?.decision === "block");

// T27~T30 장부 저장 실패 -> 차단하지 않고 허용(fail-open) + hook.log 관측 (D8)
// 저장이 실패하면 iteration이 디스크에 오르지 않아 max_iterations 은퇴가 영원히 오지 않는다.
// 주입: 대상 .json에 읽기 전용 속성을 걸면 readFileSync/tmp 쓰기는 성공하고
// renameSync(tmp, file)만 EPERM으로 실패한다 — 프로덕션 코드에 훅을 넣지 않는 유일한 경로.
reset(); state("a.json");
const wfFile = path.join(ACTIVE, "a.json");
fs.chmodSync(wfFile, MODE_READONLY);
snap = raw("a.json");
const logBefore = logLines().length;
const wfOut = run();
const wfLines = logLines().slice(logBefore);
check("T27 write-fail allow", wfOut === null, `got=${JSON.stringify(wfOut)}`);
check("T28 write-fail ledger intact", raw("a.json") === snap && !exists("a.json.stale"));
check("T29 write-fail logged once with cause",
  wfLines.filter((l) => /write-fail a\.json: \S/.test(l)).length === 1, `lines=${wfLines.join(" | ")}`);
// 반복 호출해도 계속 allow — 저장 불능 상태에서 매 Stop이 차단되던 D8의 핵심
check("T30 write-fail stays allow on repeat", run() === null && run() === null);
fs.chmodSync(wfFile, MODE_WRITABLE); // 샌드박스 정리 전 속성 복구

} catch (e) {
  crashed = e;
} finally {
  // 크래시 경로에서도 반드시 실행 — 잔여물·실장부 게이트 스킵 방지 (cx-s1 반영)
  fs.rmSync(SANDBOX, { recursive: true, force: true });
}

// 자기 침습 차단 단언 (check 수에 포함하지 않는 하드 게이트)
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
