#!/usr/bin/env node
// cases/ 최소 스키마 검사 — 구조만 판정한다. 본문 품질·증거 충분성·트리거 계산의 정밀한
// 판단은 배치 시 T1 몫 (검증 스크립트 비대화 경계 — CX 합의). 출력 ASCII.
// 단독 실행: node case-lint.mjs [--root=<repo root>] / validate.mjs가 6항으로 호출.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SEVERITIES = ["critical", "major", "minor"];
const STATUSES = ["pending", "applied", "rejected"];
const REVIEW_PENDING = 5;
const REVIEW_AGE_DAYS = 14;
const REQUIRED_KEYS = ["skill", "project", "observed-version", "severity", "status"];

export function lintCases(root, log = console.log) {
  const dir = path.join(root, "cases");
  let failures = 0;
  const fail = (m) => { failures++; log(`FAIL [6] ${m}`); };
  if (!fs.existsSync(dir)) { log("PASS [6] cases/ absent (nothing to lint)"); return { failures, pending: 0 }; }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md");
  let pending = 0;
  const criticalPending = [];
  let oldestPending = null;
  for (const f of files) {
    const txt = fs.readFileSync(path.join(dir, f), "utf-8").replace(/\r/g, "");
    const m = txt.match(/^---\n([\s\S]*?)\n---/);
    if (!m) { fail(`${f}: frontmatter missing`); continue; }
    const fm = Object.fromEntries(m[1].split("\n").map((l) => {
      const i = l.indexOf(":");
      return i < 0 ? [l.trim(), ""] : [l.slice(0, i).trim(), l.slice(i + 1).replace(/#.*$/, "").trim()];
    }));
    for (const k of REQUIRED_KEYS) if (!fm[k]) fail(`${f}: '${k}' missing`);
    if (fm.severity && !SEVERITIES.includes(fm.severity)) fail(`${f}: severity '${fm.severity}' invalid`);
    if (fm.status && !STATUSES.includes(fm.status)) fail(`${f}: status '${fm.status}' invalid`);
    if (fm.status === "applied" && !fm["applied-version"]) fail(`${f}: applied requires 'applied-version'`);
    if (!/^\d{4}-\d{2}-\d{2}-\d{4}-.+\.md$/.test(f)) fail(`${f}: filename must be YYYY-MM-DD-HHMM-<skill>-<slug>.md`);
    if (fm.status === "pending") {
      pending++;
      if (fm.severity === "critical") criticalPending.push(f);
      const d = f.slice(0, 10);
      if (!oldestPending || d < oldestPending) oldestPending = d;
    }
  }
  if (!failures) log(`PASS [6] cases schema ok (${files.length} files, ${pending} pending)`);
  if (criticalPending.length) {
    log(`NOTE [6] batch review trigger met: pending critical ${criticalPending.length} (${criticalPending.join(", ")})`);
  }
  if (pending >= REVIEW_PENDING) {
    log(`NOTE [6] batch review trigger met: pending ${pending} >= ${REVIEW_PENDING}`);
  } else if (oldestPending) {
    const age = Math.floor((Date.now() - Date.parse(oldestPending + "T00:00:00Z")) / 86400000);
    if (age >= REVIEW_AGE_DAYS) log(`NOTE [6] batch review trigger met: oldest pending ${age}d >= ${REVIEW_AGE_DAYS}d`);
  }
  return { failures, pending };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const rootArg = process.argv.find((a) => a.startsWith("--root="));
  const root = rootArg ? path.resolve(rootArg.slice("--root=".length))
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const { failures } = lintCases(root);
  process.exit(failures ? 1 : 0);
}
