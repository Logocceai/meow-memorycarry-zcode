// meow-memorycarry 发布包核验脚本(Node 零依赖)
// 用法:node scripts/check-packages.mjs [version]
//   省略 version 时只做包内一致性检查;给出时额外比对工作区 .zcode-plugin/plugin.json 的版本
// 校验:zip 可解、路径安全、必需条目齐全、版本三处一致、技能/命令命名与 frontmatter 合法、模板字段齐全
import { readFileSync, existsSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginJson = JSON.parse(readFileSync(path.join(root, ".zcode-plugin/plugin.json"), "utf8"));
const version = pluginJson.version;
const wrapDir = `meow-memorycarry-plugin-v${version}`;
const zipPath = path.join(root, "packages", `${wrapDir}.zip`);

const results = [];
const fail = (msg) => results.push({ ok: false, msg });
const pass = (msg) => results.push({ ok: true, msg });

if (!existsSync(zipPath)) {
  console.error(`找不到发布包:${path.relative(root, zipPath)}(先运行 node scripts/package.mjs)`);
  process.exit(1);
}

// ---- 读取 zip 条目(含内容) ----
function readZip(zipBuf) {
  const eocdIdx = zipBuf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocdIdx < 0) throw new Error("不是有效的 zip(EOCD 未找到)");
  const total = zipBuf.readUInt16LE(eocdIdx + 10);
  let cdOffset = zipBuf.readUInt32LE(eocdIdx + 16);
  const entries = [];
  for (let i = 0; i < total; i++) {
    if (zipBuf.readUInt32LE(cdOffset) !== 0x02014b50) throw new Error("central directory 损坏");
    const method = zipBuf.readUInt16LE(cdOffset + 10);
    const compSize = zipBuf.readUInt32LE(cdOffset + 20);
    const nameLen = zipBuf.readUInt16LE(cdOffset + 28);
    const extraLen = zipBuf.readUInt16LE(cdOffset + 30);
    const commentLen = zipBuf.readUInt16LE(cdOffset + 32);
    const localOffset = zipBuf.readUInt32LE(cdOffset + 42);
    const name = zipBuf.subarray(cdOffset + 46, cdOffset + 46 + nameLen).toString("utf8");
    const localNameLen = zipBuf.readUInt16LE(localOffset + 26);
    const localExtraLen = zipBuf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const raw = zipBuf.subarray(dataStart, dataStart + compSize);
    const data = method === 0 ? raw : inflateRawSync(raw);
    entries.push({ name, data });
    cdOffset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

const entries = readZip(readFileSync(zipPath));
const nameSet = new Set(entries.map((e) => e.name));
const relSet = new Set(entries.map((e) => e.name.replace(`${wrapDir}/`, "")));
const get = (rel) => entries.find((e) => e.name === `${wrapDir}/${rel}`)?.data.toString("utf8");

// 1. 条目数与路径安全
if (entries.length >= 20) pass(`条目数 ${entries.length}`);
else fail(`条目数异常:${entries.length}(预期 ≥20)`);

const unsafe = entries.filter(
  (e) => e.name.includes("\\") || e.name.includes("..") || /^[A-Za-z]:/.test(e.name) || e.name.startsWith("/")
);
if (unsafe.length === 0) pass("路径安全:无反斜杠/上级目录/盘符/绝对路径");
else fail(`不安全路径:${unsafe.map((e) => e.name).join(", ")}`);

const notWrapped = entries.filter((e) => !e.name.startsWith(`${wrapDir}/`));
if (notWrapped.length === 0) pass(`所有条目位于单层包装目录 ${wrapDir}/ 下`);
else fail(`条目不在包装目录内:${notWrapped.map((e) => e.name).join(", ")}`);

// 2. 必需条目(独立于打包脚本的清单,交叉校验)
const required = [
  "marketplace.json",
  ".zcode-plugin/plugin.json",
  "LICENSE",
  "CHANGELOG.md",
  "README.md",
  "INSTALL-FOR-AI.md",
  "docs/user-guide.md",
  "scripts/install.ps1",
  "commands/handoff.md",
  "commands/recall.md",
  "skills/meow-handoff/SKILL.md",
  "skills/meow-handoff/docs/format-spec.md",
  "skills/meow-handoff/docs/tier-system.md",
  "skills/meow-recall/SKILL.md",
  "skills/meow-handoff/templates/INDEX.md",
  "skills/meow-handoff/templates/project.md",
  "skills/meow-handoff/templates/facts.md",
  "skills/meow-handoff/templates/decisions.md",
  "skills/meow-handoff/templates/lessons.md",
  "skills/meow-handoff/templates/handoff-snapshot.md",
];
const missing = required.filter((r) => !relSet.has(r));
if (missing.length === 0) pass(`必需条目齐全(${required.length} 项)`);
else fail(`缺少条目:${missing.join(", ")}`);

// 3. 版本一致性:zip 名 / 包内 plugin.json / 包内 marketplace.json(两处)
const inPlugin = JSON.parse(get(".zcode-plugin/plugin.json"));
const inMarket = JSON.parse(get("marketplace.json"));
const versionChecks = [
  [`zip 名版本 = plugin.json(${version})`, zipPath.endsWith(`-v${version}.zip`)],
  [`包内 plugin.json(${inPlugin.version})`, inPlugin.version === version],
  [`包内 marketplace.json 顶层(${inMarket.version})`, inMarket.version === version],
  [`包内 marketplace.json plugins[0](${inMarket.plugins?.[0]?.version})`, inMarket.plugins?.[0]?.version === version],
  [`marketplace plugins[0].source = "./"`, inMarket.plugins?.[0]?.source === "./"],
];
for (const [msg, ok] of versionChecks) (ok ? pass : fail)(`版本/结构:${msg}`);
if (inMarket.plugins?.[0]?.name === inPlugin.name) pass(`插件名一致:${inPlugin.name}`);
else fail(`插件名不一致:${inPlugin.name} vs ${inMarket.plugins?.[0]?.name}`);

// 4. 技能 frontmatter 与命名
for (const skill of ["meow-handoff", "meow-recall"]) {
  const md = get(`skills/${skill}/SKILL.md`);
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) { fail(`${skill}: 缺少 frontmatter`); continue; }
  const fm = m[1];
  const name = fm.match(/^name:\s*(\S+)/m)?.[1];
  const desc = fm.match(/^description:\s*(.+)$/m)?.[1];
  if (name === skill && /^[a-z0-9][a-z0-9._-]{0,127}$/.test(name)) pass(`${skill}: name 合法`);
  else fail(`${skill}: name 非法或与目录不符(${name})`);
  if (desc && desc.trim().length > 20) pass(`${skill}: description 非空`);
  else fail(`${skill}: description 缺失或过短`);
}

// 5. 命令文件名规则
for (const cmd of ["handoff.md", "recall.md"]) {
  const base = cmd.replace(/\.md$/, "");
  if (/^[a-z0-9][a-z0-9_:-]{0,63}$/.test(base)) pass(`命令名合法:${base}`);
  else fail(`命令名非法:${base}`);
}

// 6. 模板 frontmatter 四字段
for (const t of ["INDEX", "project", "facts", "decisions", "lessons", "handoff-snapshot"]) {
  const md = get(`skills/meow-handoff/templates/${t}.md`);
  const ok = ["summary", "created", "updated", "status"].every((k) => new RegExp(`^${k}:`, "m").test(md));
  if (ok) pass(`模板 ${t}: frontmatter 四字段齐全`);
  else fail(`模板 ${t}: frontmatter 缺字段`);
}

// 7. 可选:与工作区版本比对
if (process.argv[2]) {
  if (process.argv[2] === version) pass(`工作区版本与入参一致(${version})`);
  else fail(`版本不匹配:工作区 ${version} vs 入参 ${process.argv[2]}`);
}

// ---- 报告 ----
let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.msg}`);
  if (!r.ok) failed++;
}
console.log(`\n${results.length - failed}/${results.length} 项通过`);
process.exit(failed === 0 ? 0 : 1);
