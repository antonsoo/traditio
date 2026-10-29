import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium, firefox } from "playwright";
import { diagramSvg } from "../../src/drawing.ts";

const cases = [];
for (const years of [0, 1, 2, 3]) {
  for (const thing of ["cup", "mule", "field"])
    for (const form of ["delivery", "mancipation"])
      if (thing !== "cup" || form === "delivery")
        cases.push({ lesson: "delivery", thing, form, years });
  for (const belief of ["good", "bad"]) {
    for (const seller of ["heir", "thief"])
      cases.push({ lesson: "good-faith", seller, belief, years });
    for (const location of ["italy", "province"])
      for (const entry of ["peaceful", "violent"])
        cases.push({ lesson: "land", entry, location, belief, years });
  }
}
assert.equal(cases.length, 68);
const result = { date: new Date().toISOString(), browsers: [] };
for (const [name, engine] of [
  ["chromium", chromium],
  ["firefox", firefox],
]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
    const failures = [];
    for (const input of cases) {
      await page.setContent(diagramSvg(input));
      const extents = await page.evaluate(() => {
        const svg = document.querySelector("svg"),
          box = svg.viewBox.baseVal;
        return [...svg.querySelectorAll("text")]
          .map((text) => {
            const rect = text.getBBox();
            return {
              text: text.textContent,
              x: rect.x,
              y: rect.y,
              right: rect.x + rect.width,
              bottom: rect.y + rect.height,
            };
          })
          .filter(
            (rect) =>
              rect.x < 0 || rect.y < 0 || rect.right > box.width || rect.bottom > box.height,
          );
      });
      if (extents.length) failures.push({ input, extents });
    }
    assert.deepEqual(failures, []);
    result.browsers.push({
      name,
      version: browser.version(),
      supportedDiagrams: cases.length,
      visibleTextWithinViewBox: true,
    });
    await page.setContent(
      diagramSvg({ lesson: "good-faith", seller: "heir", belief: "good", years: 1 }),
    );
    await page.locator("svg").screenshot({ path: `docs/assets/diagram-facts-${name}.png` });
  } finally {
    await browser.close();
  }
}
await writeFile(
  "studies/audit-2026-10-29/after-diagram-geometry.json",
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify(result, null, 2));
