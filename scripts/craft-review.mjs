import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";
import { reviewServer } from "./review-server.mjs";

const output = resolve(process.env.REVIEW_OUTPUT || "test-results/craft");
await mkdir(output, { recursive: true });
const server = reviewServer("dist");
await server.start();
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = JSON.parse(await readFile("src/asset-manifest.json", "utf8"));
const report = { at: new Date().toISOString(), journeys: [], faults: [] };
const says = (p, id, text) =>
  p.waitForFunction(
    ({ id, text }) => document.getElementById(id)?.textContent.includes(text),
    { id, text },
    { timeout: 45000 },
  );
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
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: async () => {
        throw new Error("Clipboard unavailable");
      },
    },
  });
}
async function checkedScan(p, number) {
  await p.locator("#craft-page").selectOption(String(number));
  await says(p, "craft-scan-status", `p. ${number}. Complete image checked`);
  const digest = await p.evaluate(async () => {
    const bytes = await window.reviewBlobs
      .get(document.querySelector("#craft-scan").src)
      .arrayBuffer();
    return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  });
  assert.equal(digest, manifest.find((a) => a.path === `sources/poste-1904-p${number}.jpg`).sha256);
}
async function activate(p) {
  await p.evaluate(async () => {
    const r = await navigator.serviceWorker.ready;
    if (r.active) return;
    await new Promise((resolve) => r.addEventListener("updatefound", resolve, { once: true }));
  });
  await p.reload();
  await p.waitForFunction(() => !!navigator.serviceWorker.controller);
  await says(p, "offline-status", "available offline");
}
async function assertNoOverflow(p) {
  assert.ok(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "No page-width overflow",
  );
}
try {
  for (const [name, type] of [
    ["chromium", chromium],
    ["firefox", firefox],
  ]) {
    const browser = await type.launch();
    try {
      for (const width of [1440, 375]) {
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
          reducedMotion: "reduce",
        });
        await context.addInitScript(instrument);
        const p = await context.newPage();
        const errors = [];
        const external = [];
        p.on("pageerror", (e) => errors.push(String(e)));
        p.on("request", (r) => {
          if (/^https?:/.test(r.url()) && !r.url().startsWith(server.base)) external.push(r.url());
        });
        await p.goto(server.base);
        await p.getByRole("link", { name: "Craft dispute" }).click();
        await p.locator("#craft-case").waitFor();
        await checkedScan(p, 163);
        await p.screenshot({
          path: resolve(output, `${name}-${width}-opening.png`),
          fullPage: true,
        });
        const first =
          "The gold belonged to Lucius before the work; I would let its ownership continue.";
        await p.locator("#craft-explanation").fill(first);
        await p.locator("#craft-proposal details summary").click();
        await p.locator('#craft-citations input[value="schools"]').check();
        await p.locator("#craft-submit").focus();
        await p.keyboard.press("Enter");
        await says(p, "craft-feedback", "matches Sabinus and Cassius");
        assert.match(
          await p.locator("#craft-outcome").textContent(),
          /Sabinus and Cassius[\s\S]*Lucius[\s\S]*opposing school[\s\S]*Aulus/,
        );
        await p
          .locator("#craft-explanation")
          .fill("The source gives two answers; a matching school is not a settled rule.");
        await p.locator("#craft-case").selectOption("painting");
        assert.equal(await p.locator("#craft-explanation").inputValue(), "");
        await p.locator("#craft-reveal").click();
        assert.match(await p.locator("#craft-outcome").textContent(), /Aulus/);
        await p.locator("#craft-remedy summary").click();
        await p.locator("#craft-read-theft").click();
        assert.equal(await p.locator("#craft-passage").inputValue(), "painting-remedy");
        await p.locator("#craft-case").selectOption("writing");
        await p.locator("#craft-reveal").click();
        assert.match(await p.locator("#craft-outcome").textContent(), /Lucius/);
        await p.locator("#craft-read-theft").click();
        assert.equal(await p.locator("#craft-passage").inputValue(), "writing-remedy");
        await p.locator("#craft-case").selectOption("repair");
        await p.locator("#craft-reveal").click();
        assert.match(await p.locator("#craft-outcome").textContent(), /Not decided/);
        assert.equal(await p.locator("#craft-remedy").isVisible(), false);
        await p.locator("#craft-case").selectOption("vessel");
        assert.equal(
          await p.locator("#craft-explanation").inputValue(),
          "The source gives two answers; a matching school is not a settled rule.",
        );
        assert.match(await p.locator("#craft-trials").textContent(), /The gold belonged to Lucius/);
        assert.equal(await p.locator("#craft-trials img").count(), 0);
        await p.locator("#craft-judgment").selectOption("disputed");
        await p.locator("#craft-submit").click();
        if (!(await p.locator("#craft-analogy-body").isVisible()))
          await p.locator("#craft-open-analogy").click();
        assert.match(
          await p.locator("#craft-rule-table tr.counterexample").textContent(),
          /Painting on a board/,
        );
        await p.locator("#craft-rule").selectOption("maker");
        assert.match(
          await p.locator("#craft-rule-table tr.counterexample").textContent(),
          /Writing on parchment/,
        );
        await checkedScan(p, 162);
        await p.locator("#craft-zoom").click();
        await p.keyboard.press("ArrowRight");
        await p.waitForFunction(() => document.querySelector("#craft-viewport").scrollLeft > 0);
        await p.locator("#craft-zoom").click();
        await p.locator("#craft-passage").selectOption("painting");
        await p.locator('[data-word="1"]').focus();
        await p.keyboard.press("Enter");
        await says(p, "craft-word", "board to follow the painting");
        await checkedScan(p, 163);
        await p
          .locator("#craft-note")
          .fill("A compatible side of a dispute does not prove an always claim.");
        const json = await download(p, "craft-save-json");
        const record = JSON.parse(json);
        assert.equal(record.trials.length, 2);
        assert.equal(record.trials[0].explanation, first);
        assert.deepEqual(record.trials[0].citations, ["schools"]);
        assert.equal(
          record.drafts.find((d) => d.craft === "vessel").explanation,
          "The source gives two answers; a matching school is not a settled rule.",
        );
        await p.locator("#craft-copy").click();
        const link = await p.locator("#craft-copy-url").inputValue();
        assert.deepEqual(JSON.parse(decodeURIComponent(new URL(link).hash.slice(7))), record);
        await p.locator("#craft-note").fill("A replacement to be overwritten by explicit restore.");
        await p
          .locator("#craft-open")
          .setInputFiles({ name: "notebook.json", mimeType: "application/json", buffer: json });
        await says(p, "craft-save-status", "Notebook reopened");
        assert.equal(await p.locator("#craft-note").inputValue(), record.note);
        await p.locator("#craft-open").setInputFiles({
          name: "newer.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify({ ...record, version: 9 })),
        });
        await says(p, "craft-save-status", "not a supported");
        assert.equal(await p.locator("#craft-note").inputValue(), record.note);
        await p.goto(link);
        await p.locator("#craft-case").waitFor();
        assert.equal(await p.locator("#craft-note").inputValue(), record.note);
        await p.locator("#craft-reveal").click();
        if (!(await p.locator("#craft-analogy-body").isVisible()))
          await p.locator("#craft-open-analogy").click();
        await checkedScan(p, 163);
        await assertNoOverflow(p);
        const axe = await new AxeBuilder({ page: p }).analyze();
        assert.deepEqual(
          axe.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target),
          })),
          [],
        );
        await p.screenshot({
          path: resolve(output, `${name}-${width}-operated.png`),
          fullPage: true,
        });
        const html = await download(p, "craft-save-reading");
        assert.ok(!html.toString().includes("<script"));
        assert.ok(html.toString().includes("The gold belonged to Lucius"));
        const embeddedHashes = (pattern) =>
          [...html.toString().matchAll(pattern)]
            .map((m) => hash(Buffer.from(m[1], "base64")))
            .sort();
        assert.deepEqual(
          embeddedHashes(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/g),
          manifest
            .filter((m) => /poste-1904-p16[23].jpg/.test(m.path))
            .map((m) => m.sha256)
            .sort(),
        );
        assert.deepEqual(
          embeddedHashes(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/g),
          manifest
            .filter((m) => m.mime === "font/woff2")
            .map((m) => m.sha256)
            .sort(),
        );
        const saved = resolve(output, `${name}-${width}-reading.html`);
        await writeFile(saved, html);
        const standalone = await browser.newContext({
          javaScriptEnabled: false,
          viewport: { width, height: 1000 },
        });
        await standalone.setOffline(true);
        const offlinePage = await standalone.newPage();
        const requests = [];
        offlinePage.on("request", (r) => {
          if (/^https?:/.test(r.url())) requests.push(r.url());
        });
        await offlinePage.goto(`file://${saved}`);
        assert.equal(await offlinePage.locator(".page img").count(), 2);
        assert.ok(
          await offlinePage
            .locator(".page img")
            .evaluateAll((imgs) => imgs.every((img) => img.complete && img.naturalWidth > 1000)),
        );
        assert.equal(await offlinePage.locator(".trial").count(), 2);
        assert.deepEqual(JSON.parse(await download(offlinePage, "craft-native-notebook")), record);
        await assertNoOverflow(offlinePage);
        assert.deepEqual(requests, []);
        if (name === "chromium" && width === 1440) {
          await offlinePage.pdf({
            path: resolve(output, "notebook.pdf"),
            printBackground: true,
            preferCSSPageSize: true,
            tagged: true,
          });
          const text = execFileSync("pdftotext", [resolve(output, "notebook.pdf"), "-"]).toString();
          for (const phrase of [
            "Your kept judgments",
            "The direction reverses",
            "Some think. Others think.",
            "Licenses and source notices",
          ])
            assert.ok(text.includes(phrase), phrase);
          await writeFile(resolve(output, "notebook.html.gz"), gzipSync(html));
          await writeFile(resolve(output, "notebook.json"), json);
        }
        await standalone.close();
        await activate(p);
        await context.setOffline(true);
        await p.reload();
        await says(p, "offline-status", "available offline");
        await checkedScan(p, 162);
        await checkedScan(p, 163);
        const offlineJson = JSON.parse(await download(p, "craft-save-json"));
        assert.deepEqual(offlineJson, record);
        await download(p, "craft-save-reading");
        for (const route of ["", "ceremony.html", "river.html", "work.html"]) {
          await p.goto(server.base + route);
          assert.equal(await p.locator("h1").count(), 1);
        }
        assert.deepEqual(errors, []);
        assert.deepEqual(external, []);
        report.journeys.push({
          browser: name,
          width,
          keptJudgments: 2,
          sourcePages: 2,
          standaloneNoScriptsNoNetwork: true,
          offlineAllFourRooms: true,
          axeViolations: axe.violations.length,
          errors,
        });
        console.log(
          `${name} ${width}: craft, analogy, source pixels, notebook/downloads, no-script reading and all four offline rooms verified`,
        );
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
  // Fresh worker-free reads make substituted and stale source responses observable.
  for (const [engineName, engine] of [
    ["chromium", chromium],
    ["firefox", firefox],
  ]) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({ serviceWorkers: "block" });
      await context.addInitScript(instrument);
      const p = await context.newPage();
      let broken = true;
      const source = "**/sources/poste-1904-p163.jpg";
      await context.route(source, async (route) => {
        if (broken) {
          const bytes = await readFile("public/sources/poste-1904-p163.jpg");
          bytes[100] ^= 1;
          await route.fulfill({ body: bytes, contentType: "image/jpeg" });
        } else await route.continue();
      });
      await p.goto(`${server.base}work.html`);
      await says(p, "craft-scan-status", "failed its source check");
      assert.equal(await p.locator("#craft-scan").isVisible(), false);
      await p.locator("#craft-note").fill("Keep this when the source fails.");
      await p.locator("#craft-save-reading").click();
      await says(p, "craft-save-status", "failed its source check");
      assert.equal(await p.locator("#craft-note").inputValue(), "Keep this when the source fails.");
      await download(p, "craft-save-json");
      broken = false;
      await p.locator("#craft-retry").click();
      await checkedScan(p, 163);
      await context.unroute(source);
      let release;
      let started;
      const began = new Promise((r) => {
        started = r;
      });
      const hold = new Promise((r) => {
        release = r;
      });
      await context.route(source, async (route) => {
        started();
        await hold;
        await route.continue().catch(() => {});
      });
      await p.locator("#craft-retry").click();
      await began;
      await p.locator("#craft-page").selectOption("162");
      await checkedScan(p, 162);
      release();
      await context.unroute(source, { behavior: "wait" });
      assert.equal(await p.locator("#craft-page").inputValue(), "162");
      await says(p, "craft-scan-status", "p. 162. Complete image checked");
      // Export captures a frozen record, even while its first source body is delayed.
      let releaseExport;
      let exportStarted;
      const exporting = new Promise((r) => {
        exportStarted = r;
      });
      const exportHold = new Promise((r) => {
        releaseExport = r;
      });
      await context.route("**/sources/poste-1904-p162.jpg", async (route) => {
        exportStarted();
        await exportHold;
        await route.continue().catch(() => {});
      });
      const pending = p.waitForEvent("download");
      await p.locator("#craft-save-reading").click();
      await exporting;
      await p.locator("#craft-note").fill("A newer note after Save.");
      releaseExport();
      const capturedDownload = await pending;
      const captured = (await readFile(await capturedDownload.path())).toString();
      assert.ok(captured.includes("Keep this when the source fails."));
      assert.ok(!captured.includes("A newer note after Save."));
      assert.equal(await p.locator("#craft-note").inputValue(), "A newer note after Save.");
      await context.unroute("**/sources/poste-1904-p162.jpg");
      report.faults.push(
        `${engineName}: same-length source corruption rejected for display and export; editable work survives; retry succeeds`,
        `${engineName}: late source cannot replace current page`,
        `${engineName}: export uses the record captured at Save while newer edits survive`,
      );
      // Cancel a held export, and reject a late import after newer writing.
      let releaseCancel;
      let cancelStarted;
      const cancelling = new Promise((r) => {
        cancelStarted = r;
      });
      const cancelHold = new Promise((r) => {
        releaseCancel = r;
      });
      await context.route("**/sources/poste-1904-p162.jpg", async (route) => {
        cancelStarted();
        await cancelHold;
        await route.continue().catch(() => {});
      });
      let cancelledDownloads = 0;
      const countDownload = () => {
        ++cancelledDownloads;
      };
      p.on("download", countDownload);
      await p.locator("#craft-save-reading").click();
      await cancelling;
      await p.locator("#craft-cancel").click();
      await says(p, "craft-save-status", "Preparation canceled");
      releaseCancel();
      await context.unroute("**/sources/poste-1904-p162.jpg", { behavior: "wait" });
      assert.equal(cancelledDownloads, 0);
      p.off("download", countDownload);
      const beforeImport = await download(p, "craft-save-json");
      await p.evaluate(() => {
        const original = File.prototype.text;
        File.prototype.text = function () {
          return new Promise((resolve) => {
            window.releaseCraftImport = async () => resolve(await original.call(this));
          });
        };
      });
      await p
        .locator("#craft-open")
        .setInputFiles({ name: "old.json", mimeType: "application/json", buffer: beforeImport });
      await p
        .locator("#craft-explanation")
        .fill("Newer draft survives delayed import. <img src=x onerror=alert(1)>");
      await p.evaluate(() => window.releaseCraftImport());
      await says(p, "craft-save-status", "newer work has been kept");
      assert.match(await p.locator("#craft-explanation").inputValue(), /Newer draft survives/);
      await p.locator("#craft-submit").click();
      assert.equal(await p.locator("#craft-trials img").count(), 0);
      const escapedReading = (await download(p, "craft-save-reading")).toString();
      assert.ok(escapedReading.includes("&lt;img src=x onerror=alert(1)&gt;"));
      report.faults.push(
        `${engineName}: canceled export produces no download; delayed import preserves newer draft; learner markup is escaped in live and saved notebook`,
      );
      await context.close();
    } finally {
      await browser.close();
    }
  }
  await writeFile(resolve(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Review complete: ${report.journeys.length} browser/viewport journeys, ${report.faults.length} fault checks.`,
  );
} finally {
  await server.stop();
}
