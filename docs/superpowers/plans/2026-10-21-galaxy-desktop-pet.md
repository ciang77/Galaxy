# Galaxy Desktop Pet Implementation Plan

> **For agentic workers:** This plan is executed inline in the existing Galaxy worktree. Tasks are tracked here as they are completed.

**Goal:** Build a standalone Galaxy Windows x64 desktop-pet installer from Clawd with its own app identity, isolated data, selected Agent integrations, and a default character theme based on the user reference.

**Architecture:** Preserve Clawd's shared runtime and current release configuration. Add a Galaxy-specific build config and explicit product variant boundary, then use that boundary to constrain Agent exposure/sync, data and updater behavior, and bundled themes.

**Tech Stack:** Electron, electron-builder NSIS, Node.js CommonJS, existing theme JSON/SVG/APNG pipeline.

**Spec:** `docs/superpowers/specs/2026-10-21-galaxy-desktop-pet-design.md`

## Global Constraints

- Galaxy appId is `com.galaxy.deskpet`, product name is `Galaxy`, user data is `%APPDATA%/Galaxy`, and the Windows x64 artifact is `Galaxy-Setup-<version>-x64.exe`.
- Galaxy has no Clawd update source or update actions until Galaxy owns a release channel.
- Galaxy exposes and syncs only Codex, Pi, and DeepSeek Harness; Pi and DSH installation remains explicit.
- Galaxy and Clawd must not overwrite or remove each other's integration configuration.
- Keep the existing Clawd build, updater, data path, and theme behavior unchanged.
- Use the attached character image as the style and design reference; keep the original illustration look and the silver/teal/black visual identity.
- Do not publish binaries or configure a Galaxy release feed.

## Review Focus

- Starting Galaxy and Clawd under one Windows account must resolve to distinct app data, lock and single-instance identities.
- Pi/DSH installation and uninstall ownership checks must not remove or rewrite entries owned by Clawd.
- Galaxy must never perform a scheduled or manual update check against Clawd's GitHub feed.
- Filtering other agents must not bypass registry capabilities or break the selected agents' existing install and status paths.
- The default animated theme must load without eye-tracking assumptions or inconsistent frame bounds.

---

### Task 1: Add independent Galaxy product/build identity

**Files:**
- Create: `electron-builder.galaxy.yml`
- Modify: `package.json`
- Modify: `launch.js` and the Electron startup composition point after tracing actual app initialization
- Modify: `.gitignore` only if new Galaxy output paths require it

- [x] Add a dedicated `build:galaxy:win:x64` script invoking electron-builder with the Galaxy configuration and NSIS x64 target.
- [x] Configure Galaxy `appId`, `productName`, artifact name, icon, NSIS shortcut/uninstaller names, and package file inclusion without changing default Clawd build values.
- [x] Resolve a Galaxy product variant before `app.whenReady()` and assign the Galaxy app name, AppUserModelId and userData path before any code reads Electron paths or creates windows.
- [x] Keep protocol registration compatible with `clawd://` import behavior while preventing protocol collisions from changing stored data identity.

### Task 2: Apply a narrow Agent product allowlist

**Files:**
- Create: `src/product-variant.js`
- Modify: `agents/registry.js`
- Modify: `src/agent-gate.js`
- Modify: `src/integration-sync.js`
- Modify: Agent settings tab rendering/data source identified from `src/settings-tab-agents.js` and adjacent settings modules
- Modify: `src/main.js` wiring as needed

- [x] Define immutable product variant data for `clawd` and `galaxy`, with Galaxy allowed ids `codex`, `pi`, and `deepseek-harness`.
- [x] Apply the Galaxy allowlist at the authoritative registry/sync/settings boundaries so disallowed agents cannot be discovered, installed from the settings page, or automatically synchronized.
- [x] Preserve Codex automatic install/enable defaults and preserve explicit-install behavior for Pi and DeepSeek Harness.
- [x] Keep shared agent code and Clawd's default behavior intact.

### Task 3: Isolate update behavior for Galaxy

**Files:**
- Modify: `src/updater.js`
- Modify: `src/settings-tab-about.js`
- Modify: settings menu/IPC paths that expose update actions, based on actual call graph
- Modify: Galaxy builder config only if needed to ensure no inherited publish metadata is active

- [x] Make Galaxy's updater report unsupported/disabled without constructing electron-updater or requesting remote metadata.
- [x] Hide or disable About/settings/notification update actions in Galaxy while preserving those actions for Clawd.
- [x] Ensure startup scheduling and update listeners cannot initiate checks under Galaxy.

### Task 4: Create the Galaxy character theme and app icon

**Files:**
- Create: `themes/galaxy/theme.json` and required animation assets
- Create: `assets/galaxy/icon.ico` and source artwork under `assets/galaxy/`
- Modify: built-in theme discovery/default selection at existing theme preference initialization
- Modify: Galaxy builder config to use the Galaxy icon

- [x] Produce a consistent transparent character set from the attached reference image for idle, thinking, working, completion, error/alert, sleeping/waking, click and drag reactions.
- [x] Use a shared logical canvas, stable baseline/content bounds, and eye tracking disabled for raster/APNG animation.
- [x] Set Galaxy as the built-in default only in the Galaxy variant; leave Clawd defaults unchanged.
- [x] Use a separate simplified small-size app icon.

### Task 5: Package and prepare local handoff

**Files:**
- Modify: Galaxy-specific package configuration/scripts as required
- Create or update: concise Galaxy local-build instructions in `docs/guides/` if needed

- [x] Produce the Galaxy Windows x64 NSIS installer using the dedicated command.
- [x] Inspect the generated artifact name and metadata to confirm Galaxy identity and architecture.
- [x] Provide the installer path, version, and installation instructions; do not publish or configure auto-updates.

## Implementation Notes

- The user requested execution in this session; proceed inline in this worktree.
- Per the task instructions, do not add or run tests unless the user explicitly requests testing or verification. Do use read-only inspection and build/artifact inspection needed to carry out the requested installer work.
- If the original reference image is not available as a local file at execution time, use the image attached in this conversation as the image-generation reference.

---

## Execution Record (2026-10-21, packaging phase)

Environment: Windows 10.0.19045, Node v24.20.0, npm 11.19.0, electron-builder
26.15.7, Electron 41.10.4 from the pre-verified local `electronDist`. Verified
scope is recorded below; anything not listed was not verified.

### Packaging failure root cause (confirmed by reading the effective config)

`build()` was called with an inline `config` object and no config path. In that
case `app-builder-lib/out/util/config/config.js#getConfig` first loads
`package.json` `build` and deep-merges the inline object on top, and
`builder-util-runtime` `deepAssign` unions arrays. The effective config therefore
contained:

- two `extraResources` entries copying to `resources/icon.ico`
  (`assets/icon.ico` and `assets/galaxy/icon.ico`) — this is the
  `EBUSY: resource busy or locked, copyfile` failure;
- both the `clawd://` and `galaxy://` protocol entries (Galaxy would have taken
  over Clawd's scheme association);
- both `win.target` entries (Clawd's `x64 + arm64` and Galaxy's `x64`).

### Fixes

- `electron-builder.galaxy.cjs` (new): the single config file electron-builder
  now reads, so `package.json` `build` is never merged underneath it.
- `scripts/build-galaxy.js`: passes the config file path, asserts the effective
  configuration (`publish: null`, exactly one `resources/icon.ico` source,
  `galaxy://` only, single NSIS x64 target, Galaxy metadata/NSIS include/icons),
  then verifies the artefacts of this run (file exists, non-empty, written during
  this build, listed by the builder, unpacked `Galaxy.exe` is x64, no
  `app-update.yml`, packaged `app.asar` metadata is the Galaxy variant) and prints
  path, bytes, SHA-256 and signature state. Failures exit non-zero instead of
  reporting success.
- `scripts/smoke-galaxy.js`: no longer trusts a leftover `result.json` (its own
  previous result/screenshot are removed, a unique run id is passed and required
  back, the screenshot must be newer than the run, `userData` must stay inside
  the throw-away home, a newly created real `%APPDATA%/Galaxy` fails the check);
  honours `GALAXY_OUTPUT_DIR`; drops the `%APPDATA%`/`USERPROFILE` redirection
  (see below); writes an explicit scope note.
- `src/galaxy-package-smoke.js`: echoes the run id in `result.json`.
- `.gitignore`: `dist-galaxy/` and `dist-galaxy-build/`.

### Second blocker (environment, not shipping code)

`dist-galaxy/win-unpacked/resources/app.asar` was held by another process
(Windows Restart Manager identified the OpenAI Codex desktop app `ChatGPT.exe`).
That handle blocked unlink and every rename of its parent directories, so the
canonical `dist-galaxy` tree could not be rebuilt while the app was open.
Killing unrelated processes was out of scope, so the first verified build ran
with `GALAXY_OUTPUT_DIR=dist-galaxy-build` (the documented override that the
build and the packaging check both honour). After the user closed that app the
stale tree was deleted and the canonical build was re-run; the canonical results
below supersede the override build, and the temporary `dist-galaxy-build` tree
has been removed.

### Harness defect found and fixed while checking

Electron resolves `app.getPath("appData")` from the real Windows shell folder:
with `%APPDATA%` redirected to a temp directory it throws
`Failed to get 'appData' path`. `src/main.js` sets the Galaxy identity through
that call, so the packaged app died before it could report anything (Windows
registered `APPCRASH 0xc0000005` in `Galaxy.exe`). The runner therefore no longer
redirects `HOME`/`USERPROFILE`/`APPDATA`; isolation comes from `--user-data-dir`
plus the smoke branch calling `app.setPath("userData", ...)`.

### Result

- `npm run build:galaxy:win:x64` (default output directory): exit 0, installer
  `dist-galaxy\Galaxy-Setup-1.4.0-x64.exe`, unsigned (no certificate
  configured). The artefact was rebuilt after the icon update at 23:35 with the
  same builder code; the current file is 133,954,524 bytes, SHA-256
  `8da21ccd016846c089671b3040dfb83127a001b7423c5f9527a9f944cbf2c854`
  (the first verified build was 134,094,863 bytes / `ac09b314...`, so hashes are
  per-build, not per-contract). Block map sidecar:
  `dist-galaxy\Galaxy-Setup-1.4.0-x64.exe.blockmap`.
- Unpacked `dist-galaxy\win-unpacked\Galaxy.exe`: x64, unsigned; packaged
  `app.asar` metadata `galaxy-desktop-pet` / `Galaxy` / `productVariant: galaxy`;
  no `app-update.yml`; `resources/icon.ico` equals `assets/galaxy/icon.ico`
  (SHA-256 `21747efc…`), i.e. the single-copy fix holds.
- `npm run smoke:galaxy`: exit 0; result `dist-galaxy/smoke/result.json`,
  screenshot `dist-galaxy/smoke/galaxy-preview.png`; identity, default `galaxy`
  theme, three-Agent catalog, disabled updater and a moving animation all
  reported true.
- `node --test test/galaxy-product.test.js`: 7/7 pass (the packaging test now
  also asserts the effective configuration, so the array-union regression cannot
  return silently).

Note that two consecutive builds differ by one byte in size and in SHA-256
(embedded build timestamp), so the hash above identifies this exact artefact,
not "any" Galaxy build.

Still open: NSIS install/uninstall click-through, real Codex/Pi/DSH event and
approval round-trips, Remote SSH/WSL against real hosts.

### Codex integration closeout (2026-10-21)

- Inspected DeepSeek's config-file entry, effective-config assertions and smoke
  runId isolation against the actual files. The initial installer hash matched
  the handoff report before the artwork update.
- Reviewed the atlas and packaged idle screenshot; used built-in image editing
  to reduce cutout debris, saved non-destructively as
  `assets/galaxy/galaxy-character-sheet-clean-v2.png`, and updated the mechanical
  asset pipeline to use it. Provenance, exact cleanup prompt and remaining
  visual limits are in `assets/galaxy/README.md`.
- `npm run assets:galaxy`: exit 0.
- `npm run build:galaxy:win:x64`: exit 0; current installer is 133,954,524 bytes,
  SHA-256 `8da21ccd016846c089671b3040dfb83127a001b7423c5f9527a9f944cbf2c854`.
  This supersedes the historical installer hash in the preceding Result section.
- `npm run smoke:galaxy`: exit 0, runId
  `galaxy-smoke-1792596962845-11592-41daf4ac`; identity, catalog, disabled updater
  and animation loading/motion passed in isolated userData. Reviewed screenshot.
- `git diff --check`: exit 0 (line-ending warnings only).
- No real Agent integrations installed, no NSIS installation performed, no
  additional regression suites run during closeout; changes remain uncommitted.

## Post-Handoff Verification (2026-10-21, 23:40-23:50)

Three claims from the handoff result were re-checked on the current tree and the
current (rebuilt) artefacts.

### 1. The installer is unsigned - confirmed

`Get-AuthenticodeSignature` returns `NotSigned` with no signer certificate for
all four relevant binaries: `dist-galaxy\Galaxy-Setup-1.4.0-x64.exe`,
`dist-galaxy\win-unpacked\Galaxy.exe`, the installed `D:\galaxy\Galaxy.exe` and
`D:\galaxy\Uninstall Galaxy.exe`. Their PE optional headers carry
`SecurityDirectory VA=0, Size=0` (installer stub machine `0x14c`, application
`0x8664`). `win.sign`, `certificateFile`, `certificateSubjectName`,
`signtoolOptions` and `forceCodeSigning` are all absent from the Galaxy build
config, and no `CSC_LINK` / `WIN_CSC_LINK` is set, so the build is unsigned by
construction rather than by a skipped step.

### 2. Install / uninstall / real Agent linkage - status corrected

The earlier statement "not verified" described this handoff's own work and was
accurate when written. The machine now contains a real installation performed
outside this session (installer run and app started at ~23:34-23:41):

| Observed | Evidence |
| --- | --- |
| Installed | `D:\galaxy\` containing the NSIS marker `.galaxy-install-user-home`; HKCU uninstall entry `Galaxy 1.4.0` (`"D:\galaxy\Uninstall Galaxy.exe" /currentuser`); Start Menu `Galaxy.lnk` pointing at `D:\galaxy\Galaxy.exe`; `VersionInfo` ProductName `Galaxy`, FileVersion `1.4.0` |
| Running with the Galaxy identity | 9 `Galaxy.exe` processes from `D:\galaxy`; `~/.galaxy/runtime.json` has `app: "galaxy"` and `port: 23433`; `127.0.0.1:23433` answers while `23333` (Clawd's range) does not |
| Codex linkage | `~/.codex/hooks.json`: 10 hook events, every entry carries the `galaxy-codex-bridge.js` marker |
| Pi linkage | `~/.pi/agent/extensions/galaxy-desktop-pet/.clawd-managed.json` = `{app: "galaxy", integration: "pi", managed: true}`, `installedAt 2026-10-21T15:41:43Z` |
| Still not verified | uninstall (uninstaller and registry entry still present, never run); DeepSeek Harness linkage (no `dsh-galaxy-bridge` reference on disk); real Codex/Pi/DSH event and approval round-trips; Clawd <-> Galaxy coexistence (no Clawd-managed integration exists on this machine to coexist with) |

Note that `dist-galaxy/` was rebuilt at 23:35 after `assets/galaxy/icon.ico` and
the sprites were updated, so the artefact this record was first written for is no
longer the file on disk.

### 3. Animation and edge/speckle quality - confirmed, quantified

Animation: each packaged wrapper (`assets/svg/galaxy-*.svg`) embeds one PNG as
`data:image/png;base64` and animates the whole `.character` group with a single
`@keyframes motion` (`translateY(0 -> -1px)` + `scaleY(1 -> 1.006)`), disabled
under `prefers-reduced-motion: reduce`. Eight states therefore mean eight static
poses with whole-body breathing/sway - no per-limb or skeletal animation.

Edge quality, measured read-only on the current sprites (no asset was touched):

- There is no white matte: near-white pixels (`min(R,G,B) >= 215`) on the
  outermost layer are 0-2 % of that layer, and 0 in the actual render.
- The real artefact is a very wide semi-transparent ramp: 26-38 % of
  non-transparent pixels are translucent, and walking inward from the visible
  edge the mean distance to near-opaque is **13.6-17.2 px at 512 px** (median
  12-22, capped at 24). At a 128 px pet size that is ~3.4-4.3 px, and 100 % of
  the outermost visible ring in `dist-galaxy/smoke/galaxy-preview.png` is still
  translucent. The band's mean luminance (134-163) is higher than the body's
  (123-140), which is why the edge reads as a light/white fuzzy rim.
- Speckles exist but are small: 0-3 detached islands per state of 1-53 px (for
  example `wave` has a 53 px island at (16,362)-(18,389) and `alert` an 8 px
  island plus two 1 px dots), plus larger detached clusters in `complete`
  (481 px, 437 px) and `sleeping` (581 px, 454 px) that look like intended
  floating effects, and two clusters hugging the canvas border - `alert` 96 px at
  (491,305)-(495,330) and `working` 157 px at (398,489)-(431,495) - that look
  like clipped slivers. In the rendered screenshot only one 2 px dot is detached
  from the silhouette.

Actionable for the art pass (Codex's scope): sharpen the alpha ramp so the edge
reaches near-opaque within ~1-2 px at 512 px, and re-check the two border-hugging
clusters.
