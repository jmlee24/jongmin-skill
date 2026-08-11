#!/usr/bin/env node
// jongmin-loop/sortie Stop 가드 — 미완료 상태의 자의적 턴 종료를 되민다.
// 상태 파일이 없으면 전 세션 no-op. 무한 차단 방어는 stop_hook_active가 아니라
// 백스톱(반복 상한·no-progress·데드라인)이 담당한다 — 플래그로 allow하면 2번째 반복에서 루프가 죽는다.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ACTIVE_DIR = path.join(os.homedir(), ".claude", "jongmin-ledgers", "active");
const LOG = path.join(os.homedir(), ".claude", "jongmin-ledgers", "hook.log");
const SCHEMA_VERSION = 1;
const STALE_MS = 24 * 3600 * 1000;
// 알려진 종료 신호 — 미지의 truthy 신호도 allow하되(취소 경로 보존 계약) 로그로 관측한다
const KNOWN_SIGNALS = ["completed", "blocked", "failed", "cancelled", "stalled"];

function log(msg) {
  try { fs.appendFileSync(LOG, `${new Date().toISOString()} ${msg}\n`); } catch {}
}
function norm(p) {
  let s = String(p || "");
  const msys = s.match(/^\/([a-zA-Z])\//); // Git Bash 경로(/c/...)와 Windows 경로(C:\...) 통일
  if (msys) s = msys[1] + ":/" + s.slice(3);
  try { s = fs.realpathSync.native(s); } catch {}
  return s.toLowerCase().replace(/\\/g, "/");
}
function writeState(file, st) {
  // pid 포함 고유 tmp명 — 가드와 CLI가 같은 tmp를 동시에 쓰는 충돌 차단 (cx-s3)
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(st, null, 2));
  fs.renameSync(tmp, file);
}
function retire(file, st, reason) {
  try {
    st.active = false;
    // 빈 completed(필수 필드 누락)는 완료로 기록될 수 없다 — 백스톱 은퇴 시 stalled로 정정 (cx-s2)
    if (!st.exit_signal) st.exit_signal = "stalled";
    else if (st.exit_signal === "completed" && !(st.oracle_status && st.review_status)) st.exit_signal = "stalled";
    st.stale_reason = reason;
    st.updated_at = new Date().toISOString();
    writeState(file, st);
    fs.renameSync(file, file + ".stale");
  } catch {}
  log(`retire ${path.basename(file)}: ${reason}`);
}

let input = {};
try { input = JSON.parse(fs.readFileSync(0, "utf-8") || "{}"); } catch { process.exit(0); }

let files = [];
try { files = fs.readdirSync(ACTIVE_DIR).filter((f) => f.endsWith(".json")); }
catch { process.exit(0); }

const cwd = norm(input.cwd || process.cwd());

for (const name of files) {
  const file = path.join(ACTIVE_DIR, name);
  let st;
  try { st = JSON.parse(fs.readFileSync(file, "utf-8")); }
  catch { log(`parse-fail ${name} -> allow`); continue; }

  if (st.schema_version !== SCHEMA_VERSION) continue;
  // 빈 completed(필수 필드 누락)는 active 여부와 무관하게 되민다 — active:false로 쓰면
  // 게이트를 우회하던 구멍 차단 (cx-s3). completed만 게이트, 그 외 truthy exit_signal
  // (blocked/failed/cancelled/stalled 등)은 전부 allow — 취소 경로 보존 (PRD S2 확정 문언).
  const emptyCompleted = st.exit_signal === "completed" && !(st.oracle_status && st.review_status);
  if (emptyCompleted) {
    log(`reject-completed ${name}: oracle_status/review_status missing`);
    // 통과시키지 않고 아래 block 경로로 떨어뜨린다 — 빈 completed 되밀기
  } else {
    if (st.active !== true) continue;
    if (st.exit_signal) {
      if (!KNOWN_SIGNALS.includes(st.exit_signal)) log(`unknown-exit-signal ${name}: ${st.exit_signal}`);
      continue;
    }
  }
  if (norm(st.cwd) !== cwd) continue;
  if (st.owner_session_id && input.session_id && st.owner_session_id !== input.session_id) continue;

  const now = Date.now();
  const started = Date.parse(st.started_at || "") || 0;
  if (!started || now - started > STALE_MS) { retire(file, st, "stale-24h"); continue; }
  if (st.deadline_epoch_ms && now > st.deadline_epoch_ms) { retire(file, st, "deadline"); continue; }

  const max = st.max_iterations || 50;
  st.iteration = (st.iteration || 0) + 1;
  if (st.iteration > max) { retire(file, st, "max-iterations"); continue; }

  // no-progress 백스톱: 차단 사이에 progress_token이 안 변하면 카운트, 한도 도달 시 은퇴
  if (st.progress_token != null && st.progress_token === st.last_seen_token) {
    st.no_progress_count = (st.no_progress_count || 0) + 1;
  } else {
    st.no_progress_count = 0;
  }
  st.last_seen_token = st.progress_token ?? null;
  if (st.no_progress_count >= (st.no_progress_limit || 3)) { retire(file, st, "no-progress"); continue; }

  st.updated_at = new Date().toISOString();
  try { writeState(file, st); } catch { log(`write-fail ${name}`); }

  const reason = st.mode === "sortie"
    ? `[jongmin-sortie 가드 ${st.iteration}/${max}] 데드라인 전 자의적 정지 금지. 유예 장부 규칙(보수 기본값+4요소 기록, 중대 판단은 CX 반박 자문 공동)으로 전진하라. 데드라인 도달 또는 전 갈래 보류 상태면 귀환 보고를 작성하고 state 파일에 exit_signal을 기록한 뒤 정지하라 (completed면 oracle_status·review_status 동반 기록 필수 — 없으면 가드가 계속 되민다).`
    : `[jongmin-loop 가드 ${st.iteration}/${max}] 완료 조건 미달성 상태의 정지 금지. 장부의 미완료 태스크를 계속 진행하고 매 반복 state의 progress_token(마지막 커밋 해시 또는 태스크 ID)을 갱신하라. 이중 종료 게이트(장부 완료 AND 독립 판정) 통과 후에만 exit_signal="completed"를 oracle_status·review_status와 함께 기록하고 정지하라 (두 필드 없는 completed는 가드가 되민다). 진행 불능이면 exit_signal="blocked"|"failed" + exit_reason 기록 후 정지하라. 질문 금지 — 판단 필요 시 보수 기본값 + 유예 장부.`;

  log(`block ${name} iter=${st.iteration}/${max} stop_hook_active=${!!input.stop_hook_active}`);
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
  process.exit(0);
}
process.exit(0);
