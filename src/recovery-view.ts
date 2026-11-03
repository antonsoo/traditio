import type { CraftRecord } from "./core/craft";
import {
  claimLabel,
  defenseLabel,
  type RecoveryFacts,
  recovery,
  recoveryFacts,
  recoveryPerson,
} from "./core/recovery";
import { escapeHtml as esc } from "./drawing";

export function recoveryPositions(f: RecoveryFacts): string {
  const r = recovery(f);
  return `<caption>One physical object. Distinct positions.</caption><tbody><tr><th scope="row">Physical holder</th><td>${recoveryPerson(f.holder)}</td></tr><tr><th scope="row">Reported owner</th><td>${recoveryPerson(r.title)}</td></tr><tr><th scope="row">Person seeking recovery</th><td>${recoveryPerson(r.claimant)}</td></tr><tr><th scope="row">Claim in this passage</th><td>${esc(claimLabel(r))}</td></tr><tr><th scope="row">Defense on this ground</th><td>${esc(defenseLabel(r))}</td></tr></tbody>`;
}
export function recoveryComparison(a: RecoveryFacts, b: RecoveryFacts): string {
  const first = recoveryFacts(a);
  const second = recoveryFacts(b);
  return `<caption>Pinned recovery point compared with current facts</caption><thead><tr><th scope="col">Fact or legal position</th><th scope="col">Pinned point</th><th scope="col">Current point</th></tr></thead><tbody>${first.map(([label, value], i) => `<tr${value === second[i]?.[1] ? "" : ' class="recovery-changed"'}><th scope="row">${esc(label)}</th><td>${esc(value)}</td><td>${esc(second[i]?.[1] ?? "")}</td></tr>`).join("")}</tbody>`;
}
export function recoverySheet(record: CraftRecord): string {
  const f = record.recovery;
  const r = recovery(f);
  return `<section class="recovery-sheet"><h2>The title and the recovery claim</h2><p>This is a separate experiment with Gaius 2.77–78, retained alongside the ownership proposals. The selected work is ${f.medium === "painting" ? "painting on Lucius’s board" : "writing on Lucius’s parchment"}. Aulus did the work. The claimant is the person seeking the physical object from the holder.</p><table>${recoveryPositions(f)}</table><h3>${esc(r.headline)}</h3><p>${esc(r.reason)}</p><table><caption>Current stipulated recovery facts</caption><tbody>${recoveryFacts(
    f,
  )
    .map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join(
      "",
    )}</tbody></table><p><a href="#reading-${r.source}">Read the supporting Latin and its qualification</a>.</p>${record.pinnedRecovery ? `<h3>Pinned comparison</h3><table>${recoveryComparison(record.pinnedRecovery, f)}</table>` : "<p>No earlier recovery point pinned.</p>"}<p class="small">Changing custody or paying an expense does not change the ownership rule in this model. A stated defense, the removal of its stated nonpayment ground and the result of litigation are separate questions. Utique si supplies the good-faith case; the converse for bad faith is not asserted.</p></section>`;
}
