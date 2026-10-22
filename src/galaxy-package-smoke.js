"use strict";

const fs = require("node:fs");
const path = require("node:path");

module.exports = function maybeRunGalaxyPackageSmoke({ app, BrowserWindow }) {
  const arg = process.argv.find((value) => value.startsWith("--galaxy-smoke-result="));
  if (!arg) return false;
  const resultPath = arg.slice("--galaxy-smoke-result=".length);
  const runArg = process.argv.find((value) => value.startsWith("--galaxy-smoke-run="));
  const runId = runArg ? runArg.slice("--galaxy-smoke-run=".length) : null;
  if (!path.isAbsolute(resultPath)) throw new Error("Galaxy smoke result must be an absolute path");
  const smokeUserData = path.join(path.dirname(resultPath), "home", "Galaxy");
  fs.mkdirSync(smokeUserData, { recursive: true });
  app.setPath("userData", smokeUserData);
  app.disableHardwareAcceleration();
  app.whenReady().then(async () => {
    let window;
    const deadline = setTimeout(() => app.exit(1), 25000);
    try {
      const loader = require("./theme-loader");
      loader.init(__dirname, app.getPath("userData"));
      const theme = loader.loadTheme("galaxy", { strict: true });
      const defaults = require("./prefs").getDefaults();
      const agentIds = require("../agents/registry").getAllAgents().map((agent) => agent.id).sort();
      const updater = require("./updater")({}, { app });
      if (app.getName() !== "Galaxy" || defaults.theme !== "galaxy") throw new Error("Galaxy product identity did not activate");
      if (JSON.stringify(agentIds) !== JSON.stringify(["codex", "deepseek-harness", "pi"])) throw new Error("Unexpected Agent catalog");
      if (updater.getUpdateCheckSnapshot().state !== "disabled") throw new Error("Upstream updater is active");
      window = new BrowserWindow({
        width: 480, height: 500, show: false, frame: false, transparent: true,
        webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, offscreen: true },
      });
      await window.loadFile(path.join(__dirname, "galaxy-preview.html"));
      const visual = await window.webContents.executeJavaScript(`(async()=>{
        for(let i=0;i<100;i++){
          const object=document.getElementById('pet');
          const svg=object&&object.contentDocument;
          const character=svg&&svg.querySelector('.character');
          if(character){
            const style=svg.defaultView.getComputedStyle(character);
            const first=style.transform;
            await new Promise(r=>setTimeout(r,600));
            return {loaded:true,animation:style.animationName,moving:first!==svg.defaultView.getComputedStyle(character).transform};
          }
          await new Promise(r=>setTimeout(r,50));
        }
        throw new Error('Galaxy SVG did not load');
      })()`);
      if (!visual.loaded || !visual.moving) throw new Error("Packaged animation is not moving");
      const screenshotPath = path.join(path.dirname(resultPath), "galaxy-preview.png");
      fs.mkdirSync(path.dirname(resultPath), { recursive: true });
      fs.writeFileSync(screenshotPath, (await window.webContents.capturePage()).toPNG());
      fs.writeFileSync(resultPath, JSON.stringify({
        ok: true, runId, name: app.getName(), version: app.getVersion(), arch: process.arch,
        userData: app.getPath("userData"), theme: theme._id, agentIds,
        updates: updater.getUpdateCheckSnapshot().state,
        miniMode: theme.miniMode.supported, visual, screenshotPath,
      }, null, 2));
      app.exit(0);
    } catch (error) {
      fs.mkdirSync(path.dirname(resultPath), { recursive: true });
      fs.writeFileSync(resultPath, JSON.stringify({ ok: false, runId, error: error.stack || String(error) }, null, 2));
      app.exit(1);
    } finally {
      clearTimeout(deadline);
      if (window && !window.isDestroyed()) window.destroy();
    }
  });
  return true;
};
