#!/usr/bin/env node
// hud 회귀 테스트 — validate.mjs check2가 실행한다. 네트워크 없이(JONGMIN_HUD_NO_API=1) 돈다.
//   1) usage-hud.mjs: 정상 stdin / 빈 stdin / 깨진 JSON / rate_limits 없음 / 캐시된 모델 버킷
//      → 항상 exit 0, 값 반영
//   2) hud-setup.mjs: 격리 CLAUDE_CONFIG_DIR에서 install → check → uninstall 왕복,
//      다른 설정 키 보존·백업 생성·래퍼 생성/삭제·비관리 statusLine 보존 확인
//      + 미인식 인자 거부(exit 2, 무기록) / --check 종료 코드 / 래퍼의 손상 렌더러 폴백
// 판정 문자열은 ASCII.

import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const RENDERER = resolve(SCRIPT_DIR, "usage-hud.mjs");
const SETUP = resolve(SCRIPT_DIR, "hud-setup.mjs");
// hud-setup.mjs가 미인식 인자에 쓰는 종료 코드 (설치 실패 1과 구분한다)
const EXIT_USAGE = 2;

let failures = 0;
function pass(msg) { console.log(`PASS [hud] ${msg}`); }
function fail(msg) { failures++; console.log(`FAIL [hud] ${msg}`); }
function expect(cond, msg) { (cond ? pass : fail)(msg); }

const isoDir = mkdtempSync(join(tmpdir(), "jongmin-hud-test-"));
const cacheDir = join(isoDir, "cache");
const codexHome = join(isoDir, "codex-home");
const env = { ...process.env, CLAUDE_CONFIG_DIR: isoDir, CODEX_HOME: codexHome, JONGMIN_HUD_NO_API: "1", JONGMIN_HUD_CACHE_DIR: cacheDir };

function run(script, args, input) {
  return spawnSync(process.execPath, [script, ...args], { input, encoding: "utf-8", env, timeout: 15_000 });
}

// --- 1) 렌더러 ---
const nowSec = Math.floor(Date.now() / 1000);
const sample = JSON.stringify({
  version: "2.1.0",
  model: { display_name: "Fable 5.1" },
  effort: { level: "high" },
  context_window: { used_percentage: 9 },
  rate_limits: {
    five_hour: { used_percentage: 21, resets_at: nowSec + 3 * 3600 + 90 },
    seven_day: { used_percentage: 46, resets_at: nowSec + 30 * 3600 + 90 },
  },
});
let r = run(RENDERER, [], sample);
expect(r.status === 0, "renderer exits 0 on normal stdin");
expect(/Fable 5\.1/.test(r.stdout), "renderer shows model name");
expect(/Fable 5\.1\x1b\[0m \x1b\[2mhigh/.test(r.stdout), "renderer shows effort level next to model");
expect(/5h.*21%.*\(3h1m\)/.test(r.stdout), "renderer shows 5h gauge with reset countdown");
expect(/wk\x1b\[0m \[.*46%.*\(1d6h\)/.test(r.stdout), "renderer shows weekly gauge with day countdown");
expect(/ctx.*9%/.test(r.stdout), "renderer shows ctx gauge");
expect(r.stdout.trim().split("\n").length === 1, "renderer prints one line when no codex data");
expect(/^.*Fable 5\.1.*5h.*wk.*ctx.*9%/.test(r.stdout.split("\n")[0]), "renderer puts model, claude gauges and ctx on line 1");

r = run(RENDERER, [], "");
expect(r.status === 0 && r.stdout.length > 0, "renderer exits 0 with output on empty stdin");
r = run(RENDERER, [], "{not json");
expect(r.status === 0 && r.stdout.length > 0, "renderer exits 0 with output on invalid JSON");
r = run(RENDERER, [], JSON.stringify({ model: { display_name: "X" }, context_window: { used_percentage: 91 } }));
expect(r.status === 0 && /^\x1b\[36mX\x1b\[0m\x1b\[2m \| \x1b\[0m\x1b\[2mctx/.test(r.stdout) && /ctx.*91%/.test(r.stdout) && !/5h/.test(r.stdout), "renderer omits rate gauges and effort when absent");

// API 차단 상태에서도 캐시된 모델 버킷은 표시한다 (실패 시 마지막 성공 캐시 유지 계약)
mkdirSync(cacheDir, { recursive: true });
writeFileSync(join(cacheDir, "usage-cache.json"), JSON.stringify({
  anthropic: { fetchedAt: Date.now(), scoped: [{ label: "Fable", percent: 78, resetsAt: new Date((nowSec + 30 * 3600 + 90) * 1000).toISOString(), isActive: true }], global: {} },
  codex: { fetchedAt: Date.now(), buckets: [{ label: "codex wk", percent: 20, resetsAt: nowSec + 4 * 24 * 3600 + 20 * 3600 + 90 }] },
}));
r = run(RENDERER, [], sample);
expect(/Fable\x1b\[0m \[.*78%.*\(1d6h\)/.test(r.stdout), "renderer shows cached model-scoped bucket");
expect(/codex\x1b\[0m \x1b\[2mwk\x1b\[0m \[.*20%/.test(r.stdout), "renderer shows cached codex bucket under codex group");
expect(r.stdout.indexOf("Fable\x1b[0m [") < r.stdout.indexOf("ctx") && r.stdout.indexOf("ctx") < r.stdout.indexOf("\n") && r.stdout.indexOf("\n") < r.stdout.indexOf("codex"), "renderer orders model bucket, ctx on line 1, codex on line 2");
expect(r.stdout.trim().split("\n").length === 2, "renderer prints two lines when codex data is cached");
expect(r.stdout.replace(/\x1b\[[0-9;]*m/g, "").split("\n").every((l) => l.length < 120), "renderer keeps every line under 120 visible chars");
// codex 5h 창이 있으면 5h(카운트다운) → wk 순, config.toml의 모델·effort가 그룹 머리에 온다
mkdirSync(codexHome, { recursive: true });
writeFileSync(join(codexHome, "config.toml"), 'model = "gpt-6-astra"\nmodel_reasoning_effort = "high"\n');
writeFileSync(join(cacheDir, "usage-cache.json"), JSON.stringify({
  anthropic: { fetchedAt: Date.now(), scoped: [], global: {} },
  codex: { fetchedAt: Date.now(), buckets: [
    { label: "codex wk", percent: 20, resetsAt: nowSec + 4 * 24 * 3600 },
    { label: "codex 5h", percent: 7, resetsAt: nowSec + 2 * 3600 + 90 },
  ] },
}));
r = run(RENDERER, [], sample);
expect(/\x1b\[2m5h\x1b\[0m \[.*7%\x1b\[0m\x1b\[2m\(2h1m\).* \x1b\[2mwk\x1b\[0m \[.*20%.*\(4d0h\)/.test(r.stdout.split("\n")[1]), "renderer orders codex 5h before wk with countdowns");
expect(/\x1b\[36mgpt-6-astra\x1b\[0m \x1b\[2mhigh\x1b\[0m \x1b\[2m5h/.test(r.stdout), "renderer shows codex model + effort from config.toml as group head");
rmSync(codexHome, { recursive: true, force: true });
// 구 캐시 형식(최상위 fetchedAt)도 읽는다
writeFileSync(join(cacheDir, "usage-cache.json"), JSON.stringify({ fetchedAt: Date.now(), scoped: [{ label: "Old", percent: 33, resetsAt: null, isActive: true }], global: {} }));
r = run(RENDERER, [], sample);
expect(/Old\x1b\[0m \[.*33%/.test(r.stdout), "renderer reads legacy cache shape");
rmSync(cacheDir, { recursive: true, force: true });
// codex auth가 없으면 codex 세그먼트를 생략한다
r = run(RENDERER, [], sample);
expect(r.status === 0 && !/codex/.test(r.stdout), "renderer omits codex when auth.json is absent");

// 모델명·라벨의 개행은 한 줄 계약을 깨지 않는다 (CX#5)
r = run(RENDERER, [], JSON.stringify({ model: { display_name: "A\nB" }, context_window: { used_percentage: 1 } }));
expect(r.status === 0 && r.stdout.trim().split("\n").length === 1 && /A B/.test(r.stdout), "renderer collapses newlines in model name");

// API 실패도 TTL 스탬프를 남겨 매 렌더 재시도를 막고, 이전 버킷은 유지한다 (CX#1)
writeFileSync(join(isoDir, ".credentials.json"), JSON.stringify({ claudeAiOauth: { accessToken: "dummy" } }));
mkdirSync(codexHome, { recursive: true });
writeFileSync(join(codexHome, "auth.json"), JSON.stringify({ tokens: { access_token: "dummy", account_id: "acc" } }));
mkdirSync(cacheDir, { recursive: true });
writeFileSync(join(cacheDir, "usage-cache.json"), JSON.stringify({
  anthropic: { fetchedAt: 0, scoped: [{ label: "Fable", percent: 50, resetsAt: null, isActive: true }], global: {} },
  codex: { fetchedAt: 0, buckets: [{ label: "codex wk", percent: 11, resetsAt: null }] },
}));
const failEnv = { ...env, JONGMIN_HUD_NO_API: "0", JONGMIN_HUD_API_URL: "http://127.0.0.1:9/", JONGMIN_HUD_CODEX_URL: "http://127.0.0.1:9/" };
const t0 = Date.now();
r = spawnSync(process.execPath, [RENDERER], { input: sample, encoding: "utf-8", env: failEnv, timeout: 15_000 });
const failCache = JSON.parse(readFileSync(join(cacheDir, "usage-cache.json"), "utf-8"));
expect(r.status === 0 && /Fable.*50%/.test(r.stdout) && /codex.*wk.*11%/.test(r.stdout), "renderer keeps previous buckets when APIs fail");
expect(failCache.anthropic.fetchedAt >= t0 && failCache.anthropic.scoped[0]?.percent === 50, "renderer stamps anthropic cache TTL on failure");
expect(failCache.codex.fetchedAt >= t0 && failCache.codex.buckets[0]?.percent === 11, "renderer stamps codex cache TTL on failure");
rmSync(cacheDir, { recursive: true, force: true });
rmSync(join(isoDir, ".credentials.json"), { force: true });
rmSync(codexHome, { recursive: true, force: true });

// --- 2) 설치기 왕복 ---
const settingsPath = join(isoDir, "settings.json");
const wrapperPath = join(isoDir, "hud", "jongmin-hud.mjs");
writeFileSync(settingsPath, JSON.stringify({ model: "opus", statusLine: { type: "command", command: "old-cmd" }, hooks: {} }, null, 2));

r = run(SETUP, [], "");
expect(r.status === 0, "setup install exits 0");
expect(/REPLACED previous statusLine/.test(r.stdout), "setup reports replaced statusLine");
expect(/RENDER OK/.test(r.stdout), "setup render test passes");
expect(existsSync(wrapperPath), "setup writes wrapper");
let settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
expect(settings.model === "opus" && settings.hooks && typeof settings.hooks === "object", "setup preserves other settings keys");
expect(settings.statusLine?.type === "command" && settings.statusLine.command.includes("jongmin-hud.mjs"), "setup sets statusLine to wrapper");
expect(readdirSync(isoDir).some((f) => f.startsWith("settings.json.bak-hud-")), "setup writes settings backup");

r = run(SETUP, ["--check"], "");
expect(r.status === 0 && /managed\s*: yes/.test(r.stdout) && /RENDER OK/.test(r.stdout), "setup --check reports managed + render ok");

r = run(SETUP, ["--uninstall"], "");
expect(r.status === 0 && /REMOVED statusLine/.test(r.stdout), "setup --uninstall removes managed statusLine");
settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
expect(!("statusLine" in settings) && settings.model === "opus", "uninstall leaves other keys intact");
expect(!existsSync(wrapperPath), "uninstall removes wrapper");

// 비관리 statusLine은 uninstall이 건드리지 않는다
writeFileSync(settingsPath, JSON.stringify({ statusLine: { type: "command", command: "someone-else" } }));
r = run(SETUP, ["--uninstall"], "");
settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
expect(/SKIP statusLine/.test(r.stdout) && settings.statusLine?.command === "someone-else", "uninstall leaves unmanaged statusLine untouched");

// node 경로가 달라져도 래퍼를 가리키는 statusLine은 관리 대상 — uninstall이 제거한다
writeFileSync(settingsPath, JSON.stringify({ statusLine: { type: "command", command: `"/other/node" "${wrapperPath.replace(/\\/g, "/")}"` } }));
r = run(SETUP, ["--uninstall"], "");
settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
expect(/REMOVED statusLine/.test(r.stdout) && !("statusLine" in settings), "uninstall recognizes wrapper under a different node path");

// 래퍼 경로에 접미사가 붙은 다른 명령은 관리 대상이 아니다 (CX#2)
writeFileSync(settingsPath, JSON.stringify({ statusLine: { type: "command", command: `node "${wrapperPath.replace(/\\/g, "/")}.custom"` } }));
r = run(SETUP, ["--uninstall"], "");
settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
expect(/SKIP statusLine/.test(r.stdout) && settings.statusLine?.command.endsWith('.custom"'), "uninstall ignores wrapper-path-with-suffix command");

// 래퍼는 캐시에서 최신 정식 버전을 고른다 — 프리릴리스는 같은 숫자의 정식보다 뒤 (CX#4)
const fakeCache = join(isoDir, "plugins", "cache", "jongmin-skill", "jongmin-skills");
for (const v of ["1.9.1", "1.11.0", "1.11.0-beta.2", "1.10.0"]) {
  mkdirSync(join(fakeCache, v, "scripts"), { recursive: true });
  writeFileSync(join(fakeCache, v, "scripts", "usage-hud.mjs"), `process.stdout.write("MARK ${v}\\n");\n`);
}
writeFileSync(settingsPath, "{}");
r = run(SETUP, [], "");
r = run(wrapperPath, [], "{}");
expect(r.stdout.trim() === "MARK 1.11.0", `wrapper picks newest stable version (got: ${r.stdout.trim()})`);
rmSync(join(isoDir, "plugins"), { recursive: true, force: true });

// BOM 붙은 settings.json은 관용, 배열·null은 거부
writeFileSync(settingsPath, "\uFEFF" + JSON.stringify({ model: "opus" }));
r = run(SETUP, [], "");
settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
expect(r.status === 0 && settings.model === "opus" && settings.statusLine, "install tolerates BOM in settings.json");
writeFileSync(settingsPath, "[]");
r = run(SETUP, [], "");
expect(r.status === 1 && readFileSync(settingsPath, "utf-8") === "[]", "install refuses non-object settings.json");

// 깨진 settings.json은 덮어쓰지 않고 실패한다
writeFileSync(settingsPath, "{broken");
r = run(SETUP, [], "");
expect(r.status === 1 && readFileSync(settingsPath, "utf-8") === "{broken", "install refuses to overwrite unparsable settings.json");

// 허용 플래그 밖의 인자는 사용법만 내고 exit 2 — 어떤 파일도 쓰지 않는다 (D1)
const argDir = mkdtempSync(join(tmpdir(), "jongmin-hud-args-"));
for (const bad of ["check", "--bogus"]) {
  r = spawnSync(process.execPath, [SETUP, bad], { input: "", encoding: "utf-8", env: { ...env, CLAUDE_CONFIG_DIR: argDir }, timeout: 15_000 });
  const leftovers = readdirSync(argDir);
  expect(r.status === EXIT_USAGE, `setup rejects unrecognized argument "${bad}" with exit ${EXIT_USAGE} (got: ${r.status})`);
  expect(/usage:/.test(r.stdout), `setup prints usage for unrecognized argument "${bad}"`);
  expect(leftovers.length === 0, `setup writes no file for unrecognized argument "${bad}" (found: ${leftovers.join(",") || "none"})`);
}
rmSync(argDir, { recursive: true, force: true });

// --check는 상태를 종료 코드로 알린다: 미설치 1, 정상 설치 0 (D7)
const checkDir = mkdtempSync(join(tmpdir(), "jongmin-hud-check-"));
const checkEnv = { ...env, CLAUDE_CONFIG_DIR: checkDir };
r = spawnSync(process.execPath, [SETUP, "--check"], { input: "", encoding: "utf-8", env: checkEnv, timeout: 15_000 });
expect(r.status === 1, `setup --check exits 1 when the wrapper is missing (got: ${r.status})`);
expect(/wrapper missing/.test(r.stdout), "setup --check names the missing wrapper as the cause");
r = spawnSync(process.execPath, [SETUP], { input: "", encoding: "utf-8", env: checkEnv, timeout: 15_000 });
expect(r.status === 0, `setup install exits 0 in a fresh config dir (got: ${r.status})`);
r = spawnSync(process.execPath, [SETUP, "--check"], { input: "", encoding: "utf-8", env: checkEnv, timeout: 15_000 });
expect(r.status === 0 && /STATUS OK/.test(r.stdout), `setup --check exits 0 after a healthy install (got: ${r.status})`);
rmSync(checkDir, { recursive: true, force: true });

// 래퍼는 손상된 최신 렌더러를 건너뛰고 다음 후보를 쓴다 — 전부 실패해도 exit 0 (D6)
// 폴백 후보까지 손상시켜야 "전 후보 실패" 경로가 나오므로 설치기를 tmpdir의 가짜 플러그인 루트로 복사해 실행한다
const CORRUPT_SOURCE = "this is ((( not valid js\n";
const corruptDir = mkdtempSync(join(tmpdir(), "jongmin-hud-corrupt-"));
const fakePluginScripts = join(corruptDir, "fakeplugin", "scripts");
mkdirSync(fakePluginScripts, { recursive: true });
copyFileSync(SETUP, join(fakePluginScripts, "hud-setup.mjs"));
writeFileSync(join(fakePluginScripts, "usage-hud.mjs"), CORRUPT_SOURCE);
const corruptEnv = { ...env, CLAUDE_CONFIG_DIR: corruptDir };
spawnSync(process.execPath, [join(fakePluginScripts, "hud-setup.mjs")], { input: "", encoding: "utf-8", env: corruptEnv, timeout: 15_000 });
const corruptWrapper = join(corruptDir, "hud", "jongmin-hud.mjs");
const corruptCache = join(corruptDir, "plugins", "cache", "jongmin-skill", "jongmin-skills");
for (const v of ["1.12.0", "1.12.1"]) mkdirSync(join(corruptCache, v, "scripts"), { recursive: true });
writeFileSync(join(corruptCache, "1.12.0", "scripts", "usage-hud.mjs"), 'process.stdout.write("MARK 1.12.0\\n");\n');
writeFileSync(join(corruptCache, "1.12.1", "scripts", "usage-hud.mjs"), CORRUPT_SOURCE);
r = spawnSync(process.execPath, [corruptWrapper], { input: "{}", encoding: "utf-8", env: corruptEnv, timeout: 15_000 });
expect(r.status === 0 && r.stdout.trim() === "MARK 1.12.0", `wrapper falls back past a corrupt newest renderer (status: ${r.status}, stdout: ${JSON.stringify(r.stdout.trim())})`);
writeFileSync(join(corruptCache, "1.12.0", "scripts", "usage-hud.mjs"), CORRUPT_SOURCE);
r = spawnSync(process.execPath, [corruptWrapper], { input: "{}", encoding: "utf-8", env: corruptEnv, timeout: 15_000 });
expect(r.status === 0 && r.stdout.trim().split("\n").length === 1 && /renderer not found/.test(r.stdout), `wrapper prints one line and exits 0 when every renderer is corrupt (status: ${r.status}, stdout: ${JSON.stringify(r.stdout.trim())})`);
rmSync(corruptDir, { recursive: true, force: true });

rmSync(isoDir, { recursive: true, force: true });
console.log(failures ? `hud-test: ${failures} FAILED` : "hud-test: all passed");
process.exit(failures ? 1 : 0);
