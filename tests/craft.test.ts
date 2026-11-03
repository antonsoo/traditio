import assert from "node:assert/strict";
import test from "node:test";
import {
  assess,
  craftIds,
  keepTrial,
  MAX_TRIALS,
  makeCraftRecord,
  outcome,
  readCraft,
  testRule,
  writeCraft,
} from "../src/core/craft";
import { craftReadings } from "../src/craft-content";
import { analogyTable, craftSvg } from "../src/craft-drawing";

// Hand-transcribed legal positions from the inspected 1904 pp. 162–163.
// A single expected title must not replace the reported dispute in 2.79.
const sourceTable = [
  ["vessel", "disputed", "One reported view", "One reported view"],
  ["wine", "disputed", "One reported view", "One reported view"],
  ["chest", "disputed", "One reported view", "One reported view"],
  ["writing", "material", "Agrees here", "Counterexample"],
  ["painting", "maker", "Counterexample", "Agrees here"],
  ["repair", "unresolved", "Outside these passages", "Outside these passages"],
] as const;
test("source positions preserve dispute, opposite accession rules and an undecided analogy", () => {
  for (const [id, expected, material, maker] of sourceTable) {
    assert.equal(outcome(id), expected, id);
    assert.equal(testRule(id, "material").label, material, id);
    assert.equal(testRule(id, "maker").label, maker, id);
  }
  assert.match(assess("vessel", "maker"), /matches the opposing school.*leaves out the rival/);
  assert.match(assess("vessel", "unresolved"), /more specific than silence/);
  assert.match(assess("repair", "maker"), /goes beyond/);
});
test("kept proposal is detached from all later drafts and citation arrays", () => {
  const initial = makeCraftRecord();
  const d = initial.drafts[0];
  assert.ok(d);
  d.explanation = "Because the material remains.";
  d.citations.push("schools");
  const kept = keepTrial(initial, d);
  initial.drafts[0]?.citations.push("question");
  kept.drafts[0]?.citations.push("writing");
  if (kept.drafts[0]) kept.drafts[0].explanation = "Changed my mind.";
  assert.deepEqual(kept.trials[0], {
    craft: "vessel",
    judgment: "material",
    explanation: "Because the material remains.",
    citations: ["schools"],
  });
  assert.equal(initial.trials.length, 0);
  assert.deepEqual(readCraft(writeCraft(kept)), kept);
});
test("bounded record can retain every maximum-length multilingual draft and judgment", () => {
  let r = makeCraftRecord();
  for (const d of r.drafts) {
    d.explanation = "漢".repeat(800);
    d.citations = craftReadings.map((x) => x.id);
  }
  r.note = "漢".repeat(1500);
  for (let i = 0; i < MAX_TRIALS; i++) {
    const d = r.drafts[i % craftIds.length];
    assert.ok(d);
    r = keepTrial(r, d);
  }
  assert.deepEqual(readCraft(writeCraft(r)), r);
  const first = r.drafts[0];
  assert.ok(first);
  assert.throws(() => keepTrial(r, first), /Twelve/);
});
test("bad or newer records are rejected before replacement", () => {
  const record = makeCraftRecord();
  for (const patch of [
    { version: 2 },
    { current: "clay" },
    { rule: "reversible" },
    { note: "x".repeat(1501) },
    {
      trials: [
        {
          craft: "vessel",
          judgment: "material",
          explanation: "",
          citations: ["schools", "schools"],
        },
      ],
    },
    { drafts: [] },
    { drafts: Array(6).fill(record.drafts[0]) },
  ]) {
    assert.throws(() => readCraft(JSON.stringify({ ...record, ...patch })));
  }
  assert.throws(() => readCraft(" ".repeat(65_537)), /64 KiB/);
  assert.throws(() => readCraft("null"), /object/);
  assert.deepEqual(record, makeCraftRecord());
});
test("readings retain the source's direction, reservation and restored words", () => {
  const readings = new Map(craftReadings.map((r) => [r.id, r]));
  assert.match(readings.get("writing")?.latin ?? "", /litterae chartulis sive membranis cedunt/);
  assert.match(readings.get("painting")?.latin ?? "", /tabulam picturae cedere/);
  assert.match(readings.get("painting")?.latin ?? "", /vix idonea ratio/);
  assert.match(readings.get("question")?.latin ?? "", /⟨aut olivis aut spicis⟩/);
  assert.match(readings.get("theft")?.latin ?? "", /adversus eum qui subripuerit/);
  assert.equal(
    craftReadings.reduce((n, r) => n + r.words.length, 0),
    21,
  );
});
test("diagrams and analogy table distinguish physical work from legal answers", () => {
  for (const id of craftIds) {
    assert.match(craftSvg(id), /physical work, not a transfer of legal title/);
    assert.doesNotMatch(craftSvg(id), /undefined|NaN/);
  }
  assert.equal((analogyTable("material").match(/class="counterexample"/g) ?? []).length, 1);
  assert.equal((analogyTable("maker").match(/class="counterexample"/g) ?? []).length, 1);
});
