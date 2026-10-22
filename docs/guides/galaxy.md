# Galaxy (Local Windows x64 Build)

[Back to the setup guide](setup-guide.md)

Galaxy is an independent desktop-pet build made from this repository for
Windows x64. It runs the same Electron pet runtime, Dashboard, Session HUD,
theme system, mini mode and permission pipeline, but it is a separate product:

| Item | Galaxy | Clawd on Desk |
| --- | --- | --- |
| App ID | `com.galaxy.deskpet` | `com.clawd.on-desk` |
| Product name | `Galaxy` | `Clawd on Desk` |
| User data | `%APPDATA%/Galaxy` (`galaxy-prefs.json`) | `%APPDATA%/Clawd on Desk` (`clawd-prefs.json`) |
| Local state | `~/.galaxy/` (runtime, history, recovery, recap, remote layout) | `~/.clawd/` |
| HTTP hook service | `127.0.0.1:23433-23437` | `127.0.0.1:23333-23337` |
| URL scheme | registers `galaxy://` only (its importer still accepts `clawd://` links) | registers `clawd://` |
| Official updates | disabled, no feed | GitHub releases |
| Agent catalog | `codex`, `pi`, `deepseek-harness` | full catalog |

Galaxy and Clawd on Desk can be installed and running side by side under one
Windows account. Galaxy never rewrites or removes Clawd-managed integrations:
it writes its own Codex bridge marker (`hooks/galaxy-codex-bridge.js`), its own
Pi extension directory (`galaxy-desktop-pet` with an `app: "galaxy"` managed
marker), and its own DSH package (`@dsh-external/dsh-galaxy-bridge`) in a
`.galaxy` managed generation.

The authoritative design record is
`docs/superpowers/specs/2026-10-21-galaxy-desktop-pet-design.md`; the task plan
is `docs/superpowers/plans/2026-10-21-galaxy-desktop-pet.md`.

## Build

Prerequisites: Node.js 24, dependencies installed (`npm install` already run),
and a complete Electron distribution under `node_modules/electron/dist`
(`node scripts/verify-electron-install.js` verifies it).

```powershell
# Optional: mirror for NSIS / winCodeSign tool downloads (current process only)
$env:ELECTRON_BUILDER_BINARIES_MIRROR = 'https://registry.npmmirror.com/-/binary/electron-builder-binaries/'

npm run build:galaxy:win:x64
```

The command runs `scripts/build-galaxy.js`, which:

1. loads the effective builder configuration from `electron-builder.galaxy.cjs`
   (the single config source) and rejects it unless the app id, product name,
   packaged metadata, `publish: null`, `galaxy://`-only protocol list, single
   `resources/icon.ico` copy, NSIS include and Galaxy icons are all correct;
2. builds the NSIS x64 target;
3. verifies that this run actually wrote `Galaxy-Setup-<version>-x64.exe`,
   that the unpacked `Galaxy.exe` is x64, that no `app-update.yml` was shipped,
   and that the packaged `app.asar` metadata is the Galaxy variant;
4. prints a JSON summary with the installer path, byte size, SHA-256 and
   signature state. It exits non-zero instead of reporting a failed build as a
   success.

Expected output:

| Path | Content |
| --- | --- |
| `dist-galaxy/Galaxy-Setup-1.4.0-x64.exe` | NSIS installer (unsigned, local build) |
| `dist-galaxy/Galaxy-Setup-1.4.0-x64.exe.blockmap` | block map sidecar |
| `dist-galaxy/win-unpacked/` | unpacked application used by the packaging check |

`dist-galaxy/` is generated output and is git-ignored; installers, the unpacked
tree and smoke user data must never be committed.

### Why a separate builder config file exists

`electron-builder` deep-merges `package.json` `build` when it receives an inline
configuration object and no config path, and that merge unions arrays. Doing
that produced two `extraResources` entries copying to `resources/icon.ico`
(`assets/icon.ico` and `assets/galaxy/icon.ico`) — which fails with
`EBUSY: resource busy or locked, copyfile` — and it also leaked Clawd's
`clawd://` protocol into the Galaxy installer. Pointing `build({ config })` at
`electron-builder.galaxy.cjs` bypasses that merge; `scripts/build-galaxy.js`
asserts the resulting effective configuration so the regression cannot return
silently.

### Building when the output directory is locked

If another process keeps a handle on `dist-galaxy/win-unpacked` (for example an
editor or indexer that opened `resources/app.asar`), packaging fails with
`EBUSY`. Galaxy supports an explicit output override that both the build and the
packaging check honour:

```powershell
$env:GALAXY_OUTPUT_DIR = 'dist-galaxy-build'
npm run build:galaxy:win:x64
npm run smoke:galaxy
```

Unset the variable to return to the default `dist-galaxy` location. Do not kill
unrelated processes to release such a handle; build to an override, or close the
process that holds it.

## Packaging check

```powershell
npm run smoke:galaxy
```

`scripts/smoke-galaxy.js` starts `dist-galaxy/win-unpacked/Galaxy.exe` with
`--galaxy-smoke-result=<abs path>` and `--galaxy-smoke-run=<run id>`. The main
process enters a dedicated branch (`src/galaxy-package-smoke.js`) before the
normal runtime starts: it does not install Agent hooks and does not register the
`galaxy://` protocol for the user. It then checks the packaged metadata, the PE
architecture, the absence of `app-update.yml`, the application name, the default
`galaxy` theme, the three-Agent catalog and the disabled updater, loads the
bundled animated asset in a hidden window, and writes:

| Path | Content |
| --- | --- |
| `dist-galaxy/smoke/result.json` | machine-readable check result |
| `dist-galaxy/smoke/galaxy-preview.png` | screenshot of the rendered pet |
| `dist-galaxy/smoke/home/` | throw-away user data for the run |

Reliability rules the runner enforces: previous `result.json` /
`galaxy-preview.png` files are removed before the run, the result must carry the
current run id, the screenshot must be newer than the run start, the reported
`userData` must stay inside the throw-away home, and a run that newly creates the
real `%APPDATA%/Galaxy` fails the check.

Harness constraint: do not redirect `%APPDATA%`/`USERPROFILE` for this check.
Electron resolves `app.getPath("appData")` from the real Windows shell folder and
throws `Failed to get 'appData' path` when `%APPDATA%` points somewhere else, so
the app dies before it can report anything. Isolation comes from
`--user-data-dir` plus the smoke branch calling `app.setPath("userData", ...)`
before any window or session is created.

Scope: this check covers the unpacked build (identity, resources, theme load,
Agent catalog, disabled updater, animation is moving). It is **not** an NSIS
install/uninstall test, and it does not exercise real Codex, Pi or DeepSeek
Harness event traffic.

## Agent scope

Only three integrations exist in Galaxy; every other Agent is absent from the
Settings list, from process discovery and from startup sync.

| Agent | Galaxy behaviour |
| --- | --- |
| Codex (`codex`) | Same integration as in Clawd (install/enable defaults, local, WSL and Remote SSH paths, permission behaviour unchanged); uses the separate `galaxy-codex-bridge.js` marker |
| Pi (`pi`) | Existing global extension, state-only, no permission bubble; installed explicitly from Settings |
| DeepSeek Harness (`deepseek-harness`) | Existing web profile and desktop profile support, version gate and approval behaviour unchanged; installed explicitly from Settings |

Install Pi or DeepSeek Harness from **Settings → AI Coding Tools → Install**.
Do not run the repository's Clawd install scripts (`npm run install:pi-extension`,
`npm run install:dsh`, …) for Galaxy: those write Clawd-owned markers.

## Updates

Galaxy has no release channel. Its updater reports `disabled`, it never
constructs `electron-updater`, and the About page and menus hide the update
entries. Upgrading means installing a newer Galaxy setup package over the
existing installation. Galaxy never checks or installs Clawd on Desk releases.

## Build and verification status

- The installer is an **unsigned local build**: no code-signing certificate is
  configured, so Windows SmartScreen shows the usual "unknown publisher"
  warning and the file hash must be checked instead of a signature.
- Verified on this machine: the Galaxy NSIS build carries an x64 application
  (the NSIS installer stub itself is ia32), the packaged metadata is the Galaxy variant,
  no update feed is shipped, and the packaging check passes (identity, default
  `galaxy` theme, three-Agent catalog, disabled updater, animation moving).
- Not verified: clicking through the NSIS installer and uninstaller on a real
  machine, upgrade-over-install behaviour, real Codex/Pi/DeepSeek Harness event
  and approval round-trips, Remote SSH / WSL deployment against real hosts.
- Visual review: the atlas and packaged idle screenshot were inspected. The
  current v2 atlas reduces background debris but retains light fringe and some
  isolated color noise around fine hair; further visual refinement is possible.
- Known runtime caveat for the Galaxy variant: `src/main.js` resolves
  `app.getPath("appData")` while it sets the product identity, so a session where
  Windows cannot resolve the roaming AppData folder makes Galaxy fail during
  startup instead of falling back to Electron's default `userData` path.

## Character animation limits (first release)

The Galaxy theme ships eight state poses (idle, thinking, working, completion,
error/alert, sleeping, waking, wave/attention) as raster art wrapped in SVG,
animated as whole-body motion: breathing and light sway. It is not Live2D, not a
skeletal rig, and it does not have per-limb or full-body continuous motion. Eye
tracking is disabled for this theme because the art is not eye-mapped; hit
testing uses the theme's content box and baseline. The app icon is a separate,
simplified crop of the same character.

## Current local deliverable (2026-10-21)

After the v2 atlas update, the installer was rebuilt and the packaging check
was run again successfully. This supersedes the earlier packaging report hash.

- File: `dist-galaxy/Galaxy-Setup-1.4.0-x64.exe`
- Size: 133,954,524 bytes; unsigned.
- SHA-256: `8da21ccd016846c089671b3040dfb83127a001b7423c5f9527a9f944cbf2c854`
- Build log: `.tmp-galaxy-final-build.txt` (local scratch file).
- Check evidence: `dist-galaxy/smoke/result.json` and `galaxy-preview.png`.
- Artwork source, recorded cleanup prompt and limits: `assets/galaxy/README.md`.

To install, run the setup EXE and follow its installation wizard. Pi and
DeepSeek Harness can then be installed explicitly from Galaxy Settings.
