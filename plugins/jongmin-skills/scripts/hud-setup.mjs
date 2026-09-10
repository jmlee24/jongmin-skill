#!/usr/bin/env node
// jongmin-skills HUD 설치기 — /jongmin-skills:hud-setup 이 실행한다.
//
//   node hud-setup.mjs            설치: 래퍼 생성 + settings.json statusLine 등록 + 렌더 테스트
//   node hud-setup.mjs --check    현재 상태만 출력 (변경 없음) — 정상 0 / 미설치·렌더 실패 1
//   node hud-setup.mjs --uninstall  statusLine 제거 + 래퍼 삭제 (설정 백업은 남긴다)
//   그 밖의 인자는 사용법만 출력하고 종료 코드 2 — 아무것도 쓰지 않는다
//
// 왜 래퍼가 필요한가: 플러그인은 statusLine을 설정할 수 없고, 플러그인 캐시 경로에는 버전이
// 박혀 있어(…/jongmin-skills/1.10.0/…) autoUpdate마다 경로가 바뀐다. settings.json은 버전이
// 없는 고정 경로(<configDir>/hud/jongmin-hud.mjs)를 가리키고, 래퍼가 매 실행마다 최신 버전
// 디렉터리의 usage-hud.mjs를 찾아 import한다.
//
// 출력 판정 문자열은 ASCII — 콘솔 cp949에서 한글이 깨지는 환경 대비.

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(SCRIPT_DIR, "..");
const RENDERER_REL = "scripts/usage-hud.mjs";
const RENDER_TEST_TIMEOUT_MS = 10_000;
const EXIT_OK = 0;
const EXIT_FAIL = 1;
// 미인식 인자는 설치 실패(1)와 구분한다 — 호출부가 오타를 즉시 알아채도록
const EXIT_USAGE = 2;
const ALLOWED_FLAGS = new Set(["--check", "--uninstall"]);

const configDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
const settingsPath = join(configDir, "settings.json");
const wrapperPath = join(configDir, "hud", "jongmin-hud.mjs");
const nodePath = process.execPath;

const argv = process.argv.slice(2);
// 오타·잘못된 형태(맨 check 등)가 인자 없음으로 흘러 설치(쓰기)로 폴백하면 사용자 설정이 재기록된다
const unknownArgs = argv.filter((a) => !ALLOWED_FLAGS.has(a));
const args = new Set(argv);
const mode = args.has("--uninstall") ? "uninstall" : args.has("--check") ? "check" : "install";

function printUsage() {
  console.log("usage:");
  console.log("  node hud-setup.mjs              install wrapper + settings.json statusLine");
  console.log("  node hud-setup.mjs --check      report current state only (no writes)");
  console.log("  node hud-setup.mjs --uninstall  remove managed statusLine + wrapper");
}

function toPosix(p) {
  return p.replace(/\\/g, "/");
}

function statusLineCommand() {
  return `"${nodePath}" "${toPosix(wrapperPath)}"`;
}

function readSettings() {
  if (!existsSync(settingsPath)) return {};
  // 파싱 실패는 치명 — 깨진 설정을 덮어쓰면 사용자 설정이 통째로 사라진다. BOM만 관용.
  const parsed = JSON.parse(readFileSync(settingsPath, "utf-8").replace(/^\uFEFF/, ""));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("settings.json is not a JSON object");
  return parsed;
}

// node 경로가 바뀌어도(업그레이드·nvm) 우리 래퍼를 가리키면 관리 대상으로 본다.
// 따옴표까지 포함한 토큰으로 비교 — 접미사가 붙은 다른 경로(…mjs.custom)의 오탐 방지 (CX#2)
function isManaged(statusLine) {
  return typeof statusLine?.command === "string" && statusLine.command.includes(`"${toPosix(wrapperPath)}"`);
}

function backupSettings() {
  if (!existsSync(settingsPath)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${settingsPath}.bak-hud-${stamp}`;
  copyFileSync(settingsPath, backupPath);
  return backupPath;
}

function writeSettings(settings) {
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}

function wrapperSource() {
  // FALLBACK: 설치 시점의 플러그인 루트 — 캐시에 버전 디렉터리가 없을 때(로컬 clone 개발 등) 사용
  return `#!/usr/bin/env node
// jongmin-skills HUD 래퍼 — hud-setup.mjs가 생성한다. 손 편집 금지 (재설치 시 덮어씀).
// 최신 플러그인 버전 디렉터리의 ${RENDERER_REL}를 찾아 실행한다.
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
const CACHE_ROOT = join(CONFIG_DIR, "plugins", "cache", "jongmin-skill", "jongmin-skills");
const FALLBACK_ROOT = ${JSON.stringify(toPosix(PLUGIN_ROOT))};
const RENDERER_REL = ${JSON.stringify(RENDERER_REL)};

// "1.11.0-beta.2" → 숫자부 [1,11,0] + 프리릴리스 플래그. 같은 숫자면 정식(플래그 없음)이 앞선다 (CX#4)
function versionKey(name) {
  const [core, pre] = name.split("-", 2);
  return { nums: core.split(".").map((n) => Number.parseInt(n, 10) || 0), pre: pre !== undefined };
}
function compareVersionDesc(a, b) {
  const ka = versionKey(a), kb = versionKey(b);
  for (let i = 0; i < Math.max(ka.nums.length, kb.nums.length); i++) {
    const d = (kb.nums[i] ?? 0) - (ka.nums[i] ?? 0);
    if (d !== 0) return d;
  }
  return (ka.pre ? 1 : 0) - (kb.pre ? 1 : 0);
}
function rendererCandidates() {
  const out = [];
  try {
    const versions = readdirSync(CACHE_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort(compareVersionDesc);
    for (const v of versions) {
      const p = join(CACHE_ROOT, v, RENDERER_REL);
      if (existsSync(p)) out.push(p);
    }
  } catch {
    // 캐시 없음 → FALLBACK
  }
  const fallback = join(FALLBACK_ROOT, RENDERER_REL);
  if (existsSync(fallback)) out.push(fallback);
  return out;
}

// autoUpdate가 새 버전을 쓰는 도중이면 최신 디렉터리의 렌더러가 손상·부분 기록일 수 있다.
// 해석·구문 단계 실패만 다음 후보로 넘긴다 — 평가 단계 오류는 렌더러가 이미 출력했을 수 있어
// 재시도하면 상태줄이 두 번 그려진다 (import 성공 = 종료).
function isLoadFailure(err) {
  return err instanceof SyntaxError || err?.code === "ERR_MODULE_NOT_FOUND" || err?.code === "ENOENT";
}

let rendered = false;
for (const target of rendererCandidates()) {
  try {
    await import(pathToFileURL(target).href);
    rendered = true;
    break;
  } catch (err) {
    if (!isLoadFailure(err)) {
      rendered = true;
      break;
    }
  }
}
// statusline은 어떤 경우에도 비정상 종료하지 않는다
if (!rendered) {
  process.stdout.write("jongmin-hud: renderer not found (reinstall: /jongmin-skills:hud-setup)\\n");
}
`;
}

function renderTest(env = {}) {
  const sample = JSON.stringify({
    version: "2.1.0",
    model: { display_name: "RenderTest" },
    context_window: { used_percentage: 42 },
    rate_limits: {
      five_hour: { used_percentage: 21, resets_at: Math.floor(Date.now() / 1000) + 3 * 3600 },
      seven_day: { used_percentage: 46, resets_at: Math.floor(Date.now() / 1000) + 30 * 3600 },
    },
  });
  const r = spawnSync(nodePath, [wrapperPath], {
    input: sample,
    encoding: "utf-8",
    timeout: RENDER_TEST_TIMEOUT_MS,
    env: { ...process.env, ...env },
  });
  return { ok: r.status === 0 && /21%/.test(r.stdout) && /42%/.test(r.stdout), stdout: r.stdout, stderr: r.stderr };
}

function printState(settings) {
  const current = settings.statusLine;
  console.log(`config dir : ${configDir}`);
  console.log(`wrapper    : ${wrapperPath} ${existsSync(wrapperPath) ? "(present)" : "(missing)"}`);
  console.log(`statusLine : ${current ? JSON.stringify(current) : "(none)"}`);
  console.log(`managed    : ${isManaged(current) ? "yes (jongmin-hud)" : "no"}`);
}

function install() {
  const settings = readSettings();
  const previous = settings.statusLine;
  const desired = { type: "command", command: statusLineCommand() };

  mkdirSync(dirname(wrapperPath), { recursive: true });
  writeFileSync(wrapperPath, wrapperSource());
  console.log(`WROTE wrapper ${wrapperPath}`);

  if (previous && JSON.stringify(previous) !== JSON.stringify(desired)) {
    console.log(`REPLACED previous statusLine: ${JSON.stringify(previous)}`);
  }
  const backup = backupSettings();
  if (backup) console.log(`BACKUP ${backup}`);
  settings.statusLine = desired;
  writeSettings(settings);
  console.log(`SET statusLine.command = ${desired.command}`);

  const t = renderTest();
  console.log(`RENDER ${t.ok ? "OK" : "FAIL"}: ${t.stdout.trim()}`);
  if (!t.ok && t.stderr) console.log(t.stderr.trim());
  console.log(t.ok ? "DONE - restart Claude Code (or open a new session) to see the HUD" : "DONE WITH ERRORS");
  return t.ok ? EXIT_OK : EXIT_FAIL;
}

function uninstall() {
  const settings = readSettings();
  if (isManaged(settings.statusLine)) {
    const backup = backupSettings();
    if (backup) console.log(`BACKUP ${backup}`);
    delete settings.statusLine;
    writeSettings(settings);
    console.log("REMOVED statusLine");
  } else {
    console.log("SKIP statusLine: not managed by jongmin-hud (left untouched)");
  }
  if (existsSync(wrapperPath)) {
    unlinkSync(wrapperPath);
    console.log(`REMOVED wrapper ${wrapperPath}`);
  }
  console.log("DONE");
  return EXIT_OK;
}

// 종료 코드로 설치 상태를 알린다 — 스크립트로 점검할 때 stdout 파싱이 필요 없도록
function check() {
  const settings = readSettings();
  printState(settings);
  const wrapperPresent = existsSync(wrapperPath);
  let renderOk = false;
  if (wrapperPresent) {
    const t = renderTest();
    renderOk = t.ok;
    console.log(`RENDER ${t.ok ? "OK" : "FAIL"}: ${t.stdout.trim()}`);
  }
  const problems = [];
  if (!wrapperPresent) problems.push("wrapper missing");
  if (!isManaged(settings.statusLine)) problems.push("statusLine not managed");
  if (wrapperPresent && !renderOk) problems.push("render failed");
  console.log(problems.length ? `STATUS FAIL: ${problems.join(", ")}` : "STATUS OK");
  return problems.length ? EXIT_FAIL : EXIT_OK;
}

if (unknownArgs.length) {
  console.log(`UNRECOGNIZED ARGUMENT: ${unknownArgs.join(" ")}`);
  printUsage();
  process.exit(EXIT_USAGE);
}

try {
  const code = mode === "install" ? install() : mode === "uninstall" ? uninstall() : check();
  process.exit(code);
} catch (e) {
  console.log(`ERROR ${e?.message ?? e}`);
  process.exit(EXIT_FAIL);
}
