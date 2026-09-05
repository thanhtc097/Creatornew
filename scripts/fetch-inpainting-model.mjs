import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifestPath = join(root, "public", "models", "inpainting-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const output = join(dirname(manifestPath), manifest.fileName);
const temporary = output + ".download";

async function digest(file) {
  return await new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(file);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function validExistingFile() {
  try {
    await access(output);
    return (await digest(output)) === manifest.sha256;
  } catch {
    return false;
  }
}

if (await validExistingFile()) {
  console.log(`Using verified ${manifest.fileName}.`);
  process.exit(0);
}

await mkdir(dirname(output), { recursive: true });
await rm(temporary, { force: true });
const response = await fetch(manifest.url, { redirect: "follow" });
if (!response.ok || !response.body) throw new Error(`Model download failed with HTTP ${response.status}.`);
await writeFile(temporary, new Uint8Array(await response.arrayBuffer()));

const downloaded = await stat(temporary);
if (manifest.sizeBytes && Math.abs(downloaded.size - manifest.sizeBytes) > 2_000_000) {
  await rm(temporary, { force: true });
  throw new Error(`Unexpected model size: ${downloaded.size} bytes.`);
}
const checksum = await digest(temporary);
if (checksum !== manifest.sha256) {
  await rm(temporary, { force: true });
  throw new Error(`Model checksum mismatch: ${checksum}.`);
}
await rename(temporary, output);
console.log(`Downloaded and verified ${manifest.fileName}.`);
