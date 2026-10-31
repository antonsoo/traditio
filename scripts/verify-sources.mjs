import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile("src/asset-manifest.json", "utf8"));
const ownership = JSON.parse(await readFile("src/source-sets.json", "utf8")).ownership;
assert.equal(new Set(ownership).size, ownership.length);
for (const path of ownership) {
  assert.ok(path.startsWith("sources/poste-1904-p"), "Ownership pages belong to the Gaius edition");
  assert.ok(
    manifest.some((item) => item.path === path),
    path,
  );
}
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
const artifacts = JSON.parse(await readFile("docs/river-review/artifacts.json", "utf8")).artifacts;
for (const item of artifacts) {
  const bytes = await readFile(`docs/river-review/local/${item.path}`);
  assert.equal(bytes.length, item.bytes, item.path);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256, item.path);
}
console.log(`${artifacts.length} native river artifacts match their retained byte identities.`);

// A self-consistent artifact receipt can still describe a stale reading. Compare
// its actual embedded files and source/license text with the current sources.
const { gunzipSync } = await import("node:zlib");
const escapeHtml = (text) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const bundles = [
  ["examples/mistaken-heir-comparison.html.gz", ownership],
  ["examples/knowing-seller-argument.html.gz", ownership],
  [
    "docs/ceremony-review/local/rehearsal.html.gz",
    [74, 75, 134, 135].map((p) => `sources/poste-1904-p${p}.jpg`),
  ],
  [
    "docs/river-review/local/reading.html.gz",
    [
      "sources/poste-1904-p160.jpg",
      "sources/poste-1904-p161.jpg",
      "sources/mommsen-1893-p644.jpg",
      "sources/mommsen-1893-p645.jpg",
    ],
  ],
];
for (const [path, pages] of bundles) {
  const html = gunzipSync(await readFile(path)).toString();
  const hashes = (pattern) =>
    [...html.matchAll(pattern)]
      .map((m) => createHash("sha256").update(Buffer.from(m[1], "base64")).digest("hex"))
      .sort();
  assert.deepEqual(
    hashes(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/g),
    manifest
      .filter((a) => pages.includes(a.path))
      .map((a) => a.sha256)
      .sort(),
    `${path}: embedded source pages`,
  );
  assert.deepEqual(
    hashes(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/g),
    manifest
      .filter((a) => a.mime === "font/woff2")
      .map((a) => a.sha256)
      .sort(),
    `${path}: embedded fonts`,
  );
  for (const source of [
    "LICENSE.txt",
    "sources/NOTICE.txt",
    "fonts/literata-OFL.txt",
    "fonts/sourcesans3-OFL.txt",
  ])
    assert.ok(
      html.includes(escapeHtml(await readFile(`public/${source}`, "utf8"))),
      `${path}: retained ${source} is stale or missing`,
    );
}
console.log(
  `${bundles.length} retained readings contain current source images, fonts, notices and licenses.`,
);
