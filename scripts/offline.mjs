import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const base = "/traditio/";
async function walk(path) {
  const list = [];
  for (const entry of (await readdir(path, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (entry.isDirectory()) list.push(...(await walk(join(path, entry.name))));
    else list.push(join(path, entry.name));
  }
  return list;
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const paths = (await walk("dist")).filter((path) => !path.endsWith("/sw.js"));
const seed = [];
for (const path of paths) seed.push(`${path}:${hash(await readFile(path))}`);
seed.push(`worker-builder:${hash(await readFile(new URL(import.meta.url)))}`);
const edition = hash(seed.join("\n")).slice(0, 20);
const html = await readFile("dist/index.html", "utf8");
await writeFile(
  "dist/index.html",
  html.replace("</head>", `<meta name="traditio-edition" content="${edition}"></head>`),
);
const files = [];
for (const path of paths) {
  const bytes = await readFile(path);
  files.push({ url: base + path.slice(5), hash: hash(bytes), bytes: bytes.length });
}
await writeFile(
  "dist/sw.js",
  `/* Generated from the complete production edition. */
const EDITION = ${JSON.stringify(edition)};
const CACHE = 'traditio-' + EDITION;
const FILES = ${JSON.stringify(files)};
const allowed = new Map(FILES.map(file => [new URL(file.url, self.location.origin).href, file]));
const digest = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
async function matches(response, file) {
  if (!response || !response.ok) return false;
  const bytes = await response.arrayBuffer();
  return bytes.byteLength === file.bytes && await digest(bytes) === file.hash;
}
async function fetchEdition(file) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(file.url, {cache:'reload', signal:controller.signal});
    if (!await matches(response.clone(), file)) throw new Error('Edition mismatch: ' + file.url);
    return response;
  } finally {clearTimeout(timeout);}
}
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  try {
    for (const file of FILES) {
      const response = await fetchEdition(file);
      await cache.put(file.url, response);
    }
  } catch (error) { await caches.delete(CACHE); throw error; }
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith('traditio-') && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '${base}') url.pathname += 'index.html';
  url.search = ''; url.hash = '';
  const file = allowed.get(url.href);
  if (!file) return;
  event.respondWith((async () => {
    const saved = await caches.match(url.href, {cacheName:CACHE});
    if (saved && await matches(saved.clone(), file)) return saved;
    try {
      const response = await fetchEdition(file);
      try {await (await caches.open(CACHE)).put(file.url, response.clone());}
      catch {} // A connected read can succeed without claiming offline retention.
      return response;
    } catch {
      return new Response('This file is unavailable for the current Traditio edition. Reconnect and reopen the workshop.', {status:503, headers:{'Content-Type':'text/plain;charset=utf-8'}});
    }
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'inventory' || !event.ports[0]) return;
  event.waitUntil((async () => {
    let complete = true;
    for (const file of FILES) {
      if (!await matches(await caches.match(file.url, {cacheName:CACHE}), file)) {
        if (event.data.repair !== true) {complete = false; break;}
        const response = await fetchEdition(file);
        await (await caches.open(CACHE)).put(file.url, response);
      }
    }
    event.ports[0].postMessage({edition:EDITION, complete, files:FILES.length});
  })().catch(() => event.ports[0].postMessage({edition:EDITION,complete:false})));
});
`,
);
console.log(
  `Offline edition ${edition}: ${files.length} files, ${files.reduce((sum, file) => sum + file.bytes, 0)} bytes.`,
);
