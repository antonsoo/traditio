import "./style.css";
import "./ceremony.css";
import { asset, verifiedBytes } from "./assets";
import { type CeremonyReadingId, ceremonyReadings, ceremonyScope } from "./ceremony-content";
import { ceremonySvg } from "./ceremony-drawing";
import { ceremonySheet } from "./ceremony-export";
import {
  type Act,
  type Arrangement,
  acts,
  arrangementGaps,
  MAX_ACTS,
  MAX_REHEARSAL_BYTES,
  makeRehearsal,
  readRehearsal,
  replay,
  writeRehearsal,
} from "./core/ceremony";
import { escapeHtml as esc } from "./drawing";
import { saveFile } from "./export";
import { installOffline } from "./offline";

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing ${id}`);
  return node as T;
}
let record = makeRehearsal();
let revision = 0;
let importId = 0;
let selectedPage = 74;
let scanId = 0;
let scanController: AbortController | undefined;
let scanUrl: string | undefined;
let exportController: AbortController | undefined;
const status = el("dossier-status");
const routeActs: Record<Arrangement["route"], Act[]> = {
  bronze: ["seller-claim", "give", "buyer-claim", "strike"],
  magistrate: [
    "award",
    "buyer-claim",
    "silence",
    "ask",
    "disclaim",
    "counterclaim",
    "seller-claim",
  ],
};
function update(): void {
  const a = record.arrangement;
  const result = replay(record);
  for (const radio of document.querySelectorAll<HTMLInputElement>('[name="route"]'))
    radio.checked = radio.value === a.route;
  el("bronze-setup").hidden = a.route !== "bronze";
  el<HTMLSelectElement>("thing").value = a.thing;
  el<HTMLSelectElement>("witnesses").value = String(a.witnesses);
  el<HTMLSelectElement>("holder").value = a.holder;
  el<HTMLInputElement>("present").checked = a.present;
  el("present-label").textContent =
    a.thing === "mule" ? "Mule present and grasped by Aulus" : "Ceremony held at the field";
  el("presence-note").textContent =
    a.thing === "field"
      ? "Gaius 1.121 permits mancipation of land while absent. Try unchecking this."
      : a.route === "bronze"
        ? "Presence includes the acquirer’s grasp in 1.121."
        : "The acquirer holds the thing in 2.24. This scene uses the mule only.";
  el("arrangement-gaps").innerHTML = arrangementGaps(a)
    .map(
      (g) =>
        `<li>${esc(g.text)} <button class="text-button" type="button" data-source="${g.source}">Read the words</button></li>`,
    )
    .join("");
  el("scene").innerHTML = ceremonySvg(record);
  el("ceremony-title-holder").textContent = result.title;
  el("ceremony-result").textContent = result.explanation;
  el("next-act").textContent = result.contested
    ? "The described branch ends at a counterclaim."
    : result.complete
      ? "The described formal conveyance is complete."
      : `Described acts completed: ${result.stage} / ${a.route === "bronze" ? 3 : 4}.`;
  // Keep the current action button in the DOM, preserving keyboard focus on each attempt.
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-act]")) {
    button.hidden = !routeActs[a.route].includes(button.dataset.act as Act);
    button.disabled = record.events.length >= MAX_ACTS;
  }
  el<HTMLButtonElement>("undo-act").disabled = record.events.length === 0;
  el("act-count").textContent = `${record.events.length} / ${MAX_ACTS}`;
  el("act-log").innerHTML = result.steps
    .map(
      (s) =>
        `<li data-accepted="${s.accepted}"><strong>${esc(acts[s.act].actor)}: ${esc(acts[s.act].label)} · ${s.accepted ? "entered" : "did not advance"}</strong><p>${esc(s.explanation)}</p><button class="text-button" type="button" data-source="${s.source}">Read the passage</button></li>`,
    )
    .join("");
  el<HTMLTextAreaElement>("ceremony-note").value = record.note;
}
function editArrangement(): void {
  const route = document.querySelector<HTMLInputElement>('[name="route"]:checked')
    ?.value as Arrangement["route"];
  const thing =
    route === "magistrate"
      ? "mule"
      : (el<HTMLSelectElement>("thing").value as Arrangement["thing"]);
  record.arrangement = {
    route,
    thing,
    witnesses: Number(el<HTMLSelectElement>("witnesses").value) as Arrangement["witnesses"],
    holder: el<HTMLSelectElement>("holder").value as Arrangement["holder"],
    present: el<HTMLInputElement>("present").checked,
  };
  record.events = [];
  ++revision;
  update();
  el("act-status").textContent =
    "Arrangement changed. A fresh sequence begins; your explanation has been kept.";
}
for (const node of document.querySelectorAll(
  '[name="route"], #thing, #witnesses, #holder, #present',
))
  node.addEventListener("change", editArrangement);
el("acts").innerHTML = Object.entries(acts)
  .map(
    ([id, a]) =>
      `<button type="button" data-act="${id}"><small>${esc(a.actor)}</small>${esc(a.label)}</button>`,
  )
  .join("");
document.addEventListener("click", (event) => {
  const button =
    event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button") : null;
  if (button?.dataset.act) {
    if (record.events.length >= MAX_ACTS) return;
    record.events.push(button.dataset.act as Act);
    ++revision;
    update();
    const last = replay(record).steps.at(-1);
    el("act-status").textContent = last?.explanation ?? "";
  }
  if (button?.dataset.source) {
    showReading(button.dataset.source as CeremonyReadingId);
    el("ceremony-reader").scrollIntoView({ block: "start" });
    el("ceremony-passage").focus({ preventScroll: true });
  }
});
el("undo-act").addEventListener("click", () => {
  record.events.pop();
  ++revision;
  update();
  el("act-status").textContent = "Last attempt removed; the remaining sequence has been replayed.";
  if (!record.events.length) el("reset-acts").focus();
});
el("reset-acts").addEventListener("click", () => {
  record.events = [];
  ++revision;
  update();
  el("act-status").textContent = "Sequence restarted. Arrangement and explanation kept.";
});
el("ceremony-note").addEventListener("input", () => {
  record.note = el<HTMLTextAreaElement>("ceremony-note").value;
  ++revision;
});
function showReading(id: CeremonyReadingId): void {
  const r = ceremonyReadings.find((r) => r.id === id);
  if (!r) return;
  el<HTMLSelectElement>("ceremony-passage").value = id;
  el("passage-title").textContent = `${r.reference} · ${r.title}`;
  el("passage-latin").textContent = r.latin;
  el("passage-english").textContent = r.english;
  el("passage-note").textContent = r.note;
  el("phrase-notes").innerHTML = r.words
    .map(
      ([w, m, j]) => `<dt lang="la">${esc(w)}</dt><dd><strong>${esc(m)}.</strong> ${esc(j)}</dd>`,
    )
    .join("");
  void loadPage(r.pages[0]);
}
async function loadPage(page: number): Promise<void> {
  selectedPage = page;
  el<HTMLSelectElement>("ceremony-page").value = String(page);
  const id = ++scanId;
  scanController?.abort();
  scanController = new AbortController();
  const img = el<HTMLImageElement>("ceremony-scan");
  img.hidden = true;
  img.removeAttribute("src");
  if (scanUrl) {
    URL.revokeObjectURL(scanUrl);
    scanUrl = undefined;
  }
  el("ceremony-scan-status").textContent = `Loading printed page ${page}…`;
  const file = asset(`sources/poste-1904-p${page}.jpg`);
  el<HTMLAnchorElement>("ceremony-archive").href =
    `https://archive.org/details/gaiinstitutiones00gaiuuoft/page/n${page + 63}/mode/1up`;
  try {
    const bytes = await verifiedBytes(file, scanController.signal);
    if (id !== scanId) return;
    const url = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
    scanUrl = url;
    img.src = url;
    img.alt = `Complete printed page ${page} of Poste–Whittuck's 1904 Gaius edition`;
    await img.decode();
    if (id !== scanId) return;
    img.hidden = false;
    el("ceremony-scan-status").textContent =
      `Printed page ${page}. Complete image checked against the retained edition.`;
    el("ceremony-viewport").scrollTo(0, 0);
  } catch (error) {
    if (id !== scanId) return;
    img.hidden = true;
    el("ceremony-scan-status").textContent =
      error instanceof Error ? error.message : "The source page could not be loaded.";
  }
}
el<HTMLSelectElement>("ceremony-passage").innerHTML = ceremonyReadings
  .map((r) => `<option value="${r.id}">${esc(r.reference)} · ${esc(r.title)}</option>`)
  .join("");
el("ceremony-passage").addEventListener("change", () =>
  showReading(el<HTMLSelectElement>("ceremony-passage").value as CeremonyReadingId),
);
el("ceremony-page").addEventListener(
  "change",
  () => void loadPage(Number(el<HTMLSelectElement>("ceremony-page").value)),
);
el("ceremony-retry").addEventListener("click", () => void loadPage(selectedPage));
el("ceremony-zoom").addEventListener("click", () => {
  const enlarged = el("ceremony-viewport").classList.toggle("enlarged");
  el("ceremony-zoom").setAttribute("aria-pressed", String(enlarged));
  el("ceremony-zoom").textContent = enlarged ? "Fit page" : "Enlarge page";
  if (enlarged) el("ceremony-viewport").focus();
});
el("save-rehearsal").addEventListener("click", () => {
  saveFile("traditio-ceremony.json", writeRehearsal(record), "application/json");
  status.textContent = "Editable arrangement, attempts and explanation saved.";
});
el("open-rehearsal").addEventListener("change", async () => {
  const input = el<HTMLInputElement>("open-rehearsal");
  const file = input.files?.[0];
  const id = ++importId;
  const capturedRevision = revision;
  if (!file) return;
  try {
    if (file.size > MAX_REHEARSAL_BYTES) throw new Error("The rehearsal is larger than 16 KiB.");
    const restored = readRehearsal(await file.text());
    if (id !== importId) return;
    if (revision !== capturedRevision) {
      status.textContent =
        "The file finished reading after your newer work. That work has been kept. Select the file again to replace it.";
      return;
    }
    record = restored;
    ++revision;
    update();
    el("act-status").textContent = "Saved attempts replayed from the recorded arrangement.";
    status.textContent = "Rehearsal reopened. The result has been recomputed from the saved acts.";
  } catch (error) {
    if (id === importId)
      status.textContent = `${error instanceof Error ? error.message : "Could not open this rehearsal."} Your work has been kept.`;
  } finally {
    if (id === importId) input.value = "";
  }
});
el("copy-rehearsal").addEventListener("click", async () => {
  const url = new URL(location.href);
  url.hash = `rehearsal=${encodeURIComponent(writeRehearsal(record))}`;
  try {
    await navigator.clipboard.writeText(url.href);
    el("rehearsal-fallback").hidden = true;
    status.textContent =
      "Rehearsal link copied, including your explanation. Editing leaves the address bar unchanged.";
  } catch {
    el("rehearsal-fallback").hidden = false;
    el<HTMLInputElement>("rehearsal-url").value = url.href;
    el("rehearsal-url").focus();
    el<HTMLInputElement>("rehearsal-url").select();
    status.textContent = "Copy the selected rehearsal link.";
  }
});
function restoreLink(): void {
  if (!location.hash.startsWith("#rehearsal=")) return;
  ++importId;
  try {
    if (location.hash.length > MAX_REHEARSAL_BYTES * 3)
      throw new Error("The shared rehearsal is too large.");
    record = readRehearsal(decodeURIComponent(location.hash.slice(11)));
    ++revision;
    update();
    status.textContent = "Shared rehearsal opened; the recorded acts have been replayed.";
    el("act-status").textContent = "Shared attempts replayed from the recorded arrangement.";
  } catch (error) {
    status.textContent = `${error instanceof Error ? error.message : "Damaged rehearsal link."} Your work has been kept.`;
  }
}
window.addEventListener("hashchange", restoreLink);
el("save-dossier").addEventListener("click", async () => {
  const captured = readRehearsal(writeRehearsal(record));
  exportController = new AbortController();
  const signal = exportController.signal;
  el<HTMLButtonElement>("save-dossier").disabled = true;
  el("cancel-dossier").hidden = false;
  try {
    const html = await ceremonySheet(
      captured,
      (message) => {
        status.textContent = message;
      },
      signal,
    );
    signal.throwIfAborted();
    saveFile("traditio-rehearsal.html", html, "text/html;charset=utf-8");
    status.textContent =
      "Illustrated rehearsal saved with the arrangement, attempts and explanation captured when you clicked, plus four complete pages and fonts.";
  } catch (error) {
    status.textContent = signal.aborted
      ? "Preparation canceled. Your rehearsal has been kept."
      : error instanceof Error
        ? error.message
        : "The rehearsal could not be saved.";
  } finally {
    const focus = document.activeElement === el("cancel-dossier");
    el<HTMLButtonElement>("save-dossier").disabled = false;
    el("cancel-dossier").hidden = true;
    exportController = undefined;
    if (focus) el("save-dossier").focus();
  }
});
el("cancel-dossier").addEventListener("click", () => exportController?.abort());
el("ceremony-scope-text").innerHTML = ceremonyScope.map((s) => `<p>${esc(s)}</p>`).join("");
restoreLink();
update();
showReading("assembly");
installOffline(el("offline-status"));
