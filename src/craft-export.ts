import { asset, dataUrl, verifiedBytes } from "./assets";
import { assess, type CraftRecord, craft, judgmentLabel, person, writeCraft } from "./core/craft";
import { craftPage, craftReadings, craftScope } from "./craft-content";
import { analogyTable, responsiveCraftSvg } from "./craft-drawing";
import { escapeHtml as esc } from "./drawing";
import { recoverySheet } from "./recovery-view";
export async function craftSheet(
  record: CraftRecord,
  progress: (message: string) => void,
  signal: AbortSignal,
): Promise<string> {
  const paths = [
    craftPage(162).path,
    craftPage(163).path,
    "fonts/literata.woff2",
    "fonts/sourcesans3.woff2",
  ];
  const embedded = new Map<string, string>();
  for (const path of paths) {
    signal.throwIfAborted();
    embedded.set(path, await dataUrl(asset(path), signal));
    progress(
      `Preparing notebook: ${embedded.size} of ${paths.length} source pages and fonts checked.`,
    );
  }
  const texts = new Map<string, string>();
  for (const path of [
    "LICENSE.txt",
    "sources/NOTICE.txt",
    "sources/work-NOTICE.txt",
    "fonts/literata-OFL.txt",
    "fonts/sourcesans3-OFL.txt",
  ]) {
    signal.throwIfAborted();
    texts.set(path, new TextDecoder().decode(await verifiedBytes(asset(path), signal)));
  }
  signal.throwIfAborted();
  const json = writeCraft(record);
  const c = craft(record.current);
  const trials = record.trials
    .map(
      (t, i) =>
        `<section class="trial"><h2>Judgment ${i + 1}: ${esc(craft(t.craft).title)}</h2>${responsiveCraftSvg(t.craft, `trial-${i}`)}<h3>Your kept proposal: ${esc(judgmentLabel(t.judgment))}</h3><p class="learner-note">${esc(t.explanation || "No explanation kept.")}</p><p>Cited readings: ${t.citations.length ? t.citations.map((id) => `<a href="#reading-${id}">${esc(craftReadings.find((r) => r.id === id)?.ref ?? id)}</a>`).join(", ") : "none"}.</p><p><strong>Comparison with the selected source:</strong> ${esc(assess(t.craft, t.judgment))}</p><p>${esc(craft(t.craft).reason)}</p></section>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none';img-src data:;font-src data:;style-src 'unsafe-inline';base-uri 'none';form-action 'none'"><title>Traditio — craft dispute notebook</title><style>
@font-face{font-family:Literata;src:url('${embedded.get("fonts/literata.woff2")}')}@font-face{font-family:'Source Sans 3';src:url('${embedded.get("fonts/sourcesans3.woff2")}')}*{box-sizing:border-box}body{font:18px/1.6 'Source Sans 3',sans-serif;color:#172b43;background:#fcfdff;max-width:1000px;margin:auto;padding:36px;overflow-wrap:anywhere}h1,h2,.latin{font-family:Literata,serif}h1{font-size:2.7rem;line-height:1.2}h2{font-size:1.6rem}section{margin:2rem 0}p{max-width:78ch}svg{display:block;width:100%;max-width:660px;margin:1rem 0;height:auto}table{border-collapse:collapse;width:100%;font-size:.9rem}caption{text-align:left;font-weight:600}th,td{padding:.65rem;border-bottom:1px solid #c8d3df;text-align:left;vertical-align:top}.counterexample,.recovery-changed{background:#e4ece8}.small{font-size:.85rem;color:#526478}.learner-note,pre{white-space:pre-wrap;overflow-wrap:anywhere}pre{font-size:.75rem}dt{font-weight:650}dd{margin:0 0 1rem}img{display:block;width:100%;height:auto}a{color:#286491}.latin{line-height:1.9}[lang=la]{font-feature-settings:'locl' 0;font-language-override:'ENG'}.craft-compact{display:none}@media(max-width:600px){.craft-wide{display:none}.craft-compact{display:block}}.downloads{display:flex;flex-wrap:wrap;gap:1rem}@media(max-width:600px){body{padding:18px}h1{font-size:2rem}table{font-size:.8rem}td,th{padding:.3rem}}@media print{.craft-compact{display:none}.craft-wide{display:block}@page{size:A4;margin:15mm}body{font-size:11pt;padding:0}h1{font-size:28pt}h2{font-size:18pt}h1,h2,h3{break-after:avoid}p,li{orphans:3;widows:3}svg{max-height:95mm}.page,.reading,.trial,.analogy,.recovery-sheet{break-before:page}.page{break-inside:avoid}.page img{width:auto;max-width:100%;max-height:235mm;margin:auto}tr{break-inside:avoid}pre{font-size:8pt}.downloads{display:none}}
</style></head><body><header><p>Traditio · Anthony Mercer</p><h1>Someone else’s gold. Your work.</h1><p>A craft dispute notebook from Gaius, Institutes 2.77–79.</p><p class="small">Captured when Save was pressed. Proposals are kept as written. Source comparisons are recomputed from case facts; prose and citation choices are not graded. This reading embeds its pages, fonts, sources and licenses; it needs no scripts or network. Print to save a PDF.</p><p><a id="craft-native-notebook" class="downloads" href="data:application/json;charset=utf-8,${encodeURIComponent(json)}" download="traditio-craft.json">Download editable notebook, including unkept drafts</a></p></header>
<section><h2>Current work: ${esc(c.title)}</h2><p>${esc(c.story)}</p>${responsiveCraftSvg(c.id, "current")}<p>${esc(c.reason)}</p></section>
<section><h2>Your kept judgments</h2>${record.trials.length ? `<p>${record.trials.length} kept. The judgments below are fixed records, separate from later drafts.</p>` : "<p>No judgments kept.</p>"}</section>${trials}
${recoverySheet(record)}
<section><h2>Your unkept drafts</h2><p class="small">These drafts have not been submitted as judgments.</p>${
    record.drafts
      .filter((d) => d.explanation || d.citations.length)
      .map(
        (d) =>
          `<h3>${esc(craft(d.craft).title)}: ${esc(judgmentLabel(d.judgment))}</h3><p class="learner-note">${esc(d.explanation || "No explanation written.")}</p><p>Citations: ${esc(d.citations.join(", ") || "none")}.</p>`,
      )
      .join("") || "<p>No written draft or draft citation.</p>"
  }</section>
<section><h2>Your account of the case</h2><p class="learner-note">${esc(record.note || "No account written.")}</p><p>Selected proposed general rule: ${esc(person(record.rule))} always owns the result.</p></section>
${(["material", "maker"] as const).map((rule) => `<section class="analogy"><h2>Testing the ${rule === "material" ? "material owner" : "maker"} rule</h2><table>${analogyTable(rule)}</table></section>`).join("")}
<section><h2>Scope and assumptions</h2>${craftScope.map((p) => `<p>${esc(p)}</p>`).join("")}</section>
${craftReadings.map((r) => `<section class="reading" id="reading-${r.id}"><p>Gaius · Institutes ${esc(r.ref)}</p><h2>${esc(r.title)}</h2><p lang="la" class="latin">${esc(r.latin)}</p><h3>Close English translation</h3><p>${esc(r.english)}</p><p class="small">${esc(r.note)}</p><dl>${r.words.map(([w, m, j]) => `<dt lang="la">${esc(w)}</dt><dd>${esc(m)}. ${esc(j)}</dd>`).join("")}</dl><p>Complete printed page${r.pages.length > 1 ? "s" : ""}: ${r.pages.map((p) => `<a href="#page-${p}">${p}</a>`).join(", ")}.</p></section>`).join("")}
${[162, 163]
  .map((p) => {
    const page = craftPage(p);
    return `<figure class="page" id="page-${p}"><figcaption>${esc(page.label)} · complete printed page</figcaption><img src="${embedded.get(page.path)}" alt="Complete printed page ${p}: Latin, historical English and editorial supplies"><p class="small"><a href="${page.url}">Digitized volume, this page</a>. SHA-256: ${asset(page.path).sha256}.</p></figure>`;
  })
  .join("")}
<section><h2>Editable notebook in plain text</h2><pre>${esc(json)}</pre></section><section><h2>Retained-file identities</h2><pre>${esc(JSON.stringify([...paths, ...texts.keys()].map(asset), null, 2))}</pre></section><section><h2>Licenses and source notices</h2>${[...texts].map(([p, t]) => `<h3>${esc(p)}</h3><pre>${esc(t)}</pre>`).join("")}</section></body></html>`;
}
