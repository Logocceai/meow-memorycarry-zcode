// meow-memorycarry 打包脚本(Node 零依赖:内置 zlib + 手写 zip 容器)
// 用法:node scripts/package.mjs
// 产物:packages/meow-memorycarry-plugin-v<version>.zip(单层包装目录,路径全用正斜杠)
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { deflateRawSync, crc32 } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(path.join(root, ".zcode-plugin/plugin.json"), "utf8"));
const version = pkg.version;
const wrapDir = `meow-memorycarry-plugin-v${version}`;
const zipName = `${wrapDir}.zip`;

// 发布文件清单(相对插件根,路径一律正斜杠);skills/ 下的技能文件逐个列出以便缺件即报错
const files = [
  ".zcode-plugin/plugin.json",
  "marketplace.json",
  "LICENSE",
  "CHANGELOG.md",
  "README.md",
  "INSTALL-FOR-AI.md",
  "scripts/install.ps1",
  "docs/user-guide.md",
  "commands/handoff.md",
  "commands/recall.md",
  "skills/meow-handoff/SKILL.md",
  "skills/meow-handoff/docs/format-spec.md",
  "skills/meow-handoff/templates/INDEX.md",
  "skills/meow-handoff/templates/project.md",
  "skills/meow-handoff/templates/facts.md",
  "skills/meow-handoff/templates/decisions.md",
  "skills/meow-handoff/templates/lessons.md",
  "skills/meow-handoff/templates/handoff-snapshot.md",
  "skills/meow-recall/SKILL.md",
];

const missing = files.filter((f) => !existsSync(path.join(root, f)));
if (missing.length > 0) {
  console.error("打包中止,缺少必需文件:");
  for (const f of missing) console.error("  - " + f);
  process.exit(1);
}

function dosDateTime(d = new Date()) {
  const time = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
  const date = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  return { time, date };
}

function makeZip(entries) {
  const { time, date } = dosDateTime();
  const parts = [];
  const central = [];
  let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, "utf8");
    const comp = deflateRawSync(e.data, { level: 9 });
    const crc = crc32(e.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);      // version needed
    local.writeUInt16LE(0x0800, 6);  // UTF-8 文件名
    local.writeUInt16LE(8, 8);       // deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);      // extra len
    parts.push(local, nameBuf, comp);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);         // version made by
    cd.writeUInt16LE(20, 6);         // version needed
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(comp.length, 20);
    cd.writeUInt32LE(e.data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += local.length + nameBuf.length + comp.length;
  }
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...parts, centralBuf, eocd]);
}

const entries = files.map((rel) => ({
  name: `${wrapDir}/${rel}`,
  data: readFileSync(path.join(root, rel)),
}));
const zip = makeZip(entries);

mkdirSync(path.join(root, "packages"), { recursive: true });
const out = path.join(root, "packages", zipName);
writeFileSync(out, zip);
console.log(`打包完成:${path.relative(root, out).replaceAll("\\", "/")}`);
console.log(`  版本:${version}  条目:${entries.length}  大小:${(zip.length / 1024).toFixed(1)} KB`);
