"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const asar = require("@electron/asar");

const root = path.resolve(__dirname, "..");
const outputOverride = String(process.env.GALAXY_OUTPUT_DIR || "").trim().replace(/[\\/]+$/, "");
const outputRoot = outputOverride.length > 0 ? path.resolve(root, outputOverride) : path.join(root, "dist-galaxy");
const unpacked = path.join(outputRoot, "win-unpacked");
const output = path.join(outputRoot, "smoke");
const home = path.join(output, "home");
const resultPath = path.join(output, "result.json");
const screenshotPath = path.join(output, "galaxy-preview.png");
const exe = path.join(unpacked, "Galaxy.exe");
// Every run gets its own id, so a leftover result.json from an earlier run can never
// be mistaken for this run's evidence.
const runId = `galaxy-smoke-${Date.now()}-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;

function removeOwnArtifact(target) {
  let stat;
  try {
    stat = fs.lstatSync(target);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  if (!stat.isFile()) throw new Error(`Refusing to remove non-regular smoke artifact: ${target}`);
  fs.unlinkSync(target);
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

if (!fs.existsSync(exe)) {
  fail(`Galaxy unpacked build is missing: ${exe} (run npm run build:galaxy:win:x64 first)`);
  process.exit();
}

fs.mkdirSync(home, { recursive: true });
removeOwnArtifact(resultPath);
removeOwnArtifact(screenshotPath);
const metadata = JSON.parse(asar.extractFile(path.join(unpacked, "resources", "app.asar"), "package.json"));
if (metadata.productName !== "Galaxy" || metadata.productVariant !== "galaxy") throw new Error("Packaged Galaxy metadata missing");
if (fs.existsSync(path.join(unpacked, "resources", "app-update.yml"))) throw new Error("Galaxy contains an upstream update feed");
const binary = fs.readFileSync(exe);
if (binary.readUInt16LE(binary.readUInt32LE(0x3c) + 4) !== 0x8664) throw new Error("Galaxy executable is not Windows x64");

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.GALAXY_VARIANT;
// Do NOT redirect APPDATA/USERPROFILE/HOME here. Electron resolves app.getPath("appData")
// from the real Windows shell folder; with a redirected %APPDATA% it throws
// "Failed to get 'appData' path", and the packaged app dies before it can report anything.
// Isolation comes from --user-data-dir plus the smoke branch's explicit app.setPath("userData").
const smokeUserData = path.join(home, "Galaxy");
const realGalaxyUserData = env.APPDATA ? path.join(env.APPDATA, "Galaxy") : null;
const realUserDataExistedBefore = realGalaxyUserData != null && fs.existsSync(realGalaxyUserData);
fs.mkdirSync(smokeUserData, { recursive: true });

const startedAt = Date.now();
const child = spawn(exe, [`--user-data-dir=${smokeUserData}`, `--galaxy-smoke-result=${resultPath}`, `--galaxy-smoke-run=${runId}`], { cwd: root, env, windowsHide: true, timeout: 60000 });
let diagnostics = "";
for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { if (diagnostics.length < 8000) diagnostics += chunk.toString(); });
child.on("error", (error) => fail(error.message));
child.on("close", (code, signal) => {
  let result;
  try { result = JSON.parse(fs.readFileSync(resultPath, "utf8")); } catch {}
  const problems = [];
  if (code !== 0) problems.push(`Galaxy smoke exited with code ${code}${signal ? ` (signal ${signal})` : ""}`);
  if (!result) problems.push(`Galaxy smoke wrote no result at ${resultPath}`);
  else {
    if (result.runId !== runId) problems.push(`result.json belongs to another run (${result.runId || "no runId"})`);
    if (!result.ok) problems.push(String(result.error || "Galaxy smoke reported a failure"));
    if (result.userData && !path.resolve(result.userData).toLowerCase().startsWith(`${path.resolve(output).toLowerCase()}${path.sep}`)) {
      problems.push(`smoke used a userData path outside the test home: ${result.userData}`);
    }
    if (realGalaxyUserData != null && !realUserDataExistedBefore && fs.existsSync(realGalaxyUserData)) {
      problems.push(`smoke polluted the real user data directory: ${realGalaxyUserData}`);
    }
    if (!fs.existsSync(screenshotPath)) problems.push(`Galaxy smoke wrote no screenshot at ${screenshotPath}`);
    else {
      const shotStat = fs.statSync(screenshotPath);
      if (!shotStat.isFile() || shotStat.size <= 0) problems.push(`screenshot is empty: ${screenshotPath}`);
      else if (shotStat.mtimeMs < startedAt - 5000) problems.push(`screenshot predates this run: ${screenshotPath}`);
    }
  }
  if (problems.length > 0) {
    fail(`${problems.join("; ")}\n${result ? JSON.stringify(result, null, 2) : diagnostics}`);
    return;
  }
  console.log(JSON.stringify({
    ok: true,
    runId,
    unpacked,
    checks: result,
    artifacts: { result: resultPath, screenshot: screenshotPath },
    scopeNote: "Covers the unpacked Galaxy build only: identity, theme/asset loading, Agent catalog and disabled updater. It does not install the NSIS package and does not exercise real Codex/Pi/DSH event traffic.",
  }, null, 2));
});
