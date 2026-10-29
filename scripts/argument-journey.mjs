import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function says(page, selector, expected) {
  await page.waitForFunction(
    ({ selector, expected }) => document.querySelector(selector)?.textContent.includes(expected),
    { selector, expected },
  );
}
async function download(page, selector) {
  const pending = page.waitForEvent("download");
  await page.locator(selector).click();
  const file = await pending;
  assert.equal(await file.failure(), null);
  return readFile(await file.path());
}
async function kind(page, expected) {
  assert.equal(await page.locator("#argument-assessment").getAttribute("data-kind"), expected);
}

export async function argumentJourney({
  context,
  base,
  name,
  width,
  output,
  scratch,
  retainExamples = true,
}) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(base);
  await says(page, "#scan-status", "source bytes checked");
  await page.locator("#claim-select").selectOption("delivery-title");
  await page.locator("#check-argument").focus();
  await page.keyboard.press("Enter");
  await kind(page, "counterexample");
  await page.locator("#reading-select").selectOption("division");
  await page.locator("#cite-reading").focus();
  await page.keyboard.press("Enter");
  await says(page, "#citation-status", "passages needed for this refutation are cited");
  await page.locator('[data-years="1"]').click();
  await says(page, "#argument-status", "live case has changed");
  await says(page, "#witness-title", "Lucius");
  await page.locator("#restore-witness").click();
  await says(page, "#title-holder", "Lucius");
  await page.locator("#clear-argument").click();
  assert.equal(await page.locator("#argument-work").isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "claim-select");

  await page.locator("#claim-select").selectOption("faith-and-time");
  await page.locator('[data-lesson="good-faith"]').click();
  await page.locator("#pin").click();
  await page.locator("#check-argument").click();
  await kind(page, "not-counterexample");
  await page.locator('input[name="seller"][value="thief"]').check();
  await page.locator('input[name="belief"][value="bad"]').check();
  await page.locator("#check-argument").click();
  await kind(page, "premise-not-met");
  await page.locator('input[name="belief"][value="good"]').check();
  await page.locator('[data-years="0"]').click();
  await page.locator("#check-argument").click();
  await kind(page, "premise-not-met");
  await page.locator('[data-years="1"]').click();
  await page.locator("#check-argument").click();
  await kind(page, "counterexample");
  await page.locator("#reading-select").selectOption("innocent");
  await page.locator("#cite-reading").click();
  await says(page, "#citation-status", "Still needed: The stated possession period");
  await page.locator("#reading-select").selectOption("time");
  await page.locator("#cite-reading").click();
  await says(page, "#citation-status", "passages needed for this refutation are cited");
  await page.locator('[data-remove-citation="innocent"]').click();
  assert.equal(await page.evaluate(() => document.activeElement?.id), "argument-note");
  await says(page, "#citation-status", "Still needed: A barrier");
  await page
    .locator("#argument-note")
    .fill(
      'Literal notes stay text: <script>throw "not executable"</script> & <img src="https://example.invalid/a">',
    );
  const literalBook = await download(page, "#save-sheet");
  assert.ok(literalBook.includes(Buffer.from("&lt;script&gt;")));
  assert.ok(!literalBook.includes(Buffer.from("<script>")));
  assert.ok(!literalBook.includes(Buffer.from('<img src="https:')));

  await page.locator("#claim-select").selectOption("knowing-seller");
  assert.ok((await page.locator("#argument-note").inputValue()).startsWith("Literal notes"));
  await page.locator('input[name="seller"][value="heir"]').check();
  await page.locator("#check-argument").click();
  await kind(page, "premise-not-met");
  await page.locator('[data-lesson="land"]').click();
  await page.locator('[data-years="2"]').click();
  await page.locator('input[name="location"][value="province"]').check();
  await page.locator("#check-argument").click();
  await kind(page, "outside");
  await page.locator('input[name="location"][value="italy"]').check();
  await page.locator("#pin").click();
  await page.locator("#check-argument").click();
  await kind(page, "counterexample");
  await page.locator("#reading-select").selectOption("land");
  await page.getByRole("button", { name: "quamvis", exact: true }).click();
  await says(page, "#word-note", "although");
  await page.locator("#cite-reading").click();
  await says(page, "#citation-status", "passages needed for this refutation are cited");
  const note =
    "Marcus knows the field is not his, but Aulus receives it in good faith. In 2.51, quamvis concedes Marcus's knowledge; tamen nihil hoc ... nocet says it does no harm to the later possessor's usucapion. The peaceful entry (sine vi) matters. Two completed years supply the period in 2.42. This refutes the claim about every later buyer, within the stated Italian-land case.";
  await page.locator("#argument-note").fill(note);
  await page.locator("#argument-note").evaluate((element) => {
    element.blur();
    element.scrollTop = 0;
  });
  await page.locator("#argument").evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: `${output}/argument-${name}-${width}.png` });
  if (width === 375) {
    await page
      .locator(".argument-evidence")
      .evaluate((element) => element.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: `${output}/argument-evidence-${name}-${width}.png` });
  }
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  assert.deepEqual(
    axe.violations.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target) })),
    [],
  );
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  // The live case can diverge; the written argument still concerns its submitted field.
  await page.locator('input[name="entry"][value="violent"]').check();
  await says(page, "#title-holder", "Lucius");
  await says(page, "#witness-title", "Aulus");
  await kind(page, "counterexample");
  const json = await download(page, "#save-case");
  const record = JSON.parse(json);
  assert.equal(record.version, 2);
  assert.equal(record.current.entry, "violent");
  assert.equal(record.pinned.entry, "peaceful");
  assert.equal(record.argument.witness.entry, "peaceful");
  assert.equal(record.argument.note, note);
  assert.deepEqual(record.argument.citations, ["time", "land"]);
  await page.locator("#clear-argument").click();
  await page
    .locator("#open-case")
    .setInputFiles({ name: "argument.json", mimeType: "application/json", buffer: json });
  await says(page, "#file-status", "Saved case reopened");
  await kind(page, "counterexample");
  assert.equal(await page.locator("#argument-note").inputValue(), note);
  const malformed = {
    ...record,
    argument: { ...record.argument, witness: { ...record.argument.witness, years: 8 } },
  };
  await page.locator("#open-case").setInputFiles({
    name: "wrong.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(malformed)),
  });
  await says(page, "#file-status", "Your current case has been kept");
  assert.equal(await page.locator("#argument-note").inputValue(), note);
  const legacy = {
    format: "traditio-case",
    version: 1,
    current: record.current,
    pinned: record.pinned,
  };
  await page.locator("#open-case").setInputFiles({
    name: "v1.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await says(page, "#file-status", "Saved case reopened");
  assert.equal(await page.locator("#argument-work").isVisible(), false);
  await page
    .locator("#open-case")
    .setInputFiles({ name: "argument.json", mimeType: "application/json", buffer: json });
  await says(page, "#file-status", "Saved case reopened");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("Review fallback")) },
    }),
  );
  const address = page.url();
  await page.locator("#copy-link").click();
  await says(page, "#file-status", "Copy the selected link");
  const link = await page.locator("#share-text").inputValue();
  assert.equal(page.url(), address);
  await page.goto(link);
  await page.reload();
  await kind(page, "counterexample");
  assert.equal(await page.locator("#argument-note").inputValue(), note);
  const book = await download(page, "#save-sheet");
  const filePath = `${scratch}/argument-${name}-${width}.html`;
  await writeFile(filePath, book);
  const standalone = await context.newPage();
  const requests = [];
  standalone.on("request", (request) => {
    if (/^https?:/.test(request.url())) requests.push(request.url());
  });
  await standalone.goto(`file://${filePath}`);
  await standalone.evaluate(() => document.fonts.ready);
  assert.equal(await standalone.locator(".learner-note").textContent(), note);
  const diagrams = await standalone.locator('svg[role="img"]').evaluateAll((figures) =>
    figures.map((figure) =>
      ["aria-labelledby", "aria-describedby"].every((name) => {
        const matches = document.querySelectorAll(`#${figure.getAttribute(name)}`);
        return matches.length === 1 && figure.contains(matches[0]);
      }),
    ),
  );
  assert.deepEqual(diagrams, [true, true, true]);
  assert.deepEqual(
    JSON.parse(await download(standalone, 'a[download="traditio-case.json"]')),
    record,
  );
  assert.deepEqual(requests, []);
  if (retainExamples && name === "chromium" && width === 1440) {
    await writeFile("examples/knowing-seller-argument.json", json);
    await writeFile("examples/knowing-seller-argument.html.gz", gzipSync(book));
    await standalone.pdf({
      path: "examples/knowing-seller-argument.pdf",
      format: "A4",
      printBackground: true,
      tagged: true,
      outline: true,
    });
    await standalone
      .locator(".argument-record")
      .evaluate((element) => element.scrollIntoView({ block: "start" }));
    await standalone.screenshot({ path: `${output}/argument-casebook.png` });
  }
  await standalone.close();
  assert.deepEqual(errors, []);
  return {
    page,
    link,
    book,
    receipt: {
      threeClaims: true,
      falsePremisesRejected: true,
      provincialBoundary: true,
      latinPhrase: "quamvis",
      separateCitationCoverage: true,
      fixedSubmission: true,
      notesRemainText: true,
      version1And2Reopened: true,
      malformedImportPreservesArgument: true,
      nativeDownloadMatches: true,
      sharedArgument: true,
      standaloneRequests: requests,
      diagramDescriptionsUnique: true,
      axeViolations: 0,
      errors,
      book: { bytes: book.length, sha256: hash(book) },
    },
  };
}

export async function offlineArgument(journey) {
  await journey.page.reload({ waitUntil: "domcontentloaded" });
  await says(journey.page, "#offline-status", "This edition is available offline");
  await kind(journey.page, "counterexample");
  assert.deepEqual(await download(journey.page, "#save-sheet"), journey.book);
  await journey.page.close();
}
