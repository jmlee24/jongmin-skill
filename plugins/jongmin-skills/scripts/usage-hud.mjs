#!/usr/bin/env node
// jongmin-skills HUD — Claude Code statusline 렌더러 (의존성 없음).
//
// 입력: Claude Code가 statusline 명령의 stdin으로 주는 JSON 1건.
// 출력: 2줄 — [1] 클로드 모델 effort | 5h wk 모델별버킷 | ctx  [2] codex 모델 effort 5h wk. codex 없으면 1줄만.
//
// 5h·주간·ctx는 stdin의 rate_limits / context_window만으로 그린다 (네트워크 0).
// 모델별 주간 버킷(예: Fable 77%)은 stdin에 없어서 api.anthropic.com/api/oauth/usage를
// 호출한다 — 응답의 limits[] 중 kind === "weekly_scoped" 항목이 그것이다 (2026-09-10 실측).
// 호출은 CACHE_TTL_MS마다 1회로 제한하고, 실패하면 마지막 성공 캐시를 그대로 쓴다.
//
// 이 파일은 컨텍스트에 로드되지 않는다 — statusline 프로세스로만 실행된다.
// 어떤 경우에도 throw하지 않고 exit 0 — 렌더러 오류로 상태줄이 깨지지 않게.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const CACHE_TTL_MS = 60_000;
const API_TIMEOUT_MS = 3_000;
// 한 줄이 터미널 폭을 넘으면 끝이 잘린다 (실측 130자) — 2줄 출력: 1줄 클로드+ctx, 2줄 codex
const BAR_WIDTH = 8;
const WARN_PCT = 50;
const DANGER_PCT = 80;
const CTX_WARN_PCT = 60;
const CTX_DANGER_PCT = 85;
const USAGE_URL = process.env.JONGMIN_HUD_API_URL || "https://api.anthropic.com/api/oauth/usage";
// codex(ChatGPT 계정) 사용량 — codex TUI /status가 쓰는 백엔드. auth.json의 access_token + account_id로 200 OK (2026-09-10 실측)
const CODEX_USAGE_URL = process.env.JONGMIN_HUD_CODEX_URL || "https://chatgpt.com/backend-api/wham/usage";
const CODEX_HOME = process.env.CODEX_HOME || join(homedir(), ".codex");
const codexDisabled = process.env.JONGMIN_HUD_NO_CODEX === "1";
const HOURS_5_SEC = 5 * 3600;
const DAYS_7_SEC = 7 * 24 * 3600;
// OAuth 엔드포인트가 요구하는 베타 헤더·UA 형식 — OMC HUD와 동일 값 (실측 200 OK)
const OAUTH_BETA = "oauth-2025-04-20";
const DEFAULT_CLIENT_VERSION = "2.1.0";

const ANSI = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

const configDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
const cacheDir = process.env.JONGMIN_HUD_CACHE_DIR || join(configDir, "jongmin-hud");
const cachePath = join(cacheDir, "usage-cache.json");
const apiDisabled = process.env.JONGMIN_HUD_NO_API === "1";

function readStdinJson() {
  try {
    const raw = readFileSync(0, "utf-8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Number(null)·Number("")·Number(true)가 유한수라, 값을 모르는 항목이 0%·1%로 그려졌다.
// 숫자 또는 비어 있지 않은 숫자 문자열만 수치로 받고 나머지는 null → 게이지 자체를 그리지 않는다.
function clampPct(v) {
  if (typeof v === "string" && v.trim() === "") return null;
  if (typeof v !== "number" && typeof v !== "string") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function colorFor(pct, warn, danger) {
  if (pct >= danger) return ANSI.red;
  if (pct >= warn) return ANSI.yellow;
  return ANSI.green;
}

function bar(pct, warn = WARN_PCT, danger = DANGER_PCT) {
  const filled = Math.round((pct / 100) * BAR_WIDTH);
  const color = colorFor(pct, warn, danger);
  return `[${color}${"#".repeat(filled)}${ANSI.dim}${"-".repeat(BAR_WIDTH - filled)}${ANSI.reset}]${color}${pct}%${ANSI.reset}`;
}

// resets_at: unix 초(stdin) 또는 ISO 문자열(API) — 둘 다 받는다
function formatReset(resetsAt, nowMs) {
  if (resetsAt == null) return "";
  const t = typeof resetsAt === "number" ? resetsAt * 1000 : Date.parse(resetsAt);
  if (!Number.isFinite(t)) return "";
  const remainMin = Math.max(0, Math.round((t - nowMs) / 60_000));
  if (remainMin >= 24 * 60) {
    const d = Math.floor(remainMin / (24 * 60));
    const h = Math.floor((remainMin % (24 * 60)) / 60);
    return `${d}d${h}h`;
  }
  if (remainMin >= 60) return `${Math.floor(remainMin / 60)}h${remainMin % 60}m`;
  return `${remainMin}m`;
}

// 외부 입력 문자열(모델명·버킷 라벨)이 한 줄 계약을 깨지 않게
function oneLine(s) {
  return String(s).replace(/[\r\n]+/g, " ").trim();
}

function gauge(label, pct, resetsAt, nowMs, warn, danger) {
  const reset = formatReset(resetsAt, nowMs);
  return `${ANSI.dim}${oneLine(label)}${ANSI.reset} ${bar(pct, warn, danger)}${reset ? `${ANSI.dim}(${reset})${ANSI.reset}` : ""}`;
}

function readCache() {
  try {
    return JSON.parse(readFileSync(cachePath, "utf-8"));
  } catch {
    return null;
  }
}

// statusline은 짧은 간격으로 동시 실행될 수 있다 — 임시 파일 + rename으로 찢어진 캐시를 막는다
function writeCache(data) {
  try {
    mkdirSync(dirname(cachePath), { recursive: true });
    const tmp = `${cachePath}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(data));
    renameSync(tmp, cachePath);
  } catch {
    // 캐시 실패는 표시에 영향 없음
  }
}

function readAccessToken() {
  const credPath = join(configDir, ".credentials.json");
  if (existsSync(credPath)) {
    try {
      const parsed = JSON.parse(readFileSync(credPath, "utf-8"));
      const creds = parsed.claudeAiOauth || parsed;
      if (creds.accessToken) return creds.accessToken;
    } catch {
      // 아래 Keychain 경로로
    }
  }
  if (platform() === "darwin") {
    try {
      const raw = execFileSync("security", ["find-generic-password", "-s", "Claude Code-credentials", "-w"], {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 1500,
      }).trim();
      const parsed = JSON.parse(raw);
      const creds = parsed.claudeAiOauth || parsed;
      if (creds.accessToken) return creds.accessToken;
    } catch {
      // 토큰 없음 → 버킷 생략
    }
  }
  return null;
}

function parseScopedBuckets(response) {
  const byLabel = new Map();
  for (const entry of response?.limits ?? []) {
    if (entry?.kind !== "weekly_scoped") continue;
    const pct = clampPct(entry.percent);
    const label = entry.scope?.model?.display_name?.trim();
    if (pct == null || !label) continue;
    const isActive = entry.is_active === true;
    const existing = byLabel.get(label);
    if (!existing || (isActive && !existing.isActive)) {
      byLabel.set(label, { label, percent: pct, resetsAt: entry.resets_at ?? null, isActive });
    }
  }
  return [...byLabel.values()];
}

// stdin에 rate_limits가 없는 환경(구버전·API 키 모드) 대비 — API 값으로 대체
function parseGlobalBuckets(response) {
  const out = {};
  const fh = clampPct(response?.five_hour?.utilization);
  const sd = clampPct(response?.seven_day?.utilization);
  if (fh != null) out.five_hour = { used_percentage: fh, resets_at: response.five_hour.resets_at ?? null };
  if (sd != null) out.seven_day = { used_percentage: sd, resets_at: response.seven_day.resets_at ?? null };
  return out;
}

async function fetchUsage(clientVersion) {
  const token = readAccessToken();
  if (!token) return null;
  const res = await fetch(USAGE_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
      "anthropic-beta": OAUTH_BETA,
      "User-Agent": `claude-code/${clientVersion}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  return res.json();
}

// 클코에서 codex exec를 부를 때 쓰는 모델 = config.toml 기본값 (codex-lane.md: -m 지정 금지). 네트워크 없음
function readCodexModel() {
  try {
    const toml = readFileSync(join(CODEX_HOME, "config.toml"), "utf-8");
    const model = toml.match(/^\s*model\s*=\s*"([^"]+)"/m)?.[1] ?? "";
    const effort = toml.match(/^\s*model_reasoning_effort\s*=\s*"([^"]+)"/m)?.[1] ?? "";
    return { model: oneLine(model), effort: oneLine(effort) };
  } catch {
    return { model: "", effort: "" };
  }
}

function readCodexAuth() {
  try {
    const parsed = JSON.parse(readFileSync(join(CODEX_HOME, "auth.json"), "utf-8"));
    const tokens = parsed.tokens ?? {};
    if (!tokens.access_token) return null;
    return { token: tokens.access_token, accountId: tokens.account_id ?? "" };
  } catch {
    return null;
  }
}

// primary_window(주간 등)·secondary_window(5h 등)를 창 길이로 라벨링
function windowLabel(seconds) {
  if (!Number.isFinite(seconds)) return "";
  if (seconds >= DAYS_7_SEC) return "wk";
  if (seconds <= HOURS_5_SEC) return "5h";
  return `${Math.round(seconds / 3600)}h`;
}

function parseCodexBuckets(response) {
  const out = [];
  for (const w of [response?.rate_limit?.primary_window, response?.rate_limit?.secondary_window]) {
    const pct = clampPct(w?.used_percent);
    if (pct == null) continue;
    const suffix = windowLabel(w.limit_window_seconds);
    out.push({ label: suffix ? `codex ${suffix}` : "codex", percent: pct, resetsAt: w.reset_at ?? null });
  }
  return out;
}

async function fetchCodexUsage() {
  const auth = readCodexAuth();
  if (!auth) return null;
  const res = await fetch(CODEX_USAGE_URL, {
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "ChatGPT-Account-Id": auth.accountId,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  return res.json();
}

// 캐시 슬롯 하나를 TTL 기준으로 갱신 — 실패해도 스탬프를 남겨 매 렌더 재시도를 막는다 (CX#1)
async function refreshSlot(cached, nowMs, disabled, fetcher, parser, empty) {
  if (cached && nowMs - (cached.fetchedAt ?? 0) < CACHE_TTL_MS) return cached;
  if (disabled) return cached;
  try {
    const response = await fetcher();
    if (response) return { fetchedAt: nowMs, ...parser(response) };
  } catch {
    // 네트워크·토큰 오류 → 이전 값 유지
  }
  return { ...empty, ...(cached ?? {}), fetchedAt: nowMs };
}

async function loadUsage(clientVersion, nowMs) {
  const cache = readCache() ?? {};
  // 구 캐시 형식(최상위 fetchedAt)은 anthropic 슬롯으로 승격
  const prevAnthropic = cache.anthropic ?? (cache.fetchedAt ? cache : null);
  const [anthropic, codex] = await Promise.all([
    refreshSlot(prevAnthropic, nowMs, apiDisabled, () => fetchUsage(clientVersion),
      (r) => ({ scoped: parseScopedBuckets(r), global: parseGlobalBuckets(r) }), { scoped: [], global: {} }),
    refreshSlot(cache.codex ?? null, nowMs, apiDisabled || codexDisabled, fetchCodexUsage,
      (r) => ({ buckets: parseCodexBuckets(r) }), { buckets: [] }),
  ]);
  const next = { anthropic, codex };
  if (JSON.stringify(next) !== JSON.stringify({ anthropic: cache.anthropic, codex: cache.codex })) writeCache(next);
  return next;
}

async function main() {
  const stdin = readStdinJson();
  const nowMs = Date.now();
  const line1 = [];
  const line2 = [];

  const modelName = stdin.model?.display_name || stdin.model?.id;
  // effort.level(low/medium/high 등)은 stdin에 그대로 온다 — 모델명 옆에 회색으로
  const effort = typeof stdin.effort?.level === "string" ? oneLine(stdin.effort.level) : "";
  if (modelName) {
    line1.push(`${ANSI.cyan}${oneLine(modelName)}${ANSI.reset}${effort ? ` ${ANSI.dim}${effort}${ANSI.reset}` : ""}`);
  }

  const usage = await loadUsage(stdin.version || DEFAULT_CLIENT_VERSION, nowMs);
  const fiveHour = stdin.rate_limits?.five_hour ?? usage.anthropic?.global?.five_hour;
  const sevenDay = stdin.rate_limits?.seven_day ?? usage.anthropic?.global?.seven_day;

  // [1] 클로드: 5h · wk · 모델별 주간 버킷
  const claude = [];
  const fhPct = clampPct(fiveHour?.used_percentage);
  if (fhPct != null) claude.push(gauge("5h", fhPct, fiveHour.resets_at, nowMs, WARN_PCT, DANGER_PCT));
  const sdPct = clampPct(sevenDay?.used_percentage);
  if (sdPct != null) claude.push(gauge("wk", sdPct, sevenDay.resets_at, nowMs, WARN_PCT, DANGER_PCT));
  for (const b of usage.anthropic?.scoped ?? []) claude.push(gauge(b.label, b.percent, b.resetsAt, nowMs, WARN_PCT, DANGER_PCT));
  if (claude.length) line1.push(claude.join(" "));

  // [2] codex: 5h → wk 순 (Spark 등 additional_rate_limits는 파서에서 제외). ctx는 1줄 끝
  // NO_CODEX면 캐시가 남아 있어도 줄을 만들지 않는다 — 끈 항목이 계속 보이면 안 된다 (캐시 파일은 보존)
  const codex = (codexDisabled ? [] : (usage.codex?.buckets ?? []))
    .slice()
    .sort((a, b) => (a.label.endsWith("5h") ? 0 : 1) - (b.label.endsWith("5h") ? 0 : 1))
    .map((b) => gauge(b.label.replace(/^codex /, ""), b.percent, b.resetsAt, nowMs, WARN_PCT, DANGER_PCT));
  if (codex.length) {
    const cm = readCodexModel();
    const head = cm.model
      ? `${ANSI.cyan}${cm.model}${ANSI.reset}${cm.effort ? ` ${ANSI.dim}${cm.effort}${ANSI.reset}` : ""}`
      : `${ANSI.dim}codex${ANSI.reset}`;
    line2.push(`${head} ${codex.join(" ")}`);
  }

  const ctxPct = clampPct(stdin.context_window?.used_percentage);
  if (ctxPct != null) line1.push(gauge("ctx", ctxPct, null, nowMs, CTX_WARN_PCT, CTX_DANGER_PCT));

  const sep = `${ANSI.dim} | ${ANSI.reset}`;
  const lines = [line1, line2].filter((l) => l.length).map((l) => l.join(sep));
  if (lines.length === 0) lines.push(`${ANSI.dim}jongmin-hud: no data${ANSI.reset}`);
  process.stdout.write(lines.join("\n") + "\n");
}

try {
  await main();
} catch {
  process.stdout.write("jongmin-hud\n");
}
