# Install meow-memorycarry-zcode into ZCode

给 AI 代理的安装说明书。用户如果让你"安装这个插件",读本文件按 Route A 或 B 操作;装完只需重启 ZCode(或开新窗口),`/handoff` 与 `/recall` 即可用。

## 这个包是什么

**meow-memorycarry-zcode** 是 ZCode 的会话记忆交接插件:收尾 `/handoff` 把窗口内的决策、教训、断点总结写入记忆库,新窗口 `/recall` 按时间列出历史快照供选择载入。纯 Markdown 技能 + 一个安装脚本,**不需要 MCP、不需要常驻进程、不修改任何应用文件**。

## Route A — 插件市场安装(推荐,约 30 秒)

1. 打开 ZCode → **Settings(设置)→ Plugin Management(插件管理)→ Discover**
2. 点 **+** 添加市场:
   - 在线:粘贴仓库地址 `https://github.com/Logocceai/meow-memorycarry-zcode`
   - 离线:先解压 `meow-memorycarry-zcode-plugin-v0.1.0.zip`,再添加解压出的文件夹(其根目录含 `marketplace.json`)
3. 在列表中找到 **meow-memorycarry-zcode**,点 **Get** 安装
4. 重启 ZCode

## Route B — 有 shell 时直接安装

仓库或解压包根目录下执行(二选一):

```powershell
# 只装到某个仓库(在目标仓库根执行)
powershell -ExecutionPolicy Bypass -File scripts/install.ps1

# 用户级安装:所有仓库全局可用
powershell -ExecutionPolicy Bypass -File scripts/install.ps1 -Target $env:USERPROFILE
```

脚本幂等(重复执行覆盖更新)。安装内容:

- `~/.zcode/skills/meow-handoff/`、`~/.zcode/skills/meow-recall/`(技能自包含:含格式规范与初始化模板)
- `~/.zcode/commands/handoff.md`、`recall.md`(短名命令入口)

注意:技能装在哪里只决定"能否用",**记忆库永远写在当前工作仓库的 `.zcode/memory/`**,随该仓库一起提交 git,跨机器同步靠它。

## 安装后

- 收尾:`/handoff`(全默认:速度 s2 + AI 按上下文推荐深度)或指定双轴,如 `/handoff s1`、`/handoff s1d3`;`/handoff tidy` 整理记忆库
- 新窗口:`/recall`(列出快照清单供选择)、`/recall latest`(直接载入最新)
- 口语触发同样有效:"交接一下""收尾""接着上次""上次做到哪了"
- 首次 `/handoff` 自动创建记忆库 `.zcode/memory/`(从技能模板初始化)

## 卸载

删除 `<仓库根>/.zcode/skills/meow-handoff`、`meow-recall` 与 `.zcode/commands/handoff.md`、`recall.md` 即可(用户级安装则删 `~/.zcode/` 下对应目录)。记忆库 `.zcode/memory/` 是用户数据,由你自行决定保留或删除。
