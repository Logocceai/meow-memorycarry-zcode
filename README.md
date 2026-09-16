# meow-memorycarry-zcode

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

## 效果实测

在隔离实验仓库上跑了 10 个实验(10/10 成功),对比"有记忆 recall"与"无记忆重新探索项目":

| 场景 | output token | 墙钟 |
|---|---|---|
| 短上下文:无记忆 → 有记忆 | 6,330 → 1,718(**-72.9%**) | 52.6s → 32.1s |
| 长上下文:无记忆 → 有记忆 | 10,609 → 2,676(**-74.8%**) | 87.2s → 39.1s |

三档成本:短素材下 `s1` 比 `s3` 墙钟快 31.1%(104.4s vs 151.5s)。

完整数据、方法与口径见 → [Token 节省与档位成本实测](docs/token-report.md)

## 安装

### 方式 1 — 让 AI 一键安装(推荐)

把下面这句话发给 ZCode 里的 AI:

```text
把这个插件装到当前仓库:https://github.com/Logocceai/meow-memorycarry-zcode
按仓库里的 INSTALL-FOR-AI.md 执行。
```

AI 会运行仓库根的 `scripts/install.ps1`,把技能与命令装进 `<仓库根>/.zcode/`;装完开个新窗口,`/handoff`、`/recall` 即可用(说"交接一下""接着上次"等口语也能触发)。

### 方式 2 — 手动运行脚本

```powershell
# 装到当前仓库(在仓库根执行)
powershell -ExecutionPolicy Bypass -File scripts/install.ps1

# 用户级安装:所有仓库全局可用
powershell -ExecutionPolicy Bypass -File scripts/install.ps1 -Target $env:USERPROFILE
```

脚本幂等,重复执行即覆盖更新。

### 方式 3 — 插件市场 / 离线 zip

| 方式 | 做法 |
|---|---|
| 插件市场 | ZCode → Settings → Plugin Management → Discover → `+` 添加市场 → 粘贴 `https://github.com/Logocceai/meow-memorycarry-zcode` → Get |
| 离线 zip | 下载 Release 附件的 zip,解压后把解压出的文件夹添加为市场 |

市场安装后需重启 ZCode 才生效。它不作为首选的原因见下。

### ZCode 插件系统当前限制

- **市场安装依赖能访问 GitHub**:网络不可达或市场源缺失时无法更新(ZCode 内置提示:插件仍可使用,但暂时无法更新)。
- **插件缓存目录是无公开文档的内部格式**:安装与更新只能通过 UI 点击完成,无法用脚本或 CLI 驱动——仓库级/用户级自动化安装只能走本仓库的 `scripts/install.ps1`(方式 1 / 2)。

AI 代理安装请读 [INSTALL-FOR-AI.md](INSTALL-FOR-AI.md)。

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
- [Token 节省与档位成本实测](docs/token-report.md) — 10 个隔离实验的数据、方法与口径
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
docs/token-report.md        # Token 节省与档位成本实测报告
docs/releasing.md           # 发布流程
```

## Roadmap

- [ ] codex 接入:技能放 `~/.agents/skills/`(开放标准,ZCode/Codex 共读),可选 SessionStart/Stop hooks
- [ ] dsh 接入:AGENTS.md 约定片段,与 dsh-meow-memory 互补(后者管注入与检索,本插件管交接文件规范)
- [ ] 全局用户级记忆层(用户偏好,跨项目)
