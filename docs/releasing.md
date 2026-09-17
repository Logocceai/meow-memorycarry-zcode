# 发布流程(Releasing)

本文档说明 meow-memorycarry-zcode 如何从 monorepo 开发态导出为独立发布仓库。

## 核心原则

- **只在 monorepo 开发**:所有改动提交到 `projects/meow-memorycarry-zcode/`(工作区 main 分支);release 分支只做**只读导出**,不在其上开发——避免出现 release 与 main 漂移(这是 zcode-beautify 踩过的坑)。
- **导出仓库即单插件市场**:`marketplace.json` + `.zcode-plugin/plugin.json` 位于导出仓库根,用户把仓库 URL 加进 ZCode 插件市场即可安装。

## 版本发布步骤(以 0.1.0 为例)

### 1. 版本对齐(手工,共 3 处)

- `.zcode-plugin/plugin.json` 的 `version`
- `marketplace.json`:顶层 `version` 与 `plugins[0].version`(两处)
- `CHANGELOG.md`:新增 `## vX.Y.Z` 段(一段白话叙述 + `### Added` / `### Fixed`,新到旧)

### 2. 回归校验

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install.ps1        # 安装产物传播
node scripts/package.mjs                                            # 生成 zip
node scripts/check-packages.mjs X.Y.Z                               # 结构/版本/命名全量核验
```

安装产物(`.zcode/` 下)与源码须保持一致;打包核验必须全绿;`README.md`(中文)与 `README.en.md`(英文)两份齐全、顶部带语言切换行(规范见工作区 `AGENTS.md`「项目文档规范」)。

### 3. 提交

```bash
git commit -m "chore(release): X.Y.Z"
```

### 4. 导出独立分支(subtree split,只读)

```bash
git branch -D release/meow-memorycarry-zcode 2>/dev/null   # 重复导出时先删旧分支
git subtree split --prefix=projects/meow-memorycarry-zcode -b release/meow-memorycarry-zcode
git ls-tree release/meow-memorycarry-zcode --name-only     # 校验:marketplace.json 等位于根
```

导出分支是独立历史(与 main 无共同祖先),提交数与项目历史一致;不含工作区其他内容。

### 5. 推送公开仓库(需远端已创建)

```bash
git remote add meow https://github.com/Logocceai/meow-memorycarry-zcode.git   # 一次性
git push meow release/meow-memorycarry-zcode:main
EXPORT_HEAD=$(git rev-parse release/meow-memorycarry-zcode)
git tag vX.Y.Z $EXPORT_HEAD && git push meow vX.Y.Z                      # tag 打在导出分支提交上
```

### 6. GitHub Release(附 zip)

```powershell
$env:HTTPS_PROXY = "http://127.0.0.1:7890"   # 本机 gh 需代理
gh release create vX.Y.Z packages/meow-memorycarry-zcode-plugin-vX.Y.Z.zip --repo Logocceai/meow-memorycarry-zcode --title "vX.Y.Z" --notes "对照 CHANGELOG 摘要"
```

## 发布记录(2026-09-17)

v0.1.4 已发布:交接笔记中英双语(`docs/handoff-notes.md` / `docs/handoff-notes.en.md`),README 新增「交接的时机与注意事项」一节,AI 按 `INSTALL-FOR-AI.md` 完成安装后主动引导用户阅读交接注意事项;打包与核验清单纳入两个新文档(23 → 25 项);`INSTALL-FOR-AI.md` 离线示例版本号纠正(此前停留在 v0.1.0)。

## 发布记录(2026-09-16)

v0.1.3 已发布:会话标题不再被客户端落盘冲回旧值(`meta_json.title` 一起改写),并经 CDP 调用客户端 `renameTask` 让侧边栏当场刷新(不可得则自动跳过,退回"下次重启可见")。

v0.1.0 已发布:公开仓库 <https://github.com/Logocceai/meow-memorycarry-zcode>。`git subtree split` 生成的本地导出分支 `release/meow-memorycarry-zcode` 为独立历史(与 main 无共同祖先),根目录含 `marketplace.json`、`.zcode-plugin/plugin.json`、`skills/`、`commands/`、`docs/`、`scripts/`、`README.md`、`LICENSE`、`CHANGELOG.md`、`INSTALL-FOR-AI.md`;Release 附件为 `meow-memorycarry-zcode-plugin-v0.1.0.zip`。分支可随时 `git branch -D` 删除后按上述步骤重新导出。

## 用户安装路径(发布后)

1. **市场 UI(推荐)**:ZCode → Settings → Plugin Management → Discover → `+` 添加市场 → 粘贴仓库 URL → Get
2. **离线**:下载 Release 附件的 zip,解压后添加该文件夹为市场
3. **脚本**:仓库根执行 `scripts/install.ps1`,或 `-Target $env:USERPROFILE` 用户级全局安装

详见 [INSTALL-FOR-AI.md](../INSTALL-FOR-AI.md)。
