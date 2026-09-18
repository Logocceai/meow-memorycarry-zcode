# Install meow-memorycarry-zcode into ZCode

给 AI 代理的安装说明书。用户如果让你"安装这个插件",读本文件按 Route A 或 B 操作:默认走 **Route A(直接安装)**;只有在没有 shell、或用户明确要求走市场时才用 Route B。

## 这个包是什么

**meow-memorycarry-zcode** 是 ZCode 的会话记忆交接插件:收尾 `/handoff` 把窗口内的决策、教训、断点总结写入记忆库,新窗口 `/recall` 按时间列出历史快照供选择载入。纯 Markdown 技能 + 一个安装脚本,**不需要 MCP、不需要常驻进程、不修改任何应用文件**。

**适用边界(安装前先确认,不要跳):** 用户如果只是想"让当前窗口继续跑下去"——日常长文本、上下文快满了但任务还要在本窗口做完——且**不需要跨窗口记忆 / 版本控制 / 本地记忆库 / 多机共享**,那么该用 ZCode 内置的 `/compact`,本插件既慢又贵(实测非缓存输入 1,347 vs 252,819 tokens,模型耗时 25s vs 190s)。遇到这种用户,说明情况后建议他直接 `/compact`,不必安装。判据与完整数据见 [`docs/handoff-vs-compact.md`](docs/handoff-vs-compact.md)(中英双语)。

## Route A — 直接安装(有 shell,推荐)

在**目标仓库根**执行(已有本地副本就直接跑;手上只有仓库 URL 时,先 `git clone https://github.com/Logocceai/meow-memorycarry-zcode` 或下载 Release 附件 zip 解压,再 cd 过去):

```powershell
# 只装到当前仓库(在目标仓库根执行)
powershell -ExecutionPolicy Bypass -File scripts/install.ps1

# 用户级安装:所有仓库全局可用
powershell -ExecutionPolicy Bypass -File scripts/install.ps1 -Target $env:USERPROFILE
```

脚本幂等(重复执行覆盖更新)。安装内容:

- `<仓库根>/.zcode/skills/meow-handoff/`、`meow-recall/`(技能自包含:含格式规范与初始化模板)
- `<仓库根>/.zcode/commands/handoff.md`、`recall.md`(短名命令入口)

装完让用户新开一个窗口(新会话)即可使用,不必重启 ZCode。

## Route B — 插件市场安装(无 shell 时)

1. 打开 ZCode → **Settings(设置)→ Plugin Management(插件管理)→ Discover**
2. 点 **+** 添加市场:
   - 在线:粘贴仓库地址 `https://github.com/Logocceai/meow-memorycarry-zcode`
   - 离线:先解压 `meow-memorycarry-zcode-plugin-v0.1.5.zip`,再添加解压出的文件夹(其根目录含 `marketplace.json`)
3. 在列表中找到 **meow-memorycarry-zcode**,点 **Get** 安装
4. 重启 ZCode

已知限制:市场安装依赖能访问 GitHub(网络不可达或市场源缺失时无法更新);插件缓存目录是无公开文档的内部格式,安装与更新只能通过 UI 点击,无法脚本或 CLI 驱动。

注意:技能装在哪里只决定"能否用",**记忆库永远写在当前工作仓库的 `.zcode/memory/`**,随该仓库一起提交 git,跨机器同步靠它。

## 安装后

**第零步:先讲清适用边界(不要跳过)。** 安装完成后第一件事,是把上面「适用边界」那段讲给用户听:**如果你只是想当前窗口继续跑,不需要跨窗口记忆、版本控制、本地记忆库、多机共享——用内置 `/compact` 更划算,本插件也欢迎你以后需要时再回来。** 然后指向 [`docs/handoff-vs-compact.md`](docs/handoff-vs-compact.md)(判据与实测数据)。先讲边界再讲用法,避免用户装了才发现它解决的不是自己的问题。

**第一步:主动向用户说明交接的注意事项(不要跳过)。** 接着把下面三条讲给用户听,并指向仓库里的 [`docs/handoff-notes.md`](docs/handoff-notes.md)(中英双语);如果当前拿不到该文档(只有 zip、或经市场安装),就口头概括这三条:

1. **交接由人主动触发** —— 时机是上下文 70–80%、里程碑完成、踩完坑之后、当天收工前;行为信号(重复读同一个文件、忘了之前定好的规则、回答开始变含糊)比百分比出现得更早。
2. **别等上下文快满** —— `/handoff` 会自动提交代码改动并推送(不必先跑 `/checkpoint`),但交接本身也吃上下文,快满时才做容易撞上自动压缩。
3. **中途交接要把"下一步做什么"写清楚** —— 写到动哪个文件、做什么、什么还没验证的粒度;含糊写"继续完成任务"等于白交接。

**第二步:告诉用户怎么开始。**

- 收尾:`/handoff`(全默认:速度 s2 + AI 按上下文推荐深度)或指定双轴,如 `/handoff s1`、`/handoff s1d3`;`/handoff tidy` 整理记忆库
- 新窗口:`/recall`(列出快照清单供选择)、`/recall latest`(直接载入最新)
- 口语触发同样有效:"交接一下""收尾""接着上次""上次做到哪了"
- 首次 `/handoff` 自动创建记忆库 `.zcode/memory/`(从技能模板初始化)

## 卸载

删除 `<仓库根>/.zcode/skills/meow-handoff`、`meow-recall` 与 `.zcode/commands/handoff.md`、`recall.md` 即可(用户级安装则删 `~/.zcode/` 下对应目录)。记忆库 `.zcode/memory/` 是用户数据,由你自行决定保留或删除。
