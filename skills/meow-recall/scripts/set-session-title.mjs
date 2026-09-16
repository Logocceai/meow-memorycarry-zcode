// meow-recall 会话标题改写(Node 零依赖:node:sqlite)
// 用法:node scripts/set-session-title.mjs "<标题>" [--session-id <id>] [--dry-run] [--no-live]
//
// 为什么需要:/recall 只有 7 个字符,低于 ZCode 标题生成的 10 字符守卫,标题会永久
// 停在首句截断("/recall"),而客户端没有"重新生成标题"的入口。这里直接改写两个库的
// 标题字段,做法与 ZCode 官方 restore-legacy-sessions 插件一致:
//   ~/.zcode/cli/db/db.sqlite      session.title + title_source='custom'
//   ~/.zcode/v2/tasks-index.sqlite tasks.title   + meta_json.title + title_overridden=1(侧边栏数据源)
// 写入后被标记为"人工标题",客户端不会再自动覆盖。最后再尽力调用客户端自己的
// renameTask 触发 side bar 免刷新(见文件末尾,--no-live 可跳过)。

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
let noLive = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--dry-run") dryRun = true;
  else if (a === "--no-live") noLive = true;
  else if (a === "--session-id") sessionId = args[++i] || "";
  else if (a === "-h" || a === "--help") { usage(); process.exit(0); }
  else if (!title) title = a;
  else { console.error(`未知参数:${a}`); process.exit(2); }
}

function usage() {
  console.log(`用法: node scripts/set-session-title.mjs "<标题>" [--session-id <id>] [--dry-run] [--no-live]

把当前 ZCode 会话的标题改写为指定文本(由 /recall 用所选快照的概括调用)。
会话定位优先级:--session-id > 环境变量 ZCODE_SESSION_ID / CLAUDE_SESSION_ID > 最近写入的会话日志。
改完会尽力调用客户端自己的 renameTask 让侧边栏当场刷新;--no-live 跳过这步。`);
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

// 任务索引(侧边栏数据源):客户端运行中会用它内存里的任务对象落盘重建该行,而 meta_json
// 是那次重建的源。只改 tasks.title 列会被下一次落盘冲回旧值(2026-09-16 实测:写入 11 秒后
// 被改回),所以 meta_json.title 必须与列一起改写。
function readTaskRows(sid) {
  if (!existsSync(TASKS_PATH)) return null;
  const tdb = new DatabaseSync(TASKS_PATH);
  tdb.exec("PRAGMA busy_timeout = 5000");
  const rows = tdb.prepare("SELECT workspace_key, title, title_overridden, meta_json FROM tasks WHERE task_id = ?").all(sid);
  tdb.close();
  return rows;
}

function metaTitle(metaJson) {
  try { return JSON.parse(metaJson || "{}").title; } catch { return undefined; } // 坏 meta 不阻塞标题改写
}

function withMetaTitle(metaJson, title) {
  let meta = {};
  try { meta = JSON.parse(metaJson || "{}"); } catch { /* 同上 */ }
  meta.title = title;
  meta.titleOverridden = true;
  return JSON.stringify(meta);
}

function taskRowOk(r, title) {
  return r.title === title && r.title_overridden === 1 && metaTitle(r.meta_json) === title;
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

const taskRows = readTaskRows(sid);
if (taskRows === null) {
  console.log(`提示:未找到任务索引库(${TASKS_PATH})`);
} else if (taskRows.length === 0) {
  console.log("任务索引:没有该会话的记录(侧边栏可能不更新)");
} else {
  console.log(`任务索引:${taskRows.map((r) => `${r.workspace_key} / "${r.title}"${r.title_overridden ? "(已人工设置)" : ""}${metaTitle(r.meta_json) === title ? "" : `(meta 标题:${metaTitle(r.meta_json) ?? "无"})`}`).join("; ")}`);
}

const sessionOk = row.title === title && row.title_source === "custom";
const tasksOk = taskRows === null || taskRows.every((r) => taskRowOk(r, title));
if (sessionOk && tasksOk) {
  console.log("标题已是目标值,无需改写。");
  db.close();
  process.exit(0);
}
if (sessionOk && !tasksOk) console.log("会话库标题正确、任务索引已被改回旧值:修复被冲掉的标题。");

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

if (taskRows !== null) {
  const tdb = new DatabaseSync(TASKS_PATH);
  tdb.exec("PRAGMA busy_timeout = 5000");
  try {
    tdb.exec("BEGIN IMMEDIATE");
    const stmt = tdb.prepare("UPDATE tasks SET title = ?, title_overridden = 1, meta_json = ?, updated_at = ? WHERE workspace_key = ? AND task_id = ?");
    let changes = 0;
    for (const r of tdb.prepare("SELECT workspace_key, meta_json FROM tasks WHERE task_id = ?").all(sid)) {
      changes += stmt.run(title, withMetaTitle(r.meta_json, title), now, r.workspace_key, sid).changes;
    }
    tdb.exec("COMMIT");
    console.log(`已改写任务索引:${changes} 行(tasks.title / meta_json.title / title_overridden=1)`);
  } catch (e) {
    try { tdb.exec("ROLLBACK"); } catch { /* 忽略回滚失败 */ }
    console.error(`任务索引写入失败:${e.message}(会话库已改写,侧边栏下次启动时会读到新标题)`);
  }
  tdb.close();
}

// 免刷新(可选,任一环不可得就跳过):客户端自己的 zcodeTaskService.renameTask 写完标题会
// 广播 task_title_changed,侧边栏当场更新。该服务只存在于渲染层的 React context(不挂
// window,也没有对应 IPC 频道),外部只能经 CDP 在渲染层执行 JS:从侧边栏任务条目的
// React fiber 向上走到根 fiber 取 services。数据库已经写好,所以这步失败不影响结果。
const CDP_PORT = Number(process.env.ZCODE_CDP_PORT || 9222);

function liveRenameExpression(sid, workspacePath, title) {
  return `(async () => {
  const el = document.querySelector("[data-task-item-key]");
  const fiberKey = el && Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  if (!fiberKey) return { ok: false, why: "侧边栏里没有任务条目,React fiber 不可达" };
  let f = el[fiberKey], services = null;
  while (f) {
    const p = f.memoizedProps;
    if (p && p.services && typeof p.services === "object") { services = p.services; break; }
    if (p && p.value && typeof p.value === "object" && p.value.zcodeTaskService) { services = p.value; break; }
    f = f.return;
  }
  const svc = services && services.zcodeTaskService;
  if (!svc || typeof svc.renameTask !== "function") return { ok: false, why: "取不到 zcodeTaskService" };
  await svc.renameTask(${JSON.stringify({ taskId: sid, workspacePath, title })});
  return { ok: true };
})()`;
}

async function tryLiveRefresh(sid, workspacePath, title) {
  if (!workspacePath) return "跳过(会话库没有工作目录,无法定位任务条目)";
  try {
    const abort = AbortController ? new AbortController() : null;
    const t0 = setTimeout(() => abort && abort.abort(), 5000);
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`, abort ? { signal: abort.signal } : undefined);
    clearTimeout(t0);
    const targets = await res.json();
    const page =
      targets.find((t) => t.type === "page" && t.url.includes("out/renderer/index.html")) ??
      targets.find((t) => t.type === "page" && t.title === "ZCode");
    if (!page) return `跳过(端口 ${CDP_PORT} 上没有渲染层目标)`;

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("连接超时")), 5000);
      ws.addEventListener("open", () => { clearTimeout(t); resolve(); }, { once: true });
      ws.addEventListener("error", () => { clearTimeout(t); reject(new Error("连接失败")); }, { once: true });
    });
    const result = await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("调用超时")), 8000);
      ws.addEventListener("message", (ev) => {
        const msg = JSON.parse(String(ev.data));
        if (msg.id !== 1) return;
        clearTimeout(t);
        if (msg.error) reject(new Error(msg.error.message));
        else if (msg.result.exceptionDetails) reject(new Error("渲染层抛错"));
        else resolve(msg.result.result.value);
      });
      ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: liveRenameExpression(sid, workspacePath, title), returnByValue: true, awaitPromise: true } }));
    });
    ws.close();
    return result && result.ok ? "侧边栏已当场刷新" : `跳过(${result && result.why})`;
  } catch (e) {
    const why = /fetch failed|ECONNREFUSED/i.test(e.message) ? `端口 ${CDP_PORT} 未开放(客户端未带 --remote-debugging-port)` : e.message;
    return `跳过(${why})`;
  }
}

console.log(`完成:${noLive ? "(--no-live)标题在下次打开客户端或切换工作区后可见。" : (await tryLiveRefresh(sid, row.directory, title)) + "(失败则在下次打开客户端或切换工作区后可见)。"}`);
