# Changelog

## v0.1.0

首发。把会话记忆变成可带走的资产:收尾用 `/handoff` 把本窗口有价值的信息总结后写入分层 Markdown 记忆库(`.zcode/memory/`),新窗口用 `/recall` 按时间浏览历史交接快照并选择载入,继续上一个任务。纯 Markdown 技能,零运行时依赖。

### Added

- **两条指令**(`/handoff`、`/recall`)。口语触发同样生效("交接一下""接着上次")。
- **交接三档位**(`/handoff 1|2|3`)。1 节约(只写精简快照 + 索引)、2 平衡(更新相关分层文件 + 吸收旧快照)、3 深度(全量吸收合并去重);不带档位时按会话长度、任务状态与记忆库状况推荐档位供确认。
- **记忆库分层结构**。`INDEX.md` 索引、`project.md` / `facts.md` / `decisions.md` / `lessons.md` 分层文件、`handoffs/` 快照(`<概括>.memo.md`)、`archive/` 归档;frontmatter 四字段(summary/created/updated/status)。
- **防乱机制**。行数硬上限(索引 80 / 快照 150 / 分层文件 120)、`active → absorbed → archived` 生命周期、14 天自动归档、归档一律 `git mv` 永不删除、`/handoff tidy` 手动整理。
- **技能自包含**。`skills/meow-handoff/` 内含格式规范与初始化模板,安装即复制,无组装步骤。
- **安装脚本**(`scripts/install.ps1`)。支持目标仓库安装与用户级全局安装,幂等可重复执行。

## License

MIT
