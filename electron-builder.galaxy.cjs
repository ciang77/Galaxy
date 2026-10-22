"use strict";

// electron-builder entry point for the Galaxy variant.
//
// This file exists so electron-builder reads exactly one configuration source.
// When `build()` receives an inline `config` object and no config path,
// app-builder-lib first loads package.json `build` and deep-merges the inline
// object on top of it. That merge unions arrays (builder-util-runtime
// `deepAssign`), which produced two `extraResources` entries copying to
// `resources/icon.ico` (EBUSY during packaging) and leaked Clawd's `clawd://`
// protocol into the Galaxy installer. Pointing `build({ config })` at this file
// bypasses the package.json merge entirely.
const { createGalaxyBuildConfig } = require("./scripts/build-galaxy");

module.exports = function galaxyBuilderConfig() {
  return createGalaxyBuildConfig();
};
