import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";

const base = process.argv[2] || "http://127.0.0.1:4488/traditio/";
const output = process.argv[3] || "docs/ceremony-review/local";
await mkdir(output, { recursive: true });
const manifest = JSON.parse(await readFile("src/asset-manifest.json", "utf8"));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const report = { base, date: new Date().toISOString(), journeys: [], faults: [] };
const says = (p, id, text) =>
  p.waitForFunction(
    ({ id, text }) => document.getElementById(id)?.textContent.includes(text),
    { id, text },
    { timeout: 30000 },
  );
async function download(p, id) {
  const wait = p.waitForEvent("download", { timeout: 60000 });
  await p.locator(`#${id}`).click();
  let d;
  try {
    d = await wait;
  } catch (error) {
    console.error(
      "Download failure state",
      await p.locator("#dossier-status").textContent(),
      await p.locator("#offline-status").textContent(),
    );
    throw error;
  }
  assert.equal(await d.failure(), null);
  return readFile(await d.path());
}
function instrumentation() {
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
async function shownHash(p) {
  return p.evaluate(async () => {
    const blob = window.reviewBlobs.get(document.querySelector("#ceremony-scan").src);
    return Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
  });
}
for (const [name, engine] of [
  ["chromium", chromium],
  ["firefox", firefox],
].filter(([name]) => !process.env.REVIEW_BROWSER || name === process.env.REVIEW_BROWSER)) {
  const browser = await engine.launch();
  for (const width of [1440, 375]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
    });
    await context.addInitScript(instrumentation);
    const p = await context.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${base}ceremony.html`);
    await says(p, "ceremony-scan-status", "Printed page 74.");
    const originalURL = p.url();
    const act = async (id) => {
      await p.locator(`[data-act="${id}"]`).focus();
      await p.keyboard.press("Enter");
    };
    await act("buyer-claim");
    await says(p, "act-status", "Four witnesses");
    assert.equal(await p.locator("#ceremony-title-holder").textContent(), "Lucius");
    await p.selectOption("#witnesses", "5");
    await p.selectOption("#holder", "shared");
    await act("buyer-claim");
    await says(p, "act-status", "another person");
    await p.selectOption("#holder", "separate");
    await act("give");
    await says(p, "act-status", "first speak");
    await act("seller-claim");
    await says(p, "act-status", "acquirer");
    await act("buyer-claim");
    await act("strike");
    assert.equal(await p.locator("#ceremony-title-holder").textContent(), "Lucius");
    await act("give");
    assert.equal(await p.locator("#ceremony-title-holder").textContent(), "Aulus");
    assert.equal(
      await p.locator('[data-act="give"]').evaluate((e) => e === document.activeElement),
      true,
    );
    await p.selectOption("#witnesses", "6");
    await p.uncheck("#present");
    await act("buyer-claim");
    await says(p, "act-status", "mule must be present");
    await p.selectOption("#thing", "field");
    await act("buyer-claim");
    await act("strike");
    await act("give");
    await says(p, "ceremony-title-holder", "Aulus");
    await p.fill(
      "#ceremony-note",
      "An absent field is allowed here. The buyer speaks; the owner receives the bronze.",
    );
    const fieldRecord = await download(p, "save-rehearsal");
    assert.equal(JSON.parse(fieldRecord).arrangement.present, false);
    assert.equal(p.url(), originalURL);
    await p.locator('[name="route"][value="magistrate"]').check();
    await p.check("#present");
    await act("award");
    await says(p, "act-status", "first make the claim");
    await act("buyer-claim");
    await act("ask");
    await act("silence");
    assert.equal(await p.locator("#ceremony-title-holder").textContent(), "Lucius");
    await act("award");
    await says(p, "ceremony-title-holder", "Aulus");
    await p.locator("#undo-act").click();
    await says(p, "ceremony-title-holder", "Lucius");
    await p.locator("#undo-act").click();
    await act("counterclaim");
    await act("award");
    await says(p, "ceremony-title-holder", "Dispute outside this model");
    await p.locator("#reset-acts").click();
    await act("buyer-claim");
    await act("ask");
    await act("disclaim");
    await act("award");
    await says(p, "ceremony-title-holder", "Aulus");
    const note =
      "Negante denies making a counterclaim. Silence still needs the award. Literal <script>text</script> & notes.";
    await p.fill("#ceremony-note", note);
    const json = await download(p, "save-rehearsal");
    const recorded = JSON.parse(json);
    assert.deepEqual(recorded.events, ["buyer-claim", "ask", "disclaim", "award"]);
    assert.equal(recorded.note, note);
    await p.locator("#copy-rehearsal").click();
    await says(p, "dossier-status", "link copied");
    const url = await p.evaluate(() => window.reviewClipboard);
    const shared = await context.newPage();
    await shared.goto(url);
    await says(shared, "ceremony-title-holder", "Aulus");
    assert.equal(await shared.locator("#ceremony-note").inputValue(), note);
    await shared.close();
    await p.locator("#reset-acts").click();
    await p.setInputFiles("#open-rehearsal", {
      name: "saved.json",
      mimeType: "application/json",
      buffer: json,
    });
    await says(p, "dossier-status", "Rehearsal reopened");
    await says(p, "ceremony-title-holder", "Aulus");
    const sourceHashes = [];
    for (const page of [74, 75, 134, 135]) {
      await p.selectOption("#ceremony-page", String(page));
      await says(p, "ceremony-scan-status", `Printed page ${page}.`);
      const digest = await shownHash(p);
      assert.equal(digest, manifest.find((a) => a.printedPage === page).sha256);
      sourceHashes.push({ page, sha256: digest });
      const fit = await p.locator("#ceremony-scan").evaluate((e) => {
        const box = e.getBoundingClientRect(),
          parent = e.parentElement.getBoundingClientRect();
        return box.width <= parent.width && box.height <= parent.height;
      });
      assert.ok(fit);
    }
    await p.selectOption("#ceremony-passage", "magistrate");
    await says(p, "ceremony-scan-status", "Printed page 134.");
    await p.locator("#ceremony-zoom").click();
    await p.keyboard.press("ArrowRight");
    await p.waitForFunction(() => document.getElementById("ceremony-viewport").scrollLeft > 0);
    await p.locator("#ceremony-zoom").click();
    const axe = await new AxeBuilder({ page: p }).analyze();
    assert.deepEqual(
      axe.violations.map((v) => ({ id: v.id, nodes: v.nodes.length })),
      [],
    );
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await p.locator("#rehearsal").scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${output}/${name}-${width}-rehearsal.png` });
    await p.locator("#ceremony-reader").scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${output}/${name}-${width}-reader.png` });
    const html = await download(p, "save-dossier");
    assert.ok(html.toString().includes("&lt;script&gt;text&lt;/script&gt;"));
    assert.ok(!/<script\b/i.test(html.toString()));
    const embedded = [];
    for (const match of html.toString().matchAll(/data:([^;'"]+);base64,([A-Za-z0-9+/=]+)/g)) {
      const bytes = Buffer.from(match[2], "base64");
      const known = manifest.find((a) => a.sha256 === hash(bytes));
      assert.ok(known, `unknown embedded ${match[1]}`);
      embedded.push({ path: known.path, sha256: known.sha256, bytes: bytes.length });
    }
    assert.equal(embedded.length, 6);
    for (const path of [
      "LICENSE.txt",
      "sources/NOTICE.txt",
      "fonts/literata-OFL.txt",
      "fonts/sourcesans3-OFL.txt",
    ]) {
      const text = (await readFile(`public/${path}`, "utf8"))
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
      assert.ok(html.toString().includes(text), path);
    }
    if (name === "chromium" && width === 1440) {
      await writeFile(`${output}/rehearsal.html.gz`, gzipSync(html, { mtime: 0 }));
      await writeFile(`${output}/rehearsal.json`, json);
      await writeFile(`${output}/field.json`, fieldRecord);
    }
    await says(p, "offline-status", "This edition is available offline");
    await context.setOffline(true);
    await p.reload();
    await says(p, "offline-status", "This edition is available offline");
    await p.setInputFiles("#open-rehearsal", {
      name: "saved.json",
      mimeType: "application/json",
      buffer: json,
    });
    await says(p, "dossier-status", "Rehearsal reopened");
    const offlineHtml = await download(p, "save-dossier");
    assert.equal(hash(offlineHtml), hash(html));
    await p.goto(base);
    await says(p, "offline-status", "This edition is available offline");
    await p.locator('[data-years="1"]').click();
    await says(p, "title-holder", "Aulus");
    await context.close();
    const standalone = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width, height: 1000 },
      offline: true,
    });
    const doc = await standalone.newPage();
    const requests = [];
    doc.on("request", (r) => {
      if (/^https?:/.test(r.url())) requests.push(r.url());
    });
    const file = resolve(`${output}/portable-${name}-${width}.html`);
    await writeFile(file, html);
    await doc.goto(`file://${file}`);
    assert.equal(await doc.locator("img").count(), 4);
    assert.equal(await doc.locator("script").count(), 0);
    assert.deepEqual(requests, []);
    if (name === "chromium" && width === 1440) {
      await doc.pdf({
        path: `${output}/rehearsal.pdf`,
        format: "A4",
        printBackground: true,
        tagged: true,
      });
      await doc.screenshot({ path: `${output}/portable-reading.png` });
    }
    await standalone.close();
    assert.deepEqual(errors, []);
    report.journeys.push({
      engine: name,
      version: browser.version(),
      width,
      sourceHashes,
      html: { bytes: html.length, sha256: hash(html) },
      jsonSha256: hash(json),
      embedded,
      offlineIdentical: true,
      offlineTransport:
        "Browser offline mode after verified service-worker takeover; cached bytes independently hashed",
      standaloneNetworkRequests: requests,
      axeViolations: axe.violations.length,
      errors,
    });
    await writeFile(`${output}/review.json`, `${JSON.stringify(report, null, 2)}\n`);
    console.log(
      `${name} ${width}: acts, sources, native records, standalone and offline reading passed`,
    );
  }
  // Faults use a separate context without service workers so requests can be delayed or corrupted.
  const c = await browser.newContext({ serviceWorkers: "block" });
  await c.addInitScript(instrumentation);
  const p = await c.newPage();
  await p.goto(base);
  await p.selectOption("#claim-select", "delivery-title");
  await p.fill("#argument-note", "Before import");
  await p.evaluate(() => {
    const text = File.prototype.text;
    File.prototype.text = async function () {
      const result = await text.call(this);
      await new Promise((r) => (window.releaseImport = r));
      return result;
    };
  });
  const old = {
    format: "traditio-case",
    version: 1,
    current: { lesson: "delivery", thing: "cup", form: "delivery", years: 0 },
    pinned: null,
  };
  await p.setInputFiles("#open-case", {
    name: "old.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(old)),
  });
  await p.fill("#argument-note", "New explanation during import");
  await p.evaluate(() => window.releaseImport());
  await says(p, "file-status", "newer work has been kept");
  assert.equal(await p.locator("#argument-note").inputValue(), "New explanation during import");
  await says(p, "case-title", "mule");
  await p.goto(`${base}ceremony.html`);
  await says(p, "ceremony-scan-status", "Printed page 74.");
  let release;
  let seen;
  const started = new Promise((r) => (seen = r));
  await p.route("**/sources/poste-1904-p75.jpg", async (route) => {
    seen();
    await new Promise((r) => (release = r));
    await route
      .fulfill({
        body: await readFile("public/sources/poste-1904-p75.jpg"),
        contentType: "image/jpeg",
      })
      .catch(() => {});
  });
  await p.selectOption("#ceremony-page", "75");
  await started;
  await p.selectOption("#ceremony-page", "134");
  await says(p, "ceremony-scan-status", "Printed page 134.");
  release();
  await p.waitForTimeout(150);
  await says(p, "ceremony-scan-status", "Printed page 134.");
  await p.unroute("**/sources/poste-1904-p75.jpg");
  let releaseExport;
  let exportSeen;
  const exportStarted = new Promise((r) => (exportSeen = r));
  await p.route("**/sources/poste-1904-p74.jpg", async (route) => {
    exportSeen();
    await new Promise((r) => (releaseExport = r));
    await route
      .fulfill({
        body: await readFile("public/sources/poste-1904-p74.jpg"),
        contentType: "image/jpeg",
      })
      .catch(() => {});
  });
  await p.fill("#ceremony-note", "Captured explanation");
  const pending = p.waitForEvent("download");
  await p.locator("#save-dossier").click();
  await exportStarted;
  await p.fill("#ceremony-note", "Later explanation");
  releaseExport();
  const frozen = await readFile(await (await pending).path());
  assert.ok(frozen.toString().includes("Captured explanation"));
  assert.ok(!frozen.toString().includes("Later explanation"));
  await p.unroute("**/sources/poste-1904-p74.jpg");
  const corrupt = Buffer.from(await readFile("public/sources/poste-1904-p75.jpg"));
  corrupt[100] ^= 1;
  await p.route("**/sources/poste-1904-p75.jpg", (r) =>
    r.fulfill({ body: corrupt, contentType: "image/jpeg" }),
  );
  let downloads = 0;
  p.on("download", () => downloads++);
  await p.selectOption("#ceremony-page", "75");
  await says(p, "ceremony-scan-status", "failed its source check");
  assert.equal(await p.locator("#ceremony-scan").isHidden(), true);
  await p.locator("#save-dossier").click();
  await says(p, "dossier-status", "failed its source check");
  assert.equal(downloads, 0);
  await p.unroute("**/sources/poste-1904-p75.jpg");
  let releaseCancel;
  let cancelSeen;
  const cancelStarted = new Promise((r) => (cancelSeen = r));
  await p.route("**/sources/poste-1904-p74.jpg", async (route) => {
    cancelSeen();
    await new Promise((r) => (releaseCancel = r));
    await route.abort().catch(() => {});
  });
  await p.locator("#save-dossier").click();
  await cancelStarted;
  await p.locator("#cancel-dossier").click();
  await says(p, "dossier-status", "canceled");
  releaseCancel();
  assert.equal(downloads, 0);
  assert.equal(await p.locator("#ceremony-note").inputValue(), "Later explanation");
  report.faults.push({
    engine: name,
    oldCaseDelayedImportPreservesNotes: true,
    lateSourceCannotReplaceNewerPage: true,
    exportSnapshotFrozen: true,
    corruptSourceHidden: true,
    corruptExportRefused: true,
    cancellationNoDownload: true,
  });
  await writeFile(`${output}/review.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `${name}: import, source race, frozen export, corrupt source and cancellation passed`,
  );
  await c.close();
  await browser.close();
}
