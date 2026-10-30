import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, resolve } from "node:path";
import { chromium, firefox } from "playwright";

const output = resolve(process.env.REVIEW_OUTPUT || "studies/audit-2026-10-29");
await mkdir(output, { recursive: true });
const scratch = await mkdtemp(resolve(process.env.TMPDIR || tmpdir(), "traditio-audit-"));
const oldRoot = resolve(scratch, "old");
const newRoot = resolve(scratch, "new");
await cp("dist", resolve(oldRoot, "dist"), { recursive: true });
await cp("dist", resolve(newRoot, "dist"), { recursive: true });
const oldHtml = await readFile(resolve(oldRoot, "dist/index.html"), "utf8");
await writeFile(
  resolve(newRoot, "dist/index.html"),
  oldHtml
    .replace(/<meta name="traditio-edition"[^>]+>/, "")
    .replace("<body>", '<body data-audit-edition="new">'),
);
const builder = spawn(process.execPath, [resolve("scripts/offline.mjs")], {
  cwd: newRoot,
  stdio: "ignore",
});
assert.equal((await once(builder, "exit"))[0], 0);

const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".json": "application/json",
};
let activeRoot = resolve(oldRoot, "dist");
let corrupt = false;
let corruptedRequests = 0;
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, "http://localhost").pathname;
    if (!path.startsWith("/traditio/"))
      return response.writeHead(200, { "content-type": "text/html" }).end("Outside worker scope");
    const file = resolve(activeRoot, path.slice(10) || "index.html");
    assert.ok(file.startsWith(`${activeRoot}/`));
    const bytes = await readFile(file);
    if (corrupt && file.endsWith("poste-1904-p133.jpg")) {
      bytes[100] ^= 1;
      corruptedRequests++;
    }
    response
      .writeHead(200, {
        "content-type": types[extname(file)] || "application/octet-stream",
        "cache-control": "no-store",
      })
      .end(bytes);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const base = `${origin}/traditio/`;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const report = {
  date: new Date().toISOString(),
  build: {
    indexSha256: hash(await readFile("dist/index.html")),
    workerSha256: hash(await readFile("dist/sw.js")),
  },
  browsers: [],
};
async function says(page, selector, expected) {
  await page.waitForFunction(
    ({ selector, expected }) => document.querySelector(selector)?.textContent.includes(expected),
    { selector, expected },
  );
}
async function ready(page) {
  await says(page, "#offline-status", "This edition is available offline");
}

try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["firefox", firefox],
  ]) {
    const browser = await engine.launch();
    try {
      activeRoot = resolve(oldRoot, "dist");
      corrupt = true;
      const initial = await browser.newContext();
      const page = await initial.newPage();
      await page.goto(base);
      await says(page, "#offline-status", "Offline installation did not complete");
      assert.ok(corruptedRequests > 0);
      assert.equal(await page.evaluate(() => !!navigator.serviceWorker.controller), false);
      corrupt = false;
      await page.reload();
      await ready(page);

      // Neither a damaged cache entry nor a mismatched server response may be used.
      corrupt = true;
      const refused = await page.evaluate(async () => {
        const cache = await caches.open(
          (await caches.keys()).find((key) => key.startsWith("traditio-")),
        );
        const path = new URL("sources/poste-1904-p133.jpg", location.href).href;
        await cache.put(path, new Response("damaged cache entry"));
        const response = await fetch(path);
        return { status: response.status, body: await response.text() };
      });
      assert.equal(refused.status, 503);
      assert.ok(refused.body.includes("current Traditio edition"));
      await says(page, "#offline-status", "not fully available offline");
      corrupt = false;
      const restored = await page.evaluate(async () => {
        const response = await fetch(new URL("sources/poste-1904-p133.jpg", location.href));
        const bytes = await response.arrayBuffer();
        return {
          status: response.status,
          hash: Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) =>
            byte.toString(16).padStart(2, "0"),
          ).join(""),
        };
      });
      assert.equal(restored.status, 200);
      assert.equal(restored.hash, hash(await readFile("public/sources/poste-1904-p133.jpg")));
      await ready(page);

      // An installed later edition waits for existing readers to leave.
      activeRoot = resolve(newRoot, "dist");
      await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
      await page.waitForFunction(
        async () =>
          (await navigator.serviceWorker.getRegistration())?.waiting?.state === "installed",
      );
      await page.reload();
      await ready(page);
      assert.equal(await page.locator("body").getAttribute("data-audit-edition"), null);
      const outside = await initial.newPage();
      await outside.goto(`${origin}/outside`);
      await page.close();
      await outside.waitForFunction(async () => {
        const registration = await navigator.serviceWorker.getRegistration("/traditio/");
        return registration?.active?.state === "activated" && !registration.waiting;
      });
      await outside.goto(base);
      await ready(outside);
      assert.equal(await outside.locator("body").getAttribute("data-audit-edition"), "new");
      assert.equal(
        await outside.evaluate(
          async () => (await caches.keys()).filter((key) => key.startsWith("traditio-")).length,
        ),
        1,
      );
      await outside.goto(`${base}ceremony.html`);
      await ready(outside);
      assert.equal(await outside.locator('meta[name="traditio-edition"]').count(), 1);
      await initial.close();

      activeRoot = resolve(oldRoot, "dist");
      const context = await browser.newContext({ serviceWorkers: "block" });
      const exportPage = await context.newPage();
      await exportPage.goto(base);
      await says(exportPage, "#scan-status", "source bytes checked");
      await exportPage.locator("#pin").click();
      let held;
      let reached;
      let arrival = new Promise((done) => {
        reached = done;
      });
      await context.route("**/sources/poste-1904-p133.jpg", (route) => {
        held = route;
        reached();
      });
      let downloads = 0;
      exportPage.on("download", () => downloads++);
      await exportPage.locator("#save-sheet").click();
      await arrival;
      await exportPage.locator("#cancel-export").focus();
      await exportPage.keyboard.press("Enter");
      await says(exportPage, "#file-status", "preparation canceled");
      assert.equal(await exportPage.locator("#save-sheet").isDisabled(), false);
      assert.equal(await exportPage.evaluate(() => document.activeElement.id), "save-sheet");
      assert.equal(downloads, 0);
      assert.equal(await exportPage.locator("#comparison").isVisible(), true);
      await held.abort().catch(() => {});

      arrival = new Promise((done) => {
        reached = done;
      });
      await exportPage.clock.install();
      await exportPage.locator("#save-sheet").click();
      await arrival;
      await exportPage.clock.runFor(20_100);
      await says(exportPage, "#file-status", "took too long");
      assert.equal(await exportPage.locator("#save-sheet").isDisabled(), false);
      assert.equal(downloads, 0);
      await held.abort().catch(() => {});
      await context.unroute("**/sources/poste-1904-p133.jpg");

      await exportPage.locator('[data-lesson="good-faith"]').click();
      await exportPage.locator('input[name="seller"][value="thief"]').check();
      const pending = exportPage.waitForEvent("download");
      await exportPage.locator("#save-sheet").click();
      const file = await pending;
      const bytes = await readFile(await file.path());
      const saved = resolve(scratch, `${name}-casebook.html`);
      await writeFile(saved, bytes);
      const standalone = await context.newPage();
      await standalone.goto(`file://${saved}`);
      const bad = await standalone.locator("svg").evaluateAll((svgs) =>
        svgs.flatMap((svg) =>
          ["aria-labelledby", "aria-describedby"].flatMap((attribute) => {
            const id = svg.getAttribute(attribute);
            const nodes = [...document.querySelectorAll("[id]")].filter((node) => node.id === id);
            return nodes.length === 1 && svg.contains(nodes[0])
              ? []
              : [{ attribute, id, matches: nodes.length }];
          }),
        ),
      );
      assert.deepEqual(bad, []);
      assert.equal(await standalone.locator("svg").count(), 2);
      const descriptions = await standalone.locator("svg desc").allTextContents();
      assert.ok(descriptions[0].includes("Marcus steals it"));
      assert.ok(descriptions[1].includes("Lucius owns a trained mule"));
      await context.close();

      report.browsers.push({
        browser: name,
        version: browser.version(),
        failedInstallationReported: true,
        failedInstallationRecovered: true,
        corruptCacheAndServerRefused: true,
        discoveredFailureAutomaticallyWithdrawsReadiness: true,
        exactCacheRecovery: true,
        oldReaderKeepsEdition: true,
        newEditionActivatesAfterReaderCloses: true,
        companionPageHasCurrentEditionIdentity: true,
        cancellationPreservesCasesAndFocus: true,
        stalledExportTimesOut: true,
        noCanceledOrTimedOutDownload: true,
        retryProducesCasebook: true,
        diagramDescriptionsResolveWithinTheirOwnFigure: true,
      });
      console.log(
        `${name}: installation failure/recovery, damaged cache, edition upgrade, cancel/timeout/retry and diagram descriptions passed.`,
      );
    } finally {
      await browser.close();
    }
  }
  await writeFile(
    resolve(output, "after-browser-audit.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
} finally {
  await new Promise((done) => server.close(done));
}
