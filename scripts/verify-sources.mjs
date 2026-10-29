import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile("src/asset-manifest.json", "utf8"));
assert.deepEqual(JSON.parse(await readFile("public/sources/manifest.json", "utf8")), manifest);
assert.equal(await readFile("LICENSE", "utf8"), await readFile("public/LICENSE.txt", "utf8"));
for (const item of manifest) {
  const bytes = await readFile(`public/${item.path}`);
  assert.equal(bytes.length, item.bytes, item.path);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256, item.path);
  if (item.printedPage) assert.equal(bytes.subarray(0, 3).toString("hex"), "ffd8ff", item.path);
}
console.log(
  `${manifest.length} source, font and license files match their retained SHA-256 identities.`,
);
