import { evaluateRiver, lenses, type RiverCase, riverFacts, routes } from "./core/river";
import { escapeHtml as esc } from "./drawing";
import { riverReading } from "./river-content";

export function riverSvg(c: RiverCase, id = "river"): string {
  const r = evaluateRiver(c);
  const s = r.state;
  const color = r.owner === "Aulus" ? "#276457" : r.owner === "Lucius" ? "#705181" : "#80601c";
  const description = `${routes[c.route]}. ${riverFacts(c)
    .map(([k, v]) => `${k}: ${v}.`)
    .join(" ")} ${r.reason} Schematic, not a surveyed boundary or a hydraulic simulation.`;
  const tree = (x: number, y: number, rooted: boolean, carried = false) =>
    `<g transform="translate(${x} ${y})"><path d="M0 0V-44M0-18L-19-34M0-25L17-42" fill="none" stroke="#172b43" stroke-width="3"/><path d="M-31-42Q-34-64-15-65Q-7-85 10-69Q35-71 31-48Q29-31 8-34Q-13-22-31-42Z" fill="#b1c9b9" stroke="#276457" stroke-width="1.5"/>${carried ? '<path d="M0 0Q-14 12-23 16M0 0Q7 12 25 19" fill="none" stroke="#80601c" stroke-width="2"/>' : ""}${rooted ? (carried ? '<path d="M0 0Q24 13 45 15T73 29M45 15L51 30M65 24L74 18" fill="none" stroke="#276457" stroke-width="2.5"/>' : '<path d="M0 0Q-14 12-23 16M0 0Q7 12 25 19M-8 7L-7 20M12 12L10 23" fill="none" stroke="#276457" stroke-width="2.5"/>') : carried ? "" : '<path d="M-12 2Q0 12 12 2" fill="none" stroke="#705181" stroke-width="2"/>'}</g>`;
  let focus = "";
  if (c.route === "parcel") {
    focus = `${s.arrived ? `<path d="M235 165H306V270H235" fill="#d8e5ec" stroke="#705181" stroke-dasharray="5 5"/><path d="M288 207C337 167 357 166 396 200" stroke="#526478" fill="none" stroke-width="1.5" marker-end="url(#${id}-arrow)"/>` : ""}<g><path d="${s.arrived ? "M392 175L462 165V270L391 260Z" : "M235 175L305 165V270L234 260Z"}" fill="#e3dbc8" stroke="${color}" stroke-width="3"/>${tree(s.arrived ? 426 : 268, 220, s.rooted, true)}${s.longAttached ? '<path d="M462 177L476 187M462 203L476 213M462 229L476 239M462 255L476 265" stroke="#80601c" stroke-width="3"/>' : ""}</g><text x="${s.arrived ? 427 : 268}" y="303" text-anchor="middle" font-weight="600" fill="${color}">${r.owner === "Not settled here" ? "title unresolved" : `${r.owner}’s piece`}</text>`;
  } else if (c.route === "plant") {
    focus = `${tree(s.arrived ? 472 : 240, 240, s.rooted)}${s.arrived ? '<path d="M447 247Q472 255 497 247" fill="none" stroke="#526478"/>' : ""}<text x="${s.arrived ? 472 : 240}" y="303" text-anchor="middle" font-weight="600" fill="${color}">${r.owner}’s tree</text>`;
  } else if (c.route === "silt" && s.arrived) {
    focus = `<path d="M392 175L462 165V270L391 260Z" fill="#e3dbc8" stroke="#276457" stroke-width="3"/><g fill="#80601c"><circle cx="410" cy="199" r="2"/><circle cx="432" cy="219" r="2"/><circle cx="405" cy="244" r="2"/><circle cx="443" cy="187" r="2"/><circle cx="441" cy="251" r="2"/></g><text x="427" y="303" text-anchor="middle" fill="#276457" font-weight="600">Aulus’s addition</text>`;
  } else if (c.route === "flood") {
    focus = `<rect x="477" y="146" width="116" height="128" fill="#e3dbc8" stroke="#276457" stroke-width="2" stroke-dasharray="6 4"/>${s.flooded ? '<path d="M380 117Q450 107 482 133Q580 110 614 152V278Q530 294 469 277Q428 284 384 268Z" fill="#accbdc" fill-opacity=".82"/><path d="M479 170q25-10 53 0t53 0M469 206q25-10 53 0t53 0M480 245q25-10 53 0t53 0" fill="none" stroke="#286491" stroke-width="1.5"/>' : ""}<text x="535" y="303" text-anchor="middle" font-weight="600" fill="${color}">${s.flooded ? "field under water" : "Aulus’s field"}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 390" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${esc(routes[c.route])} · ${esc(r.owner)}</title><desc id="${id}-desc">${esc(description)}</desc><defs><marker id="${id}-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#526478"/></marker></defs><rect width="700" height="390" fill="#edf2f6"/><g font-family="'Source Sans 3',sans-serif" font-size="18" fill="#172b43"><path d="M35 95H301Q324 175 307 260L316 330H35Z" fill="#dce6df"/><path d="M395 95H665V330H399Q377 240 399 170Z" fill="#dce6df"/><path d="M301 95Q324 175 307 260L316 330H399Q377 240 399 170L395 95Z" fill="#c2dae7"/><path d="M301 95Q324 175 307 260L316 330M395 95L399 170Q377 240 399 330" stroke="#286491" stroke-width="1.5" fill="none"/><text x="55" y="61" font-size="22">Lucius</text><text x="646" y="61" text-anchor="end" font-size="22">Aulus</text><text x="55" y="83" fill="#526478" font-size="16">left estate</text><text x="646" y="83" text-anchor="end" fill="#526478" font-size="16">receiving estate</text><path d="M351 117V149" stroke="#286491" stroke-width="1.5" marker-end="url(#${id}-arrow)"/>${focus}<text x="35" y="365" fill="#526478" font-size="16">Schematic · ownership is a separate fact</text></g></svg>`;
}
export function riverComparison(pinned: RiverCase, current: RiverCase): string {
  const first = riverFacts(pinned);
  const second = new Map(riverFacts(current));
  return `<caption>Pinned history and current history, at their selected points</caption><thead><tr><th scope="col">Fact or result</th><th scope="col">Pinned</th><th scope="col">Current</th></tr></thead><tbody>${first.map(([k, v]) => `<tr${v === second.get(k) ? "" : ' class="changed"'}><th scope="row">${esc(k)}</th><td>${esc(v)}</td><td>${esc(second.get(k) ?? "")}</td></tr>`).join("")}</tbody>`;
}
export function riverCsv(pinned: RiverCase | null, current: RiverCase): string {
  const cell = (s: string) => `"${s.replaceAll('"', '""')}"`;
  const rows: string[][] = [
    [
      "history",
      "investigation",
      "reading",
      "point",
      "inspected point",
      "event",
      "accepted",
      "explanation",
      "owner at point",
      "source passage",
      "scope",
    ],
  ];
  for (const [name, c] of [
    ["pinned", pinned],
    ["current", current],
  ] as const) {
    if (!c) continue;
    const steps = replayForCsv(c);
    for (let at = 0; at <= c.events.length; at++) {
      const result = evaluateRiver({ ...c, at });
      const step = steps[at - 1];
      rows.push([
        name,
        routes[c.route],
        lenses[c.lens],
        String(at),
        String(at === c.at),
        step?.event ?? "Initial facts",
        step ? String(step.accepted) : "",
        step?.reason ?? "Stipulated starting ownership",
        result.owner,
        riverReading(result.source).reference,
        "Selected source clauses; modern schematic; not a general legal decision",
      ]);
    }
  }
  return `${rows.map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;
}
function replayForCsv(c: RiverCase) {
  return evaluateRiver({ ...c, at: c.events.length }).steps;
}
