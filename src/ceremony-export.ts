import { asset, dataUrl, verifiedBytes } from "./assets";
import { ceremonyReadings, ceremonyScope } from "./ceremony-content";
import { ceremonySvg } from "./ceremony-drawing";
import { acts, type Rehearsal, replay, writeRehearsal } from "./core/ceremony";
import { escapeHtml as esc } from "./drawing";
export async function ceremonySheet(
  record: Rehearsal,
  progress: (message: string) => void,
  signal: AbortSignal,
): Promise<string> {
  const files = [74, 75, 134, 135].map((p) => asset(`sources/poste-1904-p${p}.jpg`));
  files.push(asset("fonts/literata.woff2"), asset("fonts/sourcesans3.woff2"));
  const embedded = new Map<string, string>();
  for (const file of files) {
    signal.throwIfAborted();
    embedded.set(file.path, await dataUrl(file, signal));
    progress(
      `Preparing rehearsal: ${embedded.size} of ${files.length} source pages and fonts checked.`,
    );
  }
  const texts = new Map<string, string>();
  for (const path of [
    "LICENSE.txt",
    "sources/NOTICE.txt",
    "fonts/literata-OFL.txt",
    "fonts/sourcesans3-OFL.txt",
  ])
    texts.set(path, new TextDecoder().decode(await verifiedBytes(asset(path), signal)));
  signal.throwIfAborted();
  const a = record.arrangement;
  const result = replay(record);
  const json = writeRehearsal(record);
  const facts = [
    ["Procedure", a.route === "bronze" ? "Mancipation" : "Surrender before the magistrate"],
    ["Thing", a.thing === "mule" ? "Trained mule" : "Italian field"],
    ["Present / grasped", a.present ? "Yes" : "No"],
    ...(a.route === "bronze"
      ? [
          ["Witnesses", String(a.witnesses)],
          [
            "Balance holder",
            a.holder === "separate" ? "Another person" : "One of the counted witnesses",
          ],
        ]
      : []),
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none';img-src data:;font-src data:;style-src 'unsafe-inline';base-uri 'none';form-action 'none'"><title>Traditio — retained ceremony rehearsal</title><style>
  @font-face{font-family:Literata;src:url('${embedded.get("fonts/literata.woff2")}')}@font-face{font-family:'Source Sans 3';src:url('${embedded.get("fonts/sourcesans3.woff2")}')}*{box-sizing:border-box}body{overflow-wrap:anywhere;font:18px/1.6 'Source Sans 3',sans-serif;color:#172b43;background:#fcfdff;max-width:1000px;margin:auto;padding:36px}h1,h2,.latin{font-family:Literata,serif}h1{font-size:2.8rem;line-height:1.2}h2{font-size:1.6rem}section{margin:2rem 0}svg{width:100%;max-width:620px;height:auto;display:block;background:#edf2f6}table{border-collapse:collapse;width:100%}th,td{padding:.5rem;border-bottom:1px solid #c8d3df;text-align:left;vertical-align:top}dt{font-weight:650}dd{margin:0 0 1rem}.latin{line-height:1.85}.note{font-size:.9rem;color:#526478}pre,.learner-note{white-space:pre-wrap;overflow-wrap:anywhere}pre{font-size:.75rem}a{color:#286491}.page{margin:2rem 0}.page img{max-width:100%;height:auto}li{margin:.6rem 0}@media(max-width:600px){body{padding:18px}h1{font-size:2.1rem}th,td{padding:.3rem;overflow-wrap:anywhere}}@media print{@page{size:A4;margin:15mm}body{font-size:11pt;padding:0}h1{font-size:28pt}h2{font-size:18pt}h1,h2,h3{break-after:avoid}p,li{orphans:3;widows:3}svg{max-height:100mm}.page{break-before:page;break-inside:avoid}.page img{display:block;width:auto;max-width:100%;max-height:235mm;margin:auto}.reading{break-before:page}tr{break-inside:avoid}pre{font-size:8pt}}
  </style></head><body><header><p>Traditio · Anthony Mercer</p><h1>Who speaks? Who transfers?</h1><p>A retained rehearsal of Gaius's formal conveyances.</p><a href="data:application/json;charset=utf-8,${encodeURIComponent(json)}" download="traditio-ceremony.json">Download the editable rehearsal</a><p class="note">This document contains its source pages, fonts and licenses. It needs no script or network connection to read. Use Print to save a PDF. It is a reading experiment under stated assumptions, not a legal certificate.</p></header>
  <section><h2>The arrangement</h2><table><caption>Facts at the start of this rehearsal</caption><tbody>${facts.map(([k, v]) => `<tr><th scope="row">${esc(k ?? "")}</th><td>${esc(v ?? "")}</td></tr>`).join("")}</tbody></table>${ceremonySvg(record)}<h3>Civil title: ${esc(result.title)}</h3><p>${esc(result.explanation)}</p><p class="note">Possession is not assigned by the ceremony diagram.</p></section>
  <section><h2>Every attempt, in order</h2>${result.steps.length ? `<ol>${result.steps.map((s) => `<li><strong>${esc(acts[s.act].actor)}: ${esc(acts[s.act].label)} — ${s.accepted ? "entered in the sequence" : "did not advance"}</strong><p>${esc(s.explanation)} <a href="#reading-${s.source}">Read the passage</a>.</p></li>`).join("")}</ol>` : "<p>No acts attempted.</p>"}</section><section><h2>Your explanation</h2><p class="learner-note">${esc(record.note || "No explanation added.")}</p><p class="note">Retained as written, not graded. The arrangement and attempts were captured when you requested this document; the result was recomputed from those facts.</p></section>
  <section><h2>Scope</h2>${ceremonyScope.map((s) => `<p>${esc(s)}</p>`).join("")}</section>
  ${ceremonyReadings.map((r) => `<section class="reading" id="reading-${r.id}"><p>Gaius ${esc(r.reference)}</p><h2>${esc(r.title)}</h2><p class="latin" lang="la">${esc(r.latin)}</p><h3>Close English translation</h3><p>${esc(r.english)}</p><p class="note">${esc(r.note)}</p><dl>${r.words.map(([word, meaning, job]) => `<dt lang="la">${esc(word)}</dt><dd>${esc(meaning)}. ${esc(job)}</dd>`).join("")}</dl><p>Printed pages: ${r.pages.map((p) => `<a href="#page-${p}">${p}</a>`).join(", ")}.</p></section>`).join("")}
  <section><h2>Edition</h2><p>Gaius, Institutes. Latin with Edward Poste's translation and commentary, fourth edition revised by E. A. Whittuck, Oxford: Clarendon Press, 1904. These are complete pages from a modern printed edition, not an ancient manuscript facsimile. English translations in the readings are new for this lesson; the scans preserve Poste's English. Latin joins line breaks and prints consonantal u as v. […] marks our omissions; ⟨…⟩ marks editorial supply.</p><a href="https://archive.org/details/gaiinstitutiones00gaiuuoft">Digitized volume</a></section>
  ${[74, 75, 134, 135].map((p) => `<figure class="page" id="page-${p}"><figcaption>Complete printed page ${p} · Poste–Whittuck, 1904</figcaption><img alt="Complete printed page ${p} of the 1904 Gaius edition" src="${embedded.get(`sources/poste-1904-p${p}.jpg`)}"></figure>`).join("")}
  <section><h2>Editable rehearsal in plain text</h2><pre>${esc(json)}</pre></section><section><h2>Retained file identities</h2><pre>${esc(JSON.stringify([...files, ...[...texts.keys()].map(asset)], null, 2))}</pre></section><section><h2>Licenses and source notice</h2>${[...texts].map(([path, text]) => `<h3>${esc(path)}</h3><pre>${esc(text)}</pre>`).join("")}</section></body></html>`;
}
