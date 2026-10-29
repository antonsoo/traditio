import assert from "node:assert/strict";
import test from "node:test";
import {
  type ArgumentDraft,
  assessCitations,
  assessClaim,
  copyArgument,
} from "../src/core/argument";
import type { Case } from "../src/core/model";
import { fromHash, readRecord, shareUrl, writeRecord } from "../src/core/record";

const mule: Case = { lesson: "delivery", thing: "mule", form: "delivery", years: 0 };
const heir: Case = { lesson: "good-faith", seller: "heir", belief: "good", years: 1 };
const stolen: Case = { ...heir, seller: "thief" };
const land: Case = {
  lesson: "land",
  entry: "peaceful",
  location: "italy",
  belief: "good",
  years: 2,
};

test("the owner's delivery defeats an immediate-title claim only at the claimed moment (2.41)", () => {
  assert.equal(assessClaim("delivery-title", mule).kind, "counterexample");
  assert.equal(assessClaim("delivery-title", { ...mule, thing: "cup" }).kind, "not-counterexample");
  assert.equal(
    assessClaim("delivery-title", { ...mule, form: "mancipation" }).kind,
    "not-counterexample",
  );
  assert.equal(assessClaim("delivery-title", { ...mule, years: 1 }).kind, "premise-not-met");
  assert.equal(assessClaim("delivery-title", stolen).kind, "premise-not-met");
});

test("the innocent buyer's completed period is necessary to refute sufficiency (2.42, 2.45, 2.49)", () => {
  assert.equal(assessClaim("faith-and-time", stolen).kind, "counterexample");
  assert.equal(assessClaim("faith-and-time", { ...stolen, years: 0 }).kind, "premise-not-met");
  assert.equal(assessClaim("faith-and-time", { ...stolen, belief: "bad" }).kind, "premise-not-met");
  assert.equal(assessClaim("faith-and-time", heir).kind, "not-counterexample");
  assert.equal(assessClaim("faith-and-time", { ...land, entry: "violent" }).kind, "counterexample");
  assert.equal(
    assessClaim("faith-and-time", { ...land, entry: "violent", years: 1 }).kind,
    "premise-not-met",
  );
  assert.equal(assessClaim("faith-and-time", land).kind, "not-counterexample");
});

test("a mistaken heir cannot refute a claim about knowing sellers, but the peaceful occupier can (2.50–51)", () => {
  assert.equal(assessClaim("knowing-seller", heir).kind, "premise-not-met");
  assert.equal(assessClaim("knowing-seller", stolen).kind, "not-counterexample");
  assert.equal(assessClaim("knowing-seller", land).kind, "counterexample");
  assert.equal(assessClaim("knowing-seller", { ...land, years: 1 }).kind, "not-counterexample");
  assert.equal(
    assessClaim("knowing-seller", { ...land, belief: "bad" }).kind,
    "not-counterexample",
  );
  assert.equal(
    assessClaim("knowing-seller", { ...land, entry: "violent" }).kind,
    "not-counterexample",
  );
  for (const claim of ["delivery-title", "faith-and-time", "knowing-seller"] as const) {
    assert.equal(assessClaim(claim, { ...land, location: "province" }).kind, "outside");
  }
});

test("a pertinent exception and its period must be cited; a source list cannot validate bad facts or prose", () => {
  const draft: ArgumentDraft = {
    claim: "faith-and-time",
    witness: stolen,
    citations: ["time"],
    note: "My claim is still too broad.",
  };
  assert.equal(assessCitations(draft).complete, false);
  assert.deepEqual(assessCitations(draft).missing[0]?.anyOf, ["taint", "innocent"]);
  for (const exception of ["taint", "innocent"] as const) {
    assert.equal(assessCitations({ ...draft, citations: ["time", exception] }).complete, true);
  }
  assert.equal(
    assessCitations({ ...draft, citations: ["time", "heir", "land", "belief"] }).complete,
    false,
  );
  const unsuitable = {
    ...draft,
    witness: heir,
    citations: ["time", "innocent"],
  } satisfies ArgumentDraft;
  assert.equal(assessCitations(unsuitable).complete, true);
  assert.equal(assessClaim(unsuitable.claim, unsuitable.witness).kind, "not-counterexample");
});

test("portable arguments preserve a separate witness and literal notes, with no stored verdict to trust", () => {
  const draft: ArgumentDraft = {
    claim: "knowing-seller",
    witness: land,
    citations: ["time", "land"],
    note: 'quamquam\n<script>alert("learner text")</script> & my explanation',
  };
  const serialized = writeRecord(stolen, mule, draft);
  const restored = readRecord(serialized);
  assert.equal(restored.version, 2);
  assert.deepEqual(restored.current, stolen);
  assert.deepEqual(restored.pinned, mule);
  assert.deepEqual(restored.version === 2 && restored.argument, draft);
  const link = shareUrl("https://example.test/traditio/#reader", stolen, mule, draft);
  assert.deepEqual(fromHash(new URL(link).hash), restored);
  assert.equal(readRecord(writeRecord(stolen, mule)).version, 1);
  const saved = copyArgument(draft);
  draft.citations.pop();
  draft.note = "Later edits";
  draft.witness = stolen;
  assert.deepEqual(saved, restored.version === 2 ? restored.argument : null);
  for (const wrong of [
    { ...draft, claim: "unrecognized" },
    { ...draft, citations: ["time", "time"] },
    { ...draft, citations: ["made-up-section"] },
    { ...draft, note: "x".repeat(1_001) },
    { ...draft, note: 10 },
    { ...draft, witness: { ...land, years: 9 } },
    { ...draft, assessment: "counterexample" },
  ]) {
    assert.throws(() => readRecord(JSON.stringify({ ...restored, argument: wrong })));
  }
  const unfinished = { ...draft, witness: null, note: "Pending source reading" };
  assert.deepEqual(readRecord(writeRecord(stolen, null, unfinished)).version, 2);
});
