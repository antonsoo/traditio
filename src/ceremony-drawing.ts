import { type Rehearsal, replay } from "./core/ceremony";
import { escapeHtml as esc } from "./drawing";
export function ceremonySvg(record: Rehearsal): string {
  const a = record.arrangement;
  const result = replay(record);
  const bronze = a.route === "bronze";
  const witnesses = Array.from(
    { length: a.witnesses },
    (_, i) =>
      `<circle cx="${45 + i * 40}" cy="48" r="10" fill="none" stroke="#172b43" stroke-width="2"/>`,
  ).join("");
  const title = bronze
    ? `${a.witnesses} witnesses; ${a.holder === "separate" ? "one additional" : "a shared"} balance holder`
    : "Acquirer, owner and praetor";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 305" role="img" aria-labelledby="ceremony-svg-title ceremony-svg-desc"><title id="ceremony-svg-title">${esc(title)}</title><desc id="ceremony-svg-desc">${esc(`${a.thing === "mule" ? "Trained mule" : "Italian field"} ${a.present ? "present" : "absent"}. Civil title: ${result.title}. ${result.explanation}`)}</desc><style>text{font-family:'Source Sans 3',sans-serif;fill:#172b43;font-size:28px}.label{font-size:26px}.name{font-size:32px;font-weight:600}.accent{fill:#705181}.rule{stroke:#9cadbf;stroke-width:2;fill:none}</style>
  ${bronze ? `${witnesses}<text x="30" y="88">${a.witnesses} witnesses</text><path class="rule" d="M390 20v65m-20 0h40m-65-52h90m-90 0v24m90-24v24m-104 0h28q-14 22-28 0m90 0h28q-14 22-28 0"/><text class="label" x="310" y="113">${a.holder === "separate" ? "Another person" : "One witness reused"}</text><text class="label" x="330" y="141">libripens</text>` : `<text class="name" x="270" y="48" text-anchor="middle">Praetor</text><text class="label" x="270" y="75" text-anchor="middle">asks · then awards</text><path class="rule" d="M235 90 100 135m205-45 135 45"/>`}
  <path class="rule" d="M30 155h480"/><text class="name" x="30" y="188">Aulus</text><text class="label" x="30" y="215">acquirer</text><text class="name" x="510" y="188" text-anchor="end">Lucius</text><text class="label" x="510" y="215" text-anchor="end">transferor</text>
  ${bronze ? `<circle cx="${result.complete ? 460 : 80}" cy="245" r="11" fill="#a68039" stroke="#70521d"/><text class="label" x="270" y="250" text-anchor="middle">${result.complete ? "bronze given to Lucius" : "bronze held by Aulus"}</text>` : `<text class="label accent" x="270" y="250" text-anchor="middle">${result.contested ? "Competing claim: no judgment" : result.complete ? "Award made" : result.stage === 3 ? "No counterclaim; award still needed" : "No award yet"}</text>`}
  <text class="label" x="270" y="292" text-anchor="middle">${a.thing === "mule" ? "Mule" : "Italian field"} · ${a.present ? "present" : "absent"}</text></svg>`;
}
