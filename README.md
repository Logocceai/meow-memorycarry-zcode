# meow-memorycarry

让 AI 编码代理把一个窗口(会话)有价值的信息**总结后规范化带走**,新窗口用指令载入记忆,更好地继续下一个任务。ZCode 插件,纯 Markdown 技能,零运行时依赖。

- 设计借鉴:[dsh-meow-memory](https://github.com/Phant0Meow/dsh-meow-memory) 的分层记忆与 dream 整理思想
- License: MIT

## 解决什么问题

换窗口 = 丢上下文。会话接近上下文上限、或一个任务收尾要开新窗口时,有价值的信息(决策、教训、断点)只留在旧窗口里。本插件提供两条指令:

| 指令 | 时机 | 做什么 |
|---|---|---|
| `/handoff` | 会话收尾 | 总结本窗口信息并生成交接快照;双轴档位:速度轴 `s1` 速度 / `s2` 平衡 / `s3` 质量(默认 `s2`),深度轴 `d1` 节约 / `d2` 平衡 / `d3` 深度(默认 AI 按上下文量推荐) |
| `/recall` | 新窗口开始 | 按时间列出历史快照清单 → 你选择载入哪份 → 输出进度摘要与下一步建议 |

触发方式为**指令触发**(非 hook 自动注入):记忆摘要必须总结精炼后保存,新窗口由用户显式调用来载入,可控且省 token。

## 安装

| 方式 | 做法 | 适合 |
|---|---|---|
| 插件市场(推荐) | ZCode → Settings → Plugin Management → Discover → `+` 添加市场 → 粘贴 `https://github.com/Logocceai/meow-memorycarry` → Get | 所有人 |
| 离线 zip | 解压发布包,添加解压文件夹为市场 | 无网络 |
| 安装脚本 | `powershell -ExecutionPolicy Bypass -File scripts/install.ps1 [-Target <仓库根>]` | 有 shell 的仓库级/用户级安装 |

AI 代理安装请读 [INSTALL-FOR-AI.md](INSTALL-FOR-AI.md)。安装后重启 ZCode,`/handoff`、`/recall` 即可用(说"交接一下""接着上次"等口语也能触发)。

## 使用

```text
会话收尾:  /handoff        # 全默认:速度 s2 + AI 按上下文推荐深度
           /handoff s1     # 最快压缩(深度仍由 AI 决定)
           /handoff s1d3   # 连写:最快压缩 + 全量吸收
           /handoff d3     # 只定深度,速度默认 s2
           /handoff tidy   # 只整理记忆库,不新增
新窗口:    /recall         # 列出快照清单,输入序号选择
           /recall latest  # 直接载入最新一份
```

典型轮回:`/checkpoint`(提交代码)→ `/handoff`(带走记忆)→ 关窗口 → 新窗口 `/recall`(载入继续)。

## 记忆库

位置 `<仓库根>/.zcode/memory/`,随仓库提交 git,跨机器同步、历史可回滚:

```
.zcode/memory/
├── INDEX.md      # 唯一入口,≤80 行:活跃任务、下一步、最近快照
├── project.md    # 项目目标与进行中任务
├── facts.md      # 原子事实:路径、命令、版本、环境
├── decisions.md  # 已拍板决策 + 理由(append-only)
├── lessons.md    # 踩坑与修复教训
├── handoffs/     # 交接快照:<概括>.memo.md,六节固定结构
└── archive/      # 已吸收且超 14 天的快照,git mv 归档,永不删除
```

防乱机制:一条一事带日期、行数硬上限、`active → absorbed → archived` 生命周期、清理用 `git mv` 保留历史。

## 文档

- [使用手册](docs/user-guide.md) — 安装、两条指令的交互细节、档位选择、FAQ、命令速查
- [档位体系(骨架)](skills/meow-handoff/docs/tier-system.md) — 速度轴与深度轴的定义、9 组合行为矩阵、调用语法与扩展规则
- [记忆格式规范](skills/meow-handoff/docs/format-spec.md) — frontmatter、命名、行数上限、生命周期、档位与格式的关系
- [发布流程](docs/releasing.md) — 开发者:打包、核验、导出到独立仓库

## 项目结构

```
.zcode-plugin/plugin.json   # 插件清单
marketplace.json            # 市场索引(本仓库即单插件市场)
skills/meow-handoff/        # 交接技能(自包含:SKILL.md + docs/format-spec.md + templates/)
skills/meow-recall/         # 载入技能
commands/                   # /handoff 与 /recall 命令入口
scripts/install.ps1         # 安装脚本
scripts/package.mjs         # 打包脚本(生成发布 zip)
scripts/check-packages.mjs  # 发布包核验脚本
docs/user-guide.md          # 用户手册
docs/releasing.md           # 发布流程
```

## Roadmap

- [ ] codex 接入:技能放 `~/.agents/skills/`(开放标准,ZCode/Codex 共读),可选 SessionStart/Stop hooks
- [ ] dsh 接入:AGENTS.md 约定片段,与 dsh-meow-memory 互补(后者管注入与检索,本插件管交接文件规范)
- [ ] 全局用户级记忆层(用户偏好,跨项目)
