import "./style.css";
import { asset, assets, verifiedBytes } from "./assets";
import {
  type Case,
  defaults,
  differences,
  evaluate,
  type Lesson,
  lessonNames,
  type RuleId,
  story,
  thingName,
  type Years,
} from "./core/model";
import {
  fromHash,
  MAX_RECORD_BYTES,
  readCase,
  readRecord,
  shareUrl,
  writeRecord,
} from "./core/record";
import { diagramSvg, escapeHtml, objectSvg } from "./drawing";
import { comparisonTable, saveFile, studySheet } from "./export";
import { installOffline } from "./offline";
import { edition, reading, readings, scope } from "./readings";

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing interface element: ${id}`);
  return found as T;
}

let current: Case = { ...defaults.delivery };
let pinned: Case | null = null;
let selectedReading: RuleId = "division";
let selectedPage = 147;
let scanRequest = 0;
let scanController: AbortController | undefined;
let imageUrl: string | undefined;
let announcementTimeout = 0;
let importRequest = 0;
const fileStatus = element("file-status");

function announce(message: string): void {
  element("announcement").textContent = message;
  window.clearTimeout(announcementTimeout);
  announcementTimeout = window.setTimeout(() => {
    element("announcement").textContent = "";
  }, 6000);
}

function update(): void {
  const result = evaluate(current);
  element("case-title").textContent = `Who owns the ${thingName(current)}?`;
  element("story").textContent = story(current);
  for (const control of document.querySelectorAll<HTMLFieldSetElement>("[data-for]")) {
    control.hidden = !control.dataset.for?.split(" ").includes(current.lesson);
  }
  const entries = new Map(Object.entries(current));
  for (const radio of document.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
    radio.checked = radio.value === entries.get(radio.name);
  }
  const cup = current.lesson === "delivery" && current.thing === "cup";
  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="form"]')) {
    radio.disabled = cup && radio.value === "mancipation";
  }
  element("cup-note").hidden = !cup;
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-lesson]")) {
    button.setAttribute("aria-pressed", String(button.dataset.lesson === current.lesson));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-years]")) {
    button.setAttribute("aria-pressed", String(Number(button.dataset.years) === current.years));
    const outcome = evaluate({ ...current, years: Number(button.dataset.years) as Years });
    button.title = `${button.dataset.years} completed years: ${outcome.headline}`;
  }
  element("object-picture").innerHTML = objectSvg(current);
  element("transfer-from").textContent = current.lesson === "delivery" ? "Lucius" : "Marcus";
  element("transfer-role").textContent =
    current.lesson === "delivery" ? "Owner and seller" : "Seller, not owner";
  element("title-holder").textContent = result.title;
  element("title-holder").className =
    `holder ${result.title === "Lucius" ? "left" : result.title === "Aulus" ? "right" : "neutral"}`;
  element("bonitary-holder").textContent = result.bonitary;
  element("bonitary-holder").className =
    `holder ${result.bonitary === "Aulus" || result.bonitary === "United with title" ? "right" : "neutral"}`;
  element("outcome").dataset.kind = result.kind;
  element("outcome-title").textContent = result.headline;
  element("outcome-explanation").textContent = result.explanation;
  const states = {
    met: "Satisfied",
    waiting: "Not yet complete",
    blocked: "Blocked",
    outside: "Outside scope",
  };
  element("conditions").innerHTML = result.conditions
    .map(
      (condition) =>
        `<li data-state="${condition.state}"><strong>${escapeHtml(condition.label)}</strong><p>${states[condition.state]}. ${escapeHtml(condition.explanation)}</p><button type="button" class="text-button" data-read="${condition.rule}">Gaius ${escapeHtml(reading(condition.rule).reference)}</button></li>`,
    )
    .join("");
  const focus = reading(result.focus);
  const excerpt =
    result.focus === "division"
      ? {
          latin:
            "[…] in bonis quidem tuis ea res efficitur, ex iure Quiritium vero mea permanebit, donec tu eam possidendo usucapias […].",
          english:
            "The thing becomes yours in bonis, while by the law of the Quirites it will remain mine until you acquire it by possessing it.",
        }
      : result.focus === "land"
        ? {
            latin:
              "[…] quam si ad alium bona fide accipientem transtulerit, poterit usucapere possessor […].",
            english:
              "If he transfers possession to another who receives it in good faith, the possessor can acquire by usucapion.",
          }
        : focus;
  element("focus-reference").textContent =
    `Gaius ${focus.reference} · ${excerpt === focus ? "Reading" : "Excerpt"}`;
  element("focus-title").textContent = focus.title;
  element("focus-latin").textContent = excerpt.latin;
  element("focus-english").textContent = excerpt.english;
  element("prompt").textContent =
    current.lesson === "delivery"
      ? "Try this: pin the mule at transfer, then advance one year. Which track moves?"
      : current.lesson === "good-faith"
        ? "Try this: pin the honest heir's sale after one year, then change only how Marcus got the cup."
        : "Try this: pin a peaceful Italian field after two years, then change only Marcus's entry.";
  element("comparison").hidden = pinned === null;
  element("comparison-jump").hidden = pinned === null;
  if (pinned) {
    const diff = differences(pinned, current);
    const sameLesson = pinned.lesson === current.lesson;
    element("comparison-count").textContent = sameLesson
      ? diff.length === 0
        ? "The two cases currently have identical facts. Change a control above."
        : `${diff.length} ${diff.length === 1 ? "fact changed" : "facts changed"}: ${diff.map((item) => item.fact.toLowerCase()).join(", ")}.`
      : "These are different investigations. Several premises change together.";
    element("comparison-table").innerHTML = comparisonTable(pinned, current);
    element("comparison-note").textContent =
      sameLesson && diff.length === 1
        ? `Only ${diff[0]?.fact.toLowerCase()} changed. The other stated premises remain the same.`
        : "For a one-fact comparison, pin a case and change just one control. The highlighted rows identify changed premises.";
  }
}

async function loadScan(page: number): Promise<void> {
  const id = ++scanRequest;
  selectedPage = page;
  scanController?.abort();
  scanController = new AbortController();
  const target = element<HTMLImageElement>("scan");
  target.hidden = true;
  target.removeAttribute("src");
  if (imageUrl) {
    URL.revokeObjectURL(imageUrl);
    imageUrl = undefined;
  }
  element("scan-viewport").classList.remove("enlarged");
  element("scan-viewport").scrollTo(0, 0);
  element("zoom").setAttribute("aria-pressed", "false");
  element("zoom").textContent = "Enlarge page";
  element<HTMLButtonElement>("zoom").disabled = true;
  element("scan-status").textContent = `Loading and checking printed page ${page}…`;
  element<HTMLSelectElement>("page-select").value = String(page);
  element<HTMLAnchorElement>("archive-page").href = `${edition.url}/page/${page}/mode/1up`;
  try {
    const item = asset(`sources/poste-1904-p${page}.jpg`);
    const bytes = await verifiedBytes(item, scanController.signal);
    if (id !== scanRequest) return;
    const url = URL.createObjectURL(new Blob([bytes], { type: item.mime }));
    imageUrl = url;
    target.src = url;
    target.alt = `Complete printed page ${page}, Gaius, Poste–Whittuck edition, Oxford 1904. Latin and historical English in two columns.`;
    await target.decode();
    if (id !== scanRequest) return;
    target.hidden = false;
    element<HTMLButtonElement>("zoom").disabled = false;
    element("scan-status").textContent =
      `Printed page ${page} · complete page · source bytes checked`;
  } catch (error) {
    if (id !== scanRequest) return;
    element("scan-status").textContent =
      error instanceof Error
        ? error.message
        : "The source page could not be read. Use Reload scan to try again.";
  }
}

function setReading(id: RuleId, scroll = false): void {
  selectedReading = id;
  const item = reading(id);
  element<HTMLSelectElement>("reading-select").value = id;
  element("reading-title").textContent = item.title;
  const paragraph = element("reading-latin");
  paragraph.replaceChildren();
  let cursor = 0;
  const text = item.latin;
  // Longest phrase wins; buttons are built as DOM nodes, never from input HTML.
  const words = item.words
    .map((word, index) => ({ ...word, index }))
    .sort((a, b) => b.latin.length - a.latin.length);
  const lower = text.toLocaleLowerCase("en");
  const letter = /[\p{L}\p{M}]/u;
  while (cursor < text.length) {
    let next = text.length;
    let selected: (typeof words)[number] | undefined;
    for (const word of words) {
      const phrase = word.latin.toLocaleLowerCase("en");
      let position = lower.indexOf(phrase, cursor);
      // An inflected ending changes the grammar: traditione is not traditionem.
      while (
        position !== -1 &&
        (letter.test(text[position - 1] ?? "") || letter.test(text[position + phrase.length] ?? ""))
      ) {
        position = lower.indexOf(phrase, position + 1);
      }
      if (position !== -1 && position < next) {
        next = position;
        selected = word;
      }
    }
    paragraph.append(document.createTextNode(text.slice(cursor, next)));
    if (!selected) break;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "word";
    button.dataset.word = String(selected.index);
    button.setAttribute("aria-pressed", "false");
    button.textContent = text.slice(next, next + selected.latin.length);
    paragraph.append(button);
    cursor = next + selected.latin.length;
  }
  element("reading-english").textContent = item.english;
  element("reading-note").textContent = item.note;
  element("word-note").innerHTML = "<p>Select a phrase in the Latin to read it closely.</p>";
  const first = id === "division" ? 147 : item.pages[0];
  if (first !== undefined) void loadScan(first);
  if (scroll) {
    element("reader").scrollIntoView({ block: "start" });
    element<HTMLSelectElement>("reading-select").focus({ preventScroll: true });
  }
}

element("controls").addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const changed = { ...current, [input.name]: input.value };
  if (input.name === "thing" && input.value === "cup" && changed.lesson === "delivery")
    changed.form = "delivery";
  current = readCase(changed);
  update();
  announce(evaluate(current).headline);
});
document.addEventListener("click", (event) => {
  const button =
    event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button") : null;
  if (!button) return;
  if (button.dataset.lesson) {
    current = { ...defaults[button.dataset.lesson as Lesson] };
    update();
    announce(`${lessonNames[current.lesson]}. ${evaluate(current).headline}`);
  } else if (button.dataset.years) {
    current = { ...current, years: Number(button.dataset.years) as Years };
    update();
    announce(`${current.years} completed years. ${evaluate(current).headline}`);
  } else if (button.dataset.read) {
    setReading(button.dataset.read as RuleId, true);
  } else if (button.dataset.word) {
    const word = reading(selectedReading).words[Number(button.dataset.word)];
    if (!word) return;
    for (const item of document.querySelectorAll<HTMLButtonElement>("[data-word]"))
      item.setAttribute("aria-pressed", String(item === button));
    element("word-note").innerHTML =
      `<p><strong lang="la">${escapeHtml(word.latin)}</strong> — ${escapeHtml(word.meaning)}</p><p>${escapeHtml(word.job)}</p>`;
  }
});
element("pin").addEventListener("click", () => {
  pinned = { ...current };
  update();
  announce("Case pinned. Change one fact above, then compare the consequences below.");
});
element("unpin").addEventListener("click", () => {
  pinned = null;
  update();
  element("pin").focus();
  announce("Pinned case cleared.");
});
element("repin").addEventListener("click", () => {
  pinned = { ...current };
  update();
  announce("Pinned case replaced with the current case.");
});
element("restore").addEventListener("click", () => {
  if (pinned) {
    current = { ...pinned };
    update();
    announce("Pinned case restored.");
  }
});
element("reset").addEventListener("click", () => {
  current = { ...defaults[current.lesson] };
  update();
  announce("Investigation reset. Your pinned case is still available.");
});
element("focus-read").addEventListener("click", () => {
  setReading(evaluate(current).focus, true);
});
element<HTMLSelectElement>("reading-select").innerHTML = readings
  .map(
    (item) =>
      `<option value="${item.id}">${escapeHtml(item.reference)} · ${escapeHtml(item.title)}</option>`,
  )
  .join("");
element("reading-select").addEventListener("change", () => {
  setReading(element<HTMLSelectElement>("reading-select").value as RuleId);
});
element<HTMLSelectElement>("page-select").innerHTML = assets
  .filter((item) => item.printedPage !== null)
  .sort((a, b) => (a.printedPage ?? 0) - (b.printedPage ?? 0))
  .map((item) => `<option value="${item.printedPage}">${item.printedPage}</option>`)
  .join("");
element("page-select").addEventListener("change", () => {
  void loadScan(Number(element<HTMLSelectElement>("page-select").value));
});
element("retry-scan").addEventListener("click", () => {
  void loadScan(selectedPage);
});
element("zoom").addEventListener("click", () => {
  const enlarged = element("scan-viewport").classList.toggle("enlarged");
  element("zoom").textContent = enlarged ? "Fit page" : "Enlarge page";
  element("zoom").setAttribute("aria-pressed", String(enlarged));
  if (enlarged) element("scan-viewport").focus();
});
element("save-case").addEventListener("click", () => {
  saveFile("traditio-case.json", writeRecord(current, pinned), "application/json");
  fileStatus.textContent = "Editable case saved, including the pinned comparison when present.";
});
element("save-svg").addEventListener("click", () => {
  saveFile("traditio-diagram.svg", diagramSvg(current), "image/svg+xml");
  fileStatus.textContent =
    "Current diagram saved as SVG. Save the casebook to retain its full facts and sources.";
});
element("save-sheet").addEventListener("click", async () => {
  const button = element<HTMLButtonElement>("save-sheet");
  const captured = { ...current };
  const capturedPin = pinned ? { ...pinned } : null;
  button.disabled = true;
  try {
    const html = await studySheet(captured, capturedPin, (message) => {
      fileStatus.textContent = message;
    });
    saveFile("traditio-casebook.html", html, "text/html;charset=utf-8");
    fileStatus.textContent =
      "Casebook saved with the cases as they were when you clicked, all readings, complete source pages and fonts. Open it on its own; use Print for a PDF.";
  } catch (error) {
    fileStatus.textContent =
      error instanceof Error
        ? error.message
        : "The casebook could not be saved. Try again when all source files are available.";
  } finally {
    button.disabled = false;
  }
});
element("open-case").addEventListener("change", async () => {
  const input = element<HTMLInputElement>("open-case");
  const file = input.files?.[0];
  const id = ++importRequest;
  if (!file) return;
  try {
    if (file.size > MAX_RECORD_BYTES)
      throw new Error("This file is too large. Traditio cases must be smaller than 16 KiB.");
    const result = readRecord(await file.text());
    if (id !== importRequest) return;
    current = result.current;
    pinned = result.pinned;
    update();
    fileStatus.textContent =
      "Saved case reopened. Current and pinned facts are restored; outcomes are recomputed from those facts.";
    announce("Saved case reopened.");
  } catch (error) {
    if (id === importRequest)
      fileStatus.textContent = `${error instanceof Error ? error.message : "Could not read this case."} Your current case has been kept.`;
  } finally {
    if (id === importRequest) input.value = "";
  }
});
element("copy-link").addEventListener("click", async () => {
  const url = shareUrl(location.href, current, pinned);
  try {
    await navigator.clipboard.writeText(url);
    element("share-fallback").hidden = true;
    fileStatus.textContent =
      "Case link copied. It includes the current and pinned facts. Editing the case does not change the address bar.";
  } catch {
    element("share-fallback").hidden = false;
    const input = element<HTMLInputElement>("share-text");
    input.value = url;
    input.focus();
    input.select();
    fileStatus.textContent = "Automatic copying is unavailable. Copy the selected link below.";
  }
});
function restoreHash(): void {
  try {
    const record = fromHash(location.hash);
    if (record) {
      current = record.current;
      pinned = record.pinned;
      fileStatus.textContent = "Shared case opened. Outcomes are recomputed from its saved facts.";
      update();
    }
  } catch (error) {
    fileStatus.textContent = `${error instanceof Error ? error.message : "The shared case could not be opened."} Your current case has been kept.`;
    announce("The shared case could not be opened. Details are under Keep a case.");
  }
}
window.addEventListener("hashchange", restoreHash);
element("edition-description").textContent = edition.description;
element("editorial-policy").textContent = edition.editorial;
element("scope-text").innerHTML = scope
  .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
  .join("");
restoreHash();
update();
setReading(evaluate(current).focus);
installOffline(element("offline-status"));
