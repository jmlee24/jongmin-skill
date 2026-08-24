#!/usr/bin/env node
// 웨이브 종료 문서 감사 — 증거 수집기. 판정은 T1 (shared/doc-hygiene.md 웨이브 종료 감사).
// usage: node doc-audit.mjs <repo> <BASE> [--allow a.md,b.md]
// exit 0 = hard fail 없음 / 2 = hard fail:
//   (1) allowlist 밖 신규 .md  (2) 이번 범위에서 도입된 코드·설정 → .md#앵커 참조
// 기존(범위 밖) 위반은 inventory로만 보고한다 — 무관 웨이브를 막지 않는다.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const [, , repo, base, ...rest] = process.argv;
if (!repo || !base) { console.error("usage: doc-audit.mjs <repo> <BASE> [--allow a.md,b.md]"); process.exit(1); }
const allow = rest[0] === "--allow" && rest[1] ? rest[1].split(",").map(s => s.trim().replace(/\\/g, "/")) : [];
const git = c => { try { return execSync("git " + c, { cwd: repo, encoding: "utf8" }).trim(); } catch { return ""; } };
let hard = [];

// 1) touched .md 상태·증감
const rows = git(`diff --name-status -M ${base} -- "*.md"`).split("\n").filter(Boolean)
  .map(l => { const p = l.split("\t"); return { st: p[0][0], file: p[p.length - 1] }; });
const num = {};
for (const l of git(`diff --numstat ${base} -- "*.md"`).split("\n").filter(Boolean)) {
  const [a, d, f] = l.split("\t"); num[f] = "+" + a + " -" + d;
}
console.log("== touched .md (" + base.slice(0, 7) + "..HEAD)");
for (const r of rows) console.log(`  [${r.st}] ${r.file}  ${num[r.file] ?? ""}`);
if (!rows.length) console.log("  (none)");

// 2) 신규 .md × allowlist — hard fail
for (const r of rows.filter(r => r.st === "A")) {
  if (!allow.includes(r.file)) hard.push("NEW_MD_NOT_ALLOWED: " + r.file);
}

// 3) 이번 범위 도입 코드·설정 → .md#앵커 참조 — hard fail (추가 줄만 검사)
const addedNonMd = git(`diff ${base} -- . ":(exclude)*.md"`).split("\n")
  .filter(l => l.startsWith("+") && !l.startsWith("+++") && /\.md#/.test(l));
for (const l of addedNonMd) hard.push("CODE_TO_MD_ANCHOR: " + l.slice(1, 120).trim());

// 4) 참조 후보 (완전성 비보장 — reference candidates)
console.log("== reference candidates");
for (const r of rows.filter(r => r.st !== "D")) {
  const abs = path.join(repo, r.file);
  if (!fs.existsSync(abs)) continue;
  const out = [...fs.readFileSync(abs, "utf8").matchAll(/\]\(([^)#\s]+\.md)/g)].map(m => m[1]);
  const inb = git(`grep -l "${path.basename(r.file)}" -- "*.md"`).split("\n")
    .filter(f => f && f !== r.file);
  console.log(`  ${r.file}\n    outbound: ${[...new Set(out)].join(", ") || "-"}\n    inbound:  ${inb.join(", ") || "-"}`);
}

if (hard.length) { console.log("== HARD FAIL"); hard.forEach(h => console.log("  " + h)); process.exit(2); }
console.log("== no hard fail");
