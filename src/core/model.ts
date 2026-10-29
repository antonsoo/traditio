/** A bounded reading of Gaius 2.19–22, 2.40–51. No modern-law inference. */
export type Years = 0 | 1 | 2 | 3;
export type Belief = "good" | "bad";
export type DeliveryCase = {
  lesson: "delivery";
  thing: "cup" | "mule" | "field";
  form: "delivery" | "mancipation";
  years: Years;
};
export type GoodFaithCase = {
  lesson: "good-faith";
  seller: "heir" | "thief";
  belief: Belief;
  years: Years;
};
export type LandCase = {
  lesson: "land";
  entry: "peaceful" | "violent";
  location: "italy" | "province";
  belief: Belief;
  years: Years;
};
export type Case = DeliveryCase | GoodFaithCase | LandCase;
export type Lesson = Case["lesson"];
export const ruleIds = [
  "classification",
  "delivery",
  "form",
  "division",
  "time",
  "belief",
  "taint",
  "province",
  "innocent",
  "heir",
  "land",
] as const;
export type RuleId = (typeof ruleIds)[number];
export type Condition = {
  label: string;
  state: "met" | "blocked" | "waiting" | "outside";
  explanation: string;
  rule: RuleId;
};
export type Outcome = {
  kind: "full" | "divided" | "waiting" | "blocked" | "outside";
  title: "Aulus" | "Lucius" | "Outside this model";
  possession: "Aulus";
  bonitary: "Aulus" | "United with title" | "Not the 2.41 route" | "Outside this model";
  threshold: 1 | 2;
  headline: string;
  explanation: string;
  conditions: Condition[];
  focus: RuleId;
};

export const defaults: Record<Lesson, Case> = {
  delivery: { lesson: "delivery", thing: "mule", form: "delivery", years: 0 },
  "good-faith": { lesson: "good-faith", seller: "heir", belief: "good", years: 1 },
  land: { lesson: "land", entry: "peaceful", location: "italy", belief: "good", years: 1 },
};

export const lessonNames: Record<Lesson, string> = {
  delivery: "The missing formality",
  "good-faith": "The innocent buyer",
  land: "The empty field",
};

export function thingOf(input: Case): "cup" | "mule" | "field" {
  return input.lesson === "delivery" ? input.thing : input.lesson === "land" ? "field" : "cup";
}

export function thingName(input: Case): string {
  const thing = thingOf(input);
  return thing === "cup" ? "silver cup" : thing === "mule" ? "trained mule" : "field";
}

export function facts(input: Case): [string, string][] {
  const time = `${input.years} completed ${input.years === 1 ? "year" : "years"}`;
  if (input.lesson === "delivery") {
    return [
      ["Thing", input.thing === "field" ? "Field in Italy" : thingName(input)],
      ["Seller", "Lucius, the owner"],
      [
        "Conveyance",
        input.form === "delivery" ? "Delivery alone" : "Valid mancipation and delivery",
      ],
      ["Time held", time],
    ];
  }
  if (input.lesson === "good-faith") {
    return [
      ["Thing", "Silver cup belonging to Lucius"],
      ["Seller", input.seller === "heir" ? "Marcus, an honestly mistaken heir" : "Marcus, a thief"],
      [
        "Buyer at receipt",
        input.belief === "good" ? "Believes Marcus owns it" : "Knows Marcus does not own it",
      ],
      ["Conveyance", "Sale and delivery"],
      ["Time held", time],
    ];
  }
  return [
    ["Thing", input.location === "italy" ? "Field in Italy" : "Provincial field"],
    [
      "Seller's entry",
      input.entry === "peaceful"
        ? "Takes vacant possession without force"
        : "Takes possession by force",
    ],
    [
      "Buyer at receipt",
      input.belief === "good" ? "Believes Marcus owns it" : "Knows Marcus does not own it",
    ],
    ["Conveyance", "Sale and delivery by Marcus"],
    ["Time held", time],
  ];
}

export function story(input: Case): string {
  if (input.lesson === "delivery") {
    const object = input.thing === "field" ? "field in Italy" : thingName(input);
    return `Lucius owns a ${object}. He sells it to Aulus and gives him possession. ${input.form === "delivery" ? "They use delivery alone, without mancipation or surrender before a magistrate." : "They also complete a valid mancipation; all required formalities are assumed satisfied."}`;
  }
  if (input.lesson === "good-faith") {
    const origin =
      input.seller === "heir"
        ? "Lucius lent a silver cup to Marcus's father. The father dies. Marcus honestly mistakes the borrowed cup for an inherited possession."
        : "Lucius owns a silver cup. Marcus steals it.";
    return `${origin} Marcus sells and delivers the cup to Aulus, who ${input.belief === "good" ? "believes Marcus owns it" : "knows it belongs to someone else"} when he receives it.`;
  }
  const place = input.location === "italy" ? "in Italy" : "in a province";
  const entry =
    input.entry === "peaceful"
      ? "enters a vacant field without force during Lucius's absence"
      : "takes possession of Lucius's field by force";
  return `Marcus ${entry}, ${place}. He knows it is not his. He sells and transfers possession to Aulus, who ${input.belief === "good" ? "believes Marcus owns it" : "knows Marcus does not own it"} at receipt.`;
}

export function evaluate(input: Case): Outcome {
  const threshold = thingOf(input) === "field" ? 2 : 1;
  const time: Condition = {
    label: threshold === 1 ? "One complete year" : "Two complete years",
    state: input.years >= threshold ? "met" : "waiting",
    explanation: `${input.years} of ${threshold} required years of uninterrupted possession. Whole years are teaching steps, not Roman calendar calculations.`,
    rule: "time",
  };
  if (input.lesson === "delivery") {
    const direct = input.thing === "cup" || input.form === "mancipation";
    if (direct) {
      return {
        kind: "full",
        title: "Aulus",
        possession: "Aulus",
        bonitary: "United with title",
        threshold,
        headline: "Possession and ownership pass together.",
        explanation:
          input.thing === "cup"
            ? "The silver cup is res nec mancipi. The owner's sale and delivery pass full ownership immediately. Waiting adds no missing title."
            : "The owner has completed a valid mancipation. Aulus receives civil title at the conveyance; in this case he also receives possession. No usucapion is needed.",
        conditions: [
          {
            label: "Owner conveys",
            state: "met",
            explanation: "Lucius owns the thing and has authority to transfer it.",
            rule: "delivery",
          },
          {
            label: input.thing === "cup" ? "Delivery is sufficient" : "Required form is complete",
            state: "met",
            explanation: "The transfer already gives full ownership.",
            rule: input.thing === "cup" ? "delivery" : "form",
          },
        ],
        focus: input.thing === "cup" ? "delivery" : "form",
      };
    }
    const complete = input.years >= threshold;
    return {
      kind: complete ? "full" : "divided",
      title: complete ? "Aulus" : "Lucius",
      possession: "Aulus",
      bonitary: complete ? "United with title" : "Aulus",
      threshold,
      headline: complete
        ? "Time reunites the two sides of ownership."
        : "Aulus has the thing. Lucius retains civil title.",
      explanation: complete
        ? `After ${threshold === 1 ? "one complete year" : "two complete years"}, usucapion gives Aulus full ownership. Nothing has to be handed over a second time.`
        : "Delivery of a res mancipi by its owner makes it Aulus's in bonis, while Lucius retains title ex iure Quiritium. These are distinct legal positions, not half shares in the thing.",
      conditions: [
        {
          label: "Owner delivers a res mancipi",
          state: "met",
          explanation:
            "The missing mancipation leaves civil title with Lucius and in bonis with Aulus.",
          rule: "division",
        },
        time,
      ],
      focus: complete ? "time" : "division",
    };
  }

  // Provincial holdings must not be represented as ordinary private Quiritary title.
  if (input.lesson === "land" && input.location === "province") {
    return {
      kind: "outside",
      title: "Outside this model",
      possession: "Aulus",
      bonitary: "Outside this model",
      threshold,
      headline: "Gaius's usucapion does not apply to provincial land.",
      explanation:
        "Section 2.46 excludes provincial land from this method. The field's private rights are not decided here. More years do not turn this into an Italian civil-title case.",
      conditions: [
        {
          label: "Provincial land",
          state: "outside",
          explanation:
            "Gaius distinguishes provincial holdings from the private civil ownership modeled for Italy. See also 2.7 and 2.21.",
          rule: "province",
        },
      ],
      focus: "province",
    };
  }
  const belief: Condition = {
    label: "Buyer's good faith at receipt",
    state: input.belief === "good" ? "met" : "blocked",
    explanation:
      input.belief === "good"
        ? "Aulus believes the seller owns the thing when he receives it."
        : "Aulus knows the seller does not own it. This ordinary purchase route lacks the good faith Gaius requires.",
    rule: "belief",
  };
  const tainted =
    input.lesson === "good-faith" ? input.seller === "thief" : input.entry === "violent";
  const eligibility: Condition = {
    label: input.lesson === "good-faith" ? "No theft in the history" : "No taking by force",
    state: tainted ? "blocked" : "met",
    explanation:
      input.lesson === "good-faith"
        ? tainted
          ? "Marcus stole the cup. An innocent later purchase does not remove that barrier."
          : "The heir's honest mistake is Gaius's explicit example of a non-owner's transfer without theft."
        : tainted
          ? "Marcus took the field by force. Aulus's own good faith does not remove that barrier."
          : "Gaius allows this peaceful vacant-possession example; the first taker's knowledge does not disqualify the innocent buyer.",
    rule: tainted ? "taint" : input.lesson === "good-faith" ? "heir" : "land",
  };
  const blocked = tainted || input.belief === "bad";
  const complete = !blocked && input.years >= threshold;
  let explanation: string;
  if (blocked) {
    explanation = tainted
      ? `${input.lesson === "good-faith" ? "A stolen cup" : "Land taken by force"} cannot be acquired by this usucapion, even by an innocent buyer. ${input.belief === "bad" ? "Aulus also lacks good faith at receipt. " : ""}The source blocks the route; it does not merely ask for a longer wait.`
      : "Aulus knew the seller was not the owner when he received possession. Elapsed time cannot supply that missing condition in this purchase case. Gaius discusses other, exceptional routes outside this workshop.";
  } else if (complete) {
    explanation =
      input.lesson === "good-faith"
        ? "The heir was not the owner, so delivery alone did not transfer title. But his honest mistake avoided theft; Aulus's good faith and completed year allow usucapion."
        : "Marcus was not the owner and knew it. Yet his peaceful entry into vacant land does not prevent the innocent buyer from acquiring by two years of possession in Gaius's example.";
  } else {
    explanation = `The transfer comes from a non-owner. Aulus possesses the ${thingName(input)}, but Lucius retains civil ownership until the qualifying ${threshold === 1 ? "year is" : "two years are"} complete.`;
  }
  return {
    kind: blocked ? "blocked" : complete ? "full" : "waiting",
    title: complete ? "Aulus" : "Lucius",
    possession: "Aulus",
    bonitary: complete ? "United with title" : "Not the 2.41 route",
    threshold,
    headline: blocked
      ? "Time cannot cure this defect."
      : complete
        ? "Aulus acquires title from a non-owner's sale."
        : "Possession has passed. Ownership has not yet passed.",
    explanation,
    conditions: [belief, eligibility, time],
    focus: tainted
      ? "innocent"
      : input.belief === "bad"
        ? "belief"
        : input.lesson === "good-faith"
          ? "heir"
          : "land",
  };
}

export type Difference = { fact: string; before: string; after: string };
export function differences(before: Case, after: Case): Difference[] {
  if (before.lesson !== after.lesson) {
    return [
      {
        fact: "Investigation",
        before: lessonNames[before.lesson],
        after: lessonNames[after.lesson],
      },
    ];
  }
  const prior = new Map(facts(before));
  return facts(after).flatMap(([fact, value]) => {
    const previous = prior.get(fact);
    return previous !== undefined && previous !== value
      ? [{ fact, before: previous, after: value }]
      : [];
  });
}

export function withYears(input: Case, years: Years): Case {
  return { ...input, years };
}
