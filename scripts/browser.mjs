import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";
import { argumentJourney, offlineArgument } from "./argument-journey.mjs";

const root = resolve("dist");
const output = resolve(process.env.REVIEW_OUTPUT || "docs/assets");
await mkdir(output, { recursive: true });
const scratch = resolve(process.env.REVIEW_SCRATCH || "test-results");
await mkdir(scratch, { recursive: true });
const manifest = JSON.parse(await readFile("src/asset-manifest.json", "utf8"));
const ownershipPaths = JSON.parse(await readFile("src/source-sets.json", "utf8")).ownership;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};
let serverUnavailable = false;
const server = createServer(async (request, response) => {
  if (serverUnavailable) {
    request.socket.destroy();
    return;
  }
  const url = new URL(request.url, "http://localhost");
  if (!url.pathname.startsWith("/traditio/")) {
    response.writeHead(404).end();
    return;
  }
  const file = resolve(root, decodeURIComponent(url.pathname.slice(10)) || "index.html");
  if (!file.startsWith(`${root}/`)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const address = server.address();
const base = `http://127.0.0.1:${address.port}/traditio/`;
async function inventory(directory, prefix = "") {
  const files = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory())
      files.push(...(await inventory(resolve(directory, entry.name), `${path}/`)));
    else {
      const bytes = await readFile(resolve(directory, entry.name));
      files.push({ path, bytes: bytes.length, sha256: hash(bytes) });
    }
  }
  return files;
}

const report = {
  date: new Date().toISOString(),
  runtime: { node: process.version, platform: process.platform, architecture: process.arch },
  productionFiles: await inventory(root),
  journeys: [],
  faults: [],
};

// Retain the actual blobs supplied to img.src. Reading these objects verifies
// displayed source bytes without relaxing production CSP to permit blob fetches.
function retainSourceBlobs() {
  const create = URL.createObjectURL.bind(URL);
  const revoke = URL.revokeObjectURL.bind(URL);
  window.reviewBlobs = new Map();
  URL.createObjectURL = (blob) => {
    const url = create(blob);
    window.reviewBlobs.set(url, blob);
    return url;
  };
  URL.revokeObjectURL = (url) => {
    window.reviewBlobs.delete(url);
    revoke(url);
  };
}

async function content(page, selector, expected) {
  await page
    .waitForFunction(
      ({ selector, expected }) => document.querySelector(selector)?.textContent?.includes(expected),
      { selector, expected },
    )
    .catch(async (error) => {
      console.error(
        JSON.stringify({ selector, expected, actual: await page.locator(selector).textContent() }),
      );
      throw error;
    });
}
async function noOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert.ok(dimensions.document <= dimensions.viewport + 1, JSON.stringify(dimensions));
}
async function download(page, selector) {
  const pending = page.waitForEvent("download");
  await page.locator(selector).click();
  const file = await pending;
  assert.equal(await file.failure(), null);
  return { name: file.suggestedFilename(), bytes: await readFile(await file.path()) };
}
async function scanHash(page) {
  return page.locator("#scan").evaluate(async (image) => {
    const bytes = await window.reviewBlobs.get(image.src).arrayBuffer();
    return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  });
}
function checkSheet(bytes) {
  const html = bytes.toString();
  assert.ok(!html.includes("<script"));
  assert.ok(html.includes("Scope of the experiment"));
  const embeddedImages = [...html.matchAll(/src="data:image\/jpeg;base64,([A-Za-z0-9+/=]+)"/g)].map(
    (match) => hash(Buffer.from(match[1], "base64")),
  );
  const embeddedFonts = [...html.matchAll(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/g)].map(
    (match) => hash(Buffer.from(match[1], "base64")),
  );
  assert.deepEqual(
    embeddedImages.sort(),
    manifest
      .filter((file) => ownershipPaths.includes(file.path))
      .map((file) => file.sha256)
      .sort(),
  );
  assert.deepEqual(
    embeddedFonts.sort(),
    manifest
      .filter((file) => file.mime === "font/woff2")
      .map((file) => file.sha256)
      .sort(),
  );
  assert.ok(html.includes("SIL OPEN FONT LICENSE"));
  assert.ok(html.includes("Copyright (c) 2026 Anthony Mercer"));
  const native = /href="data:application\/json;charset=utf-8,([^"]+)"/.exec(html);
  assert.ok(native);
  return {
    record: JSON.parse(decodeURIComponent(native[1])),
    pages: embeddedImages.length,
    fonts: embeddedFonts.length,
    sha256: hash(bytes),
    bytes: bytes.length,
  };
}

try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["firefox", firefox],
  ].filter(([name]) => !process.env.REVIEW_BROWSER || name === process.env.REVIEW_BROWSER)) {
    const browser = await engine.launch();
    try {
      for (const width of [1440, 375].filter(
        (width) => !process.env.REVIEW_WIDTH || width === Number(process.env.REVIEW_WIDTH),
      )) {
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
          reducedMotion: "reduce",
          acceptDownloads: true,
        });
        await context.addInitScript(retainSourceBlobs);
        const page = await context.newPage();
        page.setDefaultTimeout(15_000);
        const errors = [];
        const expectedResourceErrors = [];
        let missingPageExpected = false;
        const missingPageUrl = new URL("sources/poste-1904-p148.jpg", base).href;
        const externals = new Set();
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
          if (message.type() !== "error") return;
          if (
            missingPageExpected &&
            message.location().url === missingPageUrl &&
            /\b503\b/.test(message.text())
          ) {
            expectedResourceErrors.push({ text: message.text(), url: message.location().url });
          } else errors.push(message.text());
        });
        page.on("request", (request) => {
          if (request.url().startsWith("http") && !request.url().startsWith(base))
            externals.add(request.url());
        });
        await page.goto(base);
        await content(page, "#offline-status", "This edition is available offline");
        await content(page, "#scan-status", "source bytes checked");
        await page.evaluate(() => document.fonts.ready);
        await noOverflow(page);
        assert.equal(await page.locator("#title-holder").textContent(), "Lucius");
        await page.screenshot({ path: `${output}/workshop-${name}-${width}.png` });

        // Ordinary radio keyboard behavior must survive a redraw.
        await page.locator('input[name="thing"][value="mule"]').focus();
        await page.keyboard.press("ArrowLeft");
        await content(page, "#outcome-title", "pass together");
        assert.equal(
          await page.evaluate(() => document.activeElement?.getAttribute("value")),
          "cup",
        );
        await page.keyboard.press("ArrowRight");
        await content(page, "#title-holder", "Lucius");
        await page.locator("#pin").click();
        await page.locator('[data-years="1"]').focus();
        await page.keyboard.press("Enter");
        await content(page, "#title-holder", "Aulus");
        await content(page, "#comparison-count", "1 fact changed");
        assert.ok((await page.locator("#comparison-table").textContent()).includes("Lucius"));
        await page.locator('input[name="thing"][value="field"]').check();
        await content(page, "#title-holder", "Lucius");
        await page.locator('[data-years="2"]').click();
        await content(page, "#title-holder", "Aulus");
        await page.locator('input[name="form"][value="mancipation"]').check();
        await page.locator('[data-years="0"]').click();
        await content(page, "#title-holder", "Aulus");

        await page.locator('[data-lesson="land"]').click();
        await page.locator('[data-years="2"]').click();
        await content(page, "#title-holder", "Aulus");
        await page.locator('input[name="entry"][value="violent"]').check();
        await content(page, "#outcome-title", "cannot cure");
        await page.locator('input[name="location"][value="province"]').check();
        await content(page, "#title-holder", "Outside this model");
        await noOverflow(page);

        await page.locator('[data-lesson="good-faith"]').click();
        await content(page, "#title-holder", "Aulus");
        await page.locator("#pin").click();
        await page.locator('input[name="seller"][value="thief"]').check();
        await content(page, "#title-holder", "Lucius");
        await content(page, "#comparison-count", "1 fact changed");
        await page.locator("#comparison").scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${output}/comparison-${name}-${width}.png` });
        await page.locator('input[name="belief"][value="bad"]').check();
        assert.equal(await page.locator('.conditions [data-state="blocked"]').count(), 2);
        await page.locator('input[name="belief"][value="good"]').check();
        await page.locator('[data-years="3"]').click();
        await content(page, "#title-holder", "Lucius");
        await page.locator('[data-years="1"]').click();

        await page.locator("#reading-select").selectOption("delivery");
        assert.equal(
          await page.getByRole("button", { name: "traditione", exact: true }).count(),
          1,
        );
        await page.getByRole("button", { name: "traditione", exact: true }).click();
        await content(page, "#word-note", "Ablative singular");
        await content(page, "#reading-latin", "recipiunt traditionem");

        await page.locator("#focus-read").click();
        await content(page, "#scan-status", "Printed page 148");
        await content(page, "#scan-status", "source bytes checked");
        await page.getByRole("button", { name: "quamquam", exact: true }).click();
        await content(page, "#word-note", "even though");
        await noOverflow(page);
        await page.screenshot({ path: `${output}/reading-${name}-${width}.png` });
        await page.locator("#zoom").click();
        const size = await page.locator("#scan").evaluate((image) => ({
          natural: image.naturalWidth,
          displayed: image.getBoundingClientRect().width,
        }));
        assert.equal(size.displayed, size.natural);
        assert.ok(size.natural > 1000);
        await page.keyboard.press("ArrowRight");
        await page.waitForFunction(() => document.querySelector("#scan-viewport").scrollLeft > 0);
        await page.locator("#zoom").click();
        const scannedPages = [];
        for (const item of manifest.filter((item) => ownershipPaths.includes(item.path))) {
          await page.locator("#page-select").selectOption(String(item.printedPage));
          await content(page, "#scan-status", `Printed page ${item.printedPage} · complete page`);
          const actual = await scanHash(page);
          assert.equal(actual, item.sha256);
          scannedPages.push({ page: item.printedPage, sha256: actual });
        }
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          axe.violations.map((item) => ({
            id: item.id,
            nodes: item.nodes.map((node) => node.target),
          })),
          [],
        );

        const saved = await download(page, "#save-case");
        const original = JSON.parse(saved.bytes.toString());
        assert.equal(original.current.seller, "thief");
        assert.equal(original.pinned.seller, "heir");
        await page.locator('[data-lesson="delivery"]').click();
        await page
          .locator("#open-case")
          .setInputFiles({ name: "case.json", mimeType: "application/json", buffer: saved.bytes });
        await content(page, "#file-status", "Saved case reopened");
        await content(page, "#outcome-title", "cannot cure");
        await page.locator("#open-case").setInputFiles({
          name: "bad.json",
          mimeType: "application/json",
          buffer: Buffer.from('{"format":"wrong"}'),
        });
        await content(page, "#file-status", "Your current case has been kept");
        await content(page, "#outcome-title", "cannot cure");
        const svg = await download(page, "#save-svg");
        assert.ok(svg.bytes.includes(Buffer.from("Civil title")));
        assert.ok(svg.bytes.includes(Buffer.from("Lucius")));

        await page.evaluate(() =>
          Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: { writeText: () => Promise.reject(new Error("Denied for fallback review")) },
          }),
        );
        const addressBefore = page.url();
        await page.locator("#copy-link").click();
        await content(page, "#file-status", "Copy the selected link");
        assert.equal(page.url(), addressBefore);
        const shared = await page.locator("#share-text").inputValue();
        const sharedPage = await context.newPage();
        await sharedPage.goto(shared);
        await content(sharedPage, "#outcome-title", "cannot cure");
        await content(sharedPage, "#comparison-count", "1 fact changed");
        await sharedPage.close();

        const sheet = await download(page, "#save-sheet");
        const sheetInfo = checkSheet(sheet.bytes);
        assert.deepEqual(sheetInfo.record, original);
        const sheetPath = `${scratch}/${name}-${width}-study.html`;
        await writeFile(sheetPath, sheet.bytes);
        const standalone = await context.newPage();
        const standaloneRequests = [];
        standalone.on("request", (request) => {
          if (/^https?:/.test(request.url())) standaloneRequests.push(request.url());
        });
        await standalone.goto(`file://${sheetPath}`);
        await standalone.evaluate(() => document.fonts.ready);
        assert.equal(await standalone.locator("img").count(), 9);
        assert.deepEqual(
          await standalone
            .locator("img")
            .evaluateAll((images) =>
              images
                .filter((image) => !image.complete || image.naturalWidth === 0)
                .map((image) => image.alt),
            ),
          [],
        );
        assert.deepEqual(standaloneRequests, []);
        await noOverflow(standalone);
        if (name === "chromium" && width === 1440) {
          await standalone.screenshot({ path: `${output}/study-sheet.png` });
          await standalone.pdf({
            path: "examples/mistaken-heir-comparison.pdf",
            format: "A4",
            printBackground: true,
            tagged: true,
            outline: true,
          });
          await writeFile("examples/mistaken-heir-comparison.html.gz", gzipSync(sheet.bytes));
          await writeFile("examples/mistaken-heir-comparison.json", saved.bytes);
          await writeFile("examples/mistaken-heir-comparison.svg", svg.bytes);
        }
        const nested = await download(standalone, 'a[download="traditio-case.json"]');
        assert.deepEqual(JSON.parse(nested.bytes), original);
        await standalone.close();

        const argumentReview = await argumentJourney({
          context,
          base,
          name,
          width,
          output,
          scratch,
        });

        // Refuse all origin connections, then perform an actual document reload.
        // Browser offline emulation can intercept Firefox fetches before its worker.
        serverUnavailable = true;
        await offlineArgument(argumentReview);
        await page.goto(shared);
        await page.reload({ waitUntil: "domcontentloaded" });
        await content(page, "#offline-status", "This edition is available offline");
        await content(page, "#outcome-title", "cannot cure");
        await page.locator("#reading-select").selectOption("land");
        await content(page, "#scan-status", "Printed page 149 · complete page");
        const offlineSheet = await download(page, "#save-sheet");
        assert.equal(hash(offlineSheet.bytes), sheetInfo.sha256);
        const cacheState = await page.evaluate(async () => {
          const name = (await caches.keys()).find((name) => name.startsWith("traditio-"));
          const cache = await caches.open(name);
          return {
            name,
            files: (await cache.keys()).length,
            controlled: !!navigator.serviceWorker.controller,
          };
        });
        assert.ok(cacheState.controlled);
        assert.equal(
          cacheState.files,
          report.productionFiles.filter((file) => file.path !== "sw.js").length,
        );
        await page.evaluate(async () => {
          const name = (await caches.keys()).find((name) => name.startsWith("traditio-"));
          await (await caches.open(name)).delete(
            new URL("sources/poste-1904-p148.jpg", location.href).href,
          );
        });
        missingPageExpected = true;
        const refusedSource = page.waitForResponse(
          (response) => response.url() === missingPageUrl && response.status() === 503,
        );
        await page.locator("#page-select").selectOption("148");
        await refusedSource;
        await content(page, "#scan-status", "Could not load");
        await content(page, "#offline-status", "not fully available offline");
        serverUnavailable = false;
        await page.locator("#retry-scan").click();
        await content(page, "#scan-status", "Printed page 148 · complete page");
        await content(page, "#offline-status", "This edition is available offline,");
        missingPageExpected = false;
        assert.equal(
          await scanHash(page),
          manifest.find((item) => item.printedPage === 148).sha256,
        );
        assert.deepEqual(errors, []);
        assert.deepEqual([...externals], []);
        report.journeys.push({
          browser: name,
          browserVersion: browser.version(),
          width,
          keyboard: true,
          expectedResourceErrors,
          oneFactComparison: true,
          latinPhrase: "quamquam",
          scannedPages,
          downloads: [saved, svg].map((file) => ({
            name: file.name,
            bytes: file.bytes.length,
            sha256: hash(file.bytes),
          })),
          studySheet: sheetInfo,
          standaloneRequests,
          offlineIdenticalSheet: true,
          offlineTransport: "All origin TCP connections refused; actual document reload",
          missingCacheReportedAndRepaired: true,
          cacheState,
          axeViolations: 0,
          errors,
          argument: { ...argumentReview.receipt, offlineIdenticalBook: true },
        });
        console.log(
          `${name} ${width}: cases, comparison, Latin, nine source images, downloads, standalone casebook, offline reload passed.`,
        );
        await context.close();
      }

      // Source integrity and races use a context without a worker so injected responses
      // actually reach the source loader instead of being satisfied from the edition cache.
      const context = await browser.newContext({ serviceWorkers: "block" });
      await context.addInitScript(retainSourceBlobs);
      await context.addInitScript(() => {
        if (navigator.serviceWorker)
          Object.defineProperty(navigator.serviceWorker, "register", {
            value: () => Promise.reject(new Error("Disabled for source-fault review")),
          });
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15_000);
      await page.goto(base);
      await content(page, "#scan-status", "source bytes checked");
      const actualPage = await readFile("public/sources/poste-1904-p148.jpg");
      const corrupted = Buffer.from(actualPage);
      corrupted[500] ^= 1;
      await context.route("**/sources/poste-1904-p148.jpg", (route) =>
        route.fulfill({ status: 200, contentType: "image/jpeg", body: corrupted }),
      );
      await page.locator("#page-select").selectOption("148");
      await content(page, "#scan-status", "failed its source check");
      assert.equal(await page.locator("#scan").isVisible(), false);
      let falseDownload = false;
      const downloadListener = () => {
        falseDownload = true;
      };
      page.on("download", downloadListener);
      await page.locator("#save-sheet").click();
      await content(page, "#file-status", "failed its source check");
      assert.equal(falseDownload, false);
      page.off("download", downloadListener);
      await context.unroute("**/sources/poste-1904-p148.jpg");
      await page.locator("#retry-scan").click();
      await content(page, "#scan-status", "Printed page 148 · complete page");
      assert.equal(await scanHash(page), hash(actualPage));

      let release;
      const gate = new Promise((done) => {
        release = done;
      });
      let arrived;
      const arrival = new Promise((done) => {
        arrived = done;
      });
      await context.route("**/sources/poste-1904-p147.jpg", async (route) => {
        arrived();
        await gate;
        await route
          .fulfill({
            status: 200,
            contentType: "image/jpeg",
            body: await readFile("public/sources/poste-1904-p147.jpg"),
          })
          .catch(() => {});
      });
      await page.locator("#page-select").selectOption("147");
      await arrival;
      await page.locator("#page-select").selectOption("149");
      await content(page, "#scan-status", "Printed page 149 · complete page");
      await page.locator("#zoom").click();
      release();
      await page.waitForTimeout(150);
      assert.equal(
        await scanHash(page),
        hash(await readFile("public/sources/poste-1904-p149.jpg")),
      );
      assert.equal(await page.locator("#zoom").getAttribute("aria-pressed"), "true");
      await context.unroute("**/sources/poste-1904-p147.jpg");

      // A slow export must retain the facts at the moment Save was pressed.
      let releaseExport;
      const exportGate = new Promise((done) => {
        releaseExport = done;
      });
      let exportArrived;
      const exportArrival = new Promise((done) => {
        exportArrived = done;
      });
      await context.route("**/sources/poste-1904-p74.jpg", async (route) => {
        exportArrived();
        await exportGate;
        await route.continue();
      });
      const waitingDownload = page.waitForEvent("download");
      await page.locator("#claim-select").selectOption("delivery-title");
      await page.locator("#check-argument").click();
      await page.locator("#reading-select").selectOption("division");
      await page.locator("#cite-reading").click();
      await page.locator("#argument-note").fill("Click-time explanation");
      await page.locator("#save-sheet").click();
      await exportArrival;
      await page.locator('[data-years="3"]').click();
      await content(page, "#title-holder", "Aulus");
      await page.locator("#check-argument").click();
      await page.locator("#argument-note").fill("Later explanation");
      await page.locator('[data-remove-citation="division"]').click();
      releaseExport();
      const capturedDownload = await waitingDownload;
      const captured = checkSheet(await readFile(await capturedDownload.path()));
      assert.equal(captured.record.current.years, 0);
      assert.equal(captured.record.argument.witness.years, 0);
      assert.equal(captured.record.argument.note, "Click-time explanation");
      assert.deepEqual(captured.record.argument.citations, ["division"]);
      report.faults.push({
        browser: name,
        sameLengthCorruptImageRejected: true,
        corruptSheetRefused: true,
        retryRestoredExactPage: true,
        latePageCannotReplaceCurrentPage: true,
        zoomPreservedDuringLateResponse: true,
        exportCapturesClickTimeFacts: true,
        exportCapturesArgumentWitnessCitationsAndNote: true,
      });
      console.log(
        `${name}: corrupt source, refused export, recovery, late source response and export snapshot passed.`,
      );
      await context.close();
    } finally {
      await browser.close();
    }
  }
  await writeFile("docs/browser-review.json", `${JSON.stringify(report, null, 2)}\n`);
} finally {
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}
