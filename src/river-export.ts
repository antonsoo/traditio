import { asset, dataUrl, verifiedBytes } from "./assets";
import {
  evaluateRiver,
  events,
  lenses,
  type RiverCase,
  type RiverRecord,
  riverFacts,
  routes,
  writeRiver,
} from "./core/river";
import { escapeHtml as esc } from "./drawing";
import { riverReading, riverReadings, riverScope } from "./river-content";
import { riverComparison, riverCsv, riverSvg } from "./river-drawing";
import { riverPages } from "./river-pages";

function history(c: RiverCase, label: string, id: string): string {
  const r = evaluateRiver(c);
  const all = evaluateRiver({ ...c, at: c.events.length }).steps;
  return `<section class="history"><h2>${esc(label)} · ${esc(routes[c.route])}</h2><p>${esc(lenses[c.lens])}. Inspected point: ${c.at} of ${c.events.length} attempts.</p><table><caption>Facts and result at the inspected point</caption><tbody>${riverFacts(
    c,
  )
    .map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join(
      "",
    )}</tbody></table>${riverSvg(c, id)}${c.route === "parcel" ? '<p class="note">Brown roots remain within the carried piece. Green roots enter the receiving soil; brass marks indicate long attachment.</p>' : ""}<h3>${esc(r.headline)}</h3><p>${esc(r.reason)}</p><p><a href="#reading-${r.source}">${esc(riverReading(r.source).reference)}</a></p><h3>The complete history</h3><p class="note">Later attempts remain recorded below. They are not applied to the inspected point above.</p>${
    all.length
      ? `<ol>${all
          .map((s, i) => {
            const result = evaluateRiver({ ...c, at: i + 1 });
            return `<li><strong>${esc(events[s.event])} · ${s.accepted ? "fact added" : "not added"}${i + 1 === c.at ? " · inspected point" : ""}</strong><p>${esc(s.reason)}</p><p>Ownership: ${esc(result.owner)}. ${esc(result.reason)} <a href="#reading-${result.source}">${esc(riverReading(result.source).reference)}</a>.</p></li>`;
          })
          .join("")}</ol>`
      : "<p>No facts attempted.</p>"
  }</section>`;
}
export async function riverSheet(
  record: RiverRecord,
  progress: (message: string) => void,
  signal: AbortSignal,
): Promise<string> {
  const files = Object.values(riverPages).map((p) => asset(p.path));
  files.push(asset("fonts/literata.woff2"), asset("fonts/sourcesans3.woff2"));
  const embedded = new Map<string, string>();
  for (const file of files) {
    signal.throwIfAborted();
    embedded.set(file.path, await dataUrl(file, signal));
    progress(
      `Preparing reading: ${embedded.size} of ${files.length} source pages and fonts checked.`,
    );
  }
  const texts = new Map<string, string>();
  for (const path of [
    "LICENSE.txt",
    "sources/NOTICE.txt",
    "fonts/literata-OFL.txt",
    "fonts/sourcesans3-OFL.txt",
  ]) {
    signal.throwIfAborted();
    texts.set(path, new TextDecoder().decode(await verifiedBytes(asset(path), signal)));
  }
  signal.throwIfAborted();
  const json = writeRiver(record);
  const csv = riverCsv(record.pinned, record.current);
  const svg = riverSvg(record.current, "download");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none';img-src data:;font-src data:;style-src 'unsafe-inline';base-uri 'none';form-action 'none'"><title>Traditio — retained river histories</title><style>
@font-face{font-family:Literata;src:url('${embedded.get("fonts/literata.woff2")}')}@font-face{font-family:'Source Sans 3';src:url('${embedded.get("fonts/sourcesans3.woff2")}')}*{box-sizing:border-box}body{font:18px/1.6 'Source Sans 3',sans-serif;color:#172b43;background:#fcfdff;max-width:1000px;margin:auto;padding:36px}h1,h2,.latin{font-family:Literata,serif}h1{font-size:2.8rem;line-height:1.2}h2{font-size:1.6rem}section{margin:2rem 0}svg{width:100%;max-width:700px;height:auto;display:block;background:#edf2f6;margin:1.2rem 0}table{border-collapse:collapse;width:100%}caption{text-align:left;font-weight:600;padding:.6rem 0}th,td{padding:.5rem;border-bottom:1px solid #c8d3df;text-align:left;vertical-align:top}tr.changed{background:#f0eadc}dt{font-weight:650}dd{margin:0 0 1rem}.latin{line-height:1.85}.note{font-size:.9rem;color:#526478}pre,.learner-note{white-space:pre-wrap;overflow-wrap:anywhere}pre{font-size:.75rem}a{color:#286491}.page{margin:2rem 0}.page img{max-width:100%;height:auto}li{margin:.8rem 0}.downloads{display:flex;flex-wrap:wrap;gap:1rem}@media(max-width:600px){body{padding:18px}h1{font-size:2.1rem}th,td{padding:.3rem;overflow-wrap:anywhere}table{font-size:.85rem}}@media print{@page{size:A4;margin:15mm}body{font-size:11pt;padding:0}h1{font-size:28pt}h2{font-size:18pt}h1,h2,h3{break-after:avoid}p,li{orphans:3;widows:3}svg{max-height:105mm}.page{break-before:page;break-inside:avoid}.page img{display:block;width:auto;max-width:100%;max-height:235mm;margin:auto}.reading,.history{break-before:page}tr{break-inside:avoid}pre{font-size:8pt}.downloads{display:none}}
</style></head><body><header><p>Traditio · Anthony Mercer</p><h1>The bank moved.<br>Did the title?</h1><p>Retained river histories, their evidence and its limits.</p><div class="downloads"><a href="data:application/json;charset=utf-8,${encodeURIComponent(json)}" download="traditio-river.json">Download editable histories</a><a href="data:text/csv;charset=utf-8,${encodeURIComponent(csv)}" download="traditio-river.csv">Download every-point CSV</a><a href="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}" download="traditio-river.svg">Download current drawing</a></div><p class="note">The histories, selected points and explanation were captured when Save was pressed. Outcomes are recomputed from those facts. All readings, source pages, fonts and licenses are embedded. This reading needs no script or network request. Use Print to save a PDF.</p></header>
${record.pinned ? history(record.pinned, "Pinned history", "pinned-export") : ""}${history(record.current, "Current history", "current-export")}
${record.pinned ? `<section><h2>Compare the selected points</h2><table>${riverComparison(record.pinned, record.current)}</table><p>Different investigations may share a receiving bank or outline without sharing the same material history. A different source selection is a difference in the available evidence, not a demonstrated historical change in law.</p></section>` : ""}
<section><h2>Your explanation</h2><p class="learner-note">${esc(record.note || "No explanation added.")}</p><p class="note">Retained as written; not graded.</p></section><section><h2>Scope and assumptions</h2>${riverScope.map((p) => `<p>${esc(p)}</p>`).join("")}</section>
${riverReadings.map((r) => `<section class="reading" id="reading-${r.id}"><p>${esc(r.reference)}</p><h2>${esc(r.title)}</h2><p lang="la" class="latin">${esc(r.latin)}</p><h3>Close English translation</h3><p>${esc(r.english)}</p><p class="note">${esc(r.note)}</p><dl>${r.words.map(([w, m, j]) => `<dt lang="la">${esc(w)}</dt><dd>${esc(m)}. ${esc(j)}</dd>`).join("")}</dl><p>Complete printed pages: ${r.pages.map((id) => `<a href="#page-${id}">${esc(riverPages[id]?.label ?? id)}</a>`).join(", ")}.</p></section>`).join("")}
<section><h2>Editions and textual boundary</h2><p>The Institutes are Gaius’s second-century textbook, retained in the Poste–Whittuck edition (Oxford, 1904), printed pages 160–161. The Digest was compiled in 533 CE; it attributes fragment 41.1.7 to book two of Gaius’s Res cottidianae sive aurea, a different work. Its retained edition is Mommsen’s Digest in Corpus Iuris Civilis, volume I, sixth stereotype edition (Berlin, 1893), printed pages 644–645. This comparison does not settle authorship, interpolation or the date a particular rule originated.</p><p>The new translations join printed line wraps and print consonantal u as v in the Latin. The Gaian spellings adluvionem and conplexa follow the printed edition. The scans retain all omitted surrounding text and the editors’ apparatus.</p></section>
${Object.entries(riverPages)
  .map(
    ([id, p]) =>
      `<figure class="page" id="page-${id}"><figcaption>${esc(p.label)} · ${esc(p.edition)} · complete printed page</figcaption><img alt="${esc(p.label)}: complete printed page" src="${embedded.get(p.path)}"><p class="note"><a href="${esc(p.url)}">Digitized volume, this page</a>. Source identity: ${esc(asset(p.path).sha256)}.</p></figure>`,
  )
  .join("")}
<section><h2>Editable histories in plain text</h2><pre>${esc(json)}</pre></section><section><h2>Retained-file identities</h2><pre>${esc(JSON.stringify([...files, ...[...texts.keys()].map(asset)], null, 2))}</pre></section><section><h2>Licenses and source notice</h2>${[...texts].map(([p, t]) => `<h3>${esc(p)}</h3><pre>${esc(t)}</pre>`).join("")}</section></body></html>`;
}
