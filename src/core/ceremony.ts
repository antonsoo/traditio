/** A rehearsal of the described sequence, not a general Roman-law validity engine. */
export type Arrangement = {
  route: "bronze" | "magistrate";
  thing: "mule" | "field";
  witnesses: 4 | 5 | 6;
  holder: "separate" | "shared";
  present: boolean;
};
export const eventIds = [
  "buyer-claim",
  "seller-claim",
  "strike",
  "give",
  "ask",
  "silence",
  "disclaim",
  "counterclaim",
  "award",
] as const;
export type Act = (typeof eventIds)[number];
export const acts: Record<Act, { actor: string; label: string }> = {
  "buyer-claim": { actor: "Aulus · acquirer", label: "Make the ownership claim" },
  "seller-claim": { actor: "Lucius · owner", label: "Make the ownership claim" },
  strike: { actor: "Aulus · acquirer", label: "Strike the balance with the bronze" },
  give: { actor: "Aulus · acquirer", label: "Give that bronze to Lucius" },
  ask: { actor: "Praetor · magistrate", label: "Ask Lucius about a counterclaim" },
  silence: { actor: "Lucius · owner", label: "Remain silent when asked" },
  disclaim: { actor: "Lucius · owner", label: "Say that you make no counterclaim" },
  counterclaim: { actor: "Lucius · owner", label: "Make a counterclaim" },
  award: { actor: "Praetor · magistrate", label: "Award the thing to Aulus" },
};
export type Rehearsal = {
  format: "traditio-ceremony";
  version: 1;
  arrangement: Arrangement;
  events: Act[];
  note: string;
};
export const initialArrangement: Arrangement = {
  route: "bronze",
  thing: "mule",
  witnesses: 4,
  holder: "separate",
  present: true,
};
export const MAX_ACTS = 40;
export const MAX_REHEARSAL_BYTES = 16_384;
export type Step = {
  act: Act;
  accepted: boolean;
  explanation: string;
  source: "assembly" | "bronze" | "presence" | "magistrate";
  stage: number;
};
export type Replay = {
  steps: Step[];
  stage: number;
  complete: boolean;
  contested: boolean;
  title: string;
  explanation: string;
};

export function arrangementGaps(a: Arrangement): { text: string; source: Step["source"] }[] {
  const gaps: { text: string; source: Step["source"] }[] = [];
  if (a.route === "bronze") {
    if (a.witnesses < 5)
      gaps.push({
        text: "Four witnesses are fewer than Gaius's required five. The separate balance holder does not supply the fifth witness.",
        source: "assembly",
      });
    if (a.holder === "shared")
      gaps.push({
        text: "The balance holder must be another person in addition to the witnesses: praeterea alio. Counting one person in both roles misses that distinction.",
        source: "assembly",
      });
  }
  if (a.thing === "mule" && !a.present)
    gaps.push({
      text:
        a.route === "bronze"
          ? "The mule must be present and grasped by the acquirer. Gaius's exception for absent land does not apply to the animal."
          : "The acquirer is described as holding the thing when making the claim: rem tenens. The absent mule does not match that scene.",
      source: a.route === "bronze" ? "presence" : "magistrate",
    });
  return gaps;
}

export function replay(record: Rehearsal): Replay {
  const a = record.arrangement;
  let stage = 0;
  let contested = false;
  const steps: Step[] = [];
  for (const act of record.events) {
    let accepted = false;
    let source: Step["source"] = a.route === "bronze" ? "bronze" : "magistrate";
    let explanation = "";
    const gaps = arrangementGaps(a);
    if (gaps.length) {
      explanation = gaps.map((g) => g.text).join(" ");
      source = gaps[0]?.source ?? source;
    } else if (contested)
      explanation =
        "A counterclaim has taken this outside the unopposed conveyance Gaius describes here. The workshop does not invent a judgment in the dispute.";
    else if (stage === (a.route === "bronze" ? 3 : 4))
      explanation =
        "The described conveyance is already complete. Repeating an act does not transfer title a second time.";
    else if (act === "seller-claim")
      explanation =
        "Gaius gives the formula to the acquirer, Aulus. The owner's statement is not a substitute for the acquirer's act.";
    else if (a.route === "bronze") {
      const expected = ["buyer-claim", "strike", "give"][stage];
      if (act === expected) {
        accepted = true;
        stage++;
        explanation =
          act === "buyer-claim"
            ? "The acquirer speaks while holding bronze. This begins the described ceremony; the words alone have not completed it."
            : act === "strike"
              ? "Deinde: then he strikes the balance with the bronze. The same bronze still has to be handed to the transferor."
              : "Idque aes dat: he gives that bronze to the transferor, quasi pretii loco, as if in place of the price. The described acts are complete under the stated assumptions.";
      } else
        explanation = `This is not the next act in 1.119. ${stage === 0 ? "The acquirer must first speak." : stage === 1 ? "After speaking, he strikes the balance with the bronze." : "After striking, he gives that bronze to the transferor."} The rehearsal has not advanced.`;
    } else {
      const expected =
        stage === 0
          ? ["buyer-claim"]
          : stage === 1
            ? ["ask"]
            : stage === 2
              ? ["silence", "disclaim", "counterclaim"]
              : ["award"];
      if (expected.includes(act)) {
        accepted = true;
        if (act === "counterclaim") {
          contested = true;
          explanation =
            "Lucius asserts a competing claim. Gaius's stated branch is denial of a counterclaim or silence. A disputed claim needs a different account; no winner is assigned here.";
        } else {
          stage++;
          explanation =
            act === "buyer-claim"
              ? "The acquirer claims the thing. The praetor has not yet questioned the transferor or awarded it."
              : act === "ask"
                ? "The praetor asks whether Lucius makes a counterclaim. A reply or silence now supplies the next condition."
                : act === "silence"
                  ? "Tacente: the transferor is silent when asked. Silence satisfies this branch, but the praetor's award still has to follow."
                  : act === "disclaim"
                    ? "Negante: Lucius denies making a counterclaim. That is not a denial of Aulus's ownership claim. The praetor must still award the thing."
                    : "Tunc ... addicit: then the praetor awards the thing to the claimant. This completes the described unopposed conveyance.";
        }
      } else
        explanation = `This action is premature or belongs to the other procedure. ${stage === 0 ? "Aulus must first make the claim." : stage === 1 ? "The praetor must question Lucius after Aulus's claim." : stage === 2 ? "Lucius must respond, or be silent, when asked." : "The praetor must now award the thing."} The rehearsal has not advanced.`;
    }
    steps.push({ act, accepted, explanation, source, stage });
  }
  const complete = !contested && stage === (a.route === "bronze" ? 3 : 4);
  return {
    steps,
    stage,
    complete,
    contested,
    title: contested ? "Dispute outside this model" : complete ? "Aulus" : "Lucius",
    explanation: contested
      ? "No judgment about the competing claim is modeled."
      : complete
        ? "Civil title passes through the completed form, on the stipulated facts. Delivery of possession is a separate question."
        : "The described formal transfer has not been completed. No year of possession is being counted here.",
  };
}
export function makeRehearsal(): Rehearsal {
  return {
    format: "traditio-ceremony",
    version: 1,
    arrangement: { ...initialArrangement },
    events: [],
    note: "",
  };
}
export function writeRehearsal(record: Rehearsal): string {
  return JSON.stringify(record, null, 2);
}
function exactKeys(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected a rehearsal object.");
  const object = value as Record<string, unknown>;
  if (Object.keys(object).length !== keys.length || keys.some((k) => !Object.hasOwn(object, k)))
    throw new Error("Missing or unrecognized rehearsal fields.");
  return object;
}
export function readRehearsal(text: string): Rehearsal {
  if (new TextEncoder().encode(text).byteLength > MAX_REHEARSAL_BYTES)
    throw new Error("This rehearsal is larger than 16 KiB.");
  const r = exactKeys(JSON.parse(text), ["format", "version", "arrangement", "events", "note"]);
  if (r.format !== "traditio-ceremony" || r.version !== 1)
    throw new Error("Expected a Traditio ceremony record, version 1.");
  const a = exactKeys(r.arrangement, ["route", "thing", "witnesses", "holder", "present"]);
  if (
    typeof a.route !== "string" ||
    !["bronze", "magistrate"].includes(a.route) ||
    typeof a.thing !== "string" ||
    !["mule", "field"].includes(a.thing) ||
    ![4, 5, 6].includes(a.witnesses as number) ||
    typeof a.holder !== "string" ||
    !["separate", "shared"].includes(a.holder) ||
    typeof a.present !== "boolean" ||
    (a.route === "magistrate" && a.thing !== "mule")
  )
    throw new Error("Unsupported ceremony arrangement.");
  if (
    !Array.isArray(r.events) ||
    r.events.length > MAX_ACTS ||
    r.events.some((e) => !eventIds.includes(e))
  )
    throw new Error("Expected at most 40 recognized acts.");
  if (typeof r.note !== "string" || r.note.length > 1000)
    throw new Error("The explanation must be at most 1,000 characters.");
  return {
    format: "traditio-ceremony",
    version: 1,
    arrangement: a as Arrangement,
    events: [...r.events] as Act[],
    note: r.note,
  };
}
