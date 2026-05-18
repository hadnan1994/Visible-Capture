import { deflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} from "node:fs/promises";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptDir);
const distDir = join(projectRoot, "dist");
const allowedPermissions = ["activeTab", "scripting", "storage", "downloads"];
const runtimeFiles = [
  "manifest.json",
  "popup.html",
  "popup.css",
  "popup.js",
  "contentScript.js",
  "parser.js",
  "csv.js",
  "storage.js",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png"
];

const crcTable = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

function crc32(buffer) {
  let value = 0xffffffff;

  for (const byte of buffer) {
    value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  }

  return (value ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return { dosDate, dosTime };
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function makeZipEntry(filePath, data, modifiedAt, offset) {
  const name = Buffer.from(filePath, "utf8");
  const compressed = deflateRawSync(data);
  const checksum = crc32(data);
  const { dosDate, dosTime } = dosDateTime(modifiedAt);
  const flags = 0x0800;
  const compression = 8;

  const localHeader = Buffer.concat([
    u32(0x04034b50),
    u16(20),
    u16(flags),
    u16(compression),
    u16(dosTime),
    u16(dosDate),
    u32(checksum),
    u32(compressed.length),
    u32(data.length),
    u16(name.length),
    u16(0),
    name
  ]);

  const centralHeader = Buffer.concat([
    u32(0x02014b50),
    u16(20),
    u16(20),
    u16(flags),
    u16(compression),
    u16(dosTime),
    u16(dosDate),
    u32(checksum),
    u32(compressed.length),
    u32(data.length),
    u16(name.length),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(offset),
    name
  ]);

  return {
    local: Buffer.concat([localHeader, compressed]),
    central: centralHeader
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(join(projectRoot, path), "utf8"));
}

async function ensureRequiredFilesExist() {
  for (const filePath of runtimeFiles) {
    try {
      const fileStat = await stat(join(projectRoot, filePath));
      if (!fileStat.isFile()) {
        throw new Error(`${filePath} is not a file.`);
      }
    } catch (error) {
      throw new Error(`Required runtime file is missing: ${filePath}`, { cause: error });
    }
  }
}

function validateManifest(manifest) {
  if (manifest.manifest_version !== 3) {
    throw new Error("manifest.json must use Manifest V3.");
  }

  const permissions = manifest.permissions || [];
  const unexpectedPermissions = permissions.filter((permission) => !allowedPermissions.includes(permission));
  const missingPermissions = allowedPermissions.filter((permission) => !permissions.includes(permission));

  if (unexpectedPermissions.length > 0 || missingPermissions.length > 0) {
    throw new Error(
      `manifest.json permissions must be exactly: ${allowedPermissions.join(", ")}.`
    );
  }

  if (manifest.host_permissions && manifest.host_permissions.length > 0) {
    throw new Error("manifest.json must not include host_permissions.");
  }

  if (!manifest.version) {
    throw new Error("manifest.json must include a version.");
  }
}

async function removePreviousUploadZips() {
  await mkdir(distDir, { recursive: true });

  for (const entry of await readdir(distDir)) {
    if (/^visible-capture-v.+\.zip$/.test(entry)) {
      await rm(join(distDir, entry), { force: true });
    }
  }
}

async function createZip(zipPath) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const filePath of runtimeFiles) {
    const absolutePath = join(projectRoot, filePath);
    const [data, fileStat] = await Promise.all([
      readFile(absolutePath),
      stat(absolutePath)
    ]);
    const entry = makeZipEntry(filePath, data, fileStat.mtime, offset);

    localParts.push(entry.local);
    centralParts.push(entry.central);
    offset += entry.local.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endOfCentralDirectory = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(runtimeFiles.length),
    u16(runtimeFiles.length),
    u32(centralDirectory.length),
    u32(offset),
    u16(0)
  ]);
  const zip = Buffer.concat([...localParts, centralDirectory, endOfCentralDirectory]);

  await writeFile(zipPath, zip);
}

const manifest = await readJson("manifest.json");
validateManifest(manifest);
await ensureRequiredFilesExist();
await removePreviousUploadZips();

const zipName = `visible-capture-v${manifest.version}.zip`;
const zipPath = join(distDir, zipName);
await createZip(zipPath);

const zipStat = await stat(zipPath);
console.log(`Created ${zipPath}`);
console.log(`Size: ${zipStat.size} bytes`);
