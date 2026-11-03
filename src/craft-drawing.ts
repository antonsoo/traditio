import { type CraftId, craft, person, testRule } from "./core/craft";
import { escapeHtml as esc } from "./drawing";
export function craftSvg(id: CraftId, prefix = "craft", compact = false): string {
  const c = craft(id);
  const material =
    id === "vessel"
      ? '<path d="M90 170l35-20 65 14v36l-35 15-65-14z" fill="#d8b65e"/><path d="M90 170l65 13 35-19m-35 19v32" fill="none"/>'
      : id === "wine"
        ? '<g fill="#a494b9"><circle cx="125" cy="169" r="15"/><circle cx="150" cy="169" r="15"/><circle cx="175" cy="169" r="15"/><circle cx="137" cy="192" r="15"/><circle cx="163" cy="192" r="15"/><circle cx="150" cy="215" r="15"/></g><path d="M150 153v-22h22" fill="none"/>'
        : id === "chest"
          ? '<g fill="#b4a0c2"><path d="M80 170h135v17H80zM80 194h135v17H80zM80 218h135v17H80z"/></g>'
          : id === "repair"
            ? '<path d="M104 155h90l-12 80h-65z" fill="#b4a0c2"/><path d="M150 155l-10 23 18 17-10 40" fill="none" stroke="#172b43" stroke-width="4"/>'
            : '<path d="M88 150q60 10 125 0v92q-60-10-125 0z" fill="#b4a0c2"/>';
  const made =
    id === "vessel"
      ? '<path d="M425 150h100l-13 66q-5 20-37 20t-37-20z" fill="#d8b65e"/><ellipse cx="475" cy="150" rx="50" ry="10" fill="#8b6922"/><path d="M525 164q52 0 27 42l-37 8" fill="none" stroke="#d8b65e" stroke-width="9"/>'
      : id === "wine"
        ? '<path d="M459 140h33v25l20 31v51h-74v-51l21-31z" fill="#a494b9"/><path d="M439 207h72v39h-72z" fill="#705181"/>'
        : id === "chest"
          ? '<path d="M414 179l37-27 102 20v65l-37 19-102-23z" fill="#b4a0c2"/><path d="M414 179l102 21 37-28m-37 28v56m-102-65l102 21 37-28" fill="none"/><path d="M506 213h18v18h-18z" fill="#d8b65e"/>'
          : id === "repair"
            ? '<path d="M429 155h90l-12 80h-65z" fill="#b4a0c2"/><path d="M475 155l-10 23 18 17-10 40" fill="none" stroke="#b58b31" stroke-width="7"/>'
            : id === "writing"
              ? '<path d="M412 145q60 10 125 0v103q-60-10-125 0z" fill="#b4a0c2"/><text x="430" y="182" fill="#f9e7a5" stroke="none" font-family="serif" font-size="19">ARMA</text><path d="M430 200h88m-88 14h70m-70 14h83" stroke="#f9e7a5" stroke-width="3"/>'
              : '<path d="M412 145h125v103H412z" fill="#b4a0c2"/><path d="M420 153h109v86H420z" fill="#dfeae7"/><circle cx="475" cy="179" r="14" fill="#276457"/><path d="M447 229q0-35 28-35t28 35" fill="#276457"/>';
  const scene = compact
    ? `<g transform="translate(25 -70)">${material}</g><g transform="translate(-300 135)">${made}</g><path d="M180 185v45m-9-12 9 12 9-12" fill="none"/>`
    : `${material}${made}<path d="M260 191h98m-15-10 15 10-15 10" fill="none"/>`;
  const labels = compact
    ? `<text x="24" y="36">${esc(c.before)}</text><text x="24" y="258">${esc(c.after)}</text><text x="200" y="213" font-size="15">work</text>`
    : `<text x="40" y="49">${esc(c.before)}</text><text x="365" y="49">${esc(c.after)}</text><text x="282" y="170" font-size="14">work</text>`;
  return `<svg class="craft-${compact ? "compact" : "wide"}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${compact ? "360 430" : "660 315"}" role="img" aria-labelledby="${prefix}-title ${prefix}-desc"><title id="${prefix}-title">${esc(c.title)}</title><desc id="${prefix}-desc">${esc(c.story)} ${compact ? "Above" : "Left"}: ${esc(c.before)}. ${compact ? "Below" : "Right"}: ${esc(c.after)}. The arrow shows physical work, not a transfer of legal title. Shapes are modern explanatory diagrams.</desc><rect width="100%" height="100%" fill="#172b43"/><g stroke="#d7e1ec" stroke-width="1.5" stroke-linejoin="round">${scene}</g><g fill="#fff" font-family="sans-serif" font-size="17">${labels}</g>${compact ? "" : '<path d="M40 70h205m120 0h255" stroke="#9e8caf" stroke-width="3"/><text x="40" y="287" fill="#d7e1ec" font-family="sans-serif" font-size="14">Physical change. Ownership is the question below.</text>'}</svg>`;
}
export function responsiveCraftSvg(id: CraftId, prefix = "craft"): string {
  return craftSvg(id, `${prefix}-wide`) + craftSvg(id, `${prefix}-compact`, true);
}
export function analogyTable(rule: "material" | "maker"): string {
  return `<caption>Proposed rule: the ${rule === "material" ? "material owner" : "maker"} always owns the result</caption><thead><tr><th scope="col">Case</th><th scope="col">Your rule predicts</th><th scope="col">Test against these passages</th></tr></thead><tbody>${[
    "vessel",
    "wine",
    "chest",
    "writing",
    "painting",
    "repair",
  ]
    .map((id) => {
      const c = craft(id as CraftId);
      const result = testRule(c.id, rule);
      return `<tr${result.label === "Counterexample" ? ' class="counterexample"' : ""}><th scope="row">${esc(c.title)}</th><td>${esc(person(rule))}</td><td><strong>${esc(result.label)}</strong><br/>${esc(result.reason)}</td></tr>`;
    })
    .join("")}</tbody>`;
}
