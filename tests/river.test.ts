import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateRiver,
  makeRiverCase,
  makeRiverRecord,
  type RiverCase,
  type RiverEvent,
  type RiverRoute,
  readRiver,
  replayRiver,
  writeRiver,
} from "../src/core/river";
import { riverReadings } from "../src/river-content";
import { riverCsv, riverSvg } from "../src/river-drawing";

// A manually transcribed concordance of the clauses, not generated from the evaluator.
// The "Not settled" entries express our selected-reading boundary, not an ancient rule.
const concordance: [RiverRoute, RiverEvent[], string, string][] = [
  ["parcel", [], "Lucius", "Lucius"],
  ["parcel", ["carry"], "Lucius", "Lucius"],
  ["parcel", ["carry", "root"], "Not settled here", "Lucius"],
  ["parcel", ["carry", "attach"], "Not settled here", "Lucius"],
  ["parcel", ["carry", "attach", "root"], "Not settled here", "Aulus"],
  ["parcel", ["carry", "root", "attach"], "Not settled here", "Aulus"],
  ["parcel", ["root", "attach", "carry"], "Lucius", "Lucius"],
  ["parcel", ["attach", "carry", "root"], "Not settled here", "Lucius"],
  ["plant", [], "Lucius", "Lucius"],
  ["plant", ["plant"], "Lucius", "Lucius"],
  ["plant", ["plant", "root"], "Aulus", "Aulus"],
  ["plant", ["root", "plant"], "Lucius", "Lucius"],
  ["silt", [], "No addition yet", "No addition yet"],
  ["silt", ["deposit"], "Aulus", "Aulus"],
  ["flood", [], "Aulus", "Aulus"],
  ["flood", ["recede"], "Aulus", "Aulus"],
  ["flood", ["flood"], "Not settled here", "Aulus"],
  ["flood", ["flood", "recede"], "Not settled here", "Aulus"],
];
function c(route: RiverRoute, events: RiverEvent[], at = events.length): RiverCase {
  return { ...makeRiverCase(route), events, at };
}
test("ownership agrees with the manually transcribed source concordance under both readings", () => {
  for (const [route, events, gaius, digest] of concordance) {
    assert.equal(evaluateRiver(c(route, events)).owner, gaius, `${route}: ${events} / Institutes`);
    assert.equal(
      evaluateRiver({ ...c(route, events), lens: "digest" }).owner,
      digest,
      `${route}: ${events} / Digest`,
    );
  }
});
test("facts before arrival and duplicate attempts cannot manufacture attachment or roots", () => {
  const steps = replayRiver(
    c("parcel", ["root", "attach", "carry", "carry", "attach", "attach", "root", "root"]),
  );
  assert.deepEqual(
    steps.map((s) => s.accepted),
    [false, false, true, false, true, false, true, false],
  );
  assert.deepEqual(steps[2]?.state, {
    arrived: true,
    rooted: false,
    longAttached: false,
    flooded: false,
    receded: false,
  });
  assert.equal(
    evaluateRiver({
      ...c(
        "parcel",
        steps.map((s) => s.event),
      ),
      lens: "digest",
    }).owner,
    "Aulus",
  );
  const wrong = replayRiver(c("silt", ["root", "carry", "plant", "flood", "attach", "recede"]));
  assert.ok(wrong.every((s) => !s.accepted));
});
test("inspecting the past never applies later roots or changes the saved future", () => {
  const current = { ...c("parcel", ["carry", "attach", "root"], 1), lens: "digest" as const };
  const original = structuredClone(current);
  assert.equal(evaluateRiver(current).owner, "Lucius");
  assert.equal(evaluateRiver({ ...current, at: 3 }).owner, "Aulus");
  assert.equal(evaluateRiver({ ...current, at: 0 }).state.arrived, false);
  assert.deepEqual(current, original);
});
test("records retain pinned histories and selected points, ignore supplied outcomes, reject foreign records", () => {
  const r = makeRiverRecord();
  r.current = c("silt", ["deposit"]);
  r.pinned = c("parcel", ["carry", "root"], 1);
  r.note = "Haec pars remains identifiable. <script> stays text.";
  const serialized = writeRiver(r);
  assert.deepEqual(readRiver(serialized), r);
  assert.deepEqual(
    readRiver(JSON.stringify({ ...r, current: { ...r.current, owner: "Lucius" } })),
    r,
  );
  for (const bad of [
    null,
    {},
    { ...r, format: "traditio-ceremony" },
    { ...r, current: { ...r.current, at: -1 } },
    { ...r, current: { ...r.current, at: 2 } },
    { ...r, current: { ...r.current, route: "__proto__" } },
    { ...r, current: { ...r.current, events: ["constructor"] } },
    { ...r, note: "x".repeat(1501) },
    { ...r, pinned: {} },
  ])
    assert.throws(() => readRiver(JSON.stringify(bad)));
});
test("every evaluator reference and contextual phrase has a retained reading", () => {
  for (const [route, events] of concordance)
    for (const lens of ["institutes", "digest"] as const) {
      const result = evaluateRiver({ ...c(route, events), lens });
      assert.ok(riverReadings.some((r) => r.id === result.source));
    }
  assert.equal(riverReadings.length, 8);
  for (const r of riverReadings) {
    assert.ok(r.latin && r.english && r.note && r.pages.length);
    for (const word of r.words) assert.ok(word.every(Boolean));
  }
});
test("portable drawing identifies both physical facts and source selection; CSV retains refused attempts", () => {
  const current = {
    ...c("parcel", ["root", "carry", "attach", "root"], 2),
    lens: "digest" as const,
  };
  const svg = riverSvg(current);
  assert.match(svg, /Ownership of the focus: Lucius/);
  assert.match(svg, /Point in history: 2 of 4/);
  assert.match(svg, /Digest/);
  assert.match(svg, /role="img"/);
  const csv = riverCsv(null, current);
  assert.equal(csv.split("\r\n").filter(Boolean).length, 6);
  assert.match(csv, /"root","false"/);
  assert.match(csv, /"Aulus"/);
});
