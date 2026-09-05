import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifestPath = join(root, "public", "models", "inpainting-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const modelPath = join(dirname(manifestPath), manifest.fileName);

try {
  await access(modelPath);
} catch {
  throw new Error(`Verified inpainting model is missing. Run npm run model:fetch before building.`);
}

const size = (await stat(modelPath)).size;
if (Math.abs(size - manifest.sizeBytes) > 2_000_000) throw new Error(`Inpainting model size is invalid: ${size}.`);

const checksum = await new Promise((resolve, reject) => {
  const hash = createHash("sha256");
  const stream = createReadStream(modelPath);
  stream.on("data", (chunk) => hash.update(chunk));
  stream.on("error", reject);
  stream.on("end", () => resolve(hash.digest("hex")));
});
if (checksum !== manifest.sha256) throw new Error(`Inpainting model checksum mismatch: ${checksum}.`);
console.log(`Verified ${manifest.fileName} (${size} bytes).`);
