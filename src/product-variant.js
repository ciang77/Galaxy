"use strict";

const GALAXY_AGENT_IDS = Object.freeze(["codex", "pi", "deepseek-harness"]);
const GALAXY_AGENT_ID_SET = new Set(GALAXY_AGENT_IDS);
const productMetadata = require("../package.json");

function isGalaxyVariant(appName) {
  return productMetadata.productVariant === "galaxy" || process.env.GALAXY_VARIANT === "1"
    || String(appName || "").trim().toLowerCase() === "galaxy";
}

function getProductVariant(appName) {
  if (isGalaxyVariant(appName)) {
    return Object.freeze({
      id: "galaxy",
      name: "Galaxy",
      appId: "com.galaxy.deskpet",
      userDataDirectoryName: "Galaxy",
      defaultThemeId: "galaxy",
      allowedAgentIds: GALAXY_AGENT_IDS,
      updatesEnabled: false,
    });
  }
  return Object.freeze({
    id: "clawd",
    name: "Clawd on Desk",
    appId: "com.clawd.on-desk",
    userDataDirectoryName: "Clawd on Desk",
    defaultThemeId: "clawd",
    allowedAgentIds: null,
    updatesEnabled: true,
  });
}

function isAgentAllowedForProduct(agentId, variant = getProductVariant()) {
  if (!variant || !Array.isArray(variant.allowedAgentIds)) return true;
  return GALAXY_AGENT_ID_SET.has(agentId);
}

module.exports = {
  GALAXY_AGENT_IDS,
  getProductVariant,
  isAgentAllowedForProduct,
  isGalaxyVariant,
};
