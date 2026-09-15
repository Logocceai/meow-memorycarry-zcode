# meow-memorycarry-zcode

让 AI 编码代理把一个窗口(会话)有价值的信息**总结后规范化带走**,新窗口用指令载入记忆,更好地继续下一个任务。

- 创建日期:2026-09-15
- 技术栈:无运行时依赖(纯 Markdown 技能 + PowerShell 安装脚本),v1 目标平台 ZCode
- 设计借鉴:[dsh-meow-memory](https://github.com/Phant0Meow/dsh-meow-memory) 的分层记忆与 dream 整理思想

## 解决什么问题

换窗口 = 丢上下文。会话接近上下文上限、或一个任务收尾要开新窗口时,有价值的信息(决策、教训、断点)只留在旧窗口里。本插件提供两条指令:

| 指令 | 时机 | 做什么 |
|---|---|---|
| `/handoff` | 会话收尾 | 总结本窗口有价值信息 → 合并进分层记忆文件 → 生成一份交接快照 → 归档已被吸收的旧快照 |
| `/recall` | 新窗口开始 | 读记忆库 → 输出上次进度摘要与下一步建议 → 确认继续点后动工 |

触发方式为**指令触发**(非 hook 自动注入):记忆摘要必须总结精炼后保存,新窗口由用户显式调用来载入,可控且省 token。

## 快速开始

```powershell
# 在目标仓库根执行(默认安装到当前工作区仓库)
pwsh projects/meow-memorycarry-zcode/scripts/install.ps1
# 或安装到其他仓库
pwsh projects/meow-memorycarry-zcode/scripts/install.ps1 -Target <其他仓库根>
```

安装内容:

- `.zcode/skills/meow-handoff/` — 收尾交接技能(含 `docs/format-spec.md` 格式规范与 `templates/` 初始化模板)
- `.zcode/skills/meow-recall/` — 记忆载入技能
- `.zcode/commands/handoff.md`、`recall.md` — `/handoff`、`/recall` 短名入口

之后在 ZCode 会话里:`/handoff` 收尾、`/handoff tidy` 整理、`/recall` 续接;说"交接一下""接着上次"等口语也能触发。

## 记忆库

位置 `<仓库根>/.zcode/memory/`,格式规范见 [docs/format-spec.md](docs/format-spec.md)。要点:

```
.zcode/memory/
├── INDEX.md      # 唯一入口,≤80 行:活跃任务、下一步、最近快照
├── project.md    # 项目目标与进行中任务
├── facts.md      # 原子事实:路径、命令、版本、环境
├── decisions.md  # 已拍板决策 + 理由(append-only)
├── lessons.md    # 踩坑与修复教训
├── handoffs/     # 交接快照:YYYYMMDD-HHMM-<主题>.md,六节固定结构
└── archive/      # 已吸收且超 14 天的快照,git mv 归档,永不删除
```

防乱机制:一条一事带日期、行数硬上限、`active → absorbed → archived` 生命周期、清理用 `git mv` 保留历史。记忆库纳入 git,跨机器同步、历史可回滚。

## Roadmap

- [ ] codex 接入:技能放 `~/.agents/skills/`(开放标准,ZCode/Codex 共读),可选 SessionStart/Stop hooks
- [ ] dsh 接入:AGENTS.md 约定片段,与 dsh-meow-memory 互补(后者管注入与检索,本插件管交接文件规范)
- [ ] 全局用户级记忆层(用户偏好,跨项目)

## 运行方式

纯 Markdown 技能,无构建步骤;`scripts/install.ps1` 即安装。修改技能后重跑安装脚本覆盖更新,再用 `/checkpoint` 提交。
