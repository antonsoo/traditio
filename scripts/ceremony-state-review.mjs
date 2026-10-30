import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium, firefox } from "playwright";

const base = process.argv[2] || "http://127.0.0.1:4488/traditio/";
const out = process.argv[3] || "docs/ceremony-review/local";
await mkdir(out, { recursive: true });
const rows = [];
const says = (p, id, text) =>
  p.waitForFunction(({ id, text }) => document.getElementById(id)?.textContent.includes(text), {
    id,
    text,
  });
for (const [engine, launcher] of [
  ["chromium", chromium],
  ["firefox", firefox],
]) {
  const b = await launcher.launch();
  const c = await b.newContext({ serviceWorkers: "block" });
  const p = await c.newPage();
  p.setDefaultTimeout(15000);
  const delayed = async () =>
    p.evaluate(() => {
      const original = File.prototype.text;
      window.originalFileText = original;
      File.prototype.text = async function () {
        const result = await original.call(this);
        await new Promise((r) => (window.releaseFile = r));
        return result;
      };
    });
  await p.goto(`${base}ceremony.html`);
  await delayed();
  const saved = await readFile("docs/ceremony-review/local/rehearsal.json");
  await p.setInputFiles("#open-rehearsal", {
    name: "older.json",
    mimeType: "application/json",
    buffer: saved,
  });
  await p.fill("#ceremony-note", "New work during the pending file");
  await p.selectOption("#witnesses", "6");
  await p.evaluate(() => window.releaseFile());
  await says(p, "dossier-status", "newer work");
  assert.equal(await p.locator("#ceremony-note").inputValue(), "New work during the pending file");
  assert.equal(await p.locator("#witnesses").inputValue(), "6");
  await p.goto(`${base}ceremony.html`);
  await delayed();
  await p.setInputFiles("#open-rehearsal", {
    name: "older.json",
    mimeType: "application/json",
    buffer: saved,
  });
  const newer = JSON.parse(saved);
  newer.note = "A newer explicitly opened shared record";
  newer.events = ["buyer-claim", "ask", "counterclaim"];
  await p.evaluate(
    (hash) => {
      location.hash = hash;
    },
    `rehearsal=${encodeURIComponent(JSON.stringify(newer))}`,
  );
  await says(p, "dossier-status", "Shared rehearsal opened");
  await p.evaluate(() => window.releaseFile());
  await p.waitForTimeout(100);
  assert.equal(await p.locator("#ceremony-note").inputValue(), newer.note);
  await says(p, "ceremony-title-holder", "Dispute outside this model");
  const firstURL = p.url();
  const alternate = {
    ...newer,
    events: ["buyer-claim", "ask", "silence", "award"],
    note: "Second shared record",
  };
  await p.evaluate(
    (hash) => {
      location.hash = hash;
    },
    `rehearsal=${encodeURIComponent(JSON.stringify(alternate))}`,
  );
  await says(p, "ceremony-title-holder", "Aulus");
  await p.goBack();
  await says(p, "ceremony-title-holder", "Dispute outside this model");
  assert.equal(p.url(), firstURL);
  assert.equal(await p.locator("#ceremony-note").inputValue(), newer.note);
  await p.evaluate(() => {
    File.prototype.text = window.originalFileText;
  });
  await p.setInputFiles("#open-rehearsal", {
    name: "wrong.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"format":"traditio-case"}'),
  });
  await says(p, "dossier-status", "Your work has been kept");
  assert.equal(await p.locator("#ceremony-note").inputValue(), newer.note);
  await p.goto(base);
  await delayed();
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
  const shared = {
    ...old,
    current: { lesson: "land", entry: "peaceful", location: "italy", belief: "good", years: 2 },
  };
  await p.evaluate(
    (hash) => {
      location.hash = hash;
    },
    `case=${encodeURIComponent(JSON.stringify(shared))}`,
  );
  await says(p, "case-title", "field");
  await p.evaluate(() => window.releaseFile());
  await p.waitForTimeout(100);
  await says(p, "case-title", "field");
  await says(p, "title-holder", "Aulus");
  rows.push({
    engine,
    version: b.version(),
    newRehearsalEditsSurviveDelayedImport: true,
    sharedRecordSupersedesPendingImport: true,
    hashChangesAndBackRestoreFactsAndNotes: true,
    invalidRecordKeepsWork: true,
    oldCaseSharedRecordSupersedesPendingImport: true,
  });
  await b.close();
  console.log(engine, "state races and history passed");
}
await writeFile(`${out}/state-review.json`, `${JSON.stringify({ base, rows }, null, 2)}\n`);
