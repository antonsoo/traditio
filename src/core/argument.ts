import { type Case, evaluate, type RuleId } from "./model";

export const claimIds = ["delivery-title", "faith-and-time", "knowing-seller"] as const;
export type ClaimId = (typeof claimIds)[number];
export type ArgumentDraft = {
  claim: ClaimId;
  witness: Case | null;
  citations: RuleId[];
  note: string;
};
export const MAX_NOTE_LENGTH = 1_000;
type SourceRequirement = { label: string; anyOf: RuleId[] };
export type Claim = {
  id: ClaimId;
  label: string;
  statement: string;
  premise: string;
  sources: SourceRequirement[];
};

// These are hypotheses to refute, not statements of Gaius's doctrine.
export const claims: Claim[] = [
  {
    id: "delivery-title",
    label: "Delivery always passes title",
    statement: "Whenever an owner sells and delivers a thing, civil title passes at once.",
    premise: "Use the owner's sale in The missing formality. Inspect receipt itself: year 0.",
    sources: [{ label: "The distinction between civil title and in bonis", anyOf: ["division"] }],
  },
  {
    id: "faith-and-time",
    label: "Good faith and time are enough",
    statement:
      "An innocent buyer from a non-owner becomes civil owner once the stated possession period is complete.",
    premise:
      "Use a non-owner's sale, a buyer in good faith at receipt, and at least the stated period: one year for the cup or two for Italian land.",
    sources: [
      { label: "The stated possession period", anyOf: ["time"] },
      { label: "A barrier that survives the buyer's good faith", anyOf: ["taint", "innocent"] },
    ],
  },
  {
    id: "knowing-seller",
    label: "A knowing seller bars the buyer",
    statement:
      "If the seller knows a thing belongs to someone else, no later buyer can acquire it by usucapion.",
    premise:
      "The seller must know he is not the owner. Test whether the later buyer nevertheless acquires title in the submitted case.",
    sources: [
      { label: "The stated possession period", anyOf: ["time"] },
      { label: "The knowing occupier and the innocent later buyer", anyOf: ["land"] },
    ],
  },
];

export function claimFor(id: ClaimId): Claim {
  const found = claims.find((item) => item.id === id);
  if (!found) throw new Error("Unknown argument claim.");
  return found;
}

export function copyArgument(input: ArgumentDraft | null): ArgumentDraft | null {
  return input
    ? {
        ...input,
        witness: input.witness ? { ...input.witness } : null,
        citations: [...input.citations],
      }
    : null;
}

export type Assessment = {
  kind: "counterexample" | "not-counterexample" | "premise-not-met" | "outside";
  headline: string;
  explanation: string;
};

export function assessClaim(claim: ClaimId, witness: Case): Assessment {
  const result = evaluate(witness);
  if (result.kind === "outside") {
    return {
      kind: "outside",
      headline: "Outside this argument's model.",
      explanation:
        "Gaius excludes provincial land from this usucapion. This workshop does not assign its private title, so it cannot use that unresolved title as a counterexample. Read 2.46 for the boundary.",
    };
  }
  const premise = (explanation: string): Assessment => ({
    kind: "premise-not-met",
    headline: "The case does not meet the claim's premises.",
    explanation,
  });
  if (claim === "delivery-title") {
    if (witness.lesson !== "delivery")
      return premise(
        "The claim starts with a sale by the owner. Marcus is not the owner in this investigation.",
      );
    if (witness.years !== 0)
      return premise(
        "The claim concerns title at receipt. Submit year 0 to inspect that moment, before any usucapion.",
      );
  } else if (claim === "faith-and-time") {
    if (witness.lesson === "delivery")
      return premise(
        "The claim concerns purchase from a non-owner. Lucius is the owner in this investigation.",
      );
    if (witness.belief !== "good")
      return premise(
        "The claim assumes an innocent buyer. Aulus knows the seller is not the owner here; his failure to acquire would not refute a claim about good-faith buyers.",
      );
    if (witness.years < result.threshold)
      return premise(
        `The claim assumes the stated possession period is complete. This case has ${witness.years} completed ${witness.years === 1 ? "year" : "years"}; it needs ${result.threshold}. An unfinished period cannot refute that claim.`,
      );
  } else {
    if (witness.lesson === "delivery")
      return premise(
        "The claim concerns a seller who knows he is not the owner. Lucius owns the thing here.",
      );
    if (witness.lesson === "good-faith" && witness.seller === "heir")
      return premise(
        "The heir honestly believes the cup is his. His sale cannot refute a claim about a seller who knows he is not the owner.",
      );
  }
  const refuted = claim === "knowing-seller" ? result.title === "Aulus" : result.title === "Lucius";
  return refuted
    ? {
        kind: "counterexample",
        headline: "A counterexample within this model.",
        explanation:
          claim === "delivery-title"
            ? "The owner has sold and delivered the thing, yet Lucius still has civil title at receipt. Aulus's in bonis position is not the civil title promised by the claim."
            : claim === "faith-and-time"
              ? "Aulus is in good faith and has completed the stated period, yet Lucius still holds civil title. The thing's history defeats the claim's promised result."
              : "Marcus knew the land was not his, yet Aulus acquires civil title in the submitted case. The first taker's knowledge and the later buyer's good faith do different work.",
      }
    : {
        kind: "not-counterexample",
        headline: "This case does not refute the claim.",
        explanation:
          claim === "knowing-seller"
            ? "Aulus has not acquired title in these facts. That is consistent with the claim, but one unsuccessful buyer cannot prove that every buyer must fail. Try changing a fact."
            : "Aulus does acquire title in these facts, as the claim predicts. One agreeing case cannot establish an 'always' claim. Try changing a fact while preserving its premises.",
      };
}

export function assessCitations(draft: ArgumentDraft): {
  complete: boolean;
  missing: SourceRequirement[];
} {
  const missing = claimFor(draft.claim).sources.filter(
    (group) => !group.anyOf.some((id) => draft.citations.includes(id)),
  );
  return { complete: missing.length === 0, missing };
}
