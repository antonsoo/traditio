import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { connect } from "node:net";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { chromium, firefox } from "playwright";
import { argumentJourney, offlineArgument } from "./argument-journey.mjs";

const base = "https://antonsoo.github.io/traditio/";
const output = resolve(process.env.REVIEW_OUTPUT || "studies/publication");
const scratch = resolve("test-results/public");
await mkdir(output, { recursive: true });
await mkdir(scratch, { recursive: true });
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function paths(root, prefix = "") {
  const result = [];
  for (const entry of (await readdir(root, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) result.push(...(await paths(resolve(root, entry.name), `${path}/`)));
    else result.push(path);
  }
  return result;
}
async function canonicalFiles() {
  const results = [];
  for (const path of await paths(resolve("dist"))) {
    const local = await readFile(resolve("dist", path));
    const response = await fetch(new URL(path, base), {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    assert.equal(response.status, 200, path);
    const actual = Buffer.from(await response.arrayBuffer());
    assert.deepEqual(actual, local, `Canonical hosted bytes: ${path}`);
    results.push({ path, bytes: actual.length, sha256: hash(actual) });
  }
  return results;
}

// CONNECT carries the real site's TLS bytes unchanged. Closing its tunnels and
// refusing new ones makes the origin unavailable without intercepting worker fetches.
const sockets = new Set();
let unavailable = false;
let refused = 0;
const proxy = createServer((_request, response) => response.writeHead(502).end());
proxy.on("connect", (request, client, head) => {
  if (unavailable) {
    refused++;
    client.end("HTTP/1.1 503 Offline review\r\n\r\n");
    return;
  }
  if (request.url !== "antonsoo.github.io:443") {
    client.end("HTTP/1.1 403 Forbidden\r\n\r\n");
    return;
  }
  const upstream = connect(443, "antonsoo.github.io");
  for (const socket of [client, upstream]) {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  }
  client.on("error", () => upstream.destroy());
  upstream.on("error", () => client.destroy());
  client.on("close", () => upstream.destroy());
  upstream.on("close", () => client.destroy());
  upstream.on("connect", () => {
    if (unavailable) {
      client.destroy();
      upstream.destroy();
      return;
    }
    client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head.length) upstream.write(head);
    client.pipe(upstream);
    upstream.pipe(client);
  });
});
await new Promise((done) => proxy.listen(0, "127.0.0.1", done));
const report = {
  date: new Date().toISOString(),
  base,
  applicationCommit: execFileSync("git", [
    "log",
    "-1",
    "--format=%H",
    "--",
    "src",
    "index.html",
    "scripts/offline.mjs",
  ])
    .toString()
    .trim(),
  canonicalBefore: await canonicalFiles(),
  journeys: [],
  canonicalAfter: [],
};
async function says(page, selector, expected) {
  await page.waitForFunction(
    ({ selector, expected }) => document.querySelector(selector)?.textContent.includes(expected),
    { selector, expected },
  );
}
try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["firefox", firefox],
  ]) {
    const browser = await engine.launch({
      proxy: { server: `http://127.0.0.1:${proxy.address().port}` },
    });
    try {
      for (const width of [1440, 375]) {
        unavailable = false;
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
          reducedMotion: "reduce",
          acceptDownloads: true,
        });
        await context.addInitScript(() => {
          const create = URL.createObjectURL.bind(URL);
          window.reviewBlobs = new Map();
          URL.createObjectURL = (blob) => {
            const url = create(blob);
            window.reviewBlobs.set(url, blob);
            return url;
          };
        });
        const page = await context.newPage();
        const errors = [],
          requests = new Set();
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
          if (message.type() === "error") errors.push(message.text());
        });
        page.on("request", (request) => {
          if (/^https?:/.test(request.url()) && !request.url().startsWith(base))
            requests.add(request.url());
        });
        await page.goto(base);
        await says(page, "#offline-status", "This edition is available offline");
        await page.locator("#pin").focus();
        await page.keyboard.press("Enter");
        await page.locator('[data-years="1"]').focus();
        await page.keyboard.press("Enter");
        await says(page, "#title-holder", "Aulus");
        await says(page, "#comparison-count", "1 fact changed");
        await page.locator('[data-lesson="good-faith"]').click();
        await page.locator('input[name="seller"][value="thief"]').check();
        await says(page, "#title-holder", "Lucius");
        await page.locator("#focus-read").click();
        await page.getByRole("button", { name: "quamquam", exact: true }).click();
        await says(page, "#word-note", "even though");
        const pages = [];
        for (const item of JSON.parse(await readFile("src/asset-manifest.json", "utf8")).filter(
          (item) => item.printedPage !== null,
        )) {
          await page.locator("#page-select").selectOption(String(item.printedPage));
          await says(page, "#scan-status", `Printed page ${item.printedPage} · complete page`);
          const sha = await page.locator("#scan").evaluate(async (image) => {
            const bytes = await window.reviewBlobs.get(image.src).arrayBuffer();
            return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
              .map((byte) => byte.toString(16).padStart(2, "0"))
              .join("");
          });
          assert.equal(sha, item.sha256);
          pages.push({ page: item.printedPage, sha256: sha });
        }
        await page.locator("#zoom").click();
        await page.keyboard.press("ArrowRight");
        await page.waitForFunction(() => document.querySelector("#scan-viewport").scrollLeft > 0);
        await page.locator("#zoom").click();
        const argument = await argumentJourney({
          context,
          base,
          name,
          width,
          output,
          scratch,
          retainExamples: false,
        });
        const cache = await page.evaluate(async () => {
          const name = (await caches.keys()).find((name) => name.startsWith("traditio-"));
          return {
            name,
            controlled: !!navigator.serviceWorker.controller,
            files: (await (await caches.open(name)).keys()).length,
          };
        });
        assert.equal(
          cache.files,
          (await paths(resolve("dist"))).filter((path) => path !== "sw.js").length,
        );
        assert.equal(cache.controlled, true);
        const ceremony = await context.newPage();
        ceremony.on("pageerror", (error) => errors.push(error.message));
        await ceremony.goto(`${base}ceremony.html`);
        await says(ceremony, "#offline-status", "This edition is available offline");
        const rehearsal = await readFile("docs/ceremony-review/local/rehearsal.json");
        const openRehearsal = async () => {
          await ceremony.setInputFiles("#open-rehearsal", {
            name: "rehearsal.json",
            mimeType: "application/json",
            buffer: rehearsal,
          });
          await says(ceremony, "#dossier-status", "Rehearsal reopened");
        };
        const downloadRehearsal = async () => {
          const pending = ceremony.waitForEvent("download");
          await ceremony.locator("#save-dossier").click();
          const downloaded = await pending;
          assert.equal(await downloaded.failure(), null);
          return readFile(await downloaded.path());
        };
        await openRehearsal();
        const ceremonyHtml = await downloadRehearsal();
        assert.deepEqual(
          ceremonyHtml,
          gunzipSync(await readFile("docs/ceremony-review/local/rehearsal.html.gz")),
        );
        unavailable = true;
        for (const socket of sockets) socket.destroy();
        const before = refused;
        const probeContext = await browser.newContext({ serviceWorkers: "block" });
        const probe = await probeContext.newPage();
        let probeFailed = false;
        try {
          await probe.goto(base, { timeout: 8_000 });
        } catch {
          probeFailed = true;
        }
        assert.equal(
          probeFailed,
          true,
          "Fresh un-cached browser must fail while tunnels are refused",
        );
        assert.ok(refused > before, "The transport actually refused fresh connections");
        await probeContext.close();
        await ceremony.reload({ waitUntil: "domcontentloaded" });
        await says(ceremony, "#offline-status", "This edition is available offline");
        await says(ceremony, "#ceremony-scan-status", "Printed page 74.");
        await openRehearsal();
        assert.deepEqual(await downloadRehearsal(), ceremonyHtml);
        await ceremony.close();
        await offlineArgument(argument);
        await page.reload({ waitUntil: "domcontentloaded" });
        await says(page, "#offline-status", "This edition is available offline");
        await page.locator("#reading-select").selectOption("land");
        await says(page, "#scan-status", "Printed page 149 · complete page");
        assert.deepEqual(errors, []);
        assert.deepEqual([...requests], []);
        assert.deepEqual(argument.receipt.errors, []);
        report.journeys.push({
          browser: name,
          version: browser.version(),
          width,
          keyboardComparison: true,
          latinPhrase: "quamquam",
          pages,
          argument: { ...argument.receipt, offlineIdenticalBook: true },
          offlineTransport:
            "Real origin through unchanged TLS CONNECT; existing tunnels closed and new connections refused; fresh worker-free context fails",
          cache,
          ceremony: {
            offlineIdenticalDossier: true,
            bytes: ceremonyHtml.length,
            sha256: hash(ceremonyHtml),
          },
          errors,
          externalRequests: [...requests],
        });
        console.log(
          `${name} ${width}: actual hosted controls, scans, arguments, native artifacts and offline reload passed.`,
        );
        unavailable = false;
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
  report.canonicalAfter = await canonicalFiles();
  assert.deepEqual(report.canonicalAfter, report.canonicalBefore);
  await writeFile(resolve(output, "public-review.json"), `${JSON.stringify(report, null, 2)}\n`);
} finally {
  for (const socket of sockets) socket.destroy();
  proxy.closeAllConnections();
  await new Promise((done) => proxy.close(done));
}
