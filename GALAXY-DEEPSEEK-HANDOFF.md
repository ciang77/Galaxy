# Galaxy：交给 DeepSeek 的非图片任务

> 快照日期：2026-10-21。用户已批准实施。请直接继续工作，不要重新询问产品名称、Agent 范围或画风。

## 1. 工作位置与协作边界

**必须在这个已有 worktree 工作：**

`C:\Users\wsy\.codex\worktrees\galaxy-design\clawd-on-desk`

原始 checkout 是 `D:\clawd\clawd-on-desk`，不要误在原始 checkout 修改。分支是 `codex/galaxy-app-design`。

已有大量未提交实现和新增资源，属于本次工作。先读取 `git status --short`、`git diff --stat`、`AGENTS.md`，保留全部已有修改，不要 reset、clean、stash 或覆盖整个文件。不要自动拉取、推送、发版或上传安装包。当前任务只交付本地安装包和说明。

**你的负责范围：打包修复、打包检查脚本的必要修复、非图片文档。**

- 优先修改 `scripts/build-galaxy.js`，必要时新增 `electron-builder.galaxy.cjs`，以及 `.gitignore`。
- 可修复 `scripts/smoke-galaxy.js` / `src/galaxy-package-smoke.js` 中影响检查可靠性的代码。
- 可补充 `docs/guides/galaxy.md`、实现计划进度和执行说明。
- 不修改图片、图标、SVG、主题映射、视觉生成脚本或角色尺寸。这些由 Codex 负责。
- 不顺便重构 Agent 运行时。若发现与打包无关的隔离问题，写出文件、位置、影响和建议，交回 Codex。
- 不运行正常 `npm start` 或安装/卸载真实用户 Agent 集成；普通启动会自动同步 hooks。检查应使用下面已有的隔离 smoke 入口和临时目录。
- 不杀无关 Node/Electron/终端进程，不删除用户 `.clawd`、`.galaxy`、`.codex`、Pi 或 DSH 配置。

## 2. 已确认需求

- 基于 Clawd 制作独立 Windows x64 桌宠，名称 **Galaxy**。
- App ID `com.galaxy.deskpet`，用户数据 `%APPDATA%/Galaxy`，保留版本 `1.4.0`。
- 预期安装包：`dist-galaxy/Galaxy-Setup-1.4.0-x64.exe`，NSIS。
- 只展示/发现/同步 **Codex、Pi、DeepSeek Harness**。Pi 就是仓库现有扩展，DSH 保留 web/desktop profile。
- 保留桌宠核心功能、Dashboard、HUD、权限处理、主题和 mini mode；其他 Agent 源码可保留。
- 可以与 Clawd 并存，不改写或卸载 Clawd 管理的集成。
- Galaxy 不使用 Clawd 官方更新源，不自动更新到 Clawd。
- 原图画风：银白长发、青绿色点缀、黑色服装的插画角色，不做 Q 版或像素化。
- 首版素材已经制作：8 个状态姿势，SVG 包装实现呼吸/轻摆等整体动画；不是 Live2D，也不是完整骨骼动作。不要把这个限制写成已实现全身连续动作。

规格和计划：

- `docs/superpowers/specs/2026-10-21-galaxy-desktop-pet-design.md`
- `docs/superpowers/plans/2026-10-21-galaxy-desktop-pet.md`

计划中的 checklist 尚未同步实际进度，以代码和检查证据为准。规格仍有“待审阅”的历史文字，用户实际上已经批准执行，可以更新。

## 3. 当前实现地图（不要重复实现）

| 领域 | 已有实现 |
| --- | --- |
| 产品边界 | `src/product-variant.js`：通过打包 metadata、`GALAXY_VARIANT=1` 或 appName 识别 Galaxy，允许 IDs 为 codex/pi/deepseek-harness |
| 启动身份 | `src/main.js` 最前面设置 Galaxy 名称、userData、Windows AppUserModelId；偏好文件 `galaxy-prefs.json` |
| Agent 收口 | `agents/registry.js`、`src/agent-gate.js`、`src/integration-sync.js`、Doctor/settings；共享 recap 显式策略仍基于完整 registry |
| 更新关闭 | `src/updater.js` Galaxy 提前返回 disabled/no-op；About 页面隐藏更新入口 |
| 打包 | `scripts/build-galaxy.js` 导出 `createGalaxyBuildConfig()`；package.json 已有 `build:galaxy:win:x64` |
| 卸载 | `build/galaxy-installer.nsh` 使用 Galaxy 运行时调用 `hooks/cleanup-integrations.js`，后者只处理 Galaxy 的三个 Agent |
| Codex | 独立 `hooks/galaxy-codex-bridge.js` marker；不能改成 `galaxy-codex-hook.js`，因为原 Clawd 用 `codex-hook.js` 子串判定所有权，可能误删 |
| Pi | 独立 `galaxy-desktop-pet` 扩展目录/owner；生成的扩展内固定 Galaxy 身份，不污染 Pi 宿主全局 env |
| DSH | 独立包 `@dsh-external/dsh-galaxy-bridge`、owner、manifest 和 `.galaxy` managed generation，源变换和 hash 校验已对齐 |
| 传输隔离 | Galaxy 23433–23437，Clawd 23333–23337；runtime/history/recovery/recap 等使用 `.galaxy`；响应 server ID galaxy，header 名仍 x-clawd-server |
| 协议 | Galaxy 只注册 `galaxy://`，解析器兼容导入 `clawd://`；不抢 Clawd 默认协议关联 |
| 远程/WSL | `.galaxy` 部署布局、Galaxy env/port，Galaxy 跳过 Claude/Copilot/Hermes 安装路径；尚未在真实远程机器验证 |
| 素材 | `assets/galaxy/`、`assets/svg/galaxy-*`、`themes/galaxy/theme.json`，请勿修改 |

## 4. 首要任务：排除打包失败并产出 EXE

### 环境已就绪的部分

- Windows PowerShell；Node `v24.20.0`，npm `11.19.0`。
- 依赖已安装。不要无理由重新 npm ci（会丢失当前手动准备好的 Electron）。
- Electron `41.10.4` 已下载并按 `node_modules/electron/checksums.json` 验证 SHA-256，解压到 `node_modules/electron/dist`。
- `node scripts/verify-electron-install.js` 已通过。
- 下载 zip 是根目录 `.tmp-electron-win32-x64.zip`。不要作为发行文件提交。
- build config 已设置本地 `electronDist`，无需再次联网下载 Electron。

### 当前失败

最近一次打包到复制 extraResources 时失败：

```text
EBUSY: resource busy or locked, copyfile
assets/galaxy/icon.ico -> dist-galaxy/win-unpacked/resources/icon.ico
```

`dist-galaxy/win-unpacked` 是失败后留下的部分产物，不代表打包成功。`resources/app.asar` 已存在，内含 Galaxy metadata；**最终 NSIS EXE 尚未成功生成**。

### 有证据支持的排查方向（仍需你验证）

`scripts/build-galaxy.js` 当前：

```js
await build({
  targets: Platform.WINDOWS.createTarget('nsis', Arch.x64),
  config: createGalaxyBuildConfig(),
});
```

`createGalaxyBuildConfig()` 已经手工继承 `package.json.build`，并把原 icon.ico 的 extraResources 条目替换成 Galaxy 图标。

但本地 `node_modules/app-builder-lib/out/util/config/config.js` 的 `getConfig()` 会在没有 configPath 时先读 package.json build，再 merge programmatic object；`util/config/load.js` 则说明传明确 configPath 会直接读取配置文件。这可能造成重复继承数组、两个源向同一个 `resources/icon.ico` 并发复制。

建议首先验证合并结果，若确认，改成独立配置文件入口：

1. 新增 `electron-builder.galaxy.cjs`，导出函数，返回 `require('./scripts/build-galaxy').createGalaxyBuildConfig()`。
2. main 的 build 参数传这个配置文件的绝对路径字符串，使 builder 不再次继承 package.json build。
3. 保留 createGalaxyBuildConfig 导出和 `require.main === module` guard；导入它不能触发打包。
4. 检查最终 effective config：只有一个目标 `icon.ico`，`publish` 不指向 Clawd，产品 metadata/NSIS include/协议均为 Galaxy。
5. 若仍 EBUSY，检查是否存在本次任务自己的残留打包进程/文件句柄，勿盲目结束其他进程。

这是排查假设，不能未验证就声称已找到根因。

### 打包命令

```powershell
# 在上述 Galaxy worktree 内执行；镜像仅设置到当前进程
$env:ELECTRON_BUILDER_BINARIES_MIRROR = 'https://registry.npmmirror.com/-/binary/electron-builder-binaries/'
npm run build:galaxy:win:x64
```

可能仍需下载 NSIS/winCodeSign 工具。按具体错误处理，不要关闭 asar 完整性或原生依赖审计来掩盖问题。未配置签名证书，最终应说明这是未签名的本地构建。

**成功判定：** builder 正常结束、实际存在本次生成的目标 EXE，记录时间/大小/SHA-256。上次命令打印 error 但工具返回 exit 0，不能只信退出码。可增强脚本：检查 build 返回的 artifacts 和实际文件，失败不能伪报成功；避免把旧 EXE 当作新产物。

`.gitignore` 尚缺 `dist-galaxy/`，请补充；不要提交安装包、解包目录或 smoke 用户数据。

## 5. 打包后检查（不编辑图片）

现有脚本：

- `scripts/smoke-galaxy.js`
- `src/galaxy-package-smoke.js`
- `src/galaxy-preview.html`
- package script `npm run smoke:galaxy`

工作方式：启动 `dist-galaxy/win-unpacked/Galaxy.exe --galaxy-smoke-result=<绝对路径>`，主进程在正常 runtime 启动前进入专用检查分支。此分支不安装 Agent hooks、不注册用户协议。userData 放在输出目录内的测试 home。

它检查 metadata、x64 PE、无 app-update.yml、应用名、默认主题、三个 Agent 和 updater disabled，然后用隐藏窗口加载已有动画，输出：

- `dist-galaxy/smoke/result.json`
- `dist-galaxy/smoke/galaxy-preview.png`

你可以运行这个检查并修复检查代码本身的必要问题，但不要因渲染失败去改角色图片/主题，请把证据交回 Codex。截图保存即可，Codex 做视觉审阅。

**先审查检查可靠性：** runner 目前可能读取上次遗留的 result.json；应在本次启动前清除自己的精确旧结果，或使用唯一 runId/输出路径验证，不能误认旧结果通过。只可删除自己生成的结果文件，不递归清用户目录。

如需原生包审计，先读取 `scripts/native-package-policy.json` 确定 target-id，再使用仓库已有 audit 命令。

检查范围说明必须准确：此 smoke 覆盖解包版的身份/资源加载等；不等于已实际点击 NSIS 安装/卸载，也不等于验证真实 Codex/Pi/DSH 事件全链路。不得虚报。

## 6. 已有验证记录与已知基线问题

以下是 Codex 已运行的记录，不是要求全部重跑；接手后针对修改选择检查，遵循当前用户和运行环境的测试要求。

- `node --test test/galaxy-product.test.js`：7 通过，覆盖 registry/gate、Codex/Pi 所有权、build config、传输布局和 DSH generation/hash。
- 一批核心文件回归：184 通过；另一批 updater/server-id/settings icon 检查：93 通过。
- `node --test test/settings-window.test.js`：修复误加 Clawd additionalArguments 后，38 通过。
- 较大回归记录 `.tmp-galaxy-regressions.txt`：1072 项，1048 通过，7 失败，17 跳过。当时其中 2 项 settings-window 回归已修复并单独重跑通过。
- 余下 4 项是此 Windows 环境无法创建 symlink 的 EPERM（agent-installation-detector），不是已证明的 Galaxy 回归。
- 另 1 项 DSH 测试 `managed residue isolation preserves a foreign link swapped before unlink` 失败（expected error / actual ok）；用未修改 HEAD 的 dsh-install 源复现，日志 `.tmp-galaxy-baseline.txt`。不要随意改业务代码来压住此基线失败。
- `node scripts/validate-theme.js themes/galaxy --assets assets/svg`：usable，1 条共享素材目录存在未引用旧 Clawd assets 的提示。
- 早先 `git diff --check` 和 35 个已改 JS 的语法检查通过；新修改需重新核查适当范围。

临时基线复现文件仍在：`hooks/.tmp-dsh-baseline.js`、`test/.tmp-dsh-baseline.test.js`。可删除这两个精确文件，避免后续测试误收集；不要扩大删除范围。

当前不要执行实际 Agent install/uninstall 命令。需要所有权证据时使用现有临时目录单元检查。

## 7. 文档任务

补充 `docs/guides/galaxy.md`：

1. 项目名称、仅支持的三个 Agent、Windows x64。
2. 构建命令和实际产物位置。
3. `%APPDATA%/Galaxy`、`.galaxy`、23433–23437、galaxy://，说明与 Clawd 分离。
4. Pi/DSH 从 Settings 显式安装；不要教用户去跑原始 Clawd 安装脚本。
5. Galaxy 未启用官方更新源；未来升级使用 Galaxy 安装包。
6. 未签名构建事实、已验证范围、未验证的真实远程及 Agent 环境。
7. 原画角色的首版动画限制，只描述事实，不许宣称 Live2D/骨骼动画。

同步规格执行状态、计划 checklist 和差异：实际使用 JS/CJS build config；注册 galaxy:// 而非抢 clawd://；独立端口范围；保留 shared runtime。

素材来源和生成 prompt 说明由 Codex 补充，你不需要生成或推测图片 prompt。

## 8. 交回结果格式

完成后给 Codex 一份简洁结果，包含：

1. 修改了哪些文件，改动目的。
2. 打包失败的已验证根因及修复方式（区分确认与推测）。
3. EXE 的绝对路径、字节数、SHA-256、是否签名。
4. 实际执行的命令、结果和未通过项；给日志/JSON/截图的绝对路径。
5. 是否触碰真实用户 Agent 配置（按任务应为没有）。
6. 未完成项和需 Codex 处理的视觉/运行时问题。

不创建 GitHub PR，不推送，不上传，不隐藏错误，不把部分产物称为成功安装包。保留工作区修改，让 Codex 最后整合审阅。
