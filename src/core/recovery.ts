import type { ReadingId, Rule } from "./craft";

export type RecoveryFacts = {
  medium: "painting" | "writing";
  holder: Rule;
  paid: boolean;
  goodFaith: boolean;
};
export type RecoveryResult = {
  title: Rule;
  claimant: Rule;
  claim: "ownership" | "adapted" | "not-supplied";
  defense: "available" | "ground-removed" | "unresolved" | "not-supplied";
  source: ReadingId;
  headline: string;
  reason: string;
  expense: string;
};
export const makeRecovery = (): RecoveryFacts => ({
  medium: "painting",
  holder: "maker",
  paid: false,
  goodFaith: true,
});
export function readRecovery(value: unknown): RecoveryFacts {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid recovery facts.");
  const r = value as Record<string, unknown>;
  const expected = ["medium", "holder", "paid", "goodFaith"];
  if (Object.keys(r).length !== expected.length || expected.some((k) => !Object.hasOwn(r, k)))
    throw new Error("Recovery facts have missing or unrecognized fields.");
  if (
    (r.medium !== "painting" && r.medium !== "writing") ||
    (r.holder !== "material" && r.holder !== "maker") ||
    typeof r.paid !== "boolean" ||
    typeof r.goodFaith !== "boolean"
  )
    throw new Error(
      "Recovery facts must name the medium, holder and stated payment and good-faith conditions.",
    );
  return { medium: r.medium, holder: r.holder, paid: r.paid, goodFaith: r.goodFaith };
}
export function recovery(facts: RecoveryFacts): RecoveryResult {
  const f = readRecovery(facts);
  if (f.medium === "writing") {
    if (f.holder === "material")
      return {
        title: "material",
        claimant: "maker",
        claim: "not-supplied",
        defense: "not-supplied",
        source: "writing",
        expense: "No recovery expense assigned here",
        headline: "These clauses supply no recovery claim for the writer.",
        reason:
          "Lucius already holds the written object and 2.77 assigns him its ownership. The writer’s possible claim for fees is not decided by these selected clauses. The app does not invent it or assert that no such claim could exist.",
      };
    return {
      title: "material",
      claimant: "material",
      claim: "ownership",
      defense: f.paid ? "ground-removed" : "available",
      source: "writing-remedy",
      expense: "The expense of writing",
      headline: f.paid
        ? "The stated nonpayment ground has been removed."
        : "An owner’s recovery claim can meet a defense.",
      reason: f.paid
        ? "Lucius has paid the writing expense. The nonpayment stated in 2.77 no longer supplies this defense. This removes one ground; it does not predict a court’s complete judgment."
        : "Lucius owns the written object but Aulus holds it. If Lucius claims it without paying the writing expense, 2.77 says he can be defeated by an exceptio doli mali. This sentence gives no separate good-faith condition for that branch.",
    };
  }
  if (f.holder === "material")
    return {
      title: "maker",
      claimant: "maker",
      claim: "ownership",
      defense: f.paid ? "ground-removed" : "available",
      source: "painting-remedy",
      expense: "The value of the board",
      headline: f.paid
        ? "The board-value ground has been removed."
        : "The painter’s title does not remove the board-value defense.",
      reason: f.paid
        ? "Aulus claims the image while Lucius holds it, and has paid the value of the board. The stated nonpayment ground no longer applies. The workshop assigns no award or other grounds of defense."
        : "Aulus is the reported owner of the painted object, but Lucius holds it. Under 2.78, Lucius can defeat Aulus’s claim by a defense of fraud if Aulus does not pay the board’s value. This clause does not add the later good-faith qualification.",
    };
  if (f.paid)
    return {
      title: "maker",
      claimant: "material",
      claim: "adapted",
      defense: "ground-removed",
      source: "painting-remedy",
      expense: "The expense of painting",
      headline: "Lucius’s adapted claim remains; the stated nonpayment ground is removed.",
      reason:
        "Aulus holds the painting. Gaius says Lucius should receive an actio utilis, an adapted claim, against him. Lucius has paid the painting expense, so that stated ground for resisting recovery has been removed. Neither fact transfers title back to Lucius or determines every issue in litigation.",
    };
  if (f.goodFaith)
    return {
      title: "maker",
      claimant: "material",
      claim: "adapted",
      defense: "available",
      source: "painting-remedy",
      expense: "The expense of painting",
      headline: "A non-owner has an adapted claim; the possessor has the stated defense.",
      reason:
        "Aulus holds and, under the reported rule, owns the painting. Lucius nevertheless has the adapted claim described in 2.78. If Lucius does not pay painting expenses, Aulus can resist by an exceptio doli mali, at least where his possession is in good faith. These are distinct legal positions, not two ownership shares.",
    };
  return {
    title: "maker",
    claimant: "material",
    claim: "adapted",
    defense: "unresolved",
    source: "painting-remedy",
    expense: "The expense of painting",
    headline: "The adapted claim is stated. This qualification does not decide the defense here.",
    reason:
      "Utique si supplies the good-faith possessor’s defense. Turning that condition off does not turn the text into an express denial for every bad-faith case. The workshop leaves that converse unresolved instead of inventing a litigation result.",
  };
}
export const recoveryPerson = (p: Rule): string => (p === "material" ? "Lucius" : "Aulus");
export const claimLabel = (r: RecoveryResult): string =>
  ({
    ownership: "Claim based on reported ownership",
    adapted: "Adapted claim · actio utilis",
    "not-supplied": "Not supplied by these clauses",
  })[r.claim];
export const defenseLabel = (r: RecoveryResult): string =>
  ({
    available: "Stated defense available",
    "ground-removed": "Stated nonpayment ground removed",
    unresolved: "Not decided by this qualification",
    "not-supplied": "No recovery claim supplied here",
  })[r.defense];
export function recoveryFacts(f: RecoveryFacts): [string, string][] {
  const r = recovery(f);
  return [
    ["Work", f.medium === "painting" ? "Painting on a board" : "Writing on parchment"],
    ["Physical holder", recoveryPerson(f.holder)],
    ["Reported owner", recoveryPerson(r.title)],
    ["Person seeking recovery", recoveryPerson(r.claimant)],
    ["Reported claim", claimLabel(r)],
    ["Relevant expense", r.expense],
    [
      "Expense paid",
      r.claim === "not-supplied"
        ? "Not a condition in this selected branch"
        : f.paid
          ? "Yes"
          : "No",
    ],
    [
      "Painter’s possession stipulated in good faith",
      f.medium === "painting" && f.holder === "maker" && !f.paid
        ? f.goodFaith
          ? "Yes"
          : "No"
        : "Not a condition in this selected branch",
    ],
    ["Defense on this ground", defenseLabel(r)],
  ];
}
