#!/usr/bin/env node
// jongmin-skills HUD — Claude Code statusline 렌더러 (의존성 없음).
//
// 입력: Claude Code가 statusline 명령의 stdin으로 주는 JSON 1건.
// 출력: 한 줄 — 모델 | 5h 게이지 | 주간 게이지 | 모델별 주간 버킷 | ctx 게이지.
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
const BAR_WIDTH = 8;
const WARN_PCT = 50;
const DANGER_PCT = 80;
const CTX_WARN_PCT = 60;
const CTX_DANGER_PCT = 85;
const USAGE_URL = process.env.JONGMIN_HUD_API_URL || "https://api.anthropic.com/api/oauth/usage";
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

function clampPct(v) {
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

async function loadUsage(clientVersion, nowMs) {
  const cached = readCache();
  if (cached && nowMs - (cached.fetchedAt ?? 0) < CACHE_TTL_MS) return cached;
  if (apiDisabled) return cached;
  try {
    const response = await fetchUsage(clientVersion);
    if (response) {
      const fresh = {
        fetchedAt: nowMs,
        scoped: parseScopedBuckets(response),
        global: parseGlobalBuckets(response),
      };
      writeCache(fresh);
      return fresh;
    }
  } catch {
    // 네트워크·토큰 오류 → 이전 캐시 유지
  }
  // 실패도 TTL 스탬프를 남긴다 — 안 그러면 매 렌더마다 재시도해 최대 API_TIMEOUT_MS씩 지연된다 (CX#1)
  const stamped = { scoped: [], global: {}, ...(cached ?? {}), fetchedAt: nowMs };
  writeCache(stamped);
  return stamped;
}

async function main() {
  const stdin = readStdinJson();
  const nowMs = Date.now();
  const segments = [];

  const modelName = stdin.model?.display_name || stdin.model?.id;
  if (modelName) segments.push(`${ANSI.cyan}${oneLine(modelName)}${ANSI.reset}`);

  const usage = await loadUsage(stdin.version || DEFAULT_CLIENT_VERSION, nowMs);
  const fiveHour = stdin.rate_limits?.five_hour ?? usage?.global?.five_hour;
  const sevenDay = stdin.rate_limits?.seven_day ?? usage?.global?.seven_day;

  const fhPct = clampPct(fiveHour?.used_percentage);
  if (fhPct != null) segments.push(gauge("5h", fhPct, fiveHour.resets_at, nowMs, WARN_PCT, DANGER_PCT));
  const sdPct = clampPct(sevenDay?.used_percentage);
  if (sdPct != null) segments.push(gauge("wk", sdPct, sevenDay.resets_at, nowMs, WARN_PCT, DANGER_PCT));

  for (const b of usage?.scoped ?? []) {
    segments.push(gauge(b.label, b.percent, b.resetsAt, nowMs, WARN_PCT, DANGER_PCT));
  }

  const ctxPct = clampPct(stdin.context_window?.used_percentage);
  if (ctxPct != null) segments.push(gauge("ctx", ctxPct, null, nowMs, CTX_WARN_PCT, CTX_DANGER_PCT));

  if (segments.length === 0) segments.push(`${ANSI.dim}jongmin-hud: no data${ANSI.reset}`);
  process.stdout.write(segments.join(`${ANSI.dim} | ${ANSI.reset}`) + "\n");
}

try {
  await main();
} catch {
  process.stdout.write("jongmin-hud\n");
}
