# Changelog

## v0.1.4

新增面向使用者的交接笔记(中英双语,时机为主线、注意事项为重点),README 增加对应章节,AI 一键安装完成后会主动引导用户阅读。

### Added

- **交接笔记 `docs/handoff-notes.md`(中文)与 `docs/handoff-notes.en.md`(英文)**。讲清"人为交接"这件事:为什么交接要由人主动触发(自动压缩也在替你"总结",但它不认识你的任务)、四类时机与两类不必交接的场合、以及交接前 / 中 / 后各自的注意事项(先 `/checkpoint` 再 `/handoff`、留上下文余量、中途交接的 `Next` 要可执行、交接后读报告确认落点)。
- **README 新增「交接的时机与注意事项」一节**(中英双语),概括时机并列出四条注意事项。
- **安装引导**:AI 按 `INSTALL-FOR-AI.md` 完成安装后,须主动向用户说明交接三要点并指向交接笔记;README「方式 1」的安装提示词同步补上这一句。

### Fixed

- `INSTALL-FOR-AI.md` 离线示例里的版本号更新(此前停留在 v0.1.0)。

### Changed

- 打包清单与核验清单纳入 `docs/handoff-notes.md` 与 `docs/handoff-notes.en.md`(23 → 25 项)。
- `docs/user-guide.md` 的「什么时候该交接」一节改为指向交接笔记,两处不再各讲一套。

## v0.1.3

会话标题改写的两个修正:标题不再被客户端冲回旧值,且改完**当场生效**(不必重启客户端)。

### Added

- **侧边栏免刷新**:改完数据库后,脚本再经 CDP 调用客户端自己的 `zcodeTaskService.renameTask`——它会广播 `task_title_changed`,侧边栏当场更新,不用再重启客户端或切换工作区。该服务只存在于渲染层的 React context(`window.zcode` 未暴露、也没有对应 IPC 频道),脚本从侧边栏任务条目的 React fiber 向上取到它;任一环不可得(客户端未带 `--remote-debugging-port`、版本内部结构变化)就自动跳过,数据库改写仍是保底路径,行为退回"下次重启可见"。`--no-live` 可显式跳过这一步。

### Fixed

- **标题被客户端落盘冲回旧值**:脚本原先只改 `tasks.title` 列,而客户端在对话轮次结束时以该行 `meta_json` 为源重建任务行,会把标题改回 `/recall`(实测写入 11 秒后被改回),表现为"写库成功、重启后仍是旧标题"。现在 `meta_json.title` 与列一起改写,早退条件也放宽为"两个库都正确",被冲回的标题重跑一次命令即可修复(`skills/meow-recall/scripts/set-session-title.mjs`)。

## v0.1.2

`/recall` 载入记忆后自动改写会话标题,左栏不再显示 `/recall`;README 补齐英文版。

### Added

- **`/recall` 载入后自动改写会话标题**(`skills/meow-recall/scripts/set-session-title.mjs`)。`/recall` 只有 7 个字符,触发不了 ZCode 的标题生成(最小 10 字符守卫),左栏会永久停在 `/recall`;现在载入完成后用所选快照的概括改写标题——做法与 ZCode 官方 `restore-legacy-sessions` 插件一致(写 `title_source='custom'` 与 `title_overridden=1`,不会被客户端回滚)。侧边栏在下次打开客户端或切换工作区后显示新标题。
- **英文 README**(`README.en.md`),与中文版 1:1 对照;中文 `README.md` 顶部加语言切换行。

### Changed

- 发布回归校验新增"README 中英两份齐全且互链";打包清单与核验清单纳入 `README.en.md` 与会话标题脚本。

## v0.1.1

规则修正版本。对 v0.1.0 发布后实际使用中暴露的问题做了一次全面修复(20 项),并补上 Markdown 版实测报告。

### Added

- **Token 节省与档位成本实测报告**(`docs/token-report.md`)。10 个隔离实验的完整数据、方法与口径;README 新增"效果实测"段落。

### Fixed

- **规则冲突**:取消"文件名空格转连字符"(与"`summary` 与文件名同源"的自检互斥,实际 4/5 份快照无法满足),明确同源 = 文件名由 `summary` 清洗导出。
- **档位确认**:补非交互条款——无人在场 / headless 时按推荐档位继续,不再卡在等待确认。
- **`d1` 的出路**:`tidy` 会列出长期未吸收的 `active` 快照、征询后归档,避免只用 `d1` 时快照无界增长。
- **INDEX 收口**:写入前必须重读;已完成任务必须移除;详情指针失效必须重指;只列真实存在的快照。
- **并发防护**:新增"并发与冲突"一节(写前重读、只做增量、以事实为准、跨机器先 pull)。
- **`/recall` 交互**:补选项式提问的等价写法与非交互处置;多选与摘要行数上限的冲突改为压缩而非回退。
- **触发词前置**:交接技能的 description 精简,避免口语触发词被客户端截断。
- **计时锚点**:归档条件统一按 `created` 计(原骨架写"`absorbed` 超 14 天",而快照没有吸收时间字段)。
- **细则补全**:Windows 保留名与文件名长度上限、档位边界写法(`d3 s1`、`s1 3`)、别名表补 `d2`、单一来源清单补安装副本与发布 zip、分层文件可新增小节、分支操作提醒。

## v0.1.0

首发。把会话记忆变成可带走的资产:收尾用 `/handoff` 把本窗口有价值的信息总结后写入分层 Markdown 记忆库(`.zcode/memory/`),新窗口用 `/recall` 按时间浏览历史交接快照并选择载入,继续上一个任务。纯 Markdown 技能,零运行时依赖。

### Added

- **两条指令**(`/handoff`、`/recall`)。口语触发同样生效("交接一下""接着上次")。
- **双轴档位**。速度轴 `s1` 速度 / `s2` 平衡 / `s3` 质量(用户指定,默认 `s2`)决定压缩过程多快;深度轴 `d1` 节约 / `d2` 平衡 / `d3` 深度(默认 AI 按上下文量推荐)决定记多深。支持 `/handoff s1`、`/handoff s1d3`、`/handoff d2` 等写法。
- **档位骨架文档**(`docs/tier-system.md`)。双轴定义、9 组合行为矩阵、调用语法与扩展规则,作为实现的唯一依据。
- **记忆库分层结构**。`INDEX.md` 索引、`project.md` / `facts.md` / `decisions.md` / `lessons.md` 分层文件、`handoffs/` 快照(`<概括>.memo.md`)、`archive/` 归档;frontmatter 四字段(summary/created/updated/status)。
- **防乱机制**。行数硬上限(索引 80 / 快照 150 / 分层文件 120)、`active → absorbed → archived` 生命周期、14 天自动归档、归档一律 `git mv` 永不删除、`/handoff tidy` 手动整理。
- **技能自包含**。`skills/meow-handoff/` 内含格式规范与初始化模板,安装即复制,无组装步骤。
- **安装脚本**(`scripts/install.ps1`)。支持目标仓库安装与用户级全局安装,幂等可重复执行。

## License

MIT
