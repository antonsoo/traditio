import "./style.css";
import "./river.css";
import { asset, verifiedBytes } from "./assets";
import {
  branchRiver,
  compareRiverEvidence,
  evaluateRiver,
  events,
  type Lens,
  MAX_RIVER_BYTES,
  MAX_RIVER_EVENTS,
  makeRiverCase,
  makeRiverRecord,
  type ReadingId,
  type RiverEvent,
  type RiverRoute,
  readRiver,
  replayRiver,
  routeEvents,
  writeRiver,
} from "./core/river";
import { escapeHtml as esc } from "./drawing";
import { installOffline } from "./offline";
import { riverReading, riverReadings, riverScope, routeStories } from "./river-content";
import { riverComparison, riverCsv, riverSvg } from "./river-drawing";
import { riverSheet } from "./river-export";
import { riverPages } from "./river-pages";

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
let record = makeRiverRecord();
record.current.events = ["carry"];
record.current.at = 1;
let revision = 0;
let importId = 0;
let actionRoute: RiverRoute | undefined;
let readingId: ReadingId = "g-parcel";
let selectedPage = "g161";
let scanId = 0;
let scanController: AbortController | undefined;
let scanUrl: string | undefined;
let exportController: AbortController | undefined;
const status = el("river-save-status");
const shortEvent: Record<RiverEvent, string> = {
  carry: "Piece carried across",
  deposit: "Gradual addition",
  plant: "Tree planted",
  root: "Roots in receiving soil",
  attach: "Long attachment",
  flood: "Field flooded",
  recede: "Water receded",
};
function update(): void {
  const c = record.current;
  const r = evaluateRiver(c);
  el<HTMLSelectElement>("river-route").value = c.route;
  el<HTMLSelectElement>("river-lens").value = c.lens;
  el("river-story").textContent = routeStories[c.route];
  el("river-scene").innerHTML = riverSvg(c);
  el("river-diagram-key").hidden = c.route !== "parcel";
  el("river-point").textContent = c.at
    ? `Point ${c.at} of ${c.events.length} · ${shortEvent[c.events[c.at - 1] as RiverEvent]}`
    : "Initial stipulated facts";
  el("river-owner").textContent = r.owner;
  el("river-owner").style.color =
    r.owner === "Aulus" ? "#276457" : r.owner === "Lucius" ? "#705181" : "#80601c";
  el("river-focus-label").textContent = {
    parcel: "Ownership of the carried piece",
    silt: "Ownership of the new addition",
    plant: "Ownership of the tree",
    flood: "Ownership of the flooded field",
  }[c.route];
  el("river-headline").textContent = r.headline;
  el("river-reason").textContent = r.reason;
  el("river-last").hidden = r.owner !== "Not settled here";
  el("river-last").textContent =
    `Last express or stipulated owner: ${r.lastExpress}. The selected text does not decide the later history.`;
  if (actionRoute !== c.route) {
    el("river-actions").innerHTML = routeEvents[c.route]
      .map((e) => `<button type="button" data-river-event="${e}">${esc(events[e])}</button>`)
      .join("");
    actionRoute = c.route;
  }
  for (const b of el("river-actions").querySelectorAll<HTMLButtonElement>("button"))
    b.disabled = c.events.length >= MAX_RIVER_EVENTS;
  el<HTMLButtonElement>("river-undo").disabled = c.events.length === 0;
  el<HTMLButtonElement>("river-back").disabled = c.at === 0;
  el<HTMLButtonElement>("river-next").disabled = c.at === c.events.length;
  el<HTMLButtonElement>("river-branch").disabled = c.at === c.events.length;
  const steps = replayRiver(c);
  el("river-timeline").innerHTML =
    `<li><button type="button" data-river-at="0"${c.at === 0 ? ' aria-current="step"' : ""}><strong>Start</strong>Stipulated ownership</button></li>${steps.map((s, i) => `<li><button type="button" data-river-at="${i + 1}"${c.at === i + 1 ? ' aria-current="step"' : ""}${s.accepted ? "" : ' class="refused"'}><strong>${i + 1} · ${s.accepted ? "Fact added" : "Not added"}</strong>${esc(shortEvent[s.event])}</button></li>`).join("")}`;
  el("river-count").textContent = `(${c.events.length} / ${MAX_RIVER_EVENTS})`;
  el("river-log").innerHTML = steps.length
    ? steps
        .map(
          (s, i) =>
            `<li><strong>${esc(events[s.event])} · ${s.accepted ? "fact added" : "not added"}</strong><p>${esc(s.reason)}</p><p class="small">Ownership at this point with the selected reading: ${esc(evaluateRiver({ ...c, at: i + 1 }).owner)}.</p></li>`,
        )
        .join("")
    : "<li>No facts attempted yet.</li>";
  el<HTMLTextAreaElement>("river-note").value = record.note;
  el("river-comparison").hidden = record.pinned === null;
  if (record.pinned) {
    el("river-pinned-scene").innerHTML = riverSvg(record.pinned, "pinned");
    el("river-current-small").innerHTML = riverSvg(c, "comparison-current");
    el("river-table").innerHTML = riverComparison(record.pinned, c);
    el("river-comparison-note").textContent = compareRiverEvidence(record.pinned, c);
  }
}
function changed(message: string): void {
  ++revision;
  update();
  el("river-feedback").textContent = message;
}
el("river-route").addEventListener("change", () => {
  const lens = record.current.lens;
  record.current = {
    ...makeRiverCase(el<HTMLSelectElement>("river-route").value as RiverRoute),
    lens,
  };
  changed(
    "A new investigation starts with its stipulated ownership. The pinned history and your explanation have been kept.",
  );
});
el("river-lens").addEventListener("change", () => {
  record.current.lens = el<HTMLSelectElement>("river-lens").value as Lens;
  changed("The same history is now read with the selected passages. No physical fact has changed.");
});
el("river-actions").addEventListener("click", (e) => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-river-event]");
  if (!button || record.current.events.length >= MAX_RIVER_EVENTS) return;
  record.current.events.push(button.dataset.riverEvent as RiverEvent);
  record.current.at = record.current.events.length;
  const step = replayRiver(record.current).at(-1);
  changed(step?.reason ?? "History updated.");
});
el("river-timeline").addEventListener("click", (e) => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-river-at]");
  if (!button) return;
  record.current.at = Number(button.dataset.riverAt);
  changed(
    `Inspecting point ${record.current.at}. Later facts remain in the history but do not affect this point.`,
  );
  el("river-timeline")
    .querySelector<HTMLButtonElement>(`[data-river-at="${record.current.at}"]`)
    ?.focus();
});
for (const [id, delta] of [
  ["river-back", -1],
  ["river-next", 1],
] as const)
  el(id).addEventListener("click", () => {
    record.current.at = Math.max(
      0,
      Math.min(record.current.events.length, record.current.at + delta),
    );
    changed(`Inspecting point ${record.current.at}.`);
  });
el("river-undo").addEventListener("click", () => {
  record.current.events.pop();
  record.current.at = Math.min(record.current.at, record.current.events.length);
  changed("The last attempt was removed; earlier facts were replayed.");
});
el("river-branch").addEventListener("click", () => {
  if (record.current.at === record.current.events.length) return;
  const branched = branchRiver(record.current);
  record.pinned = branched.pinned;
  record.current = branched.current;
  changed(
    `The original ending is pinned at point ${record.pinned.at}. Your current history branches at point ${record.current.at}. Add different later facts to compare the results. Your explanation has been kept.`,
  );
  el("river-actions").querySelector<HTMLButtonElement>("button")?.focus();
});
el("river-reset").addEventListener("click", () => {
  record.current.events = [];
  record.current.at = 0;
  changed("This history starts again. The pinned history and explanation have been kept.");
});
el("river-pin").addEventListener("click", () => {
  record.pinned = structuredClone(record.current);
  changed(
    "The whole history and its selected point are pinned. Continue changing the current history or its reading.",
  );
});
el("river-restore").addEventListener("click", () => {
  if (record.pinned) record.current = structuredClone(record.pinned);
  changed("The pinned history, source selection and inspected point have been restored.");
});
el("river-unpin").addEventListener("click", () => {
  record.pinned = null;
  changed("The comparison was removed. Your current history remains.");
  el("river-pin").focus();
});
el("river-note").addEventListener("input", () => {
  record.note = el<HTMLTextAreaElement>("river-note").value;
  ++revision;
});
el("river-read-condition").addEventListener("click", () => {
  showReading(evaluateRiver(record.current).source);
  el("river-reader").scrollIntoView({ behavior: "instant", block: "start" });
  el("river-passage").focus({ preventScroll: true });
});
function showWord(index: number): void {
  const words = riverReading(readingId).words;
  const w = words[index];
  if (!w) return;
  for (const b of el("river-phrases").querySelectorAll<HTMLButtonElement>("button"))
    b.setAttribute("aria-pressed", String(Number(b.dataset.riverWord) === index));
  el("river-word").innerHTML = `<strong>${esc(w[1])}</strong><p>${esc(w[2])}</p>`;
}
function showReading(id: ReadingId): void {
  readingId = id;
  const r = riverReading(id);
  el<HTMLSelectElement>("river-passage").value = id;
  el("river-passage-title").textContent = `${r.reference} · ${r.title}`;
  el("river-latin").textContent = r.latin;
  el("river-english").textContent = r.english;
  el("river-editorial").textContent = r.note;
  el("river-phrases").innerHTML = r.words
    .map(
      ([w], i) =>
        `<button type="button" data-river-word="${i}" lang="la" aria-pressed="false">${esc(w)}</button>`,
    )
    .join("");
  el("river-related").innerHTML =
    id === "g-tree"
      ? '<button type="button" class="text-button" data-river-reading="g-soil">Read the preceding soil rule</button><button type="button" class="text-button" data-river-reading="d-tree">Compare the fuller tree passage</button>'
      : id === "g-parcel"
        ? '<button type="button" class="text-button" data-river-reading="d-parcel">Read the attachment continuation in the Digest</button>'
        : "";
  showWord(0);
  void loadPage(r.pages[0] as string);
}
el<HTMLSelectElement>("river-passage").innerHTML = riverReadings
  .map((r) => `<option value="${r.id}">${esc(r.reference)} · ${esc(r.title)}</option>`)
  .join("");
el("river-passage").addEventListener("change", () =>
  showReading(el<HTMLSelectElement>("river-passage").value as ReadingId),
);
el("river-phrases").addEventListener("click", (e) => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-river-word]");
  if (button) showWord(Number(button.dataset.riverWord));
});
el("river-related").addEventListener("click", (e) => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-river-reading]");
  if (button) {
    showReading(button.dataset.riverReading as ReadingId);
    el("river-passage").focus();
  }
});
el<HTMLSelectElement>("river-page").innerHTML = Object.entries(riverPages)
  .map(([id, p]) => `<option value="${id}">${esc(p.label)}</option>`)
  .join("");
async function loadPage(page: string): Promise<void> {
  const p = riverPages[page];
  if (!p) return;
  selectedPage = page;
  el<HTMLSelectElement>("river-page").value = page;
  const id = ++scanId;
  scanController?.abort();
  scanController = new AbortController();
  const img = el<HTMLImageElement>("river-scan");
  img.hidden = true;
  img.removeAttribute("src");
  if (scanUrl) {
    URL.revokeObjectURL(scanUrl);
    scanUrl = undefined;
  }
  el("river-scan-status").textContent = `Loading ${p.label}…`;
  el<HTMLAnchorElement>("river-page-link").href = p.url;
  try {
    const bytes = await verifiedBytes(asset(p.path), scanController.signal);
    if (id !== scanId) return;
    scanUrl = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
    img.src = scanUrl;
    img.alt = `Complete printed page: ${p.label}. ${p.edition}`;
    await img.decode();
    if (id !== scanId) return;
    img.hidden = false;
    el("river-scan-status").textContent =
      `${p.label}. Complete image checked against the retained edition.`;
    el("river-viewport").scrollTo(0, 0);
  } catch (error) {
    if (id !== scanId) return;
    img.hidden = true;
    el("river-scan-status").textContent =
      error instanceof Error ? error.message : "The page could not be loaded.";
  }
}
el("river-page").addEventListener(
  "change",
  () => void loadPage(el<HTMLSelectElement>("river-page").value),
);
el("river-retry").addEventListener("click", () => void loadPage(selectedPage));
el("river-zoom").addEventListener("click", () => {
  const enlarged = el("river-viewport").classList.toggle("enlarged");
  el("river-zoom").setAttribute("aria-pressed", String(enlarged));
  el("river-zoom").textContent = enlarged ? "Fit page" : "Enlarge page";
  if (enlarged) el("river-viewport").focus();
});
el("river-save-record").addEventListener("click", () => {
  saveFile("traditio-river.json", writeRiver(record), "application/json");
  status.textContent =
    "Both histories, their selected points and your explanation have been saved.";
});
el("river-save-svg").addEventListener("click", () => {
  saveFile("traditio-river.svg", riverSvg(record.current), "image/svg+xml");
  status.textContent =
    "The drawing includes the current facts, source selection and result in its accessible description.";
});
el("river-csv").addEventListener("click", () => {
  saveFile("traditio-river.csv", riverCsv(record.pinned, record.current), "text/csv;charset=utf-8");
  status.textContent =
    "Every point in both histories has been saved, with accepted facts and recomputed ownership.";
});
el("river-open").addEventListener("change", async () => {
  const input = el<HTMLInputElement>("river-open");
  const file = input.files?.[0];
  const id = ++importId;
  const capturedRevision = revision;
  if (!file) return;
  try {
    if (file.size > MAX_RIVER_BYTES) throw new Error("The river record is larger than 20 KiB.");
    const restored = readRiver(await file.text());
    if (id !== importId) return;
    if (revision !== capturedRevision) {
      status.textContent =
        "The file finished after you made newer changes. Your newer work has been kept. Select the file again to replace it.";
      return;
    }
    record = restored;
    changed("Saved histories replayed. Outcomes were recomputed from their facts.");
    status.textContent =
      "Histories reopened, including the pinned history, selected points and explanation.";
  } catch (error) {
    if (id === importId)
      status.textContent = `${error instanceof Error ? error.message : "The file could not be opened."} Your histories have been kept.`;
  } finally {
    if (id === importId) input.value = "";
  }
});
el("river-copy").addEventListener("click", async () => {
  const url = new URL(location.href);
  url.hash = `river=${encodeURIComponent(writeRiver(record))}`;
  try {
    await navigator.clipboard.writeText(url.href);
    el("river-copy-fallback").hidden = true;
    status.textContent =
      "History link copied, including both histories and your explanation. Editing leaves the address bar unchanged.";
  } catch {
    el("river-copy-fallback").hidden = false;
    const field = el<HTMLInputElement>("river-copy-url");
    field.value = url.href;
    field.focus();
    field.select();
    status.textContent = "Copy the selected history link.";
  }
});
function restoreLink(): void {
  if (!location.hash.startsWith("#river=")) return;
  ++importId;
  try {
    if (location.hash.length > MAX_RIVER_BYTES * 3)
      throw new Error("The shared river record is too large.");
    record = readRiver(decodeURIComponent(location.hash.slice(7)));
    changed("Shared histories replayed; ownership recomputed at each selected point.");
    status.textContent = "The shared histories and explanation have been opened.";
  } catch (error) {
    status.textContent = `${error instanceof Error ? error.message : "The link is damaged."} Your histories have been kept.`;
  }
}
window.addEventListener("hashchange", restoreLink);
el("river-save-reading").addEventListener("click", async () => {
  if (exportController) return;
  const captured = readRiver(writeRiver(record));
  exportController = new AbortController();
  const signal = exportController.signal;
  el<HTMLButtonElement>("river-save-reading").disabled = true;
  el("river-cancel").hidden = false;
  try {
    const html = await riverSheet(
      captured,
      (message) => {
        status.textContent = message;
      },
      signal,
    );
    signal.throwIfAborted();
    saveFile("traditio-river-reading.html", html, "text/html;charset=utf-8");
    status.textContent =
      "Illustrated reading saved with the histories and explanation captured when you clicked, all readings, complete source pages, fonts and licenses.";
  } catch (error) {
    status.textContent = signal.aborted
      ? "Preparation canceled. Your histories have been kept."
      : error instanceof Error
        ? error.message
        : "The reading could not be saved.";
  } finally {
    const focus = document.activeElement === el("river-cancel");
    el<HTMLButtonElement>("river-save-reading").disabled = false;
    el("river-cancel").hidden = true;
    exportController = undefined;
    if (focus) el("river-save-reading").focus();
  }
});
el("river-cancel").addEventListener("click", () => exportController?.abort());
el("river-scope-text").innerHTML = riverScope.map((p) => `<p>${esc(p)}</p>`).join("");
restoreLink();
update();
showReading("g-parcel");
installOffline(el("offline-status"), el("river-save-record"));
