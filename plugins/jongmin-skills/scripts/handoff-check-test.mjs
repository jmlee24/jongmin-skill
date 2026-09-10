#!/usr/bin/env node
// handoff-check 회귀 테스트 — validate.mjs check2가 실행한다. 임시 git repo에서 실존/부재/범위 밖/명령을 섞은 스냅샷을 검사한다.
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const CHECK = resolve(dirname(fileURLToPath(import.meta.url)), "handoff-check.mjs");
let failures = 0;
const pass = (m) => console.log(`PASS [handoff-check] ${m}`);
const fail = (m) => { failures++; console.log(`FAIL [handoff-check] ${m}`); };
const expect = (c, m) => (c ? pass : fail)(m);

const repo = mkdtempSync(join(tmpdir(), "jongmin-handoff-check-"));
const git = (...a) => spawnSync("git", a, { cwd: repo, encoding: "utf-8" });
git("init", "-q");
git("config", "user.email", "t@t"); git("config", "user.name", "t");
mkdirSync(join(repo, "src"), { recursive: true });
writeFileSync(join(repo, "src", "app.mjs"), Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n") + "\n");
writeFileSync(join(repo, "scripts.mjs"), "export {};\n");
git("add", "-A"); git("commit", "-q", "-m", "init");
const sha = git("rev-parse", "--short", "HEAD").stdout.trim();
const full = git("rev-parse", "HEAD").stdout.trim();

const snapshot = [
  `기준 SHA ${sha} (전체 ${full}), 다음 단계는 ${sha}..deadb33f 범위 리뷰`,
  "관련 파일: `src/app.mjs:12` 와 src/app.mjs:99 그리고 src/missing.mjs",
  "명령: `node scripts.mjs --json` / `node scripts/nope.mjs` / `nonexistent-bin-xyz run`",
  "장부: ~/.claude/jongmin-ledgers/does-not-exist-xyz/progress.md",
  "비율 3/4 는 경로가 아니다. URL https://example.com/a/b 도 아니다. <placeholder>/x 도 아니다. 숫자 1789029000 도 SHA가 아니다.",
  "호스트 chatgpt.com/backend-api/usage 도, 조사 붙은 account/rateLimits/read와 5h/주간/ctx는 도, 슬래시 명령 /jongmin-skills:hud-setup 과 /code-review 도, 기호 ④-C/①/⑦ 도 경로가 아니다.",
  "",
].join("\n");
const snapPath = join(repo, "snap.md");
writeFileSync(snapPath, snapshot);

let r = spawnSync(process.execPath, [CHECK, snapPath, "--cwd", repo], { encoding: "utf-8" });
const out = r.stdout;
expect(r.status === 1, "exit 1 when unverified items exist");
expect(new RegExp(`^OK sha ${sha} `, "m").test(out), "short SHA that exists → OK");
expect(new RegExp(`^OK sha ${full} `, "m").test(out), "full SHA that exists → OK");
expect(/^MISSING sha deadb33f /m.test(out), "fabricated SHA → MISSING");
expect(!/1789029000/.test(out), "pure-digit number is not treated as SHA");
expect(/^OK file:line src\/app\.mjs:12 /m.test(out), "file:line in range → OK");
expect(/^RANGE file:line src\/app\.mjs:99 .*file has 21 lines/m.test(out), "file:line out of range → RANGE with line count");
expect(/^MISSING path src\/missing\.mjs /m.test(out), "absent file → MISSING");
expect(/^OK cmd node /m.test(out), "known binary on PATH → OK");
expect(/^OK path scripts\.mjs /m.test(out), "script argument that exists → OK");
expect(/^MISSING path scripts\/nope\.mjs /m.test(out), "script argument that does not exist → MISSING");
expect(!/nonexistent-bin-xyz/.test(out), "unknown binary names are not checked (no false positives)");
expect(/^MISSING path ~\/\.claude\/jongmin-ledgers\/does-not-exist-xyz\/progress\.md /m.test(out), "~ path expanded and checked");
expect(!/ 3\/4 /.test(out) && !/example\.com/.test(out) && !/placeholder/.test(out), "ratios, URLs and placeholders are skipped");
expect(!/chatgpt\.com/.test(out) && !/rateLimits/.test(out) && !/주간/.test(out) && !/jongmin-skills:hud-setup/.test(out) && !/code-review/.test(out) && !/④/.test(out), "bare hostnames, non-ASCII tokens and slash commands are skipped");
expect(/^handoff-check: \d+ checked, \d+ ok, [1-9]\d* unverified$/m.test(out), "summary line present");

// --annotate: 원문 보존 + 문제 줄에만 UNVERIFIED 꼬리
r = spawnSync(process.execPath, [CHECK, snapPath, "--cwd", repo, "--annotate"], { encoding: "utf-8" });
const ann = r.stdout.split("\n");
expect(/\[UNVERIFIED: sha deadb33f\]$/.test(ann[0]), "annotate marks fabricated SHA on its line");
expect(/\[UNVERIFIED: .*file:line src\/app\.mjs:99.*path src\/missing\.mjs.*\]$/.test(ann[1]), "annotate lists all problems of a line");
expect(!/UNVERIFIED/.test(ann[4]) && !/UNVERIFIED/.test(ann[5]), "annotate leaves clean lines untouched");
expect(/handoff-check: \d+ checked, \d+ unverified/.test(r.stderr), "annotate summary goes to stderr");

// 깨끗한 스냅샷 → exit 0
writeFileSync(snapPath, `SHA ${sha}, 파일 \`src/app.mjs:3\`, 명령 \`git status\`\n`);
r = spawnSync(process.execPath, [CHECK, snapPath, "--cwd", repo], { encoding: "utf-8" });
expect(r.status === 0 && /0 unverified/.test(r.stdout), "clean snapshot → exit 0");

// git repo가 아니면 SHA는 SKIP, 나머지는 검사
const plain = mkdtempSync(join(tmpdir(), "jongmin-handoff-plain-"));
writeFileSync(join(plain, "a.txt"), "x\n");
r = spawnSync(process.execPath, [CHECK, "-", "--cwd", plain], { input: "SHA abc1234 와 a.txt 와 b.txt\n", encoding: "utf-8" });
expect(/^SKIP sha /m.test(r.stdout) && /^OK path a\.txt /m.test(r.stdout) && /^MISSING path b\.txt /m.test(r.stdout), "non-git cwd: sha SKIP, paths checked, stdin input works");

// --json
r = spawnSync(process.execPath, [CHECK, snapPath, "--cwd", repo, "--json"], { encoding: "utf-8" });
let j = null; try { j = JSON.parse(r.stdout); } catch {}
expect(j && j.ok === true && Array.isArray(j.results), "--json emits parseable result");

rmSync(repo, { recursive: true, force: true });
rmSync(plain, { recursive: true, force: true });
console.log(failures ? `handoff-check-test: ${failures} FAILED` : "handoff-check-test: all passed");
process.exit(failures ? 1 : 0);
