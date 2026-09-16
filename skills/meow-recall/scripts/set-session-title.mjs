// meow-recall 会话标题改写(Node 零依赖:node:sqlite)
// 用法:node scripts/set-session-title.mjs "<标题>" [--session-id <id>] [--dry-run]
//
// 为什么需要:/recall 只有 7 个字符,低于 ZCode 标题生成的 10 字符守卫,标题会永久
// 停在首句截断("/recall"),而客户端没有"重新生成标题"的入口。这里直接改写两个库的
// 标题字段,做法与 ZCode 官方 restore-legacy-sessions 插件一致:
//   ~/.zcode/cli/db/db.sqlite      session.title + title_source='custom'
//   ~/.zcode/v2/tasks-index.sqlite tasks.title   + title_overridden=1(侧边栏数据源)
// 写入后被标记为"人工标题",客户端不会再自动覆盖;侧边栏在下次打开客户端或切换工作区后显示新标题。

import { DatabaseSync } from "node:sqlite";
import { readdirSync, statSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const HOME = os.homedir();
const DB_PATH = process.env.ZCODE_DB_PATH || path.join(HOME, ".zcode", "cli", "db", "db.sqlite");
const TASKS_PATH = process.env.ZCODE_TASKS_INDEX_PATH || path.join(HOME, ".zcode", "v2", "tasks-index.sqlite");
const TITLE_MAX = 60;

const args = process.argv.slice(2);
let title = "";
let sessionId = "";
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--dry-run") dryRun = true;
  else if (a === "--session-id") sessionId = args[++i] || "";
  else if (a === "-h" || a === "--help") { usage(); process.exit(0); }
  else if (!title) title = a;
  else { console.error(`未知参数:${a}`); process.exit(2); }
}

function usage() {
  console.log(`用法: node scripts/set-session-title.mjs "<标题>" [--session-id <id>] [--dry-run]

把当前 ZCode 会话的标题改写为指定文本(由 /recall 用所选快照的概括调用)。
会话定位优先级:--session-id > 环境变量 ZCODE_SESSION_ID / CLAUDE_SESSION_ID > 最近写入的会话日志。`);
}

if (!title) { console.error("缺少标题参数。"); usage(); process.exit(2); }
if (title.length > TITLE_MAX) { console.error(`标题过长(${title.length} 字符,上限 ${TITLE_MAX})。`); process.exit(2); }

// 会话定位:显式参数 > 环境变量 > 最近写入的 rollout 文件(文件名即会话 id)
function resolveSession() {
  if (sessionId) return { id: sessionId, via: "--session-id" };
  for (const k of ["ZCODE_SESSION_ID", "CLAUDE_SESSION_ID"]) {
    if (process.env[k]) return { id: process.env[k], via: `环境变量 ${k}` };
  }
  const dir = path.join(HOME, ".zcode", "cli", "rollout");
  if (!existsSync(dir)) return null;
  const candidates = readdirSync(dir)
    .filter((f) => /^model-io-sess_[0-9a-f-]+\.jsonl$/i.test(f)) // 排除 sess_subagent_* 的日志
    .map((f) => ({ f, mtime: statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (candidates.length === 0) return null;
  const m = candidates[0].f.match(/^model-io-(sess_[0-9a-f-]+)\.jsonl$/i);
  return m ? { id: m[1], via: `最近写入的会话日志 ${candidates[0].f}` } : null;
}

const found = resolveSession();
if (!found) {
  console.error("无法确定当前会话:请显式传 --session-id,或设置环境变量 ZCODE_SESSION_ID。");
  process.exit(3);
}
const sid = found.id;
console.log(`会话定位:${sid}(${found.via})`);

if (!existsSync(DB_PATH)) { console.error(`找不到会话库:${DB_PATH}`); process.exit(3); }

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA busy_timeout = 5000");
const row = db.prepare("SELECT id, title, title_source, directory FROM session WHERE id = ?").get(sid);
if (!row) { console.error(`会话 ${sid} 不在会话库中。`); db.close(); process.exit(3); }

console.log(`当前标题:${row.title}`);
console.log(`标题来源:${row.title_source}${row.directory ? `   工作目录:${row.directory}` : ""}`);
console.log(`新标题  :${title}`);

if (row.title === title && row.title_source === "custom") {
  console.log("标题已是目标值,无需改写。");
  db.close();
  process.exit(0);
}

if (existsSync(TASKS_PATH)) {
  const tdb = new DatabaseSync(TASKS_PATH);
  tdb.exec("PRAGMA busy_timeout = 5000");
  const rows = tdb.prepare("SELECT workspace_key, title, title_overridden FROM tasks WHERE task_id = ?").all(sid);
  tdb.close();
  if (rows.length > 0) {
    console.log(`任务索引:${rows.map((r) => `${r.workspace_key} / "${r.title}"${r.title_overridden ? "(已人工设置)" : ""}`).join("; ")}`);
  } else {
    console.log("任务索引:没有该会话的记录(侧边栏可能不更新)");
  }
} else {
  console.log(`提示:未找到任务索引库(${TASKS_PATH})`);
}

if (dryRun) {
  console.log("--dry-run:未写入任何数据。");
  db.close();
  process.exit(0);
}

const now = Date.now();
try {
  db.exec("BEGIN IMMEDIATE");
  db.prepare("UPDATE session SET title = ?, title_source = 'custom', time_title_updated = ? WHERE id = ?").run(title, now, sid);
  db.exec("COMMIT");
  console.log("已改写会话库:session.title / title_source='custom'");
} catch (e) {
  try { db.exec("ROLLBACK"); } catch { /* 忽略回滚失败 */ }
  console.error(`会话库写入失败:${e.message}`);
  db.close();
  process.exit(4);
}
db.close();

if (existsSync(TASKS_PATH)) {
  const tdb = new DatabaseSync(TASKS_PATH);
  tdb.exec("PRAGMA busy_timeout = 5000");
  try {
    tdb.exec("BEGIN IMMEDIATE");
    const info = tdb.prepare("UPDATE tasks SET title = ?, title_overridden = 1, updated_at = ? WHERE task_id = ?").run(title, now, sid);
    tdb.exec("COMMIT");
    console.log(`已改写任务索引:${info.changes} 行(tasks.title / title_overridden=1)`);
  } catch (e) {
    try { tdb.exec("ROLLBACK"); } catch { /* 忽略回滚失败 */ }
    console.error(`任务索引写入失败:${e.message}(会话库已改写,侧边栏下次启动时会读到新标题)`);
  }
  tdb.close();
}

console.log("完成:侧边栏标题在下次打开客户端或切换工作区后可见。");
