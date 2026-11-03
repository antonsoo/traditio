import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { assertSameBytes } from "./byte-identity.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const says = (p, selector, text) =>
  p.waitForFunction(
    ({ selector, text }) => document.querySelector(selector)?.textContent.includes(text),
    { selector, text },
    { timeout: 60000 },
  );
async function download(p, selector) {
  const pending = p.waitForEvent("download", { timeout: 60000 });
  await p.locator(selector).click();
  const file = await pending;
  assert.equal(await file.failure(), null);
  return readFile(await file.path());
}
export function checkEmbeddedPages(html, paths, manifest) {
  assert.ok(!html.includes("<script"));
  for (const [pattern, items] of [
    [/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/g, manifest.filter((a) => paths.includes(a.path))],
    [/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/g, manifest.filter((a) => a.mime === "font/woff2")],
  ])
    assert.deepEqual(
      [...html.matchAll(pattern)].map((m) => hash(Buffer.from(m[1], "base64"))).sort(),
      items.map((a) => a.sha256).sort(),
    );
}

// Operate the newly discovered rooms on either a production preview or the real
// publication. Return a replay that must also work when the origin is refused.
export async function retainedRoomJourney({ context, base, kind, name, width, output, scratch }) {
  const craft = kind === "craft";
  assert.ok(craft || kind === "river");
  const prefix = craft ? "craft" : "river";
  const route = craft ? "work.html" : "river.html";
  const fixture = craft
    ? "docs/craft-review/notebook.json"
    : "docs/river-review/local/histories.json";
  const source = await readFile(fixture);
  const record = JSON.parse(source);
  const manifest = JSON.parse(await readFile("src/asset-manifest.json", "utf8"));
  const pages = craft
    ? [162, 163].map((p) => `sources/poste-1904-p${p}.jpg`)
    : [
        "sources/poste-1904-p160.jpg",
        "sources/poste-1904-p161.jpg",
        "sources/mommsen-1893-p644.jpg",
        "sources/mommsen-1893-p645.jpg",
      ];
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.locator(`a[href="./${route}"]`).first().click();
  assert.equal(new URL(page.url()).pathname, new URL(route, base).pathname);
  await says(page, "#offline-status", "This edition is available offline,");
  const reopen = async () => {
    await page
      .locator(`#${prefix}-open`)
      .setInputFiles({ name: `${kind}.json`, mimeType: "application/json", buffer: source });
    await says(page, `#${prefix}-save-status`, craft ? "Notebook reopened" : "Histories reopened");
    assert.equal(await page.locator(`#${prefix}-note`).inputValue(), record.note);
  };
  await reopen();
  if (craft) {
    assert.match(
      await page.locator("#recovery-headline").textContent(),
      /does not decide the defense/,
    );
    assert.match(await page.locator("#recovery-positions tr").nth(1).textContent(), /Aulus/);
    assert.match(await page.locator("#recovery-positions tr").nth(2).textContent(), /Lucius/);
    await page.locator("#recovery-fidei").check();
    assert.match(
      await page.locator("#recovery-headline").textContent(),
      /non-owner has an adapted claim/,
    );
    await page.locator("#recovery-restore").click();
    assert.equal(await page.locator("#recovery-fidei").isChecked(), true);
    await reopen();
    await page.locator("#recovery-read").click();
    await page.locator('[data-word="5"]').click();
    await says(page, "#craft-word", "positive qualification");
  }
  const selectedPages = craft ? ["162", "163"] : ["g160", "g161", "d1", "d2"];
  for (const [i, selected] of selectedPages.entries()) {
    await page.locator(`#${prefix}-page`).selectOption(selected);
    const identity = manifest.find((a) => a.path === pages[i]);
    await says(
      page,
      `#${prefix}-scan-status`,
      `p. ${identity.printedPage}. Complete image checked`,
    );
    const actual = await page.locator(`#${prefix}-scan`).evaluate(async (img) => {
      const bytes = await window.reviewBlobs.get(img.src).arrayBuffer();
      return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    });
    assert.equal(actual, identity.sha256);
  }
  const native = `#${prefix}-save-${craft ? "json" : "record"}`;
  assert.deepEqual(JSON.parse(await download(page, native)), record);
  const html = await download(page, `#${prefix}-save-reading`);
  checkEmbeddedPages(html.toString(), pages, manifest);
  const readingPath = resolve(scratch, `${name}-${width}-${kind}-hosted.html`);
  await writeFile(readingPath, html);
  await writeFile(resolve(output, `${name}-${width}-${kind}-hosted.html.gz`), gzipSync(html));
  const standaloneContext = await context
    .browser()
    .newContext({ javaScriptEnabled: false, offline: true, viewport: { width, height: 1000 } });
  try {
    const reading = await standaloneContext.newPage();
    const requests = [];
    reading.on("request", (r) => {
      if (/^https?:/.test(r.url())) requests.push(r.url());
    });
    await reading.goto(`file://${readingPath}`);
    assert.ok(
      await reading
        .locator(".page img")
        .evaluateAll(
          (imgs) => imgs.length > 0 && imgs.every((img) => img.complete && img.naturalWidth > 1000),
        ),
    );
    if (craft)
      assert.match(
        await reading.locator(".recovery-sheet").textContent(),
        /does not decide the defense/,
      );
    assert.deepEqual(
      JSON.parse(await download(reading, 'a[download][href^="data:application/json"]')),
      record,
    );
    assert.deepEqual(requests, []);
  } finally {
    await standaloneContext.close();
  }
  await page.evaluate(() =>
    window.scrollTo(0, document.querySelector("#craft-recovery")?.offsetTop || 0),
  );
  await page.screenshot({ path: resolve(output, `${name}-${width}-${kind}-operated.png`) });
  const dimensions = await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth]);
  assert.ok(dimensions[1] <= dimensions[0] + 1);
  assert.deepEqual(errors, []);
  return {
    receipt: {
      kind,
      sourcePages: pages.length,
      nativeRoundTrip: true,
      noScriptOfflineReading: true,
      bytes: html.length,
      sha256: hash(html),
      errors,
    },
    async offline() {
      await page.reload({ waitUntil: "domcontentloaded" });
      await says(page, "#offline-status", "This edition is available offline,");
      await reopen();
      assert.deepEqual(JSON.parse(await download(page, native)), record);
      assertSameBytes(
        await download(page, `#${prefix}-save-reading`),
        html,
        `${kind}: connected and origin-refused reading`,
      );
      assert.deepEqual(errors, []);
      await page.close();
    },
  };
}
