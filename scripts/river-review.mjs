import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";
import { reviewServer } from "./review-server.mjs";

const output = resolve(process.env.REVIEW_OUTPUT || "docs/river-review/local");
const scratch = resolve("test-results/river");
await mkdir(output, { recursive: true });
await mkdir(scratch, { recursive: true });
const server = reviewServer("dist");
await server.start();
const manifest = JSON.parse(await readFile("src/asset-manifest.json", "utf8"));
const sourcePaths = [
  "sources/poste-1904-p160.jpg",
  "sources/poste-1904-p161.jpg",
  "sources/mommsen-1893-p644.jpg",
  "sources/mommsen-1893-p645.jpg",
];
const hash = (b) => createHash("sha256").update(b).digest("hex");
const report = { at: new Date().toISOString(), origin: server.base, journeys: [], faults: [] };
const says = (p, id, text) =>
  p.waitForFunction(
    ({ id, text }) => document.getElementById(id)?.textContent.includes(text),
    { id, text },
    { timeout: 45000 },
  );
const owner = (p) => p.locator("#river-owner").textContent();
async function fact(p, id) {
  await p.locator(`[data-river-event="${id}"]`).focus();
  await p.keyboard.press("Enter");
}
async function download(p, id) {
  const pending = p.waitForEvent("download", { timeout: 45000 });
  await p.locator(`#${id}`).click();
  const file = await pending;
  assert.equal(await file.failure(), null);
  return readFile(await file.path());
}
function instrument() {
  const create = URL.createObjectURL.bind(URL);
  window.reviewBlobs = new Map();
  URL.createObjectURL = (blob) => {
    const url = create(blob);
    window.reviewBlobs.set(url, blob);
    return url;
  };
  window.reviewClipboard = "";
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: async (text) => {
        window.reviewClipboard = text;
      },
    },
  });
}
async function imageHash(p) {
  return p.evaluate(async () =>
    Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          await window.reviewBlobs.get(document.querySelector("#river-scan").src).arrayBuffer(),
        ),
      ),
      (b) => b.toString(16).padStart(2, "0"),
    ).join(""),
  );
}
function checkReading(bytes, expected) {
  const html = bytes.toString();
  assert.ok(!/<script\b/i.test(html));
  const images = [...html.matchAll(/src="data:image\/jpeg;base64,([A-Za-z0-9+/=]+)"/g)].map((m) =>
    hash(Buffer.from(m[1], "base64")),
  );
  assert.deepEqual(
    images.sort(),
    manifest
      .filter((f) => sourcePaths.includes(f.path))
      .map((f) => f.sha256)
      .sort(),
  );
  const fonts = [...html.matchAll(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/g)].map((m) =>
    hash(Buffer.from(m[1], "base64")),
  );
  assert.deepEqual(
    fonts.sort(),
    manifest
      .filter((f) => f.mime === "font/woff2")
      .map((f) => f.sha256)
      .sort(),
  );
  assert.ok(html.includes("SIL OPEN FONT LICENSE"));
  assert.ok(html.includes("Copyright (c) 2026 Anthony Mercer"));
  const native = /href="data:application\/json;charset=utf-8,([^"]+)"/.exec(html);
  assert.ok(native);
  assert.deepEqual(JSON.parse(decodeURIComponent(native[1])), expected);
  assert.equal((html.match(/class="reading"/g) || []).length, 8);
  return { bytes: bytes.length, sha256: hash(bytes), pages: images.length, fonts: fonts.length };
}
try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["firefox", firefox],
  ].filter(([name]) => !process.env.REVIEW_BROWSER || name === process.env.REVIEW_BROWSER)) {
    const browser = await engine.launch();
    try {
      for (const width of [1440, 375]) {
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
          reducedMotion: "reduce",
        });
        await context.addInitScript(instrument);
        const p = await context.newPage();
        const errors = [];
        p.on("pageerror", (e) => errors.push(e.message));
        await p.goto(server.base);
        await p.getByRole("link", { name: "River histories", exact: true }).click();
        await says(p, "river-scan-status", "Gaius · p. 161.");
        await p.goto(`${server.base}ceremony.html`);
        await p.getByRole("link", { name: "River histories", exact: true }).click();
        await says(p, "river-scan-status", "Gaius · p. 161.");
        const originalURL = p.url();
        assert.equal(await owner(p), "Lucius");
        await p.locator("#river-pin").click();
        await fact(p, "root");
        assert.equal(await owner(p), "Not settled here");
        await p.selectOption("#river-lens", "digest");
        assert.equal(await owner(p), "Lucius");
        await fact(p, "attach");
        assert.equal(await owner(p), "Aulus");
        await p.locator('[data-river-at="1"]').focus();
        await p.keyboard.press("Enter");
        assert.equal(await owner(p), "Lucius");
        assert.equal(
          await p.locator('[data-river-at="1"]').evaluate((n) => n === document.activeElement),
          true,
        );
        assert.equal(await p.locator("#river-timeline button").count(), 4);
        await p.locator('[data-river-at="3"]').click();
        assert.equal(await owner(p), "Aulus");
        assert.equal(p.url(), originalURL);
        await p
          .locator("#river-note")
          .fill(
            "At arrival the piece remains Lucius’s. The Digest requires long attachment AND new roots; ex eo tempore does not backdate title. <b>This is text.</b>",
          );
        const saved = JSON.parse((await download(p, "river-save-record")).toString());
        assert.equal(saved.current.at, 3);
        assert.equal(saved.pinned.at, 1);
        assert.equal(saved.pinned.lens, "institutes");
        const csv = await download(p, "river-csv");
        assert.ok(csv.toString().includes('"Aulus"'));
        const svg = await download(p, "river-save-svg");
        assert.ok(svg.toString().includes("Ownership of the focus: Aulus"));
        for (const [id, label, path] of [
          ["g160", "Gaius · p. 160.", sourcePaths[0]],
          ["g161", "Gaius · p. 161.", sourcePaths[1]],
          ["d1", "Digest · p. 644.", sourcePaths[2]],
          ["d2", "Digest · p. 645.", sourcePaths[3]],
        ]) {
          await p.selectOption("#river-page", id);
          await says(p, "river-scan-status", label);
          assert.equal(await imageHash(p), manifest.find((f) => f.path === path).sha256);
        }
        await p.locator("#river-zoom").click();
        await p.keyboard.press("ArrowRight");
        await p.keyboard.press("ArrowDown");
        await p.waitForFunction(() => {
          const n = document.getElementById("river-viewport");
          return n.scrollLeft > 0 && n.scrollTop > 0;
        });
        await p.locator("#river-zoom").click();
        let words = 0;
        for (const option of await p
          .locator("#river-passage option")
          .evaluateAll((ns) => ns.map((n) => n.value))) {
          await p.selectOption("#river-passage", option);
          for (const b of await p.locator("#river-phrases button").all()) {
            await b.focus();
            await p.keyboard.press("Enter");
            assert.ok((await p.locator("#river-word").textContent()).length > 20);
            words++;
          }
        }
        await p.locator("#river-read-condition").click();
        await says(p, "river-scan-status", "Digest · p. 644.");
        const axe = await new AxeBuilder({ page: p }).analyze();
        assert.deepEqual(
          axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
          [],
        );
        assert.equal(
          await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        await p.evaluate(() => document.activeElement?.blur());
        await p
          .locator(width === 375 ? ".river-stage" : ".river-bench")
          .screenshot({ path: resolve(output, `${name}-${width}.png`), fullPage: false });
        await p
          .locator("#river-compare")
          .screenshot({ path: resolve(output, `${name}-${width}-comparison.png`) });
        const html = await download(p, "river-save-reading");
        const reading = checkReading(html, saved);
        const artifact = resolve(scratch, `${name}-${width}.html`);
        await writeFile(artifact, html);
        const nativeContext = await browser.newContext({
          javaScriptEnabled: false,
          viewport: { width, height: 1000 },
        });
        const standalone = await nativeContext.newPage();
        const requests = [];
        standalone.on("request", (r) => {
          if (/^https?:/.test(r.url())) requests.push(r.url());
        });
        await standalone.goto(`file://${artifact}`);
        await standalone.locator(".page img").last().waitFor();
        assert.equal(await standalone.locator(".page img").count(), 4);
        assert.equal(await standalone.locator(".reading").count(), 8);
        assert.equal(await standalone.locator("script").count(), 0);
        assert.equal(await standalone.locator("b").count(), 0);
        const nativeDownload = standalone.waitForEvent("download");
        await standalone
          .getByRole("link", { name: "Download editable histories", exact: true })
          .click();
        const nativeFile = await nativeDownload;
        assert.deepEqual(JSON.parse(await readFile(await nativeFile.path(), "utf8")), saved);
        assert.deepEqual(requests, []);
        if (name === "chromium" && width === 1440) {
          await writeFile(resolve(output, "histories.json"), `${JSON.stringify(saved, null, 2)}\n`);
          await writeFile(resolve(output, "histories.csv"), csv);
          await writeFile(resolve(output, "history.svg"), svg);
          await writeFile(resolve(output, "reading.html.gz"), gzipSync(html));
          const pdf = resolve(output, "reading.pdf");
          await standalone.pdf({
            path: pdf,
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
            tagged: true,
            outline: true,
          });
          const text = execFileSync("pdftotext", [pdf, "-"]).toString().replace(/\s+/g, " ");
          for (const phrase of [
            "haec pars tua manet",
            "ex eo tempore",
            "inundatio speciem fundi non mutat",
            "si modo",
            "Long attachment",
            "Your explanation",
            "Copyright (c) 2026 Anthony Mercer",
          ])
            assert.ok(text.includes(phrase), `Missing PDF phrase: ${phrase}`);
          await standalone.screenshot({ path: resolve(output, "standalone.png") });
        }
        await nativeContext.close();
        // File reopen, foreign-file rejection, and explicit links preserve the two timelines.
        await p.selectOption("#river-route", "silt");
        await fact(p, "deposit");
        assert.equal(await owner(p), "Aulus");
        await p.locator("#river-open").setInputFiles({
          name: "histories.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(saved)),
        });
        await says(p, "river-save-status", "Histories reopened");
        assert.equal(await owner(p), "Aulus");
        assert.equal(await p.locator("#river-note").inputValue(), saved.note);
        await p.locator("#river-open").setInputFiles({
          name: "wrong.json",
          mimeType: "application/json",
          buffer: Buffer.from('{"format":"traditio-ceremony","version":1}'),
        });
        await says(p, "river-save-status", "Your histories have been kept");
        assert.equal(await owner(p), "Aulus");
        await p.locator("#river-copy").click();
        const link = await p.evaluate(() => window.reviewClipboard);
        assert.ok(link.includes("#river="));
        const linked = await context.newPage();
        await linked.goto(link);
        await says(linked, "river-save-status", "shared histories");
        assert.equal(await owner(linked), "Aulus");
        assert.equal(await linked.locator("#river-note").inputValue(), saved.note);
        await linked.close();
        // End-to-end publication is separate: this is a real local origin outage.
        await says(p, "offline-status", "available offline");
        await server.stop();
        await p.reload();
        await says(p, "river-scan-status", "Gaius · p. 161.");
        await p.selectOption("#river-route", "plant");
        await fact(p, "root");
        assert.equal(await owner(p), "Lucius");
        await fact(p, "plant");
        assert.equal(await owner(p), "Lucius");
        await fact(p, "root");
        assert.equal(await owner(p), "Aulus");
        const offlineRecord = JSON.parse((await download(p, "river-save-record")).toString());
        checkReading(await download(p, "river-save-reading"), offlineRecord);
        await p.selectOption("#river-route", "flood");
        await p.selectOption("#river-lens", "digest");
        await fact(p, "recede");
        await fact(p, "flood");
        assert.equal(await owner(p), "Aulus");
        await fact(p, "recede");
        assert.equal(await owner(p), "Aulus");
        await server.start();
        assert.deepEqual(errors, []);
        report.journeys.push({
          browser: name,
          width,
          contextualPhrases: words,
          verifiedPages: 4,
          reading,
          keyboard: true,
          reachedFromBothExistingLessons: true,
          originalAddressKept: true,
          nativeScriptFreeReopen: true,
          realOriginOfflineReloadAndExport: true,
          axeViolations: axe.violations.length,
          runtimeErrors: errors,
        });
        await context.close();
      }
      // Refuse a substituted page of the correct length; do not download it in a reading.
      const faultContext = await browser.newContext({ serviceWorkers: "block" });
      await faultContext.addInitScript(instrument);
      const p = await faultContext.newPage();
      await p.goto(`${server.base}river.html`);
      await says(p, "river-scan-status", "Gaius · p. 161.");
      const target = manifest.find((f) => f.path === sourcePaths[2]);
      const wrongBytes = Buffer.alloc(target.bytes, 41);
      await p.route(`**/${sourcePaths[2]}`, (route) =>
        route.fulfill({ status: 200, contentType: "image/jpeg", body: wrongBytes }),
      );
      await p.selectOption("#river-page", "d1");
      await says(p, "river-scan-status", "failed its source check");
      assert.equal(await p.locator("#river-scan").isVisible(), false);
      let downloads = 0;
      p.on("download", () => downloads++);
      await p.locator("#river-save-reading").click();
      await says(p, "river-save-status", "failed its source check");
      assert.equal(downloads, 0);
      await p.unroute(`**/${sourcePaths[2]}`);
      await p.locator("#river-retry").click();
      await says(p, "river-scan-status", "Digest · p. 644.");
      // Delay the first source read to verify a capture, cancellation, and import races.
      let release;
      let seen;
      const requested = new Promise((r) => {
        seen = r;
      });
      const gate = new Promise((r) => {
        release = r;
      });
      await p.route(`**/${sourcePaths[0]}`, async (route) => {
        seen();
        await gate;
        await route.continue().catch(() => {});
      });
      const captured = JSON.parse((await download(p, "river-save-record")).toString());
      const pending = p.waitForEvent("download", { timeout: 45000 });
      await p.locator("#river-save-reading").click();
      await requested;
      await p.locator("#river-note").fill("Newer note written during export");
      await p.selectOption("#river-route", "silt");
      await fact(p, "deposit");
      release();
      const file = await pending;
      checkReading(await readFile(await file.path()), captured);
      await p.unroute(`**/${sourcePaths[0]}`);
      let seenCancel;
      const cancelRequested = new Promise((r) => {
        seenCancel = r;
      });
      let releaseCancel;
      const cancelGate = new Promise((r) => {
        releaseCancel = r;
      });
      await p.route(`**/${sourcePaths[0]}`, async (route) => {
        seenCancel();
        await cancelGate;
        await route.continue().catch(() => {});
      });
      await p.locator("#river-save-reading").click();
      await cancelRequested;
      await p.locator("#river-cancel").click();
      await says(p, "river-save-status", "Preparation canceled");
      releaseCancel();
      assert.equal(await owner(p), "Aulus");
      await p.unroute(`**/${sourcePaths[0]}`);
      const beforeImport = await download(p, "river-save-record");
      await p.evaluate(() => {
        const text = File.prototype.text;
        File.prototype.text = function () {
          return new Promise((resolve) => {
            window.releaseRiverImport = async () => resolve(await text.call(this));
          });
        };
      });
      await p
        .locator("#river-open")
        .setInputFiles({ name: "old.json", mimeType: "application/json", buffer: beforeImport });
      await p.locator("#river-note").fill("This newer explanation must survive a delayed import.");
      await p.evaluate(() => window.releaseRiverImport());
      await says(p, "river-save-status", "newer work has been kept");
      assert.equal(
        await p.locator("#river-note").inputValue(),
        "This newer explanation must survive a delayed import.",
      );
      report.faults.push({
        browser: name,
        substitutedSameLengthScanRefused: true,
        substitutedExportRefused: true,
        verifiedRetry: true,
        snapshotDuringEdits: true,
        cancellation: true,
        delayedImportPreservesNewerWork: true,
      });
      await faultContext.close();
    } finally {
      await browser.close();
    }
  }
  await writeFile(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await server.stop();
}
