import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, firefox } from "playwright";
import { reviewServer } from "./review-server.mjs";

const out = resolve(process.argv[2] || "test-results/upgrade");
await mkdir(out, { recursive: true });
let previous = process.env.UPGRADE_FROM;
if (!previous) {
  // A two-page edition: the third route does not exist in its allow-list.
  const fixture = resolve(out, "previous");
  await rm(fixture, { recursive: true, force: true });
  previous = resolve(fixture, "dist");
  await cp("dist", previous, { recursive: true });
  await rm(`${previous}/river.html`);
  for (const file of ["index.html", "ceremony.html"]) {
    const path = `${previous}/${file}`;
    await writeFile(
      path,
      (await readFile(path, "utf8")).replace(/<a href="\.\/river\.html">[^<]+<\/a>/g, ""),
    );
  }
  execFileSync(process.execPath, [resolve("scripts/offline.mjs")], { cwd: fixture });
}
const server = reviewServer(previous);
const ready = (p) =>
  p.locator("#offline-status").filter({ hasText: "This edition is available offline," }).waitFor();
const edition = (p) => p.locator('meta[name="traditio-edition"]').getAttribute("content");
const hash = (b) => createHash("sha256").update(b).digest("hex");
async function download(p, selector) {
  const pending = p.waitForEvent("download", { timeout: 45000 });
  await p.locator(selector).click();
  const file = await pending;
  assert.equal(await file.failure(), null);
  return readFile(await file.path());
}
const report = {
  at: new Date().toISOString(),
  previous: process.env.UPGRADE_FROM
    ? "Retained earlier public edition"
    : "Generated two-page fixture",
  previousWorker: hash(await readFile(`${previous}/sw.js`)),
  journeys: [],
};
await server.start();
try {
  for (const [name, engine] of [
    ["chromium", chromium],
    ["firefox", firefox],
  ]) {
    server.use(previous);
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({ viewport: { width: 375, height: 1000 } });
      const old = await context.newPage();
      await old.goto(server.base);
      await ready(old);
      const oldEdition = await edition(old);
      const ceremony = await context.newPage();
      await ceremony.goto(`${server.base}ceremony.html`);
      await ready(ceremony);
      const oldNote = "Keep this older rehearsal while opening a new lesson.";
      await ceremony.locator("#ceremony-note").fill(oldNote);
      server.use("dist");
      await old.evaluate(async () => {
        await (await navigator.serviceWorker.getRegistration()).update();
      });
      await old.waitForFunction(
        async () => !!(await navigator.serviceWorker.getRegistration()).waiting,
      );
      const river = await context.newPage();
      await river.goto(`${server.base}river.html`);
      await river.locator("#river-owner").filter({ hasText: "Lucius" }).waitFor();
      await river.locator(".edition-notice").waitFor();
      await river
        .locator("#offline-status")
        .filter({ hasText: "This page and the saved edition differ." })
        .waitFor();
      const newEdition = await edition(river);
      assert.notEqual(newEdition, oldEdition);
      assert.match(
        await river.locator(".edition-notice").textContent(),
        /each open lesson.*close every Traditio tab/,
      );
      await river
        .locator("#river-note")
        .fill("My explanation must survive the edition change: ex eo tempore.");
      await river.locator("#river-pin").click();
      await river.selectOption("#river-lens", "digest");
      await river.locator('[data-river-event="root"]').click();
      await river.locator('[data-river-event="attach"]').click();
      assert.equal(await river.locator("#river-owner").textContent(), "Aulus");
      const before = await download(river, ".edition-notice button");
      const record = JSON.parse(before);
      assert.match(record.note, /must survive/);
      assert.equal(record.pinned.at, 1);
      assert.equal(record.current.at, 3);
      // The recovery button always delegates to the lesson's current record.
      await river
        .locator("#river-note")
        .fill("A newer explanation saved by the same recovery button.");
      const saved = await download(river, ".edition-notice button");
      assert.equal(
        JSON.parse(saved).note,
        "A newer explanation saved by the same recovery button.",
      );
      assert.equal(await ceremony.locator("#ceremony-note").inputValue(), oldNote);
      await ready(old);
      await ready(ceremony);
      const ownership = await download(old, "#save-case");
      const rehearsal = await download(ceremony, "#save-rehearsal");
      const controllerAtOpen = await river.evaluate(() => !!navigator.serviceWorker.controller);
      const axe = await new AxeBuilder({ page: river }).analyze();
      assert.deepEqual(
        axe.violations.map((v) => v.id),
        [],
      );
      assert.equal(await river.evaluate(() => document.documentElement.scrollWidth), 375);
      await river.evaluate(() => scrollTo(0, 0));
      await river.screenshot({ path: `${out}/${name}-recovery.png` });
      // Keep the origin and profile; release the older clients without clearing storage.
      await Promise.all([old.close(), ceremony.close(), river.close()]);
      const resumed = await context.newPage();
      await resumed.goto(`${server.base}river.html`);
      await ready(resumed);
      assert.equal(await edition(resumed), newEdition);
      assert.equal(await resumed.locator(".edition-notice").count(), 0);
      await resumed
        .locator("#river-open")
        .setInputFiles({ name: "histories.json", mimeType: "application/json", buffer: saved });
      await resumed
        .locator("#river-save-status")
        .filter({ hasText: "Histories reopened" })
        .waitFor();
      assert.deepEqual(
        JSON.parse(await download(resumed, "#river-save-record")),
        JSON.parse(saved),
      );
      const restoredOwnership = await context.newPage();
      await restoredOwnership.goto(server.base);
      await ready(restoredOwnership);
      await restoredOwnership
        .locator("#open-case")
        .setInputFiles({ name: "case.json", mimeType: "application/json", buffer: ownership });
      await restoredOwnership
        .locator("#file-status")
        .filter({ hasText: "Saved case reopened" })
        .waitFor();
      assert.deepEqual(
        JSON.parse(await download(restoredOwnership, "#save-case")),
        JSON.parse(ownership),
      );
      const restoredCeremony = await context.newPage();
      await restoredCeremony.goto(`${server.base}ceremony.html`);
      await ready(restoredCeremony);
      await restoredCeremony
        .locator("#open-rehearsal")
        .setInputFiles({ name: "rehearsal.json", mimeType: "application/json", buffer: rehearsal });

      await restoredCeremony.waitForFunction(
        (note) => document.querySelector("#ceremony-note").value === note,
        oldNote,
      );
      assert.deepEqual(
        JSON.parse(await download(restoredCeremony, "#save-rehearsal")),
        JSON.parse(rehearsal),
      );
      await server.stop();
      await resumed.reload();
      await ready(resumed);
      // Reimport is explicit after leaving a lesson; no local storage is claimed.
      await resumed
        .locator("#river-open")
        .setInputFiles({ name: "histories.json", mimeType: "application/json", buffer: saved });
      await resumed
        .locator("#river-save-status")
        .filter({ hasText: "Histories reopened" })
        .waitFor();
      const reading = await download(resumed, "#river-save-reading");
      assert.equal((reading.toString().match(/src="data:image\/jpeg;base64,/g) || []).length, 4);
      const native = /href="data:application\/json;charset=utf-8,([^"]+)"/.exec(reading.toString());
      assert.deepEqual(JSON.parse(decodeURIComponent(native[1])), JSON.parse(saved));
      await server.start();
      report.journeys.push({
        browser: name,
        width: 375,
        oldEdition,
        newEdition,
        controllerAtOpen,
        recoveryDownloadUsesCurrentWork: true,
        allThreeRecordsRestored: true,
        oldTabsStayedCoherent: true,
        originStoppedAndReadingDownloaded: true,
        axeViolations: 0,
        readingBytes: reading.length,
      });
      await context.close();
      console.log(
        `${name}: two-page upgrade, actionable recovery, three native records, and genuine offline reading passed`,
      );
    } finally {
      await browser.close();
      await server.start();
    }
  }
} finally {
  await server.stop();
}
await writeFile(`${out}/receipt.json`, `${JSON.stringify(report, null, 2)}\n`);
