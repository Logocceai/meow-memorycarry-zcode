---
name: meow-handoff
description: 会话收尾时把本窗口有价值的信息总结后写入记忆库(.zcode/memory/),生成交接快照并归档已被吸收的旧快照。当用户说"交接 / 收尾 / 换窗口 / 带走记忆 / 保存进度记忆 / handoff",或明确调用 /handoff 时使用;整理记忆库用 /handoff tidy 或"整理记忆 / 清理记忆"。
argument-hint: "[tidy]"
---

# 会话交接(meow-handoff)

把本窗口有价值的信息**总结后规范化带走**:合并进分层记忆文件、生成一份交接快照、归档旧快照。记忆库位于当前仓库根 `.zcode/memory/`,条目格式、frontmatter、命名与行数上限一律遵循本技能目录下 `docs/format-spec.md`(下称"规范")。

## 执行流程

1. **定位记忆库**
   - 记忆库 = 当前仓库根的 `.zcode/memory/`。
   - 不存在时:从本技能目录 `templates/` 初始化——复制 INDEX.md、project.md、facts.md、decisions.md、lessons.md 到记忆库根,创建空的 `handoffs/` 与 `archive/`,frontmatter 占位(`<初始化时间>`、`<最后更新时间>`)替换为当天时间。

2. **tidy 分支**:参数为 `tidy` 时跳到第 8 步;否则走收尾交接。

3. **收尾前检查**
   - `git status` 有未提交的代码改动:提示用户先执行 `/checkpoint`(记忆库只存知识与状态,不存代码),用户明确跳过才继续。
   - `.zcode/plans/` 中有本会话相关的 plan 文件:记下路径,写入快照 Refs。

4. **回顾本窗口,提炼四类信息与一句话概括**——这是产出质量的根源,宁缺毋滥:
   - 完成:做了什么,改动落在哪些文件与提交
   - 决策:拍板了什么,为什么
   - 坑:踩了什么,怎么解决的
   - 下一步:任务断点在哪,新会话第一件事做什么
   - **概括**:给本次交接提炼一句话(建议 ≤20 字,如"记忆库初始化与v1实现"),它将同时充当快照文件名、正文标题与 frontmatter `summary`

   每条信息按规范 §2 压缩后再入库:一条一事、`[YYYY-MM-DD]` 日期前缀、自包含(写具体路径/命令/hash,不写"刚才那个问题")、总结体、中文。

5. **合并分层文件**(更新,不是把会话流水账整个追加):
   - `project.md`:更新"进行中"任务状态,已完成的移出
   - `facts.md`:只新增可复用事实,已有条目不重复写
   - `decisions.md`:只追加新决策(append-only)
   - `lessons.md`:追加新教训
   - 每个文件写入前对照规范 §5 行数上限(120 行),超限先合并同类、删被取代的旧条目,再写入;`updated` 同步刷新

6. **写交接快照** `handoffs/<概括>.memo.md`(命名与非法字符清理规则见规范 §4),结构按 `templates/handoff-snapshot.md` 六节:Summary / Done / Decisions / Pitfalls / Next / Refs,全文件 ≤150 行;frontmatter 四字段:`summary`(与文件名、正文标题同源)、`created`、`updated`、`status: active`。

7. **吸收与归档旧快照**
   - 对每份旧的 `status: active` 快照:其中仍有长期价值的信息(事实/决策/教训)确保已合并进对应分层文件,然后把该快照 frontmatter 改为 `status: absorbed`(内容已在分层文件中的旧快照直接标 absorbed)。
   - `absorbed` 且 `created` 距今超过 14 天的:`git mv handoffs/<文件> archive/`。只移动,不删除。
   - 重写 INDEX.md:活跃任务 ≤5、下一步 ≤3、最近快照 ≤5(按 created 倒序),全文件 ≤80 行。

8. **整理模式**(仅 `tidy`):去重并合并分层文件条目、执行行数上限、把所有 `absorbed` 超 14 天的快照 `git mv` 进 `archive/`、重建 INDEX.md。不新增任何记忆内容。

9. **入库与报告**
   - 仓库由 git 跟踪时:`git add .zcode/memory/`(不自动 commit,提交由用户走 `/checkpoint`)。
   - 输出报告:新建/更新的文件、归档的快照、INDEX 当前的活跃任务与下一步。

## 边界

- 只写 `.zcode/memory/` 及其 `archive/`,不改任何代码与其他文件。
- 不删除记忆文件;归档一律 `git mv`,历史由 git 保留。
- 只记录本窗口真实发生的信息;禁止编造,禁止把未验证的猜测写成事实。
- 不自动执行 git commit。
