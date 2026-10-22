"use strict";

const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const assets = path.join(root, "assets", "svg");
const poses = {
  idle: [4.6, "0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(-1px) scaleY(1.006)}"],
  thinking: [4, "0%,100%{transform:rotate(-.45deg)}50%{transform:rotate(.65deg) translateY(-1px)}"],
  working: [2.3, "0%,100%{transform:translateY(0)}50%{transform:translateY(-1.7px)}"],
  complete: [2.2, "0%,65%,100%{transform:translateY(0)}25%{transform:translateY(-4px)}40%{transform:translateY(-1px)}"],
  alert: [3.5, "0%,24%,100%{transform:translateX(0)}4%,12%,20%{transform:translateX(-1.5px)}8%,16%{transform:translateX(1.5px)}"],
  sleeping: [5.5, "0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.012)}"],
  waking: [4.3, "0%,100%{transform:rotate(-.7deg) scaleY(1)}50%{transform:rotate(.7deg) scaleY(1.012)}"],
  wave: [2.8, "0%,100%{transform:rotate(-.8deg)}50%{transform:rotate(.8deg) translateY(-1px)}"],
};

for (const [pose, [seconds, frames]] of Object.entries(poses)) {
  const data = fs.readFileSync(path.join(assets, `galaxy-${pose}.png`)).toString("base64");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><style>@keyframes motion{${frames}}.character{transform-origin:50px 96px;animation:motion ${seconds}s ease-in-out infinite}@media(prefers-reduced-motion:reduce){.character{animation:none}}</style><g class="character"><image width="100" height="100" href="data:image/png;base64,${data}"/></g></svg>`;
  fs.writeFileSync(path.join(assets, `galaxy-${pose}.svg`), svg);
}

const themePath = path.join(root, "themes", "galaxy", "theme.json");
const theme = JSON.parse(fs.readFileSync(themePath, "utf8").replace(/^\uFEFF/, ""));
const replaceFiles = (value) => {
  if (typeof value === "string") return value.replace(/^(galaxy-[a-z]+)\.png$/, "$1.svg");
  if (Array.isArray(value)) return value.map(replaceFiles);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceFiles(v)]));
  return value;
};
const output = replaceFiles(theme);
output.rendering = {
  objectChannelFiles: Object.keys(poses).map((pose) => `galaxy-${pose}.svg`),
  lowPowerStaticImageOverrides: Object.fromEntries(Object.entries(output.states).filter(([, files]) => Array.isArray(files)).map(([state, files]) => [state, { from: files[0], to: files[0].replace(/\.svg$/, ".png") }])),
};
output.miniMode = {
  supported: true,
  viewBox: { x: 0, y: 0, width: 100, height: 100 },
  states: {
    "mini-idle": ["galaxy-idle.svg"], "mini-enter": ["galaxy-wave.svg"],
    "mini-enter-sleep": ["galaxy-sleeping.svg"], "mini-crabwalk": ["galaxy-idle.svg"],
    "mini-peek": ["galaxy-wave.svg"], "mini-alert": ["galaxy-alert.svg"],
    "mini-happy": ["galaxy-complete.svg"], "mini-sleep": ["galaxy-sleeping.svg"],
    "mini-working": ["galaxy-working.svg"],
  },
};
fs.writeFileSync(themePath, `${JSON.stringify(output, null, 2)}\n`);
console.log("Galaxy: generated eight animated illustration assets and mini-mode mappings.");
