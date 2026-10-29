import { asset, assets, dataUrl, verifiedBytes } from "./assets";
import { type Case, differences, evaluate, facts, lessonNames, story } from "./core/model";
import { writeRecord } from "./core/record";
import { diagramSvg, escapeHtml } from "./drawing";
import { edition, readings, scope } from "./readings";

export function comparisonTable(pinned: Case, current: Case): string {
  const before = new Map(facts(pinned));
  const after = new Map(facts(current));
  const labels = [...new Set([...before.keys(), ...after.keys()])];
  const first = evaluate(pinned);
  const second = evaluate(current);
  const rows = labels
    .map(
      (label) =>
        `<tr${before.get(label) !== after.get(label) ? ' class="changed"' : ""}><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(before.get(label) ?? "Not part of this case")}</td><td>${escapeHtml(after.get(label) ?? "Not part of this case")}</td></tr>`,
    )
    .join("");
  return `<caption class="visually-hidden">Facts and resulting legal positions</caption><thead><tr><th scope="col">Fact or result</th><th scope="col">Pinned: ${escapeHtml(lessonNames[pinned.lesson])}</th><th scope="col">Current: ${escapeHtml(lessonNames[current.lesson])}</th></tr></thead><tbody>${rows}<tr class="outcome-row"><th scope="row">Civil title</th><td>${escapeHtml(first.title)}</td><td>${escapeHtml(second.title)}</td></tr><tr><th scope="row">In bonis (2.41)</th><td>${escapeHtml(first.bonitary)}</td><td>${escapeHtml(second.bonitary)}</td></tr><tr><th scope="row">Possessor</th><td>Aulus</td><td>Aulus</td></tr><tr><th scope="row">Reasoning</th><td>${escapeHtml(first.explanation)}</td><td>${escapeHtml(second.explanation)}</td></tr></tbody>`;
}

export function saveFile(name: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function caseSection(input: Case, name: string): string {
  const result = evaluate(input);
  return `<section><h2>${name}: ${escapeHtml(lessonNames[input.lesson])}</h2><p>${escapeHtml(story(input))}</p><dl>${facts(
    input,
  )
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join(
      "",
    )}</dl>${diagramSvg(input)}<h3>${escapeHtml(result.headline)}</h3><p>${escapeHtml(result.explanation)}</p><ul>${result.conditions.map((condition) => `<li><strong>${escapeHtml(condition.label)} (${condition.state})</strong>: ${escapeHtml(condition.explanation)} <a href="#reading-${condition.rule}">Read the source</a>.</li>`).join("")}</ul></section>`;
}

export async function studySheet(
  current: Case,
  pinned: Case | null,
  progress: (message: string) => void,
): Promise<string> {
  // The caller supplies captured cases. Fetches never read mutable UI state.
  const embedded = new Map<string, string>();
  const texts = new Map<string, string>();
  const pages = assets.filter((item) => item.printedPage !== null);
  const files = [...pages, asset("fonts/literata.woff2"), asset("fonts/sourcesans3.woff2")];
  let done = 0;
  // Bounded batches keep the source download and base64 memory footprint modest.
  for (let index = 0; index < files.length; index += 3) {
    const completed = await Promise.allSettled(
      files.slice(index, index + 3).map(async (file) => {
        embedded.set(file.path, await dataUrl(file));
        progress(
          `Preparing the casebook: ${++done} of ${files.length} illustrations and fonts checked.`,
        );
      }),
    );
    const failed = completed.find((result) => result.status === "rejected");
    if (failed?.status === "rejected") throw failed.reason;
  }
  for (const path of [
    "LICENSE.txt",
    "sources/NOTICE.txt",
    "fonts/literata-OFL.txt",
    "fonts/sourcesans3-OFL.txt",
  ]) {
    texts.set(path, new TextDecoder().decode(await verifiedBytes(asset(path))));
  }
  const record = writeRecord(current, pinned);
  const jsonUrl = `data:application/json;charset=utf-8,${encodeURIComponent(record)}`;
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(diagramSvg(current))}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Traditio — retained case study</title><style>
    @font-face{font-family:Literata;src:url('${embedded.get("fonts/literata.woff2")}') format('woff2');font-weight:200 900}
    @font-face{font-family:Source;src:url('${embedded.get("fonts/sourcesans3.woff2")}') format('woff2');font-weight:200 900}
    *{box-sizing:border-box}body{font:18px/1.6 Source,sans-serif;color:#172b43;margin:auto;padding:36px;max-width:1020px;background:#fcfdff}h1,h2,.latin{font-family:Literata,Georgia,serif}h1{font-size:3rem;line-height:1.1}h2{font-size:1.6rem;line-height:1.3}h3{line-height:1.4}a{color:#205782}section{margin:2.2rem 0}svg{max-width:100%;height:auto}dl{display:grid;grid-template-columns:1fr 2fr;gap:.3rem 1rem}dt{font-weight:650}dd{margin:0}table{width:100%;border-collapse:collapse;font-size:.9rem}td,th{text-align:left;border-bottom:1px solid #c8d3df;padding:.6rem;vertical-align:top}thead th{border-bottom:2px solid #172b43}.changed{background:#edf2f6}.latin{line-height:1.85}.note{color:#526478;font-size:.9rem}.reading{border-top:1px solid #c8d3df;padding-top:1rem}.scan{max-width:100%;height:auto}.page{break-before:page}.page figcaption{font-size:1rem}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.72rem}.visually-hidden{position:absolute;clip-path:inset(50%);width:1px;height:1px;overflow:hidden}@media(max-width:600px){body{padding:18px}h1{font-size:2.3rem}dl{display:block}dd{margin-bottom:.7rem}td,th{padding:.3rem;overflow-wrap:anywhere}table{font-size:.75rem}}@media print{@page{size:A4;margin:15mm}body{font-size:11pt;padding:0}h1{font-size:30pt}h2{font-size:18pt}h1,h2,h3{break-after:avoid}p,li{orphans:3;widows:3}a{color:inherit}svg{max-height:105mm}figure{margin:0}.page{break-before:page;break-inside:avoid}.scan{display:block;max-height:240mm;width:auto;max-width:100%;margin:auto}.reading{break-before:page}table{font-size:9pt}tr{break-inside:avoid}pre{font-size:8pt}}
  </style></head><body><header><p>Anthony Mercer · Traditio · Version 0.1.0</p><h1>Having it. Owning it.</h1><p>An illustrated record of a reading experiment in Gaius's Roman ownership cases.</p><p><a href="${escapeHtml(jsonUrl)}" download="traditio-case.json">Download the editable case</a> · <a href="${escapeHtml(svgUrl)}" download="traditio-diagram.svg">Download the current diagram</a>. Use your browser's Print command to save a PDF.</p><p class="note">This document contains its fonts, original diagrams, Latin, English, word notes, full source-page images and license texts. It needs no script or network request to read. External source links are optional.</p></header>
  ${caseSection(current, "Current case")}${pinned ? `${caseSection(pinned, "Pinned case")}<section><h2>The comparison</h2><p>${pinned.lesson === current.lesson ? `${differences(pinned, current).length} changed fact(s).` : "Different investigations: this is not a one-fact comparison."}</p><table>${comparisonTable(pinned, current)}</table></section>` : ""}
  <section><h2>Scope of the experiment</h2>${scope.map((text) => `<p>${escapeHtml(text)}</p>`).join("")}</section>
  <section><h2>Edition and transcription</h2><p>${escapeHtml(edition.description)}</p><p>${escapeHtml(edition.editorial)}</p><p><a href="${edition.url}">Digitized volume at Internet Archive</a> · <a href="${edition.independent}">Independent comparison transcription</a></p></section>
  ${readings.map((item) => `<section class="reading" id="reading-${item.id}"><p>Gaius ${escapeHtml(item.reference)}</p><h2>${escapeHtml(item.title)}</h2><p class="latin" lang="la">${escapeHtml(item.latin)}</p><h3>Close English translation</h3><p>${escapeHtml(item.english)}</p><p class="note">${escapeHtml(item.note)}</p><dl>${item.words.map((word) => `<dt lang="la">${escapeHtml(word.latin)}</dt><dd><strong>${escapeHtml(word.meaning)}.</strong> ${escapeHtml(word.job)}</dd>`).join("")}</dl><p>Printed ${item.pages.length === 1 ? "page" : "pages"}: ${item.pages.map((page) => `<a href="#page-${page}">${page}</a>`).join(", ")}.</p></section>`).join("")}
  ${pages.map((page) => `<figure class="page" id="page-${page.printedPage}"><figcaption>Poste–Whittuck, 1904. Complete printed page ${page.printedPage}.<br />The Latin and English on the page belong to that edition.</figcaption><img class="scan" alt="Complete printed page ${page.printedPage} of the 1904 Gaius edition" src="${embedded.get(page.path)}" /></figure>`).join("")}
  <section><h2>Editable case, in plain text</h2><p>Save the following text as a .json file, then use Reopen a saved case in Traditio.</p><pre>${escapeHtml(record)}</pre></section>
  <section><h2>File identities</h2><pre>${escapeHtml(JSON.stringify(assets, null, 2))}</pre></section>
  <section><h2>Licenses and source notice</h2>${[...texts].map(([path, text]) => `<h3>${escapeHtml(path)}</h3><pre>${escapeHtml(text)}</pre>`).join("")}</section></body></html>`;
}
