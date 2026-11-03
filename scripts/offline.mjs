import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { readTransfer } from "../src/transfer.mjs";

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
// Rebuilding an already generated edition must not retain a stale HTML identity.
for (const path of paths.filter((path) => path.endsWith(".html"))) {
  const html = await readFile(path, "utf8");
  await writeFile(path, html.replace(/<meta name="traditio-edition"[^>]*>/g, ""));
}
const seed = [];
for (const path of paths) seed.push(`${path}:${hash(await readFile(path))}`);
seed.push(`worker-builder:${hash(await readFile(new URL(import.meta.url)))}`);
seed.push(`shared-transfer:${hash(readTransfer.toString())}`);
const edition = hash(seed.join("\n")).slice(0, 20);
for (const path of paths.filter((path) => path.endsWith(".html"))) {
  const html = await readFile(path, "utf8");
  await writeFile(
    path,
    html.replace("</head>", `<meta name="traditio-edition" content="${edition}"></head>`),
  );
}
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
const TOTAL_BYTES = FILES.reduce((sum, file) => sum + file.bytes, 0);
const BATCH_MS = 300000;
// Keep install below browser lifecycle limits. The open page retains the
// large source collection through separate, bounded file requests.
const SHELL = FILES.filter(file => !file.url.startsWith('${base}sources/') && !file.url.startsWith('${base}fonts/'));
${readTransfer.toString()}
let invalidationSent = false;
let lastInstallProgress = 0;
async function installProgress(value) {
  const now = Date.now();
  if (now - lastInstallProgress < 350 && value.received !== value.totalBytes) return;
  lastInstallProgress = now;
  const pages = await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for (const page of pages) {
    if (new URL(page.url).pathname.startsWith('${base}')) page.postMessage({type:'edition-progress',edition:EDITION,...value});
  }
}
async function installFailure(file,error) {
  const pages = await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for (const page of pages) if (new URL(page.url).pathname.startsWith('${base}')) page.postMessage({type:'edition-install-failed',edition:EDITION,file,reason:error instanceof Error ? error.message : String(error)});
}
async function notifyClients(type) {
  const pages = await self.clients.matchAll({type:'window'});
  for (const page of pages) page.postMessage({type,edition:EDITION});
}
async function invalidateClients() {
  if (invalidationSent) return;
  invalidationSent = true;
  await notifyClients('inventory-invalidated');
}
async function restoreClients() {
  if (!invalidationSent) return;
  invalidationSent = false;
  await notifyClients('inventory-restored');
}
async function storedInventoryComplete() {
  for (const file of FILES) {
    if (!await matches(await caches.match(file.url, {cacheName:CACHE}), file)) return false;
  }
  return true;
}
async function matches(response, file) {
  if (!response || !response.ok) return false;
  const bytes = await response.arrayBuffer();
  return bytes.byteLength === file.bytes && await digest(bytes) === file.hash;
}
// Source display and several inventory checks can ask for the same missing
// file together. Share verified bytes; one closing caller must not abort others.
const transfers = new Map();
function fetchEdition(file, signal, onProgress) {
  if (signal?.aborted) return Promise.reject(signal.reason);
  let entry = transfers.get(file.url);
  if (!entry) {
    entry = {controller:new AbortController(),listeners:new Set(),received:0,settled:false};
    transfers.set(file.url, entry);
    const current = entry;
    entry.promise = (async () => {
      let headers;
      try {
        const bytes = await readTransfer(file.url, {
          bytes:file.bytes,cache:'reload',signal:current.controller.signal,
          onResponse:response => {headers = new Headers(response.headers);},
          onProgress:received => {
            current.received = received;
            for (const listener of current.listeners) {try {listener.progress?.(received);} catch {}}
          }
        });
        if (await digest(bytes) !== file.hash) throw new Error('Edition mismatch: ' + file.url);
        current.controller.signal.throwIfAborted();
        // fetch() decodes HTTP compression. These bytes are already decoded.
        headers.delete('Content-Encoding');
        headers.delete('Content-Length');
        headers.delete('Content-Range');
        return new Response(bytes,{status:200,headers});
      } finally {
        current.settled = true;
        if (transfers.get(file.url) === current) transfers.delete(file.url);
      }
    })();
  }
  const current = entry;
  return new Promise((resolve,reject) => {
    let done = false;
    const listener = {progress:onProgress};
    const cleanup = () => {
      done = true;
      signal?.removeEventListener('abort',cancel);
      current.listeners.delete(listener);
      if (!current.settled && !current.listeners.size) current.controller.abort();
    };
    const cancel = () => {if (!done) {cleanup();reject(signal.reason);}};
    current.listeners.add(listener);
    signal?.addEventListener('abort',cancel,{once:true});
    onProgress?.(current.received);
    current.promise.then(response => {if (!done) {cleanup();resolve(response.clone());}},error => {if (!done) {cleanup();reject(error);}});
  });
}
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('Offline installation took too long', 'TimeoutError')), BATCH_MS);
  let saved = 0;
  let installingFile;
  try {
    for (let index = 0; index < SHELL.length; index++) {
      const file = SHELL[index];
      installingFile = file.url;
      const response = await fetchEdition(file, controller.signal, received => {
        void installProgress({phase:'install',checked:index,files:FILES.length,received:saved+received,totalBytes:TOTAL_BYTES});
      });
      await cache.put(file.url, response);
      saved += file.bytes;
    }
    // An installed shell is not a complete offline edition. No ready claim is sent here.
  } catch (error) { await caches.delete(CACHE); await installFailure(installingFile,error); throw error; }
  finally {clearTimeout(timer);}
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith('traditio-') && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
function sourceProgress(file,event) {
  let last = 0;
  return received => {
    const now = Date.now();
    if (!event.clientId || now - last < 350 && received !== file.bytes) return;
    last = now;
    void self.clients.get(event.clientId).then(client => client?.postMessage({type:'asset-transfer-progress',edition:EDITION,url:file.url,received,total:file.bytes})).catch(() => {});
  };
}
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
    await invalidateClients();
    try {
      const response = await fetchEdition(file,undefined,sourceProgress(file,event));
      try {
        await (await caches.open(CACHE)).put(file.url, response.clone());
        if (invalidationSent && await storedInventoryComplete()) await restoreClients();
      }
      catch {} // A connected read can succeed without claiming offline retention.
      return response;
    } catch {
      return new Response('This file is unavailable for the current Traditio edition. Reconnect and reopen the workshop.', {status:503, headers:{'Content-Type':'text/plain;charset=utf-8'}});
    }
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'inventory' || !event.ports[0]) return;
  const port = event.ports[0];
  event.waitUntil((async () => {
    let complete = true;
    for (const file of FILES) {
      if (!await matches(await caches.match(file.url,{cacheName:CACHE}),file)) {
        complete = false;
        await invalidateClients();
        break;
      }
    }
    if (complete) await restoreClients();
    port.postMessage({edition:EDITION,complete,files:FILES.length,manifest:FILES,transferMode:'client-batches'});
  })().catch(() => port.postMessage({edition:EDITION,complete:false})).finally(() => port.close()));
});
`,
);
console.log(
  `Offline edition ${edition}: ${files.length} files, ${files.reduce((sum, file) => sum + file.bytes, 0)} bytes.`,
);
