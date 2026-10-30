/* Generated from the complete production edition. */
const EDITION = "92f4dc9e2374d42159f8";
const CACHE = 'traditio-' + EDITION;
const FILES = [{"url":"/traditio/assets/ceremony-Bz5ZJiXb.js","hash":"01c2d4564475839c7386915d507f1becbdf19bfc1e28345515c146e79142957b","bytes":31102},{"url":"/traditio/assets/ceremony-ydxke2BF.css","hash":"37da630e4e842fa2f71e21488ccd53e0f688239a6922b9f55fe186b394f0374d","bytes":3333},{"url":"/traditio/assets/index-DWEnKsMz.js","hash":"7aec85e1f440b872b781ea4c102d727aa3924d278239a45beea4539e14ddd588","bytes":15779},{"url":"/traditio/assets/offline-B6D61xFC.css","hash":"e0a45e9985c4dadf50d85e16a40e8db6988c4b2c3ce50b5db6e72c0f1b457aca","bytes":16505},{"url":"/traditio/assets/offline-BQl7RQTq.js","hash":"b061d91b43d5c9d88f6afb3f9a995b99321c2d0feb6bcbd1e8757db24913f8ab","bytes":52645},{"url":"/traditio/ceremony.html","hash":"10a749e77b54c8411b60b889b4bfeeb1dc075dabaeabd42532bc00a3ef529348","bytes":8816},{"url":"/traditio/favicon.svg","hash":"576cf2ac3bede0e9ccfd21a4e08e59ce4850826239253d6a8eef8d2c4d466a00","bytes":270},{"url":"/traditio/fonts/literata-OFL.txt","hash":"8742963604cd89dc81437811a850018fc03b2bfad686d7422c8235967c87614e","bytes":4389},{"url":"/traditio/fonts/literata.woff2","hash":"99efd2b91637e922059a38d459abeceade161dc868b47318fa3b9c99137293db","bytes":396664},{"url":"/traditio/fonts/provenance.json","hash":"a33529cd8d64a41671cbfa367a56f0180d399810f3434f8c00b6e0e07e3115a2","bytes":637},{"url":"/traditio/fonts/sourcesans3-OFL.txt","hash":"09746787287a289323b0ec3cff4d1a4a801331b82b7207c1e186f5d26619a392","bytes":4579},{"url":"/traditio/fonts/sourcesans3.woff2","hash":"5f16566f7a40d39b339ad26be151fa5a1ab1f0c2574c7a2e619765584a1acbd8","bytes":170188},{"url":"/traditio/index.html","hash":"7e56e3fbcaa96c73e39cb62532ce4b1ece6107f8632dcaa0d7974acdc1be9e88","bytes":17229},{"url":"/traditio/LICENSE.txt","hash":"62145e70388e9be739b404f904df6434bacaa748c9b5875c146791457fb83b81","bytes":1071},{"url":"/traditio/sources/manifest.json","hash":"b1c26edcf261120656ebb570764a74e87d1f5e602832ff5123138c73b89f5b77","bytes":4021},{"url":"/traditio/sources/NOTICE.txt","hash":"028ff49992051f00f2e1299035f155b5d19813a1cbf3f88bcfbf2a5560f43c19","bytes":2156},{"url":"/traditio/sources/poste-1904-p133.jpg","hash":"05284e6270a8e6d5497eda2ab90257f953f63c267c46e127a609fb7992f6d281","bytes":695670},{"url":"/traditio/sources/poste-1904-p134.jpg","hash":"56dcb4c7a8c036c7c6d4c7e22885918d529e33eca4bc8edbb1ed13ede0621c39","bytes":766313},{"url":"/traditio/sources/poste-1904-p135.jpg","hash":"b0e7e397f3c26449a2a280ad249c18cceb2e136f2f1d0432bb568e88d7874cab","bytes":606314},{"url":"/traditio/sources/poste-1904-p146.jpg","hash":"ed49a31407b9279aff8917b9f3118143cc3b21bb5c4d7568186fa850d09a60c4","bytes":714508},{"url":"/traditio/sources/poste-1904-p147.jpg","hash":"05219d14f114f07e382879b8fd3359b4ee260e2932bdf67c9030a3f14689a8dd","bytes":726668},{"url":"/traditio/sources/poste-1904-p148.jpg","hash":"56cbb59cde3185400e2d2d96355a9b0f636de679620395a9b24bbf8e301e0da0","bytes":739943},{"url":"/traditio/sources/poste-1904-p149.jpg","hash":"6b55c1f4bb0be66b9245cb1f1d6094b2eaec7abe8c8aaa22f3b2a453fd0f3810","bytes":724335},{"url":"/traditio/sources/poste-1904-p74.jpg","hash":"9f603fe446f1a2ff53ac2383faf1060ebda4fa7bf5aa66fc3a6a095347b53ecd","bytes":702149},{"url":"/traditio/sources/poste-1904-p75.jpg","hash":"4c91e33c7da09741389249424a746d6bb72aa0097f232da4b268dc10b933e004","bytes":761383}];
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
  if (url.pathname === '/traditio/') url.pathname += 'index.html';
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
