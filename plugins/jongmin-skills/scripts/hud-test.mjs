#!/usr/bin/env node
// hud 회귀 테스트 — validate.mjs check2가 실행한다. 네트워크 없이(JONGMIN_HUD_NO_API=1) 돈다.
//   1) usage-hud.mjs: 정상 stdin / 빈 stdin / 깨진 JSON / rate_limits 없음 / 캐시된 모델 버킷
//      → 항상 exit 0, 값 반영
//   2) hud-setup.mjs: 격리 CLAUDE_CONFIG_DIR에서 install → check → uninstall 왕복,
//      다른 설정 키 보존·백업 생성·래퍼 생성/삭제·비관리 statusLine 보존 확인
// 판정 문자열은 ASCII.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const RENDERER = resolve(SCRIPT_DIR, "usage-hud.mjs");
const SETUP = resolve(SCRIPT_DIR, "hud-setup.mjs");

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
expect(r.stdout.trim().split("\n").length === 2, "renderer prints two lines (claude / codex+ctx)");
expect(/^.*Fable 5\.1.*5h.*wk.*\n.*ctx/.test(r.stdout), "renderer puts model+claude on line 1 and ctx on line 2");

r = run(RENDERER, [], "");
expect(r.status === 0 && r.stdout.length > 0, "renderer exits 0 with output on empty stdin");
r = run(RENDERER, [], "{not json");
expect(r.status === 0 && r.stdout.length > 0, "renderer exits 0 with output on invalid JSON");
r = run(RENDERER, [], JSON.stringify({ model: { display_name: "X" }, context_window: { used_percentage: 91 } }));
expect(r.status === 0 && /^\x1b\[36mX\x1b\[0m\n/.test(r.stdout) && /ctx.*91%/.test(r.stdout) && !/5h/.test(r.stdout), "renderer omits rate gauges and effort when absent");

// API 차단 상태에서도 캐시된 모델 버킷은 표시한다 (실패 시 마지막 성공 캐시 유지 계약)
mkdirSync(cacheDir, { recursive: true });
writeFileSync(join(cacheDir, "usage-cache.json"), JSON.stringify({
  anthropic: { fetchedAt: Date.now(), scoped: [{ label: "Fable", percent: 78, resetsAt: new Date((nowSec + 30 * 3600 + 90) * 1000).toISOString(), isActive: true }], global: {} },
  codex: { fetchedAt: Date.now(), buckets: [{ label: "codex wk", percent: 20, resetsAt: nowSec + 4 * 24 * 3600 + 20 * 3600 + 90 }] },
}));
r = run(RENDERER, [], sample);
expect(/Fable\x1b\[0m \[.*78%.*\(1d6h\)/.test(r.stdout), "renderer shows cached model-scoped bucket");
expect(/codex\x1b\[0m \x1b\[2mwk\x1b\[0m \[.*20%/.test(r.stdout), "renderer shows cached codex bucket under codex group");
expect(r.stdout.indexOf("Fable\x1b[0m [") < r.stdout.indexOf("codex") && r.stdout.indexOf("codex") < r.stdout.indexOf("ctx"), "renderer orders model bucket, codex, ctx");
expect(r.stdout.replace(/\x1b\[[0-9;]*m/g, "").split("\n").every((l) => l.length < 100), "renderer keeps every line under 100 visible chars");
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
expect(r.status === 0 && r.stdout.trim().split("\n").length === 2 && /A B/.test(r.stdout), "renderer collapses newlines in model name");

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

rmSync(isoDir, { recursive: true, force: true });
console.log(failures ? `hud-test: ${failures} FAILED` : "hud-test: all passed");
process.exit(failures ? 1 : 0);
