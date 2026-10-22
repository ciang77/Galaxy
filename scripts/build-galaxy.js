"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const packageJson = require("../package.json");

const PROJECT_DIR = path.resolve(__dirname, "..");
const CONFIG_FILE_NAME = "electron-builder.galaxy.cjs";
const ICON_RESOURCE_TARGET = "icon.ico";
const GALAXY_ICON = "assets/galaxy/icon.ico";
const CLAWD_ICON = "assets/icon.ico";
const DEFAULT_OUTPUT_DIR = "dist-galaxy";
const OUTPUT_DIR_ENV = "GALAXY_OUTPUT_DIR";
const GALAXY_SCHEME = "galaxy";
const CLAWD_SCHEME = "clawd";
const NSIS_INCLUDE = "build/galaxy-installer.nsh";

// Recovery hatch for a locked output tree (for example when an unrelated process keeps
// a handle on the previous `win-unpacked`). The default deliverable location stays
// `dist-galaxy`; scripts/smoke-galaxy.js honours the same variable so checks follow it.
function resolveGalaxyOutputDir(env = process.env) {
  const override = String((env && env[OUTPUT_DIR_ENV]) || "").trim();
  return override.length > 0 ? override.replace(/[\\/]+$/, "") : DEFAULT_OUTPUT_DIR;
}

function createGalaxyBuildConfig() {
  const base = packageJson.build || {};
  const outputDir = resolveGalaxyOutputDir();
  const galaxy = {
    ...base,
    appId: "com.galaxy.deskpet",
    productName: "Galaxy",
    electronDist: require("node:path").join(__dirname, "..", "node_modules", "electron", "dist"),
    publish: null,
    extraMetadata: {
      ...(base.extraMetadata || {}),
      name: "galaxy-desktop-pet",
      productName: "Galaxy",
      productVariant: "galaxy",
      description: "Galaxy desktop companion for Codex, Pi and DeepSeek Harness",
    },
    directories: {
      ...(base.directories || {}),
      output: outputDir,
    },
    protocols: [{ name: "Galaxy Import Protocol", schemes: [GALAXY_SCHEME] }],
    win: {
      ...(base.win || {}),
      icon: GALAXY_ICON,
      artifactName: "Galaxy-Setup-${version}-${arch}.${ext}",
      target: [{ target: "nsis", arch: ["x64"] }],
    },
    nsis: {
      ...(base.nsis || {}),
      installerIcon: GALAXY_ICON,
      uninstallerIcon: GALAXY_ICON,
      installerHeaderIcon: GALAXY_ICON,
      shortcutName: "Galaxy",
      uninstallDisplayName: "Galaxy",
      include: NSIS_INCLUDE,
    },
    files: [...(base.files || []), GALAXY_ICON, "assets/galaxy/icon.png", "!themes/galaxy/assets/**/*"],
    extraResources: [
      ...(base.extraResources || []).filter((resource) => resource && resource.to !== ICON_RESOURCE_TARGET),
      { from: GALAXY_ICON, to: ICON_RESOURCE_TARGET },
    ],
  };

  return galaxy;
}

function getConfigFilePath(projectDir = PROJECT_DIR) {
  return path.join(projectDir, CONFIG_FILE_NAME);
}

// Load the configuration exactly the way electron-builder's packager will load it,
// so the checks below describe the real build instead of the authored object.
async function loadEffectiveGalaxyConfig({ projectDir = PROJECT_DIR } = {}) {
  const configPath = getConfigFilePath(projectDir);
  if (!fs.existsSync(configPath)) throw new Error(`Galaxy builder config is missing: ${configPath}`);
  const { getConfig } = require("app-builder-lib/out/util/config/config");
  return getConfig(projectDir, configPath, null);
}

function flattenSchemes(protocols) {
  const schemes = [];
  for (const protocol of Array.isArray(protocols) ? protocols : []) {
    for (const scheme of Array.isArray(protocol && protocol.schemes) ? protocol.schemes : []) {
      schemes.push(String(scheme).toLowerCase());
    }
  }
  return schemes;
}

function normalizeTargetList(target) {
  if (target == null) return [];
  const list = Array.isArray(target) ? target : [target];
  return list.map((entry) => {
    if (typeof entry === "string") return { target: entry, arch: [] };
    const arches = entry && entry.arch != null ? (Array.isArray(entry.arch) ? entry.arch : [entry.arch]) : [];
    return { target: entry && entry.target, arch: arches.map(String) };
  });
}

function assertUnique(list, label) {
  const seen = new Set();
  for (const entry of Array.isArray(list) ? list : []) {
    const key = JSON.stringify(entry);
    if (seen.has(key)) throw new Error(`${label} contains a duplicated entry: ${key}`);
    seen.add(key);
  }
}

function assertGalaxyEffectiveConfig(config, { projectDir = PROJECT_DIR, outputDir = resolveGalaxyOutputDir() } = {}) {
  const fail = (message) => {
    throw new Error(`Galaxy effective build config rejected: ${message}`);
  };
  if (!config || typeof config !== "object") fail("configuration did not load");
  if (config.appId !== "com.galaxy.deskpet") fail(`appId is ${JSON.stringify(config.appId)}`);
  if (config.productName !== "Galaxy") fail(`productName is ${JSON.stringify(config.productName)}`);

  const metadata = config.extraMetadata || {};
  if (metadata.productVariant !== "galaxy") fail("extraMetadata.productVariant is not galaxy");
  if (metadata.productName !== "Galaxy") fail("extraMetadata.productName is not Galaxy");
  if (metadata.name !== "galaxy-desktop-pet") fail("extraMetadata.name is not galaxy-desktop-pet");

  if (config.publish != null && !(Array.isArray(config.publish) && config.publish.length === 0)) {
    fail(`publish still points at an upstream feed: ${JSON.stringify(config.publish)}`);
  }
  const output = config.directories && config.directories.output;
  if (output !== outputDir) fail(`output directory is ${JSON.stringify(output)}, expected ${JSON.stringify(outputDir)}`);

  const schemes = flattenSchemes(config.protocols);
  if (schemes.includes(CLAWD_SCHEME)) fail(`protocols still claim ${CLAWD_SCHEME}://`);
  if (schemes.length !== 1 || schemes[0] !== GALAXY_SCHEME) {
    fail(`protocols must be exactly one ${GALAXY_SCHEME}:// scheme, got ${JSON.stringify(schemes)}`);
  }

  const extraResources = Array.isArray(config.extraResources) ? config.extraResources : [];
  const iconTargets = extraResources.filter((resource) => resource && resource.to === ICON_RESOURCE_TARGET);
  if (extraResources.some((resource) => resource && resource.from === CLAWD_ICON)) {
    fail(`extraResources still copies Clawd's ${CLAWD_ICON}`);
  }
  if (iconTargets.length !== 1) {
    fail(`extraResources must copy exactly one source to resources/${ICON_RESOURCE_TARGET}, got ${JSON.stringify(iconTargets)}`);
  }
  if (iconTargets[0].from !== GALAXY_ICON) fail(`resources/${ICON_RESOURCE_TARGET} comes from ${JSON.stringify(iconTargets[0].from)}`);

  const win = config.win || {};
  if (win.icon !== GALAXY_ICON) fail(`win.icon is ${JSON.stringify(win.icon)}`);
  if (win.artifactName !== "Galaxy-Setup-${version}-${arch}.${ext}") fail(`win.artifactName is ${JSON.stringify(win.artifactName)}`);
  const targets = normalizeTargetList(win.target);
  if (targets.length !== 1 || targets[0].target !== "nsis") fail(`win.target is ${JSON.stringify(win.target)}`);
  if (targets[0].arch.length !== 1 || targets[0].arch[0] !== "x64") fail(`win.target arch is ${JSON.stringify(targets[0].arch)}`);

  const nsis = config.nsis || {};
  if (nsis.include !== NSIS_INCLUDE) fail(`nsis.include is ${JSON.stringify(nsis.include)}`);
  for (const key of ["installerIcon", "uninstallerIcon", "installerHeaderIcon"]) {
    if (nsis[key] !== GALAXY_ICON) fail(`nsis.${key} is ${JSON.stringify(nsis[key])}`);
  }
  if (nsis.shortcutName !== "Galaxy" || nsis.uninstallDisplayName !== "Galaxy") fail("NSIS shortcut/uninstall names are not Galaxy");
  if (!fs.existsSync(path.join(projectDir, NSIS_INCLUDE))) fail(`missing NSIS include ${NSIS_INCLUDE}`);

  assertUnique(config.files, "files");
  assertUnique(config.asarUnpack, "asarUnpack");

  return config;
}

function readPeInfo(filePath) {
  const fd = fs.openSync(filePath, "r");
  try {
    const header = Buffer.alloc(4096);
    const read = fs.readSync(fd, header, 0, header.length, 0);
    if (read < 64) throw new Error("PE header is truncated");
    if (header.readUInt16LE(0) !== 0x5a4d) throw new Error("missing MZ signature");
    const peOffset = header.readUInt32LE(0x3c);
    if (header.readUInt32LE(peOffset) !== 0x00004550) throw new Error("missing PE signature");
    const machine = header.readUInt16LE(peOffset + 4);
    const optionalHeaderOffset = peOffset + 24;
    const magic = header.readUInt16LE(optionalHeaderOffset);
    let securityDirectoryOffset = null;
    if (magic === 0x20b) securityDirectoryOffset = optionalHeaderOffset + 144;
    if (magic === 0x10b) securityDirectoryOffset = optionalHeaderOffset + 128;
    let signed = false;
    if (securityDirectoryOffset != null && securityDirectoryOffset + 8 <= read) {
      signed = header.readUInt32LE(securityDirectoryOffset) !== 0 && header.readUInt32LE(securityDirectoryOffset + 4) !== 0;
    }
    return { machine, machineName: machine === 0x8664 ? "x64" : `0x${machine.toString(16)}`, signed };
  } finally {
    fs.closeSync(fd);
  }
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function normalizeArtifactList(artifacts, projectDir) {
  const list = Array.isArray(artifacts) ? artifacts : artifacts == null ? [] : [artifacts];
  return list
    .map((entry) => (typeof entry === "string" ? entry : entry && entry.file))
    .filter((entry) => typeof entry === "string" && entry.length > 0)
    .map((entry) => path.resolve(projectDir, entry));
}

function verifyInstallers({ artifacts, projectDir, version, startedAt, outputDir = resolveGalaxyOutputDir() }) {
  const expectedName = `Galaxy-Setup-${version}-x64.exe`;
  const expectedPath = path.join(projectDir, outputDir, expectedName);
  if (!fs.existsSync(expectedPath)) {
    throw new Error(`builder finished without producing ${expectedPath} (reported artifacts: ${JSON.stringify(artifacts)})`);
  }
  const stat = fs.statSync(expectedPath);
  if (!stat.isFile()) throw new Error(`${expectedPath} is not a regular file`);
  if (stat.size <= 0) throw new Error(`${expectedPath} is empty`);
  if (stat.mtimeMs < startedAt - 5000) {
    throw new Error(`${expectedPath} was not written by this build (mtime ${stat.mtime.toISOString()}, build started ${new Date(startedAt).toISOString()})`);
  }
  const reported = artifacts.some((artifact) => path.resolve(artifact).toLowerCase() === path.resolve(expectedPath).toLowerCase());
  if (!reported && artifacts.length > 0) {
    throw new Error(`builder artifacts ${JSON.stringify(artifacts)} do not include ${expectedPath}`);
  }
  const pe = readPeInfo(expectedPath);
  // NSIS ships a 32-bit installer stub that carries the x64 payload, so the stub
  // machine type is reported but not asserted. The x64 requirement is checked on
  // the unpacked application binary in assertUnpackedApplication().
  return {
    path: expectedPath,
    bytes: stat.size,
    sha256: sha256File(expectedPath),
    builtAt: stat.mtime.toISOString(),
    installerStubMachine: pe.machineName,
    signed: pe.signed,
  };
}

function assertUnpackedApplication({ projectDir, outputDir = resolveGalaxyOutputDir() }) {
  const appExe = path.join(projectDir, outputDir, "win-unpacked", "Galaxy.exe");
  if (!fs.existsSync(appExe)) throw new Error(`unpacked application is missing: ${appExe}`);
  const pe = readPeInfo(appExe);
  if (pe.machineName !== "x64") throw new Error(`${appExe} targets ${pe.machineName}, expected x64`);
  return { path: appExe, machine: pe.machineName, signed: pe.signed, bytes: fs.statSync(appExe).size };
}

function inspectUnpackedResources(projectDir, outputDir = resolveGalaxyOutputDir()) {
  const resourcesDir = path.join(projectDir, outputDir, "win-unpacked", "resources");
  const report = { resourcesDir, appUpdateYml: null, asarMetadata: null, icon: null };
  const updateYml = path.join(resourcesDir, "app-update.yml");
  report.appUpdateYml = fs.existsSync(updateYml) ? updateYml : null;
  const iconPath = path.join(resourcesDir, ICON_RESOURCE_TARGET);
  if (fs.existsSync(iconPath)) report.icon = { path: iconPath, sha256: sha256File(iconPath), bytes: fs.statSync(iconPath).size };
  const asarPath = path.join(resourcesDir, "app.asar");
  if (fs.existsSync(asarPath)) {
    try {
      const asar = require("@electron/asar");
      const metadata = JSON.parse(asar.extractFile(asarPath, "package.json").toString("utf8"));
      report.asarMetadata = { name: metadata.name, productName: metadata.productName, productVariant: metadata.productVariant, version: metadata.version };
    } catch (error) {
      report.asarMetadata = { error: error.message };
    }
  }
  return report;
}

async function main() {
  const projectDir = PROJECT_DIR;
  const version = String(packageJson.version);
  const outputDir = resolveGalaxyOutputDir();
  const config = await loadEffectiveGalaxyConfig({ projectDir });
  assertGalaxyEffectiveConfig(config, { projectDir, outputDir });

  const { Arch, Platform, build } = require("electron-builder");
  const startedAt = Date.now();
  const artifacts = normalizeArtifactList(await build({
    projectDir,
    targets: Platform.WINDOWS.createTarget("nsis", Arch.x64),
    config: getConfigFilePath(projectDir),
  }), projectDir);

  const installer = verifyInstallers({ artifacts, projectDir, version, startedAt, outputDir });
  const application = assertUnpackedApplication({ projectDir, outputDir });
  const resources = inspectUnpackedResources(projectDir, outputDir);
  if (resources.appUpdateYml) throw new Error(`Galaxy shipped an update feed at ${resources.appUpdateYml}`);
  if (!resources.asarMetadata || resources.asarMetadata.error || resources.asarMetadata.productVariant !== "galaxy") {
    throw new Error(`packaged app metadata is not the Galaxy variant: ${JSON.stringify(resources.asarMetadata)}`);
  }

  process.stdout.write(`${JSON.stringify({
    ok: true,
    variant: "galaxy",
    version,
    outputDir: path.join(projectDir, outputDir),
    installer,
    application,
    artifacts,
    packaged: resources,
    note: "Unsigned local NSIS build; not published to any release channel.",
  }, null, 2)}\n`);
}

if (require.main === module) main().catch((error) => {
  process.stderr.write(`${error && error.stack ? error.stack : error}\n`);
  process.exitCode = 1;
});

module.exports = {
  DEFAULT_OUTPUT_DIR,
  assertGalaxyEffectiveConfig,
  assertUnpackedApplication,
  createGalaxyBuildConfig,
  getConfigFilePath,
  loadEffectiveGalaxyConfig,
  resolveGalaxyOutputDir,
  verifyInstallers,
};
