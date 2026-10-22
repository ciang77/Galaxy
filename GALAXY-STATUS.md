# Galaxy 工作快照（2026-10-22，按用户要求暂停）

## 当前可用版本

- 分支：`codex/galaxy-app-design`，远端 `https://github.com/ciang77/Galaxy.git`。
- Windows x64 独立应用、Galaxy 身份与数据隔离、Codex / Pi / DSH 范围、更新关闭、主题和打包脚本已实现。
- 最近构建：1.4.0，`dist-galaxy/Galaxy-Setup-1.4.0-x64.exe`，133,954,524 字节。
- SHA-256：`8da21ccd016846c089671b3040dfb83127a001b7423c5f9527a9f944cbf2c854`。
- 安装包未签名；安装包、依赖、临时日志和本机用户配置不提交 Git。
- 构建与打包 smoke 的上轮结果详见 `docs/guides/galaxy.md` 和实施计划；不代表真实 Agent 全部场景或安装/卸载都已验证。

## 2026-10-22 用户反馈

Codex 桌面版联动不明显、角色呆滞、存在白边、拖拽不灵敏。

本轮只完成排查，**下面修复尚未实施**：

1. 启动本机已安装 Galaxy 后，从其真实 renderer 观察到本次 Codex 桌面版会话的逻辑状态 `working`，实际文件为 `galaxy-working.svg`，OBJECT 通道，未卡在 pending load。说明本轮运行中的状态到动作链路可通；昨天失联的确切原因尚未复现，不能宣布已修复。
2. Codex 桌面版 rollout 元数据 originator 为 `codex_work_desktop`，source 为 `vscode`。现有监听已经识别对应事件；当前会话日志约 46 MB，启动读取/历史回放是后续排查延迟的候选，尚未证明根因。
3. 当前主题 attention 使用 wave，notification 使用 complete；与完成/等待提醒语义不符，应根据 `docs/guides/state-mapping.md` 修正。sweeping/carrying 等没有明确姿势，需要检查 fallback，避免压缩等状态看起来回到待机。
4. 工作动画只有整体轻摆，幅度很小。需要改善状态辨识和动作表现；不能把当前资产称作肢体/骨骼动画。
5. 当前默认 hitBox 为 x14/y12/w72/h85，头发及头顶可见区域部分在框外；睡眠 hitBox 从 y42 开始，与实际插画范围不符。实机默认输入区域约 156x184，而插画画布约 214x214。优先修正 Galaxy 主题几何，不盲目修改全局拖拽阈值。
6. 本轮图像工具生成了 `assets/galaxy/galaxy-character-sheet-v3-draft.png`。**仍有明显白边/色点，未通过视觉验收，不是正式素材，未接入资产管线或重打包。** 默认仍使用 v2。不得把该草稿说成白边已解决。
7. 源码目录里还有早期未使用的 `themes/galaxy/assets/*.png`（未提交、Galaxy 包也已排除），可能影响源码运行时的目录优先级。后续应清理或归档这些精确旧文件，避免 dev 和 packaged 资产路径不一致。

## 恢复时继续

- 先读取本文件、规格、实施计划及 AGENTS.md，不重新询问已确定的产品需求。
- 先处理 Galaxy 的状态映射与拖拽范围，再处理透明边缘和动作表现。
- 在真实 Codex 桌面会话中观察状态变化，并记录实际通过与未覆盖范围。
- 完成后再重建 EXE；当前 EXE 不包含以上待修项。
- 用户因系统维护要求暂停；在用户明确恢复前不要继续修复、生成或打包。

今日没有运行额外测试套件，没有自动批准 Codex hook 信任，没有改变权限决定策略。
