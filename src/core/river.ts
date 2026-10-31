/** Selected source clauses, applied to stipulated facts; not a general land-law engine. */
export const routes = {
  parcel: "A piece torn away",
  silt: "Imperceptible accretion",
  plant: "A transplanted tree",
  flood: "A flooded field",
} as const;
export type RiverRoute = keyof typeof routes;
export type Lens = "institutes" | "digest";
export const lenses: Record<Lens, string> = {
  institutes: "Gaius · Institutes 2.70–74",
  digest: "Digest · excerpts attributed to Gaius",
};
export const events = {
  carry: "Carry the torn piece to Aulus’s bank",
  deposit: "Establish imperceptible accretion",
  plant: "Plant Lucius’s tree in Aulus’s soil",
  root: "Establish roots in Aulus’s soil",
  attach: "Establish long attachment at Aulus’s bank",
  flood: "Flood Aulus’s field",
  recede: "Let the floodwater recede",
} as const;
export type RiverEvent = keyof typeof events;
export const routeEvents: Record<RiverRoute, RiverEvent[]> = {
  parcel: ["carry", "root", "attach"],
  silt: ["deposit"],
  plant: ["plant", "root"],
  flood: ["flood", "recede"],
};
export type RiverCase = { route: RiverRoute; lens: Lens; events: RiverEvent[]; at: number };
export type RiverRecord = {
  format: "traditio-river";
  version: 1;
  current: RiverCase;
  pinned: RiverCase | null;
  note: string;
};
export type RiverState = {
  arrived: boolean;
  rooted: boolean;
  longAttached: boolean;
  flooded: boolean;
  receded: boolean;
};
export type RiverStep = {
  event: RiverEvent;
  accepted: boolean;
  reason: string;
  state: RiverState;
};
export type ReadingId =
  | "g-alluvion"
  | "g-parcel"
  | "g-soil"
  | "g-tree"
  | "d-alluvion"
  | "d-parcel"
  | "d-tree"
  | "d-flood";
export type RiverResult = {
  owner: "Lucius" | "Aulus" | "Not settled here" | "No addition yet";
  lastExpress: "Lucius" | "Aulus" | null;
  headline: string;
  reason: string;
  source: ReadingId;
  state: RiverState;
  steps: RiverStep[];
};
export const MAX_RIVER_EVENTS = 32;
export const MAX_RIVER_BYTES = 20_480;
export function makeRiverCase(route: RiverRoute = "parcel"): RiverCase {
  return { route, lens: "institutes", events: [], at: 0 };
}
export function makeRiverRecord(): RiverRecord {
  return { format: "traditio-river", version: 1, current: makeRiverCase(), pinned: null, note: "" };
}
/** Preserve the original ending, then try a different continuation of the inspected past. */
export function branchRiver(c: RiverCase): { pinned: RiverCase; current: RiverCase } {
  return {
    pinned: { ...c, events: [...c.events], at: c.events.length },
    current: { ...c, events: c.events.slice(0, c.at) },
  };
}
export function compareRiverEvidence(a: RiverCase, b: RiverCase): string {
  if (a.route !== b.route)
    return "These are different investigations. A shared outline or receiving bank does not make a carried piece, diffuse addition and transplanted tree the same object or the same facts.";
  const left = evaluateRiver(a).state;
  const right = evaluateRiver(b).state;
  const names: Record<keyof RiverState, string> = {
    arrived:
      a.route === "parcel"
        ? "arrival of the carried piece"
        : a.route === "plant"
          ? "planting in the receiving soil"
          : "the imperceptible addition",
    rooted: "rooting in the receiving soil",
    longAttached: "long attachment",
    flooded: "flooding",
    receded: "recession of the water",
  };
  const differences = (Object.keys(names) as (keyof RiverState)[]).filter(
    (key) => left[key] !== right[key],
  );
  if (a.lens !== b.lens)
    return `${differences.length ? "Both the physical facts and the selected passages differ." : "These points establish the same physical facts; the selected passages differ."} ‘Not settled here’ reports a limit of those passages, not a demonstrated historical change in law.`;
  if (!differences.length)
    return "These points establish the same physical facts under the same passages. Different attempt counts, or refused attempts, do not supply an additional condition.";
  return differences.length === 1
    ? `Only ${names[differences[0] as keyof RiverState]} differs at these inspected points. The investigation and selected passages are the same.`
    : `The facts that differ at these inspected points are ${differences.map((key) => names[key]).join(", ")}. The investigation and selected passages are the same.`;
}
export function replayRiver(c: RiverCase): RiverStep[] {
  const s: RiverState = {
    arrived: false,
    rooted: false,
    longAttached: false,
    flooded: false,
    receded: false,
  };
  const steps: RiverStep[] = [];
  for (const event of c.events) {
    let accepted = false;
    let reason: string;
    if (!routeEvents[c.route].includes(event)) {
      reason = "That fact belongs to another investigation. No fact was added to this history.";
    } else if (event === "carry" || event === "deposit" || event === "plant") {
      if (s.arrived) reason = "The arrival is already recorded. Repeating it adds no new fact.";
      else {
        s.arrived = accepted = true;
        reason =
          event === "carry"
            ? "The identifiable piece, including its tree, is now at Aulus’s bank. Its arrival alone does not transfer it."
            : event === "plant"
              ? "Lucius’s tree is planted in Aulus’s soil. Roots have not yet taken hold there."
              : "The river’s addition is stipulated to be imperceptible at each moment. The visible outline represents its eventual extent, not a visible lump arriving.";
      }
    } else if (event === "root" || event === "attach") {
      if (!s.arrived)
        reason =
          event === "root"
            ? "The tree has not arrived at Aulus’s soil. Earlier roots elsewhere cannot satisfy this condition."
            : "The piece has not arrived at Aulus’s bank. Earlier time elsewhere cannot establish attachment here.";
      else if (event === "root" ? s.rooted : s.longAttached)
        reason =
          "That fact is already established. Repeating the button does not accumulate time or roots.";
      else {
        if (event === "root") s.rooted = true;
        else s.longAttached = true;
        accepted = true;
        reason =
          event === "root"
            ? "The tree’s roots have taken hold in Aulus’s soil. For a carried piece, this is distinct from long attachment."
            : "Long attachment at the receiving bank is now stipulated. This is a fact supplied by the learner, not a number of years computed by the app.";
      }
    } else if (event === "flood") {
      if (s.flooded || s.receded) reason = "This history already contains its one flood.";
      else {
        s.flooded = accepted = true;
        reason =
          "Aulus’s field is covered by floodwater. No permanent new river channel is stipulated.";
      }
    } else if (!s.flooded) reason = "There is no floodwater to recede yet.";
    else {
      s.flooded = false;
      s.receded = accepted = true;
      reason =
        "The water recedes from the same field. This is inundation and recovery, not abandonment of a riverbed.";
    }
    steps.push({ event, accepted, reason, state: { ...s } });
  }
  return steps;
}
export function evaluateRiver(c: RiverCase): RiverResult {
  const steps = replayRiver(c).slice(0, c.at);
  const s = steps.at(-1)?.state ?? {
    arrived: false,
    rooted: false,
    longAttached: false,
    flooded: false,
    receded: false,
  };
  const digest = c.lens === "digest";
  const base = { state: s, steps };
  if (c.route === "silt")
    return {
      ...base,
      owner: s.arrived ? "Aulus" : "No addition yet",
      lastExpress: s.arrived ? "Aulus" : null,
      headline: s.arrived
        ? "The receiving land gains the addition."
        : "Aulus owns the receiving field.",
      reason: s.arrived
        ? "The stipulated gradual addition belongs to Aulus, whose field the river enlarges. This is not an identified piece of Lucius’s estate carried intact across the river."
        : "No new soil has been added. Establish the source’s imperceptibility condition; a slow animation alone would not prove it.",
      source: digest ? "d-alluvion" : "g-alluvion",
    };
  if (c.route === "flood")
    return {
      ...base,
      owner: !digest && (s.flooded || s.receded) ? "Not settled here" : "Aulus",
      lastExpress: "Aulus",
      headline:
        !digest && (s.flooded || s.receded)
          ? "These selected Institutes passages do not address inundation."
          : "Water over the field does not change its owner.",
      reason:
        !digest && (s.flooded || s.receded)
          ? "Aulus is the stipulated initial owner. Institutes 2.70–74 do not settle this flood history. Read Digest 41.1.7.6 for an express treatment; absence from these passages is not a contrary rule."
          : s.flooded || s.receded
            ? "Digest 41.1.7.6 says inundation does not change the field’s identity, and it plainly belongs to the same person when the water recedes. A permanent new channel would be a different case."
            : "Aulus owns this field at the start. Try receding water before flooding it, then record a flood and its recession.",
      source: "d-flood",
    };
  if (!s.arrived)
    return {
      ...base,
      owner: "Lucius",
      lastExpress: "Lucius",
      headline:
        c.route === "parcel"
          ? "Lucius owns the piece on his bank."
          : "Lucius owns the lifted tree.",
      reason:
        "This is the stipulated starting ownership. No arrival at Aulus’s land has yet been recorded.",
      source:
        c.route === "parcel" ? (digest ? "d-parcel" : "g-parcel") : digest ? "d-tree" : "g-tree",
    };
  if (c.route === "plant")
    return {
      ...base,
      owner: s.rooted ? "Aulus" : "Lucius",
      lastExpress: s.rooted ? "Aulus" : "Lucius",
      headline: s.rooted
        ? "The rooted tree follows Aulus’s soil."
        : "Planting has not yet met the rooting condition.",
      reason: s.rooted
        ? "The tree has taken root in Aulus’s soil. Gaius 2.74 applies the preceding soil rule with si modo: provided that. This result concerns ownership; it does not decide compensation or an action for recovery."
        : "The tree is physically on Aulus’s land, but the condition of taking root there is not met. Digest 41.1.7.13 expressly says it remains the former owner’s before rooting; 2.74 makes rooting the condition for accession.",
      source: digest ? "d-tree" : "g-tree",
    };
  if (!digest && (s.rooted || s.longAttached))
    return {
      ...base,
      owner: "Not settled here",
      lastExpress: "Lucius",
      headline: "Do not stretch a short clause into a later-stage rule.",
      reason:
        "Institutes 2.71 expressly keeps the carried piece Lucius’s at arrival. It does not describe this later attachment history. That silence does not prove perpetual ownership or contradict the Digest. Change the reading to inspect its additional conditions.",
      source: "g-parcel",
    };
  const acquired = s.rooted && s.longAttached;
  return {
    ...base,
    owner: acquired ? "Aulus" : "Lucius",
    lastExpress: acquired ? "Aulus" : "Lucius",
    headline: acquired
      ? "The attached piece is acquired for Aulus’s land."
      : "The carried piece remains Lucius’s.",
    reason: acquired
      ? "Digest 41.1.7.2 adds long attachment and roots in the receiving estate, then says ex eo tempore: from that time. Both facts are now established. No fixed year count is supplied."
      : digest
        ? "Arrival preserves Lucius’s title. The selected Digest continuation describes acquisition after long attachment and the carried trees taking root. The model has not established both of those conditions."
        : "The identifiable piece has moved to Aulus’s bank, but haec pars tua manet says that this piece remains yours. Physical arrival alone has not changed its owner.",
    source: digest ? "d-parcel" : "g-parcel",
  };
}
export function riverFacts(c: RiverCase): [string, string][] {
  const r = evaluateRiver(c);
  return [
    ["Investigation", routes[c.route]],
    ["Reading", lenses[c.lens]],
    ["Point in history", `${c.at} of ${c.events.length} recorded attempts`],
    [
      "At Aulus’s bank",
      c.route === "flood" ? "The field starts there" : r.state.arrived ? "Yes" : "No",
    ],
    [
      "Roots in Aulus’s soil",
      ["parcel", "plant"].includes(c.route)
        ? r.state.rooted
          ? "Established"
          : "Not established"
        : "Not part of this case",
    ],
    [
      "Long attachment there",
      c.route === "parcel"
        ? r.state.longAttached
          ? "Established"
          : "Not established"
        : "Not part of this case",
    ],
    [
      "Floodwater",
      c.route === "flood"
        ? r.state.flooded
          ? "Over the field"
          : r.state.receded
            ? "Receded"
            : "No flood recorded"
        : "Not part of this case",
    ],
    ["Ownership of the focus", r.owner],
    ["Last express / stipulated owner", r.lastExpress ?? "No addition yet"],
  ];
}
function validCase(value: unknown): RiverCase {
  if (!value || typeof value !== "object") throw new Error("A river case is missing.");
  const c = value as Record<string, unknown>;
  if (typeof c.route !== "string" || !Object.hasOwn(routes, c.route))
    throw new Error("Unknown river investigation.");
  if (c.lens !== "institutes" && c.lens !== "digest") throw new Error("Unknown source reading.");
  if (
    !Array.isArray(c.events) ||
    c.events.length > MAX_RIVER_EVENTS ||
    c.events.some((e) => typeof e !== "string" || !Object.hasOwn(events, e))
  )
    throw new Error("The history has unknown facts or more than 32 attempts.");
  if (!Number.isInteger(c.at) || (c.at as number) < 0 || (c.at as number) > c.events.length)
    throw new Error("The selected point is outside the recorded history.");
  return {
    route: c.route as RiverRoute,
    lens: c.lens,
    events: [...c.events] as RiverEvent[],
    at: c.at as number,
  };
}
export function readRiver(text: string): RiverRecord {
  if (new TextEncoder().encode(text).length > MAX_RIVER_BYTES)
    throw new Error("The river record is larger than 20 KiB.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("This is not a valid JSON river record.");
  }
  if (!value || typeof value !== "object") throw new Error("A river record is required.");
  const r = value as Record<string, unknown>;
  if (r.format !== "traditio-river" || r.version !== 1)
    throw new Error("Use a version 1 Traditio river record on this page.");
  if (typeof r.note !== "string" || r.note.length > 1500)
    throw new Error("The explanation must be text of at most 1,500 characters.");
  return {
    format: "traditio-river",
    version: 1,
    current: validCase(r.current),
    pinned: r.pinned === null ? null : validCase(r.pinned),
    note: r.note,
  };
}
export function writeRiver(record: RiverRecord): string {
  return `${JSON.stringify(record, null, 2)}\n`;
}
