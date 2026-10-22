"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");
const root = path.resolve(__dirname, "..");

function inGalaxy(source) {
  const result = spawnSync(process.execPath, ["-e", source], {
    cwd: root, encoding: "utf8", timeout: 30000,
    env: { ...process.env, GALAXY_VARIANT: "1" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

test("Galaxy exposes only its three agents and loads recap policies", () => {
  const result = JSON.parse(inGalaxy(`
    const registry = require('./agents/registry');
    require('./src/recap-metrics');
    console.log(JSON.stringify(registry.getAllAgents().map(a => a.id).sort()));
  `));
  assert.deepEqual(result, ["codex", "deepseek-harness", "pi"]);
});

test("Galaxy rejects disallowed legacy gates and detectors", () => {
  inGalaxy(`
    const assert=require('node:assert/strict');
    const gate=require('./src/agent-gate');
    const prefs={agents:{'claude-code':{enabled:true,integrationInstalled:true},codex:{enabled:true,integrationInstalled:true}}};
    assert.equal(gate.shouldSyncAgentIntegration(prefs,'claude-code'),false);
    assert.equal(gate.shouldSyncAgentIntegration(prefs,'codex'),true);
    const ids=require('./src/doctor-detectors/agent-descriptors').getAgentDescriptors().map(a=>a.agentId).sort();
    assert.deepEqual(ids,['codex','deepseek-harness','pi']);
    assert.deepEqual([...require('./hooks/cleanup-integrations').MANAGED_AGENT_IDS].sort(),ids);
  `);
});

test("Galaxy Codex install and uninstall preserve original hooks", () => {
  inGalaxy(`
    const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
    const home=fs.mkdtempSync(path.join(os.tmpdir(),'galaxy-codex-'));
    try {
      const hooksPath=path.join(home,'hooks.json');
      const foreign={type:'command',command:'node /original/codex-hook.js'};
      fs.writeFileSync(hooksPath,JSON.stringify({hooks:{Stop:[{hooks:[foreign]}]}}));
      const installer=require('./hooks/codex-install');
      const opts={codexDir:home,hooksPath,configPath:path.join(home,'config.toml'),nodeBin:process.execPath,platform:'win32',silent:true};
      installer.registerCodexHooks(opts);
      const installed=JSON.parse(fs.readFileSync(hooksPath,'utf8'));
      assert.equal(installed.hooks.Stop[0].hooks[0].command,foreign.command);
      assert.ok(JSON.stringify(installed).includes('galaxy-codex-bridge.js'));
      const result=require('./hooks/cleanup-integrations').AGENT_CLEANERS.codex({...opts,markers:['galaxy-codex-bridge.js']});
      assert.equal(result.stableLauncher.changed,false);
      const remaining=JSON.parse(fs.readFileSync(hooksPath,'utf8'));
      assert.deepEqual(remaining.hooks.Stop,[{hooks:[foreign]}]);
    } finally {fs.rmSync(home,{recursive:true,force:true});}
  `);
});

test("Galaxy Pi extension has independent ownership and endpoint", () => {
  inGalaxy(`
    const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
    const home=fs.mkdtempSync(path.join(os.tmpdir(),'galaxy-pi-'));
    try {
      const original=path.join(home,'extensions','clawd-on-desk');
      fs.mkdirSync(original,{recursive:true});fs.writeFileSync(path.join(original,'keep.txt'),'original');
      const installer=require('./hooks/pi-install');
      const result=installer.registerPiExtension({parentDir:home,silent:true});
      assert.notEqual(result.extensionDir,original);
      const source=fs.readFileSync(path.join(result.extensionDir,'index.ts'),'utf8');
      assert.ok(source.includes('const IS_GALAXY = true;'));
      assert.equal(JSON.parse(fs.readFileSync(path.join(result.extensionDir,'.clawd-managed.json'),'utf8')).app,'galaxy');
      installer.unregisterPiExtension({parentDir:home,silent:true});
      assert.equal(fs.readFileSync(path.join(original,'keep.txt'),'utf8'),'original');
    } finally {fs.rmSync(home,{recursive:true,force:true});}
  `);
});

test("Galaxy packaging carries product metadata and disables upstream publishing", async () => {
  const { assertGalaxyEffectiveConfig, createGalaxyBuildConfig, loadEffectiveGalaxyConfig } = require("../scripts/build-galaxy");
  const config = createGalaxyBuildConfig();
  assert.equal(config.extraMetadata.productName, "Galaxy");
  assert.equal(config.appId, "com.galaxy.deskpet");
  assert.equal(config.publish, null);
  assert.equal(config.nsis.include, "build/galaxy-installer.nsh");

  // The builder must read the config file, not deep-merge package.json "build": that merge
  // unions arrays and produced two extraResources copies to resources/icon.ico (EBUSY) plus a
  // leaked clawd:// protocol registration in the Galaxy installer.
  const effective = await loadEffectiveGalaxyConfig();
  assertGalaxyEffectiveConfig(effective);
  assert.deepEqual(effective.extraResources, [{ from: "assets/galaxy/icon.ico", to: "icon.ico" }]);
  assert.deepEqual(effective.protocols.map((protocol) => protocol.schemes), [["galaxy"]]);
  assert.equal(effective.publish, null);
  assert.equal(effective.win.icon, "assets/galaxy/icon.ico");
});

test("Galaxy transport and remote files are separate from Clawd", () => {
  inGalaxy(`
    const assert=require('node:assert/strict'),path=require('node:path');
    const config=require('./hooks/server-config');
    assert.equal(config.CLAWD_SERVER_ID,'galaxy');
    assert.deepEqual(config.SERVER_PORTS,[23433,23434,23435,23436,23437]);
    assert.equal(config.defaultRuntimeConfigPath({homeDir:process.cwd()}),path.join(process.cwd(),'.galaxy','runtime.json'));
    const layout=require('./src/remote-ssh-layout').resolveRemoteRuntimeLayout({remoteHome:'/home/user'});
    assert.equal(layout.claudeHooksDir,'/home/user/.galaxy/hooks');
    assert.equal(layout.clawdStateDir,'/home/user/.galaxy');
    const command=require('./src/remote-ssh-node').buildRemoteHookNodeCommand('/usr/bin/node','codex-install.js',[],{hooksDir:layout.claudeHooksDir});
    assert.ok(command.startsWith('env GALAXY_VARIANT=1 '));
  `);
});

test("Galaxy DSH generation has its own package and verified bytes", () => {
  inGalaxy(`
    const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
    const home=fs.mkdtempSync(path.join(os.tmpdir(),'galaxy-dsh-'));
    (async()=>{
      try {
        const dsh=require('./hooks/dsh-install');
        const bundle=await dsh.__test.readSourceBundle();
        const files=Object.fromEntries(bundle.files.map(f=>[f.relativePath,f.content.toString('utf8')]));
        assert.equal(JSON.parse(files['package.json']).name,'@dsh-external/dsh-galaxy-bridge');
        assert.ok(files['lib/clawd-client.js'].includes("const SERVER_ID = 'galaxy'"));
        assert.ok(files['lib/clawd-client.js'].includes('[23433, 23434, 23435, 23436, 23437]'));
        const generation=await dsh.__test.promoteGeneration(bundle,{homeDir:home,dshHome:path.join(home,'.dsh')});
        assert.ok(generation.generationDir.includes(path.join(home,'.galaxy')));
        const marker=JSON.parse(fs.readFileSync(path.join(generation.generationDir,'galaxy-manifest.json'),'utf8'));
        assert.equal(marker.owner,'galaxy');
        assert.equal(dsh.__test.hashBridgeDirectorySync(fs,generation.generationDir,bundle.contract),bundle.bundleHash);
      } finally {fs.rmSync(home,{recursive:true,force:true});}
    })().catch(e=>{console.error(e);process.exitCode=1;});
  `);
});
