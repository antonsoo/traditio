import { makeRecovery, type RecoveryFacts, readRecovery } from "./recovery";

export const craftIds = ["vessel", "wine", "chest", "writing", "painting", "repair"] as const;
export type CraftId = (typeof craftIds)[number];
export const rules = ["material", "maker"] as const;
export type Rule = (typeof rules)[number];
export type Judgment = Rule | "disputed" | "unresolved";
export type ReadingId =
  | "writing"
  | "writing-remedy"
  | "painting"
  | "painting-remedy"
  | "question"
  | "schools"
  | "theft";
export type Craft = {
  id: CraftId;
  title: string;
  before: string;
  after: string;
  story: string;
  kind: "split" | "settled" | "outside";
  owner: Rule | null;
  source: ReadingId;
  reason: string;
};
export const crafts: Craft[] = [
  {
    id: "vessel",
    title: "Gold into a vessel",
    before: "Lucius’s gold",
    after: "Aulus’s work: a vessel",
    story:
      "Lucius owns all the gold. Aulus makes a vessel from it on his own account. There is no agreed transfer of the gold and no contract to make it for Lucius.",
    kind: "split",
    owner: null,
    source: "schools",
    reason:
      "2.79 expressly includes a vessel made from another’s gold or silver. Sabinus and Cassius favor the material owner; the opposing school favors the maker. These are competing answers about the same object.",
  },
  {
    id: "wine",
    title: "Grapes into wine",
    before: "Lucius’s grapes",
    after: "Aulus’s work: wine",
    story:
      "Lucius owns all the grapes. Aulus makes wine from them on his own account. There is no agreed transfer or contract of manufacture.",
    kind: "split",
    owner: null,
    source: "question",
    reason:
      "Wine from another’s grapes opens the question in 2.79. The two reported positions give different owners. This paragraph does not choose between them by asking whether wine can become grapes again.",
  },
  {
    id: "chest",
    title: "Boards into a chest",
    before: "Lucius’s boards",
    after: "Aulus’s work: a chest",
    story:
      "Lucius owns all the boards. Aulus constructs a chest from them on his own account. There is no agreed transfer or contract of manufacture.",
    kind: "split",
    owner: null,
    source: "question",
    reason:
      "The armarium in 2.79 can mean a cupboard or chest. It is one of the expressly listed examples. The workshop’s chest drawing is illustrative, not an archaeological reconstruction.",
  },
  {
    id: "writing",
    title: "Writing on parchment",
    before: "Lucius’s parchment",
    after: "Aulus’s writing on it",
    story:
      "Lucius owns the parchment. Aulus writes on it, even in gold letters. No transfer of the parchment is agreed. The question concerns the physical written object, not copyright.",
    kind: "settled",
    owner: "material",
    source: "writing",
    reason:
      "2.77 reports that the letters follow the paper or parchment, even if they are gold. The written object belongs to the support’s owner. The following sentence separately qualifies recovery without payment of writing expenses.",
  },
  {
    id: "painting",
    title: "Painting on a board",
    before: "Lucius’s board",
    after: "Aulus’s painting on it",
    story:
      "Lucius owns the board. Aulus paints an image on it. No transfer of the board is agreed. The question concerns the physical painted object, not copyright.",
    kind: "settled",
    owner: "maker",
    source: "painting",
    reason:
      "2.78 reports the opposite rule: the board follows the painting. Gaius says scarcely an adequate reason is given for the difference. He then separates ownership from the remedies and expenses when either party holds the object.",
  },
  {
    id: "repair",
    title: "Repairing a cracked vessel",
    before: "Lucius’s cracked vessel",
    after: "Aulus’s repair of it",
    story:
      "Lucius owns a cracked vessel. Aulus repairs the crack. This is a new analogy proposed by the workshop, not an example decided in the selected paragraphs.",
    kind: "outside",
    owner: null,
    source: "question",
    reason:
      "2.77–79 do not decide this repair. Treating every alteration as the making described in 2.79 would add a premise. Neither drawing a changed object nor selecting a rule establishes that legal classification.",
  },
];
export function craft(id: CraftId): Craft {
  const found = crafts.find((c) => c.id === id);
  if (!found) throw new Error("Unknown craft.");
  return found;
}
export const person = (rule: Rule): string =>
  rule === "material" ? "Lucius · material owner" : "Aulus · maker";
export const judgmentLabel = (j: Judgment): string =>
  ({
    material: "Lucius owns it",
    maker: "Aulus owns it",
    disputed: "The source reports rival answers",
    unresolved: "These passages do not decide",
  })[j];
export function outcome(id: CraftId): Judgment {
  const c = craft(id);
  return c.kind === "split" ? "disputed" : (c.owner ?? "unresolved");
}
export function assess(id: CraftId, j: Judgment): string {
  const c = craft(id);
  if (j === outcome(id))
    return c.kind === "split"
      ? "You kept the disagreement. The text reports two competing answers, rather than one owner with two shares."
      : c.kind === "outside"
        ? "You kept the boundary. The selected passages do not decide this repair."
        : "Your proposed owner agrees with the reported ownership rule. Recovery and payment are separate questions.";
  if (c.kind === "split" && (j === "material" || j === "maker"))
    return `Your answer matches ${j === "material" ? "Sabinus and Cassius" : "the opposing school"}, but leaves out the rival answer. This source does not settle on a single owner.`;
  if (c.kind === "outside")
    return "Your proposal goes beyond these passages. It may be an argument by analogy; it is not an outcome supplied by this text.";
  return c.kind === "split"
    ? "The passage supplies rival answers. That is more specific than silence about this example."
    : "The selected passage reports an ownership rule for this case. Compare your proposal with its direction of cedere.";
}
export function testRule(id: CraftId, rule: Rule): { label: string; reason: string } {
  const c = craft(id);
  if (c.kind === "outside")
    return {
      label: "Outside these passages",
      reason: "An analogy requires an additional legal classification.",
    };
  if (c.kind === "split")
    return {
      label: "One reported view",
      reason:
        "Compatible with one side of the dispute; no settled result here verifies the general rule.",
    };
  return c.owner === rule
    ? { label: "Agrees here", reason: "One agreeing example cannot establish an always claim." }
    : {
        label: "Counterexample",
        reason: `The reported rule gives the object to ${person(c.owner as Rule)}, rather than the owner your rule predicts.`,
      };
}
export type Trial = {
  craft: CraftId;
  judgment: Judgment;
  explanation: string;
  citations: ReadingId[];
};
export type CraftRecord = {
  format: "traditio-craft";
  version: 2;
  current: CraftId;
  rule: Rule;
  trials: Trial[];
  drafts: Trial[];
  note: string;
  recovery: RecoveryFacts;
  pinnedRecovery: RecoveryFacts | null;
};
export const MAX_BYTES = 65_536;
export const MAX_TRIALS = 12;
export function makeCraftRecord(): CraftRecord {
  return {
    format: "traditio-craft",
    version: 2,
    current: "vessel",
    rule: "material",
    trials: [],
    drafts: craftIds.map((id) => ({
      craft: id,
      judgment: "material",
      explanation: "",
      citations: [],
    })),
    note: "",
    recovery: makeRecovery(),
    pinnedRecovery: null,
  };
}
export const readingIds: ReadingId[] = [
  "writing",
  "writing-remedy",
  "painting",
  "painting-remedy",
  "question",
  "schools",
  "theft",
];
const judgments: Judgment[] = ["material", "maker", "disputed", "unresolved"];
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a craft record object.");
  return value as Record<string, unknown>;
}
function member<T extends string>(value: unknown, values: readonly T[]): T {
  if (typeof value !== "string" || !values.includes(value as T))
    throw new Error("Unrecognized case, rule, judgment or citation.");
  return value as T;
}
function boundedText(value: unknown, max: number): string {
  if (typeof value !== "string" || value.length > max)
    throw new Error(`Text must be no longer than ${max} characters.`);
  return value;
}
export function readCraft(text: string): CraftRecord {
  if (new TextEncoder().encode(text).length > MAX_BYTES)
    throw new Error("The craft record exceeds 64 KiB.");
  const raw = object(JSON.parse(text));
  if (raw.format !== "traditio-craft" || (raw.version !== 1 && raw.version !== 2))
    throw new Error("This is not a supported Traditio craft record.");
  if (!Array.isArray(raw.trials) || raw.trials.length > MAX_TRIALS)
    throw new Error("A record can keep up to twelve judgments.");
  function readTrial(value: unknown): Trial {
    const t = object(value);
    if (!Array.isArray(t.citations) || t.citations.length > readingIds.length)
      throw new Error("Invalid citations.");
    const citations = t.citations.map((c) => member(c, readingIds));
    if (new Set(citations).size !== citations.length) throw new Error("Repeated citation.");
    return {
      craft: member(t.craft, craftIds),
      judgment: member(t.judgment, judgments),
      explanation: boundedText(t.explanation, 800),
      citations,
    };
  }
  if (!Array.isArray(raw.drafts) || raw.drafts.length !== craftIds.length)
    throw new Error("The record must retain one draft for each craft.");
  const drafts = raw.drafts.map(readTrial);
  if (new Set(drafts.map((d) => d.craft)).size !== craftIds.length)
    throw new Error("Repeated craft draft.");
  return {
    format: "traditio-craft",
    version: 2,
    current: member(raw.current, craftIds),
    rule: member(raw.rule, rules),
    note: boundedText(raw.note, 1500),
    trials: raw.trials.map(readTrial),
    drafts,
    recovery: raw.version === 1 ? makeRecovery() : readRecovery(raw.recovery),
    pinnedRecovery:
      raw.version === 1 || raw.pinnedRecovery === null ? null : readRecovery(raw.pinnedRecovery),
  };
}
export function writeCraft(record: CraftRecord): string {
  return JSON.stringify(readCraft(JSON.stringify(record)), null, 2);
}
export function keepTrial(record: CraftRecord, trial: Trial): CraftRecord {
  if (record.trials.length >= MAX_TRIALS)
    throw new Error("Twelve judgments are kept. Save the notebook before starting a new one.");
  return readCraft(JSON.stringify({ ...record, trials: [...record.trials, trial] }));
}
