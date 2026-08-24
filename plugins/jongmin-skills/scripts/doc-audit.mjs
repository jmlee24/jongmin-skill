#!/usr/bin/env node
// 웨이브 종료 문서 감사 — 증거 수집기. 판정은 T1 (shared/doc-hygiene.md 웨이브 종료 감사).
// usage: node doc-audit.mjs <repo> <BASE> [--allow a.md,b.md]
// exit 0 = hard fail 없음 / 2 = hard fail / 3 = git 오류(잘못된 BASE·비 git 경로 등)
// hard fail: (1) allowlist 밖 신규 .md  (2) 이번 범위에서 도입된 코드·설정 → .md#앵커 참조
// 기존(범위 밖) 위반은 inventory로만 보고한다 — 무관 웨이브를 막지 않는다.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const [, , repo, base, ...rest] = process.argv;
if (!repo || !base) { console.error("usage: doc-audit.mjs <repo> <BASE> [--allow a.md,b.md]"); process.exit(1); }
const allow = rest[0] === "--allow" && rest[1] ? rest[1].split(",").map(s => s.trim().replace(/\\/g, "/")) : [];
// git 실패는 삼키지 않는다 — 오류와 "diff 0건"은 다른 결과다 (exit 3)
const git = c => execSync("git " + c, { cwd: repo, encoding: "utf8" }).trim();
// grep류만 관용: 매치 0건이 exit 1이므로 빈 결과로 처리
const gitGrep = c => { try { return git(c); } catch (e) { if (e.status === 1) return ""; throw e; } };
let hard = [];
try {
  // BASE 실존 확인 — 실패 시 exit 3. 캐럿은 따옴표 필수 (Windows cmd가 bare ^를 삼킨다 — 실측)
  git(`cat-file -e "${base}^{commit}"`);

  // 1) touched .md 상태·증감
  const rows = git(`diff --name-status -M "${base}" -- "*.md"`).split("\n").filter(Boolean)
    .map(l => { const p = l.split("\t"); return { st: p[0][0], file: p[p.length - 1] }; });
  const num = {};
  for (const l of git(`diff --numstat "${base}" -- "*.md"`).split("\n").filter(Boolean)) {
    const [a, d, f] = l.split("\t"); num[f] = "+" + a + " -" + d;
  }
  console.log("== touched .md (" + base.slice(0, 7) + "..HEAD)");
  for (const r of rows) console.log(`  [${r.st}] ${r.file}  ${num[r.file] ?? ""}`);
  if (!rows.length) console.log("  (none)");

  // 2) 신규 .md × allowlist — hard fail. cases/는 규약 승인 생성이라 기본 면제
  for (const r of rows.filter(r => r.st === "A")) {
    if (r.file.startsWith("cases/")) continue;
    if (!allow.includes(r.file)) hard.push("NEW_MD_NOT_ALLOWED: " + r.file);
  }

  // 3) 이번 범위 도입 코드·설정 → .md#앵커 참조 — hard fail (추가 줄만 검사)
  const addedNonMd = git(`diff "${base}" -- . ":(exclude)*.md"`).split("\n")
    .filter(l => l.startsWith("+") && !l.startsWith("+++") && /[\w가-힣)\]/-]\.md#/.test(l));
  // 경로 문맥 필수(직전이 경로 문자) — 산문·주석의 ".md#" 언급은 오탐 (자기 자신이 걸린 실측)
  for (const l of addedNonMd) hard.push("CODE_TO_MD_ANCHOR: " + l.slice(1, 120).trim());

  // 4) 참조 후보 (완전성 비보장). 삭제 문서도 inbound를 본다 — delete 후 잔존 참조 검출
  console.log("== reference candidates");
  for (const r of rows) {
    const inb = gitGrep(`grep -l "${path.basename(r.file)}" -- "*.md"`).split("\n")
      .filter(f => f && f !== r.file);
    if (r.st === "D") {
      console.log(`  [D] ${r.file}\n    dangling-inbound: ${inb.join(", ") || "-"}`);
      continue;
    }
    const abs = path.join(repo, r.file);
    if (!fs.existsSync(abs)) continue;
    const out = [...fs.readFileSync(abs, "utf8").matchAll(/\]\(([^)#\s]+\.md)/g)].map(m => m[1]);
    console.log(`  ${r.file}\n    outbound: ${[...new Set(out)].join(", ") || "-"}\n    inbound:  ${inb.join(", ") || "-"}`);
  }
} catch (e) {
  console.error("GIT_ERROR: " + (e.stderr?.toString().trim() || e.message));
  process.exit(3);
}
if (hard.length) { console.log("== HARD FAIL"); hard.forEach(h => console.log("  " + h)); process.exit(2); }
console.log("== no hard fail");
