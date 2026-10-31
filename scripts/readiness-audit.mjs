import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, firefox } from "playwright";
import { reviewServer } from "./review-server.mjs";

const project = "traditio";
const views = [
  {
    id: "ownership",
    route: "",
    select: "#page-select",
    page: "133",
    path: "sources/poste-1904-p133.jpg",
    retry: "#retry-scan",
    status: "#scan-status",
    image: "#scan",
    note: null,
  },
  {
    id: "ceremony",
    route: "ceremony.html",
    select: "#ceremony-page",
    page: "74",
    path: "sources/poste-1904-p74.jpg",
    retry: "#ceremony-retry",
    status: "#ceremony-scan-status",
    image: "#ceremony-scan",
    note: "#ceremony-note",
  },
  {
    id: "river",
    route: "river.html",
    select: "#river-page",
    page: "d1",
    path: "sources/mommsen-1893-p644.jpg",
    retry: "#river-retry",
    status: "#river-scan-status",
    image: "#river-scan",
    note: "#river-note",
  },
];
const out = resolve(process.argv[2] || "test-results/readiness");
await mkdir(out, { recursive: true });
const a = resolve(out, "a/dist"),
  b = resolve(out, "b/dist");
// Repeated audits must not turn unused files from a previous build into edition B.
await rm(resolve(out, "a"), { recursive: true, force: true });
await rm(resolve(out, "b"), { recursive: true, force: true });
await cp("dist", a, { recursive: true });
await cp("dist", b, { recursive: true });
const edition = (html) =>
  html.match(new RegExp(`name="${project}-edition" content="([a-f0-9]+)"`))[1];
const editionA = edition(await readFile(`${a}/index.html`, "utf8"));
await writeFile(
  `${b}/favicon.svg`,
  `${await readFile(`${b}/favicon.svg`, "utf8")}\n<!-- Readiness audit B -->\n`,
);
// Strip a generated identity before asking the builder for a distinct edition.
for (const file of ["index.html", "ceremony.html", "river.html"]) {
  const path = `${b}/${file}`;
  await writeFile(
    path,
    (await readFile(path, "utf8")).replace(
      new RegExp(`<meta name="${project}-edition"[^>]+>`, "g"),
      "",
    ),
  );
}
execFileSync(process.execPath, [resolve("scripts/offline.mjs")], { cwd: resolve(out, "b") });
const editionB = edition(await readFile(`${b}/index.html`, "utf8"));
assert.notEqual(editionA, editionB);
const server = reviewServer(a);
const ready = (p) =>
  p.locator("#offline-status").filter({ hasText: "This edition is available offline," }).waitFor();
const incomplete = (p) =>
  p.locator("#offline-status").filter({ hasText: "not fully available offline" }).waitFor();
const sourceChecked = (p, v) =>
  p
    .locator(v.status)
    .filter({ hasText: /checked|Printed page/ })
    .waitFor();
async function damage(p, path) {
  await p.evaluate(
    async ({ project, path }) => {
      const edition = document.querySelector(`meta[name="${project}-edition"]`).content;
      const url = new URL(path, new URL(".", location.href));
      const cache = await caches.open(`${project}-${edition}`);
      const good = await cache.match(url);
      if (!good) throw Error("Expected cached source");
      await (await caches.open(`${project}-unrelated-edition`)).put(url, good.clone());
      const bytes = new Uint8Array(await good.arrayBuffer());
      bytes[100] ^= 1;
      await cache.put(url, new Response(bytes, { headers: { "Content-Type": "image/jpeg" } }));
    },
    { project, path },
  );
}
async function nativeImage(p, path) {
  return p.evaluate(
    (path) =>
      new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve("loaded");
        image.onerror = () => resolve("failed");
        image.src = new URL(path, new URL(".", location.href)).href;
      }),
    path,
  );
}
const results = [];
await server.start();
try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["firefox", firefox],
  ]) {
    server.use(a);
    const browser = await engine.launch();
    try {
      for (const v of views) {
        const context = await browser.newContext({ viewport: { width: 375, height: 1000 } });
        const p = await context.newPage();
        await p.goto(server.base + v.route);
        await ready(p);
        await p.locator(v.select).selectOption(v.page);
        await sourceChecked(p, v);
        const observer = await context.newPage();
        await observer.goto(server.base + views[(views.indexOf(v) + 1) % views.length].route);
        await ready(observer);
        for (const reader of [p, observer])
          await reader.evaluate(() => {
            window.inventoryNotices = 0;
            navigator.serviceWorker.addEventListener("message", (event) => {
              if (event.data?.type === "inventory-invalidated") window.inventoryNotices++;
            });
          });
        if (v.note) await p.locator(v.note).fill("Keep the explanation when a source fails.");
        await context.setOffline(true);
        await damage(p, v.path);
        await p.locator(v.retry).click();
        await p.waitForFunction(
          (selector) => !document.querySelector(selector).textContent.startsWith("Loading"),
          v.status,
        );
        const directSource = (await p.locator(v.status).textContent()) || "";
        const directRefused = /failed|Could not|does not match/.test(directSource);
        if (directRefused) {
          await incomplete(p);
          await incomplete(observer);
          assert.equal(await p.locator(v.image).isHidden(), true);
        } else {
          // Firefox's emulated-offline default fetch may return valid bytes
          // without reaching the worker. The real-outage test below is separate.
          assert.match(directSource, /checked|Printed page/);
        }
        await context.setOffline(false);
        await ready(p);
        await ready(observer);
        await p.locator(v.retry).click();
        await sourceChecked(p, v);
        const noticesBefore = await Promise.all(
          [p, observer].map((reader) => reader.evaluate(() => window.inventoryNotices)),
        );
        // A plain image request has no verifiedBytes wrapper. Only the worker
        // can notify the page of damage discovered on this path.
        await server.stop();
        assert.equal(await p.evaluate(() => navigator.onLine), true);
        await damage(p, v.path);
        assert.equal(await nativeImage(p, v.path), "failed");
        await incomplete(p);
        await incomplete(observer);
        const noticesAfter = await Promise.all(
          [p, observer].map((reader) => reader.evaluate(() => window.inventoryNotices)),
        );
        assert.deepEqual(
          noticesAfter,
          noticesBefore.map((count) => count + 1),
        );
        assert.equal(await nativeImage(p, v.path), "failed");
        assert.deepEqual(
          await Promise.all(
            [p, observer].map((reader) => reader.evaluate(() => window.inventoryNotices)),
          ),
          noticesAfter,
        );
        const missing = await p.evaluate(async () => {
          try {
            return (await fetch(new URL("uncached-page.html", location.href))).status;
          } catch {
            return "network-failure";
          }
        });
        assert.equal(missing, "network-failure");
        await server.start();
        assert.equal(await nativeImage(p, v.path), "loaded");
        await ready(p);
        await ready(observer);
        if (v.note)
          assert.equal(
            await p.locator(v.note).inputValue(),
            "Keep the explanation when a source fails.",
          );
        await p.evaluate((project) => {
          const before = document.getElementById("offline-status").textContent;
          navigator.serviceWorker.dispatchEvent(
            new MessageEvent("message", {
              data: { type: "inventory-invalidated", edition: "foreign" },
              source: navigator.serviceWorker.controller,
            }),
          );
          navigator.serviceWorker.dispatchEvent(
            new MessageEvent("message", {
              data: {
                type: "inventory-invalidated",
                edition: document.querySelector(`meta[name="${project}-edition"]`).content,
              },
            }),
          );
          if (document.getElementById("offline-status").textContent !== before)
            throw Error("Foreign notification accepted");
        }, project);
        results.push({
          browser: name,
          page: v.route || "index.html",
          emulatedOfflineSourceStatus: directSource,
          explicitFailureWithdrawsReadiness: directRefused ? true : null,
          otherEditionCopyNotUsed: true,
          nativeImageFailureWithRealOriginStopped: true,
          otherOpenPageAutomaticallyWithdrawsReadiness: true,
          repeatedFailureNotificationsCoalesced: true,
          uncachedNavigationNotInvented: true,
          connectedRecovery: true,
          foreignNotificationsIgnored: true,
          explanationPreserved: v.note ? true : null,
        });
        await context.close();
        console.log(
          `${name}/${v.id}: source failure, native image, real outage, recovery, foreign notifications`,
        );
      }
      const updates = await browser.newContext();
      const old = await updates.newPage();
      await old.goto(server.base);
      await ready(old);
      server.use(b);
      await old.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
      await old.waitForFunction(
        async () =>
          (await navigator.serviceWorker.getRegistration()).waiting?.state === "installed",
      );
      await old.reload();
      await ready(old);
      assert.equal(
        await old.locator(`meta[name="${project}-edition"]`).getAttribute("content"),
        editionA,
      );
      const held = await old.evaluate(() => caches.keys());
      assert.ok(held.includes(`${project}-${editionA}`));
      assert.ok(held.includes(`${project}-${editionB}`));
      await old.close();
      const next = await updates.newPage();
      await next.goto(server.base);
      await ready(next);
      assert.equal(
        await next.locator(`meta[name="${project}-edition"]`).getAttribute("content"),
        editionB,
      );
      const active = await next.evaluate(() => caches.keys());
      assert.ok(active.includes(`${project}-${editionB}`));
      assert.ok(!active.includes(`${project}-${editionA}`));
      await updates.close();
      results.push({
        browser: name,
        oldEditionHeldWhileOpen: true,
        newEditionActivatedAfterClose: true,
      });
    } finally {
      await server.start().catch(() => {});
      await browser.close();
    }
  }
  await writeFile(
    `${out}/receipt.json`,
    `${JSON.stringify(
      {
        date: new Date().toISOString(),
        editionA,
        editionB,
        failureRecoveryTriggeredByRealRequests: true,
        syntheticForeignMessagesTestedAndIgnored: true,
        results,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await server.stop();
}
