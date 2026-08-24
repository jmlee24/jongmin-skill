#!/usr/bin/env node
// loop/sortie 상태 파일 CLI — 손 JSON 편집을 대체해 스키마 위반을 원천 차단한다.
// 가드(loop-stop-guard.mjs)와 같은 경로 규약·atomic 쓰기(tmp+rename)를 쓴다.
// 사용법:
//   loop-state.mjs init <name> --mode loop|sortie --cwd <abs> [--deadline-h N] [--max-iter N] [--session <id>] [--token <t>]
//   loop-state.mjs tick <name> --token <progress_token>
//   loop-state.mjs complete <name> --oracle <status> --review <status> [--reason <txt>]
//   loop-state.mjs block <name> [--signal blocked|failed|cancelled] --reason <txt>
//   loop-state.mjs status [name]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ACTIVE_DIR = path.join(os.homedir(), ".claude", "jongmin-ledgers", "active");
const SCHEMA_VERSION = 1;
const DEFAULT_MAX_ITERATIONS = 50;
const DEFAULT_NO_PROGRESS_LIMIT = 3;
const DEFAULT_DEADLINE_H = { loop: 4, sortie: 2 };
const MAX_DEADLINE_H = 8;
const BLOCK_SIGNALS = ["blocked", "failed", "cancelled"];

function die(msg) { console.error(`ERROR: ${msg}`); process.exit(1); }
function fileOf(name) {
  if (!/^[A-Za-z0-9._-]+$/.test(name)) die(`invalid name: ${name}`);
  return path.join(ACTIVE_DIR, name.endsWith(".json") ? name : `${name}.json`);
}
function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith("--")) die(`unexpected arg: ${argv[i]}`);
    const val = argv[i + 1];
    // 값 자리에 다음 플래그가 오면 거부 — "--reason --signal" 류 인자 흡수 차단 (cx-s3)
    if (val === undefined || val.startsWith("--")) die(`missing value for ${argv[i]}`);
    opts[argv[i].slice(2)] = val;
  }
  return opts;
}
function writeState(file, st) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // pid 포함 고유 tmp명 — 가드와의 동시 쓰기 충돌 차단 (cx-s3)
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(st, null, 2));
  fs.renameSync(tmp, file);
}
function readState(file) {
  if (!fs.existsSync(file)) die(`state not found: ${file}`);
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); }
  catch { die(`corrupt state: ${file}`); }
}

const [cmd, name, ...rest] = process.argv.slice(2);
const opts = parseArgs(rest);

if (cmd === "init") {
  if (!name) die("init requires <name>");
  const mode = opts.mode;
  if (mode !== "loop" && mode !== "sortie") die("init requires --mode loop|sortie");
  if (!opts.cwd) die("init requires --cwd <abs path>");
  // 상대경로·부재 경로면 가드의 cwd 매칭이 실패해 Stop 가드가 조용히 비활성화된다 (cx-s3)
  if (!path.isAbsolute(opts.cwd)) die(`--cwd must be absolute: ${opts.cwd}`);
  if (!fs.existsSync(opts.cwd)) die(`--cwd does not exist: ${opts.cwd}`);
  const deadlineH = Math.min(Number(opts["deadline-h"] || DEFAULT_DEADLINE_H[mode]), MAX_DEADLINE_H);
  if (!(deadlineH > 0)) die("invalid --deadline-h");
  const st = {
    schema_version: SCHEMA_VERSION, active: true, mode,
    cwd: opts.cwd, started_at: new Date().toISOString(),
    deadline_epoch_ms: Date.now() + deadlineH * 3600 * 1000,
    max_iterations: Number(opts["max-iter"] || DEFAULT_MAX_ITERATIONS),
    iteration: 0, no_progress_limit: DEFAULT_NO_PROGRESS_LIMIT,
    progress_token: opts.token || null, exit_signal: null,
  };
  if (opts.session) st.owner_session_id = opts.session;
  const file = fileOf(name);
  if (fs.existsSync(file)) {
    // 종료된(비활성) 상태 파일은 재init을 막지 않는다 — .stale로 격리 후 진행
    // (실측 2026-08-24: complete 잔존물이 같은 이름 재init을 차단). 활성 루프는 계속 보호.
    let prev = null;
    try { prev = JSON.parse(fs.readFileSync(file, "utf8")); } catch { /* 손상 파일도 stale 격리 */ }
    if (prev && prev.active) die(`already exists: ${file} (cancel or complete it first)`);
    fs.renameSync(file, file.replace(/\.json$/, `.stale-${Date.now()}.json`));
  }
  writeState(file, st);
  console.log(`OK init ${file}`);
} else if (cmd === "tick") {
  if (!name) die("tick requires <name>");
  if (!opts.token) die("tick requires --token <progress_token>");
  const file = fileOf(name);
  const st = readState(file);
  st.progress_token = opts.token;
  st.updated_at = new Date().toISOString();
  writeState(file, st);
  console.log(`OK tick ${opts.token}`);
} else if (cmd === "complete") {
  if (!name) die("complete requires <name>");
  // S2 계약: completed는 두 필드 없이는 가드를 통과하지 못한다 — CLI가 필수 인자로 강제
  if (!opts.oracle) die("complete requires --oracle <status> (S2 contract)");
  if (!opts.review) die("complete requires --review <status> (S2 contract)");
  const file = fileOf(name);
  const st = readState(file);
  st.active = false;
  st.exit_signal = "completed";
  st.oracle_status = opts.oracle;
  st.review_status = opts.review;
  if (opts.reason) st.exit_reason = opts.reason;
  st.updated_at = new Date().toISOString();
  writeState(file, st);
  console.log("OK complete");
} else if (cmd === "block") {
  if (!name) die("block requires <name>");
  const signal = opts.signal || "blocked";
  if (!BLOCK_SIGNALS.includes(signal)) die(`--signal must be one of: ${BLOCK_SIGNALS.join("|")}`);
  if (!opts.reason) die("block requires --reason <txt>");
  const file = fileOf(name);
  const st = readState(file);
  st.active = false;
  st.exit_signal = signal;
  st.exit_reason = opts.reason;
  st.updated_at = new Date().toISOString();
  writeState(file, st);
  console.log(`OK block ${signal}`);
} else if (cmd === "status") {
  if (name) {
    console.log(JSON.stringify(readState(fileOf(name)), null, 2));
  } else {
    let files = [];
    try { files = fs.readdirSync(ACTIVE_DIR).filter((f) => f.endsWith(".json")); } catch {}
    if (!files.length) { console.log("(no active states)"); }
    for (const f of files) {
      try {
        const st = JSON.parse(fs.readFileSync(path.join(ACTIVE_DIR, f), "utf-8"));
        console.log(`${f}: mode=${st.mode} active=${st.active} iter=${st.iteration}/${st.max_iterations} exit=${st.exit_signal ?? "-"}`);
      } catch { console.log(`${f}: (corrupt)`); }
    }
  }
} else {
  die("usage: loop-state.mjs <init|tick|complete|block|status> <name> [options]");
}
