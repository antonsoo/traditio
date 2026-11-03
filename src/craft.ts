import "./style.css";
import "./craft.css";
import { asset, verifiedBytes } from "./assets";
import {
  assess,
  type CraftId,
  type CraftRecord,
  craft,
  type Judgment,
  judgmentLabel,
  keepTrial,
  MAX_BYTES,
  MAX_TRIALS,
  makeCraftRecord,
  person,
  type ReadingId,
  type Rule,
  readCraft,
  type Trial,
  writeCraft,
} from "./core/craft";
import { craftPage, craftReading, craftReadings, craftScope } from "./craft-content";
import { analogyTable, responsiveCraftSvg } from "./craft-drawing";
import { craftSheet } from "./craft-export";
import { escapeHtml as esc } from "./drawing";
import { installOffline } from "./offline";

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing ${id}`);
  return node as T;
}
function saveFile(name: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
let record = makeCraftRecord();
let revision = 0;
let importId = 0;
let revealed = false;
let pageNumber = 163;
let scanId = 0;
let scanUrl: string | undefined;
let scanController: AbortController | undefined;
let exportController: AbortController | undefined;
const status = el("craft-save-status");
const feedback = el("craft-feedback");
function draft(): Trial {
  const found = record.drafts.find((d) => d.craft === record.current);
  if (!found) throw new Error("Missing case draft.");
  return found;
}
function captureDraft(): void {
  const d = draft();
  d.judgment = el<HTMLSelectElement>("craft-judgment").value as Judgment;
  d.explanation = el<HTMLTextAreaElement>("craft-explanation").value;
  d.citations = [...el("craft-citations").querySelectorAll<HTMLInputElement>("input:checked")].map(
    (i) => i.value as ReadingId,
  );
  ++revision;
}
function update(): void {
  const c = craft(record.current);
  el<HTMLSelectElement>("craft-case").value = c.id;
  el("craft-scene").innerHTML = responsiveCraftSvg(c.id);
  el("craft-story").textContent = c.story;
  const d = draft();
  el<HTMLSelectElement>("craft-judgment").value = d.judgment;
  el<HTMLTextAreaElement>("craft-explanation").value = d.explanation;
  for (const input of el("craft-citations").querySelectorAll<HTMLInputElement>("input"))
    input.checked = d.citations.includes(input.value as ReadingId);
  el<HTMLSelectElement>("craft-rule").value = record.rule;
  el("craft-rule-table").innerHTML = analogyTable(record.rule);
  el("craft-trials").innerHTML = record.trials.length
    ? `<ol class="craft-trials">${record.trials.map((t, i) => `<li><h3>${i + 1}. ${esc(craft(t.craft).title)}</h3><p><strong>${esc(judgmentLabel(t.judgment))}</strong></p><p class="learner-note">${esc(t.explanation || "No explanation kept.")}</p><p class="small">Citations: ${t.citations.length ? t.citations.map((id) => `<button class="text-button" type="button" data-reading="${id}">${esc(craftReading(id).ref)}</button>`).join(", ") : "none"}.</p><details><summary>Compare with the source</summary><p>${esc(assess(t.craft, t.judgment))}</p></details></li>`).join("")}</ol>`
    : "<p>No judgment kept yet.</p>";
  el<HTMLTextAreaElement>("craft-note").value = record.note;
  el<HTMLButtonElement>("craft-submit").disabled = record.trials.length >= MAX_TRIALS;
  if (record.trials.length >= MAX_TRIALS)
    feedback.textContent =
      "Twelve judgments kept. Save this notebook; reopen a saved notebook or reload to begin another.";
  showResult();
}
function showResult(): void {
  el("craft-result").hidden = !revealed;
  if (!revealed) return;
  const c = craft(record.current);
  el("craft-reason").textContent = c.reason;
  el("craft-remedy").hidden = c.kind === "outside";
  el("craft-remedy-question").textContent =
    c.id === "writing"
      ? "Can Lucius recover without paying writing expenses?"
      : c.id === "painting"
        ? "Does the painter’s title remove the board owner’s claims?"
        : "Suppose Aulus himself stole the material. Does title erase every remedy?";
  el("craft-remedy-text").textContent =
    c.id === "writing"
      ? "2.77 gives Lucius title, but says a defense of fraud can defeat his attempt to recover the written object if he does not pay writing expenses. The app computes no amount or litigation outcome."
      : c.id === "painting"
        ? "2.78 distinguishes who holds the picture, the value of the board, painting expenses and good-faith possession. It also preserves an action for theft against whoever stole the board. Title alone does not answer each question."
        : "The theft is an added premise, not a consequence of making. In 2.79 the material owner has an action for theft and a condictio against the thief, even alongside the maker-favoring view. An ownership answer does not settle every claim. The app assigns no award or litigation outcome.";
  el("craft-outcome").innerHTML =
    c.kind === "split"
      ? `<p>One object. Two competing answers.</p><div class="craft-fork"><div><h3>Sabinus and Cassius</h3><strong>Lucius</strong><p>Follow the material’s owner.</p></div><div><h3>The opposing school</h3><strong>Aulus</strong><p>Follow the person who made it.</p></div></div><p class="small">Alternative legal positions, not shares or a transfer sequence.</p>`
      : c.kind === "outside"
        ? "<h3>Not decided in these passages</h3><p>The app supplies no owner for this analogy.</p>"
        : `<h3>${esc(person(c.owner as Rule))}</h3><p>A reported rule in ${c.id === "writing" ? "2.77" : "2.78"}, separate from the rival answers in 2.79.</p>`;
}
el("craft-citations").innerHTML = craftReadings
  .map(
    (r) => `<label><input type="checkbox" value="${r.id}"/>${esc(r.ref)} · ${esc(r.title)}</label>`,
  )
  .join("");
el("craft-proposal").addEventListener("input", captureDraft);
el("craft-proposal").addEventListener("change", captureDraft);
el("craft-proposal").addEventListener("submit", (e) => {
  e.preventDefault();
  captureDraft();
  try {
    record = keepTrial(record, draft());
    ++revision;
    revealed = true;
    update();
    feedback.textContent = `${assess(record.current, draft().judgment)} Judgment ${record.trials.length} is kept; changing the draft will not rewrite it.`;
    el("craft-result").scrollIntoView({ block: "nearest", behavior: "instant" });
  } catch (error) {
    feedback.textContent =
      error instanceof Error ? error.message : "The judgment could not be kept.";
  }
});
el("craft-case").addEventListener("change", () => {
  record.current = el<HTMLSelectElement>("craft-case").value as CraftId;
  ++revision;
  revealed = false;
  update();
  feedback.textContent =
    "New live case. Your previous draft and all kept judgments remain in the notebook. Reveal this case when ready.";
});
el("craft-reveal").addEventListener("click", () => {
  revealed = true;
  showResult();
  feedback.textContent = "Source revealed. No judgment was added or changed.";
});
el("craft-rule").addEventListener("change", () => {
  record.rule = el<HTMLSelectElement>("craft-rule").value as Rule;
  ++revision;
  el("craft-rule-table").innerHTML = analogyTable(record.rule);
});
el("craft-open-analogy").addEventListener("click", () => {
  const body = el("craft-analogy-body");
  body.hidden = !body.hidden;
  el("craft-open-analogy").setAttribute("aria-expanded", String(!body.hidden));
  el("craft-open-analogy").textContent = body.hidden
    ? "Test an always claim"
    : "Close the comparison";
});
el("craft-note").addEventListener("input", () => {
  record.note = el<HTMLTextAreaElement>("craft-note").value;
  ++revision;
});
el("craft-passage").innerHTML = craftReadings
  .map((r) => `<option value="${r.id}">${esc(r.ref)} · ${esc(r.title)}</option>`)
  .join("");
function showReading(id: ReadingId, scroll = false): void {
  const r = craftReading(id);
  el<HTMLSelectElement>("craft-passage").value = id;
  el("craft-passage-title").textContent = r.title;
  el("craft-latin").textContent = r.latin;
  el("craft-english").textContent = r.english;
  el("craft-editorial").textContent = r.note;
  el("craft-related").textContent =
    `Complete printed page${r.pages.length > 1 ? "s" : ""}: ${r.pages.join(", ")}. The page selector also opens the continuation.`;
  el("craft-phrases").innerHTML = r.words
    .map(
      ([w], i) =>
        `<button type="button" lang="la" data-word="${i}" aria-pressed="${i === 0}">${esc(w)}</button>`,
    )
    .join("");
  const showWord = (i: number) => {
    const w = r.words[i];
    if (w) el("craft-word").textContent = `${w[1]}. ${w[2]}`;
  };
  showWord(0);
  el("craft-phrases").onclick = (event) => {
    const b = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-word]");
    if (!b) return;
    for (const item of el("craft-phrases").querySelectorAll("button"))
      item.setAttribute("aria-pressed", String(item === b));
    showWord(Number(b.dataset.word));
  };
  void loadPage(r.pages[0] ?? 163);
  if (scroll) {
    el("craft-reader").scrollIntoView({ behavior: "instant" });
    el("craft-passage").focus({ preventScroll: true });
  }
}
el("craft-passage").addEventListener("change", () =>
  showReading(el<HTMLSelectElement>("craft-passage").value as ReadingId),
);
el("craft-read-case").addEventListener("click", () =>
  showReading(craft(record.current).source, true),
);
el("craft-read-theft").addEventListener("click", () =>
  showReading(
    record.current === "writing"
      ? "writing-remedy"
      : record.current === "painting"
        ? "painting-remedy"
        : "theft",
    true,
  ),
);
el("craft-trials").addEventListener("click", (event) => {
  const b = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-reading]");
  if (b) showReading(b.dataset.reading as ReadingId, true);
});
async function loadPage(page: number): Promise<void> {
  pageNumber = page;
  el<HTMLSelectElement>("craft-page").value = String(page);
  const p = craftPage(page);
  const id = ++scanId;
  scanController?.abort();
  scanController = new AbortController();
  const img = el<HTMLImageElement>("craft-scan");
  img.hidden = true;
  img.removeAttribute("src");
  if (scanUrl) URL.revokeObjectURL(scanUrl);
  scanUrl = undefined;
  el("craft-scan-status").textContent = `Loading ${p.label}…`;
  el<HTMLAnchorElement>("craft-page-link").href = p.url;
  try {
    const bytes = await verifiedBytes(asset(p.path), scanController.signal);
    if (id !== scanId) return;
    scanUrl = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
    img.src = scanUrl;
    img.alt = `${p.label}: complete Latin, historical English and editorial context.`;
    await img.decode();
    if (id !== scanId) return;
    img.hidden = false;
    el("craft-scan-status").textContent =
      `${p.label}. Complete image checked against the retained bytes.`;
    el("craft-viewport").scrollTo(0, 0);
  } catch (error) {
    if (id !== scanId) return;
    img.hidden = true;
    el("craft-scan-status").textContent =
      error instanceof Error ? error.message : "The page could not be loaded.";
  }
}
el("craft-page").addEventListener(
  "change",
  () => void loadPage(Number(el<HTMLSelectElement>("craft-page").value)),
);
el("craft-retry").addEventListener("click", () => void loadPage(pageNumber));
el("craft-zoom").addEventListener("click", () => {
  const enlarged = el("craft-viewport").classList.toggle("enlarged");
  el("craft-zoom").setAttribute("aria-pressed", String(enlarged));
  el("craft-zoom").textContent = enlarged ? "Fit page" : "Enlarge page";
  if (enlarged) el("craft-viewport").focus();
});
el("craft-save-json").addEventListener("click", () => {
  saveFile("traditio-craft.json", writeCraft(record), "application/json");
  status.textContent =
    "Editable notebook saved, including every kept judgment, unkept draft and your account of the analogy.";
});
el("craft-open").addEventListener("change", async () => {
  const input = el<HTMLInputElement>("craft-open");
  const file = input.files?.[0];
  const id = ++importId;
  const capturedRevision = revision;
  if (!file) return;
  try {
    if (file.size > MAX_BYTES) throw new Error("The notebook exceeds 64 KiB.");
    const restored = readCraft(await file.text());
    if (id !== importId) return;
    if (revision !== capturedRevision) {
      status.textContent =
        "The file finished after newer edits. Your newer work has been kept; select the file again to replace it.";
      return;
    }
    replaceRecord(restored);
    status.textContent =
      "Notebook reopened. Drafts and kept judgments are separate; source comparisons have been recomputed.";
  } catch (error) {
    if (id === importId)
      status.textContent = `${error instanceof Error ? error.message : "The file could not be read."} Your notebook has been kept.`;
  } finally {
    if (id === importId) input.value = "";
  }
});
function replaceRecord(next: CraftRecord): void {
  record = next;
  ++revision;
  revealed = false;
  update();
  feedback.textContent = "Notebook restored. Reveal the current case when ready.";
}
function restoreLink(): void {
  if (!location.hash.startsWith("#craft=")) return;
  ++importId;
  try {
    if (location.hash.length > MAX_BYTES * 3) throw new Error("The shared notebook is too large.");
    replaceRecord(readCraft(decodeURIComponent(location.hash.slice(7))));
    status.textContent = "Shared notebook opened, including drafts and kept judgments.";
  } catch (error) {
    status.textContent = `${error instanceof Error ? error.message : "The link is damaged."} Your notebook has been kept.`;
  }
}
el("craft-copy").addEventListener("click", async () => {
  const url = new URL(location.href);
  url.hash = `craft=${encodeURIComponent(writeCraft(record))}`;
  try {
    await navigator.clipboard.writeText(url.href);
    el("craft-copy-fallback").hidden = true;
    status.textContent = "Notebook link copied, including your written work and unkept drafts.";
  } catch {
    el("craft-copy-fallback").hidden = false;
    const field = el<HTMLInputElement>("craft-copy-url");
    field.value = url.href;
    field.focus();
    field.select();
    status.textContent = "Copy the selected notebook link.";
  }
});
window.addEventListener("hashchange", restoreLink);
el("craft-save-reading").addEventListener("click", async () => {
  if (exportController) return;
  const captured = readCraft(writeCraft(record));
  exportController = new AbortController();
  const signal = exportController.signal;
  el<HTMLButtonElement>("craft-save-reading").disabled = true;
  el("craft-cancel").hidden = false;
  try {
    const html = await craftSheet(
      captured,
      (message) => {
        status.textContent = message;
      },
      signal,
    );
    signal.throwIfAborted();
    saveFile("traditio-craft-reading.html", html, "text/html;charset=utf-8");
    status.textContent =
      "Illustrated notebook saved with the work captured when you clicked, both complete source pages, all readings, fonts and licenses.";
  } catch (error) {
    status.textContent = signal.aborted
      ? "Preparation canceled. Your notebook has been kept."
      : error instanceof Error
        ? error.message
        : "The notebook could not be saved.";
  } finally {
    const focus = document.activeElement === el("craft-cancel");
    el<HTMLButtonElement>("craft-save-reading").disabled = false;
    el("craft-cancel").hidden = true;
    exportController = undefined;
    if (focus) el("craft-save-reading").focus();
  }
});
el("craft-cancel").addEventListener("click", () => exportController?.abort());
el("craft-scope").innerHTML = craftScope.map((p) => `<p>${esc(p)}</p>`).join("");
restoreLink();
update();
showReading("schools");
installOffline(el("offline-status"), el("craft-save-json"));
