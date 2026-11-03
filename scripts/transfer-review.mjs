import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, firefox } from "playwright";
import { transferServer } from "./transfer-server.mjs";

const out = resolve(process.env.REVIEW_OUTPUT || "test-results/transfer");
await mkdir(out, { recursive: true });
const server = transferServer(process.env.REVIEW_ROOT || "dist");
await server.start();
const manifest = JSON.parse(await readFile("src/asset-manifest.json", "utf8"));
const large = "sources/mommsen-1893-p645.jpg";
const craftSource = "sources/poste-1904-p163.jpg";
const report = { at: new Date().toISOString(), browsers: [] };
function instrument() {
  window.transferStatuses = [];
  window.transferMessages = [];
  navigator.serviceWorker?.addEventListener("message", (e) => {
    if (e.data?.type === "edition-install-failed") window.transferMessages.push(e.data);
  });
  window.transferBlobs = new Map();
  const create = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (blob) => {
    const url = create(blob);
    window.transferBlobs.set(url, blob);
    return url;
  };
  window.addEventListener("DOMContentLoaded", () => {
    for (const id of ["offline-status", "river-scan-status", "craft-scan-status"]) {
      const node = document.getElementById(id);
      if (node)
        new MutationObserver(() =>
          window.transferStatuses.push({ id, text: node.textContent, at: Date.now() }),
        ).observe(node, { childList: true, subtree: true, characterData: true });
    }
  });
}
const says = async (p, id, text, timeout = 60000) => {
  try {
    await p.waitForFunction(
      ({ id, text }) => document.getElementById(id)?.textContent.includes(text),
      { id, text },
      { timeout, polling: 100 },
    );
  } catch (error) {
    console.log(
      "TRANSFER FAILURE",
      JSON.stringify(
        await p.evaluate(() => ({
          url: location.href,
          status: document.getElementById("offline-status")?.textContent,
          source: document.getElementById("river-scan-status")?.textContent,
          history: window.transferStatuses?.slice(-12),
          failures: window.transferMessages,
        })),
      ),
    );
    throw error;
  }
};
const ready = (p, timeout) =>
  says(p, "offline-status", "This edition is available offline,", timeout);
async function scan(p, id, path) {
  const actual = await p.locator(`#${id}`).evaluate(async (img) => {
    const blob = window.transferBlobs.get(img.src);
    return Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
  });
  assert.equal(actual, manifest.find((m) => m.path === path).sha256);
}
async function jsonDownload(p) {
  const waiting = p.waitForEvent("download");
  await p.locator("#craft-save-json").click();
  const file = await waiting;
  return JSON.parse(await readFile(await file.path(), "utf8"));
}
try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["firefox", firefox],
  ]) {
    if (process.env.REVIEW_ENGINE && process.env.REVIEW_ENGINE !== name) continue;
    const browser = await engine.launch();
    try {
      const result = { browser: name };
      const errors = [];
      server.limit(Infinity);
      if (!process.env.COLD_ONLY) {
        server.limit(65536, [large]);
        const direct = await browser.newContext({ serviceWorkers: "block" });
        await direct.addInitScript(instrument);
        const p = await direct.newPage();
        p.on("pageerror", (e) => errors.push(String(e)));
        await p.goto(`${server.base}river.html`);
        await p
          .locator("#river-note")
          .fill("Active transfers and later source choices must keep this account.");
        const started = Date.now();
        await p.locator("#river-page").selectOption("d2");
        await says(p, "river-scan-status", "Complete image checked");
        const elapsed = Date.now() - started;
        assert.ok(elapsed > 20000, "The actual read must exceed the old absolute deadline");
        await scan(p, "river-scan", large);
        const statuses = await p.evaluate(() => window.transferStatuses);
        assert.ok(
          statuses.some(
            (s) =>
              s.id === "river-scan-status" && /% received/.test(s.text) && s.at - started > 20000,
          ),
        );
        assert.match(await p.locator("#river-note").inputValue(), /Active transfers/);
        result.activeRead = {
          bytesPerSecond: 65536,
          elapsedMs: elapsed,
          sourceSha256: manifest.find((m) => m.path === large).sha256,
          progressBeyondOldDeadline: true,
        };
        await direct.close();
        console.log(`${name}: a real active source read beyond 20 seconds is verified`);

        server.limit(Infinity);
        server.stalled.add(craftSource);
        const faults = await browser.newContext({ serviceWorkers: "block" });
        await faults.addInitScript(instrument);
        const f = await faults.newPage();
        f.on("pageerror", (e) => errors.push(String(e)));
        await f.goto(`${server.base}work.html`, { waitUntil: "domcontentloaded" });
        await f.locator("#craft-note").fill("A stalled source must not erase my explanation.");
        const stallStart = Date.now();
        await says(f, "craft-scan-status", "no new data arrived for 15 seconds");
        assert.ok(Date.now() - stallStart < 22000);
        assert.equal(await f.locator("#craft-scan").isVisible(), false);
        assert.match((await jsonDownload(f)).note, /must not erase/);
        server.stalled.delete(craftSource);
        await f.locator("#craft-retry").click();
        await says(f, "craft-scan-status", "Complete image checked");
        await scan(f, "craft-scan", craftSource);
        server.stalled.add(craftSource);
        await f.locator("#craft-retry").click();
        await says(f, "craft-scan-status", "% received");
        await f.locator("#craft-page").selectOption("162");
        await says(f, "craft-scan-status", "p. 162. Complete image checked");
        assert.equal(await f.locator("#craft-page").inputValue(), "162");
        server.stalled.delete(craftSource);
        result.stalledRead = {
          fifteenSecondInactivity: true,
          explanationRetained: true,
          exactRetry: true,
          supersededBodyCancelled: true,
        };
        await faults.close();
        console.log(`${name}: stalled body, verified retry and page replacement preserve work`);

        const warm = await browser.newContext();
        await warm.addInitScript(instrument);
        const w = await warm.newPage();
        w.on("pageerror", (e) => errors.push(String(e)));
        await w.goto(`${server.base}river.html`);
        await ready(w);
        const other = await warm.newPage();
        await other.goto(`${server.base}work.html`);
        await ready(other);
        await other.locator("#craft-note").fill("Keep this in the other open room during repair.");
        await w.evaluate(async (path) => {
          const edition = document.querySelector('meta[name="traditio-edition"]').content;
          await (await caches.open(`traditio-${edition}`)).put(
            new URL(path, location.href),
            new Response("damaged"),
          );
        }, large);
        server.limit(65536, [large]);
        const before = server.requests.length;
        const repairStart = Date.now();
        await w.locator("#river-page").selectOption("d2");
        await says(w, "river-scan-status", "Complete image checked");
        await ready(w);
        await ready(other);
        await scan(w, "river-scan", large);
        const requests = server.requests.slice(before).filter((r) => r.path === large);
        assert.equal(requests.length, 1, "Reader plus two inventory requests share one body");
        assert.ok(Date.now() - repairStart > 20000);
        assert.match(await other.locator("#craft-note").inputValue(), /other open room/);
        const repairStatuses = await w.evaluate(() => window.transferStatuses);
        assert.ok(repairStatuses.some((s) => /Repairing/.test(s.text)));
        assert.ok(
          !repairStatuses.some((s) => s.at >= repairStart && /could not be confirmed/.test(s.text)),
        );
        result.repair = {
          elapsedMs: Date.now() - repairStart,
          networkBodies: requests.length,
          bothPagesReadyAfterVerification: true,
          otherRoomExplanationRetained: true,
        };
        server.limit(Infinity);
        await server.stop();
        await w.reload();
        await ready(w);
        await w.locator("#river-page").selectOption("d2");
        await says(w, "river-scan-status", "Complete image checked");
        await scan(w, "river-scan", large);
        await warm.close();
        await server.start();
        console.log(
          `${name}: multi-tab repair uses one body, stays responsive and survives a real outage`,
        );

        server.stalled.add("LICENSE.txt");
        const failed = await browser.newContext();
        await failed.addInitScript(instrument);
        const failedPage = await failed.newPage();
        failedPage.on("pageerror", (e) => errors.push(String(e)));
        await failedPage.goto(`${server.base}work.html`, { waitUntil: "domcontentloaded" });
        await failedPage
          .locator("#craft-note")
          .fill("Keep this through an incomplete offline installation.");
        await says(failedPage, "offline-status", "Offline installation did not complete");
        const saved = await jsonDownload(failedPage);
        assert.match(saved.note, /incomplete offline/);
        assert.equal(
          await failedPage.evaluate(
            async () => (await caches.keys()).filter((k) => k.startsWith("traditio-")).length,
          ),
          0,
        );
        server.stalled.delete("LICENSE.txt");
        await failedPage.reload();
        await ready(failedPage);
        await failedPage.locator("#craft-open").setInputFiles({
          name: "saved.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(saved)),
        });
        await says(failedPage, "craft-save-status", "Notebook reopened");
        assert.deepEqual(await jsonDownload(failedPage), saved);
        result.installFailure = {
          partialEditionRemoved: true,
          editableNotebookSaved: true,
          reconnectedInstallationAndRestore: true,
        };
        await failed.close();
        console.log(
          `${name}: a stalled install never becomes ready; its notebook restores after retry`,
        );
      }
      // A cold foreground page shares one real 128000-byte/s budget with the
      // background edition install, including fonts and every source page.
      server.compressed.add("sources/poste-1904-p162.jpg");
      server.limit(128000);
      const cold = await browser.newContext({ viewport: { width: 375, height: 1000 } });
      await cold.addInitScript(instrument);
      const coldPage = await cold.newPage();
      coldPage.on("pageerror", (e) => errors.push(String(e)));
      const coldStart = Date.now();
      await coldPage.goto(`${server.base}river.html`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await coldPage.locator("#river-page").selectOption("d2");
      await says(coldPage, "river-scan-status", "Complete image checked", 180000);
      await scan(coldPage, "river-scan", large);
      await ready(coldPage, 240000);
      const coldStatuses = await coldPage.evaluate(() => window.transferStatuses);
      assert.ok(coldStatuses.some((s) => /Saving lessons and sources:/.test(s.text)));
      const edition = await coldPage
        .locator('meta[name="traditio-edition"]')
        .getAttribute("content");
      const inventory = JSON.parse(
        (await readFile("dist/sw.js", "utf8")).match(/const FILES = (\[[^\n]+\]);/)[1],
      );
      const cacheFiles = await coldPage.evaluate(
        async ({ edition, inventory }) => {
          const cache = await caches.open(`traditio-${edition}`);
          const results = [];
          for (const file of inventory) {
            const response = await cache.match(file.url);
            if (!response) throw new Error(`Missing offline file ${file.url}`);
            const bytes = await response.arrayBuffer();
            const digest = Array.from(
              new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
              (b) => b.toString(16).padStart(2, "0"),
            ).join("");
            if (digest !== file.hash || bytes.byteLength !== file.bytes)
              throw new Error(`Damaged offline file ${file.url}`);
            results.push(file.url);
          }
          return results.length;
        },
        { edition, inventory },
      );
      await coldPage.screenshot({ path: resolve(out, `${name}-cold-ready.png`), fullPage: true });
      result.coldInstall = {
        globalBytesPerSecond: 128000,
        elapsedMs: Date.now() - coldStart,
        completeFiles: cacheFiles,
        edition,
        progressObserved: true,
      };
      server.limit(Infinity);
      await server.stop();
      await coldPage.reload();
      await ready(coldPage);
      await coldPage.goto(`${server.base}work.html`);
      await ready(coldPage);
      await coldPage.locator("#craft-page").selectOption("162");
      await says(coldPage, "craft-scan-status", "p. 162. Complete image checked");
      await scan(coldPage, "craft-scan", "sources/poste-1904-p162.jpg");
      assert.equal(
        await coldPage.evaluate(async () =>
          (await fetch(new URL("sources/poste-1904-p162.jpg", location.href))).headers.get(
            "Content-Encoding",
          ),
        ),
        null,
      );
      for (const route of ["", "ceremony.html", "river.html", "work.html"]) {
        await coldPage.goto(server.base + route);
        await ready(coldPage);
      }
      result.coldInstall.realOutageAllFourRooms = true;
      result.coldInstall.gzipDecodedBeforeCacheAndOfflineRead = true;
      assert.deepEqual(errors, []);
      result.runtimeErrors = errors;
      report.browsers.push(result);
      await writeFile(resolve(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
      await cold.close();
      await server.start();
      console.log(
        `${name}: cold shared-bandwidth installation and decoded offline bytes verified (${cacheFiles} files)`,
      );
    } finally {
      server.limit(Infinity);
      server.stalled.clear();
      server.compressed.clear();
      await browser.close();
      await server.start();
    }
  }
} finally {
  await server.close();
}
console.log(`Transfer review complete: ${report.browsers.length} browsers.`);
