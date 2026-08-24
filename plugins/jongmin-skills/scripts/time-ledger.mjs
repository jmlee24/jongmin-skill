#!/usr/bin/env node
// append-only 시간 이벤트 장부 (shared/ledger.md 3절의 수집 기구)
// usage: node time-ledger.mjs append <file.tsv> <lane> <event> [note]
//        node time-ledger.mjs report <file.tsv>
import fs from "node:fs";
const EVENTS = ["lane_start", "lane_done", "land_start", "land_done",
  "verify_start", "verify_output", "decision_done", "conflict"];
const [, , cmd, file, lane, event, ...rest] = process.argv;
function die(m) { console.error(m); process.exit(1); }

if (cmd === "append") {
  if (!file || !lane || !event) die("usage: append <file.tsv> <lane> <event> [note]");
  if (!EVENTS.includes(event)) die("unknown event: " + event + " (allowed: " + EVENTS.join("/") + ")");
  fs.appendFileSync(file, [new Date().toISOString(), lane, event, rest.join(" ")].join("\t") + "\n");
  console.log("APPENDED " + lane + " " + event);
} else if (cmd === "report") {
  if (!file || !fs.existsSync(file)) die("no event file: " + file);
  const rows = fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map(l => l.split("\t"));
  const lanes = {}; let conflicts = 0;
  for (const [ts, ln, ev] of rows) {
    if (ev === "conflict") { conflicts++; continue; }
    (lanes[ln] ??= {})[ev] = Date.parse(ts); // 같은 이벤트 재기록 시 마지막 값
  }
  const dur = (a, b) => (a && b && b >= a) ? Math.round((b - a) / 60000) + "m" : "-";
  console.log(["lane", "write", "queue_wait", "landing", "verify", "judge"].join("\t"));
  for (const [ln, e] of Object.entries(lanes)) {
    console.log([ln,
      dur(e.lane_start, e.lane_done),      // 레인 작업
      dur(e.lane_done, e.land_start),      // 미착지 큐 대기
      dur(e.land_start, e.land_done),      // 착지
      dur(e.verify_start, e.verify_output),// 검증 실행 대기
      dur(e.verify_output, e.decision_done)// T1 판정 구간
    ].join("\t"));
  }
  console.log("conflicts\t" + conflicts);
} else die("usage: time-ledger.mjs append|report ...");
