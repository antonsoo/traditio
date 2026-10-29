import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { chromium, firefox } from "playwright";

const commands = ["preview", "dev"];
const children = commands.map((command) =>
  spawn("npm", ["run", command], { detached: true, stdio: "ignore" }),
);
const report = {
  date: new Date().toISOString(),
  commands: commands.map((command) => `npm run ${command}`),
  browsers: [],
};
try {
  for (const port of [4367, 4368]) {
    let ready = false;
    for (let count = 0; count < 80; count++) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/traditio/`);
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((done) => setTimeout(done, 100));
    }
    assert.ok(ready, `Server ${port}`);
  }
  for (const [name, engine] of [
    ["chromium", chromium],
    ["firefox", firefox],
  ]) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext();
      const preview = await context.newPage();
      await preview.goto("http://127.0.0.1:4367/traditio/");
      await preview.waitForFunction(() =>
        document
          .querySelector("#offline-status")
          .textContent.includes("This edition is available offline"),
      );
      const development = await context.newPage();
      await development.goto("http://127.0.0.1:4368/traditio/");
      await development.locator('[data-years="1"]').click();
      assert.equal(await development.locator("#title-holder").textContent(), "Aulus");
      const state = await development.evaluate(async () => ({
        controlled: !!navigator.serviceWorker.controller,
        registrations: (await navigator.serviceWorker.getRegistrations()).length,
        scripts: [...document.scripts].map((script) => new URL(script.src).pathname),
      }));
      assert.equal(state.controlled, false);
      assert.equal(state.registrations, 0);
      assert.ok(state.scripts.includes("/traditio/src/main.ts"));
      await preview.reload();
      assert.ok(await preview.evaluate(() => !!navigator.serviceWorker.controller));
      report.browsers.push({
        name,
        version: browser.version(),
        development: state,
        productionStillControlled: true,
        developmentControlsOperated: true,
      });
    } finally {
      await browser.close();
    }
  }
  await writeFile(
    "studies/audit-2026-10-29/after-development-origin.json",
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  for (const child of children) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
}
