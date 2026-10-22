# Galaxy 桌面宠物设计规格

**状态：已获用户批准执行（2026-10-21）；实际实施与下方描述的差异见文末「实施状态」**

**日期：2026-10-21**

## 目标

基于 Clawd on Desk 制作一款名为 **Galaxy** 的 Windows x64 桌面宠物应用，提供可独立安装的 `.exe` 安装程序。Galaxy 沿用项目成熟的桌宠状态、窗口、设置和会话展示能力，以用户提供的角色图片作为默认桌宠及后续动作素材的唯一视觉基准。

Galaxy 保留项目现有的 Pi 扩展、Codex 集成和 DeepSeek Harness 集成；其他 Agent 不出现在 Galaxy 的 Agent 设置页，也不会被 Galaxy 启动发现或自动同步。未使用的通用运行时代码留在源码中。

## 已确认的产品决策

- 应用显示名称：`Galaxy`。
- 目标平台：Windows x64。
- 交付物：electron-builder NSIS 安装程序，文件名形式为 `Galaxy-Setup-<version>-x64.exe`。
- Galaxy 使用独立的应用 ID 和 `%APPDATA%` 数据目录，可与 Clawd on Desk 分开安装。
- Galaxy 不读取 Clawd on Desk 的更新源；在 Galaxy 有自己的更新发布渠道前，关闭 Galaxy 的自动更新和更新入口。
- 角色动作保持参考图的原有插画画风，不改成像素风或 Q 版。银白长发、青绿色点缀、黑青服饰和发饰标记是需要持续保留的识别特征。
- 本阶段只制作本地 Windows 安装包，不向 GitHub 发布安装程序或建立 Galaxy 更新源。

## 应用结构与身份

Galaxy 复用 Clawd 的 Electron 主进程、桌宠状态机、双窗口渲染、设置、HUD/Dashboard、主题加载器及原有权限气泡行为。应用身份独立于 Clawd：产品名为 Galaxy，应用 ID 使用专属值（建议 `com.galaxy.deskpet`），用户数据路径显式设为 `%APPDATA%/Galaxy`，避免由上游默认值推导。

为避免影响 Clawd 的正式构建，Galaxy 使用独立的 electron-builder 配置和构建命令。Windows x64 使用 NSIS 目标，安装器、卸载器、开始菜单和任务栏显示 Galaxy 图标与名称。暂不构建 macOS/Linux 版本。

Galaxy 的更新功能在没有自有发布源时保持关闭，不能请求或安装 Clawd on Desk 的版本。Galaxy 注册自己的 `galaxy://` 协议，导入解析器同时接受 `clawd://` 链接，因此既有导入链接仍然可用，同时不接手 Clawd 的默认协议关联。

上游 AGPL-3.0 与素材归属说明继续保留。Galaxy 的角色素材只基于用户在本任务中提供的参考图创作；没有另行授权时，不把 Galaxy 安装包发布给其他用户。

## Agent 范围

Galaxy 的 Agent 设置目录只包含以下项目现有集成：

| Agent | Galaxy 中的范围 |
|---|---|
| Codex | 保留仓库当前 Codex 安装与状态跟踪路径，包括项目现有的本机、WSL 和 Remote SSH 支持；Codex 权限行为沿用现有实现 |
| Pi | 保留仓库现有 Pi 全局扩展；继续采用 state-only 行为，不新增权限气泡 |
| DeepSeek Harness | 保留现有 `deepseek-harness` 集成的 Web 与桌面 profile，以及项目当前版本门控和审批行为 |

Galaxy 只为上述 Agent 建立 Agent 设置行、安装入口、启动自动同步和状态路由。其他 Agent 不出现在 Galaxy 设置页，Galaxy 不为其执行安装、自动发现或同步；这些集成的通用代码仍留在源码中，避免为精简产品重写共享状态机。Galaxy 的选择范围不影响 Clawd on Desk 本身。

Codex 继续沿用项目默认的自动安装/启用行为。Pi 与 DeepSeek Harness 保持现有显式安装流程：Galaxy 显示各自安装状态，由用户在设置中安装后再同步，不在首次启动时静默写入 Pi 或 DSH 配置。

三个集成仍复用项目现有 hooks、协议和运行时契约；本次不改 Pi、Codex、DSH 的会话语义或权限决策。实现阶段必须验证 Galaxy 的应用数据隔离与现有 integration ownership/endpoint 共存，不得让 Galaxy 卸载或覆盖 Clawd 管理的外部配置。

## 角色和动作素材

新增内置 `galaxy` 主题，并作为 Galaxy 默认主题。角色以用户提供的透明背景插画为唯一基准，先建立一张稳定的视觉参照，再按相同画风绘制或生成动作帧。动画中须保持发型轮廓、青绿挑染、服饰剪裁、发饰标记、脸部比例和配色连续，避免状态之间变成不同角色。

首版主题覆盖桌宠常用状态：

- 待机、思考、工作
- 任务完成、错误/提醒
- 睡觉、唤醒
- 点击、拖拽反应

动作图使用主题系统支持的透明帧/整身动画。首版实现为 8 个状态姿势的插画包在 SVG 中，做整身呼吸与轻摆动画；不是 Live2D，也不是骨骼动作。全部共享一致的逻辑画布和角色落点。默认关闭眼球追踪，避免将无法交互的 APNG 错配为眼动 SVG。配置正确的内容边界、基线与命中区域，使角色在桌面宠物尺寸下清楚、位置稳定。角色展示动画与 Windows 应用图标分开制作；应用图标采用可在小尺寸识别的头像裁切/简化图形。

Galaxy 默认展示 Galaxy 主题；保留主题设置和用户主题导入能力，不改变 Clawd 的主题运行时。

## 构建和交付

新增 Galaxy 专用的 Windows x64 构建入口和 electron-builder 配置。执行后产出 Galaxy NSIS `.exe` 安装包，默认安装位置可由用户选择。构建不得修改 Clawd 正式构建的 `appId`、产品名、发布仓库或更新配置。

交付时提供可点击的安装包文件路径、构建版本和必要的安装说明。不开 GitHub Release，不上传二进制，不配置自动更新服务。

## 验收条件

1. Galaxy 安装程序名称、安装目录、应用图标、任务栏名称和数据目录均与 Clawd on Desk 区分。
2. Galaxy 可以与 Clawd 分别安装、启动和保存设置；Galaxy 不触发 Clawd 官方更新。
3. Galaxy 的 Agent 设置页和启动同步只包含 Pi、Codex、DeepSeek Harness；其他 Agent 不被自动安装或同步。
4. Codex 的现有集成可用；Pi 可通过设置显式安装；DSH Web 与桌面 profile 均可通过现有流程显式安装。
5. Galaxy 启动后默认显示参考图画风的 Galaxy 角色；常用状态及点击/拖拽反应均由同一角色素材驱动。
6. Galaxy NSIS x64 构建成功，安装后可启动、退出并重新打开；Clawd 正式构建配置与外部 integration ownership 不被改变。

## 验证方案

- 运行 Galaxy 专用构建命令，确认生成的 Windows x64 NSIS 安装程序和元数据使用 Galaxy 身份。
- 安装并启动打包后的 Galaxy，核对独立数据目录、默认角色、主题资源和 Agent 设置范围。
- 在可用环境中分别核对 Codex、Pi 与 DeepSeek Harness 的安装/状态路径，并检查 Clawd 正式版相关配置未被 Galaxy 卸载或覆盖。
- 不将源码运行结果当作安装包验证；不发布安装包或配置上游更新源。

## 非目标

- 不修改或重新设计 Clawd 的桌宠状态机、窗口架构、Agent 协议和权限政策。
- 不在 Galaxy 中提供除 Pi、Codex、DeepSeek Harness 之外的 Agent 设置或安装入口。
- 不从源码仓库删除未选中的 Agent 通用实现。
- 不将角色改绘为像素风或 Q 版。
- 不添加 Galaxy 云端服务、自动更新托管或公开发行流程。

## 实施状态（2026-10-21）

本节记录实际落地与上文描述的差异，以代码和检查证据为准。

| 领域 | 实际实现 |
| --- | --- |
| 构建入口 | `scripts/build-galaxy.js` + 仓库根 `electron-builder.galaxy.cjs`（CJS 配置文件，不是 `.yml`）。使用配置文件是因为 electron-builder 在没有 config path 时会把 `package.json` 的 `build` 深合并进来，数组合并会复制两份 `resources/icon.ico`（EBUSY）并把 `clawd://` 带进 Galaxy |
| 构建校验 | 打包前后都做断言：有效配置（`publish: null`、唯一 icon 来源、只有 `galaxy://`、NSIS x64、Galaxy 元数据/图标/include）与本次产物（存在、非空、本次写入、x64 解包程序、无 `app-update.yml`、asar 元数据为 Galaxy） |
| 协议 | 只注册 `galaxy://`；导入解析器同时接受 `galaxy:` 与 `clawd:` 链接，不接手 Clawd 的默认协议关联 |
| 传输与数据 | `127.0.0.1:23433-23437`（Clawd 保持 `23333-23337`）；`%APPDATA%/Galaxy`、`galaxy-prefs.json`、`~/.galaxy` |
| 共享运行时 | 状态机、双窗口、设置、HUD/Dashboard、权限链路沿用 Clawd 实现，只通过 product variant 收口 |
| 素材 | 8 个状态姿势（idle / thinking / working / wave / complete / alert / sleeping / waking）包在 SVG 里做整身呼吸与轻摆；点击、拖拽、双击复用已有姿势。不是 Live2D，也不是骨骼动画；眼球追踪关闭 |
| 打包检查 | `scripts/smoke-galaxy.js` 用唯一 runId 校验结果与截图，不信任上次遗留的 `result.json`；检查期间不重定向 `%APPDATA%`（Electron 会因此 `Failed to get 'appData' path`） |

已验证：Galaxy NSIS x64 构建完成（`dist-galaxy/Galaxy-Setup-1.4.0-x64.exe`，
133,954,524 字节，SHA-256 `8da21ccd…2c854`），内含 x64 应用（NSIS 引导程序自身为 ia32），asar
元数据为 Galaxy、无更新源，打包检查（身份、默认 `galaxy` 主题、三 Agent 目录、
更新关闭、动画在动）通过；安装包未签名（没有配置证书），升级只能靠重新安装新的
Galaxy 安装包。

未验证：点击安装/卸载、覆盖升级、真实 Codex / Pi / DeepSeek Harness 事件与审批往返、
真实 Remote SSH / WSL 主机。

视觉审阅：已查看 atlas 与打包后待机截图，使用清理后的 v2 素材，减少了大片杂边；
细发丝附近仍有浅色边缘和少量色点，极端动作构图较紧。素材来源和限制见
`assets/galaxy/README.md`。新版安装包已重新构建，打包检查再次通过。

已知运行时注意事项：`src/main.js` 在设置产品身份时调用
`app.getPath("appData")`；如果运行环境无法解析 Windows 漫游 AppData 目录，
Galaxy 会在启动阶段直接失败，而不是回退到 Electron 默认的 `userData` 路径。

核验记录（2026-10-21 23:45，只读）：

- 签名：安装包、解包程序、本机已安装的 `Galaxy.exe` 与 `Uninstall Galaxy.exe`
  经 Authenticode 校验均为 `NotSigned`（无签名者证书，PE 安全目录 VA/Size 均为 0），
  构建配置里也没有 `sign` / `certificateFile` / `signtoolOptions` 等签名项，属于
  “设计上不签名”，不是漏执行。
- 安装与联动：本机已存在一份真实安装（`D:\galaxy`，开始菜单快捷方式、HKCU 卸载项
  `Galaxy 1.4.0`、9 个 `Galaxy.exe` 进程、`127.0.0.1:23433` 有响应而 23333 无监听），
  Codex 与 Pi 的联动也已写入真实用户配置（`~/.codex/hooks.json` 全部为
  `galaxy-codex-bridge.js` 条目；`~/.pi/agent/extensions/galaxy-desktop-pet` 带
  `app: galaxy` 标记）。因此上面的“未验证：点击安装/卸载”需要拆开看：**安装**已在
  本机实际发生（但不是本仓库的可复现验证）；**卸载**仍未验证（卸载器与注册项都还在，
  从未运行过）；**DeepSeek Harness 联动**仍未验证（磁盘上无 `dsh-galaxy-bridge`
  引用）；真实事件/审批往返与 Clawd 共存也仍无证据。
