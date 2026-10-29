import assert from "node:assert/strict";
import test from "node:test";
import { type Case, differences, evaluate, type Years } from "../src/core/model";
import { fromHash, readCase, readRecord, shareUrl, writeRecord } from "../src/core/record";
import { readings } from "../src/readings";

// Expected title histories transcribed as a table from the cited passages,
// independently of the evaluator's predicates. Four positions: years 0, 1, 2, 3.
const sourceCases: { source: string; input: Case; title: string[]; kinds: string[] }[] = [
  {
    source: "2.19–20",
    input: { lesson: "delivery", thing: "cup", form: "delivery", years: 0 },
    title: ["Aulus", "Aulus", "Aulus", "Aulus"],
    kinds: ["full", "full", "full", "full"],
  },
  {
    source: "1.120; 2.41–42",
    input: { lesson: "delivery", thing: "mule", form: "delivery", years: 0 },
    title: ["Lucius", "Aulus", "Aulus", "Aulus"],
    kinds: ["divided", "full", "full", "full"],
  },
  {
    source: "2.22",
    input: { lesson: "delivery", thing: "mule", form: "mancipation", years: 0 },
    title: ["Aulus", "Aulus", "Aulus", "Aulus"],
    kinds: ["full", "full", "full", "full"],
  },
  {
    source: "1.120; 2.41–42",
    input: { lesson: "delivery", thing: "field", form: "delivery", years: 0 },
    title: ["Lucius", "Lucius", "Aulus", "Aulus"],
    kinds: ["divided", "divided", "full", "full"],
  },
  {
    source: "2.22",
    input: { lesson: "delivery", thing: "field", form: "mancipation", years: 0 },
    title: ["Aulus", "Aulus", "Aulus", "Aulus"],
    kinds: ["full", "full", "full", "full"],
  },
  {
    source: "2.42–43; 2.50",
    input: { lesson: "good-faith", seller: "heir", belief: "good", years: 0 },
    title: ["Lucius", "Aulus", "Aulus", "Aulus"],
    kinds: ["waiting", "full", "full", "full"],
  },
  {
    source: "2.43",
    input: { lesson: "good-faith", seller: "heir", belief: "bad", years: 0 },
    title: ["Lucius", "Lucius", "Lucius", "Lucius"],
    kinds: ["blocked", "blocked", "blocked", "blocked"],
  },
  {
    source: "2.45; 2.49",
    input: { lesson: "good-faith", seller: "thief", belief: "good", years: 0 },
    title: ["Lucius", "Lucius", "Lucius", "Lucius"],
    kinds: ["blocked", "blocked", "blocked", "blocked"],
  },
  {
    source: "2.43; 2.45",
    input: { lesson: "good-faith", seller: "thief", belief: "bad", years: 0 },
    title: ["Lucius", "Lucius", "Lucius", "Lucius"],
    kinds: ["blocked", "blocked", "blocked", "blocked"],
  },
  {
    source: "2.42–43; 2.51",
    input: { lesson: "land", location: "italy", entry: "peaceful", belief: "good", years: 0 },
    title: ["Lucius", "Lucius", "Aulus", "Aulus"],
    kinds: ["waiting", "waiting", "full", "full"],
  },
  {
    source: "2.43",
    input: { lesson: "land", location: "italy", entry: "peaceful", belief: "bad", years: 0 },
    title: ["Lucius", "Lucius", "Lucius", "Lucius"],
    kinds: ["blocked", "blocked", "blocked", "blocked"],
  },
  {
    source: "2.45; 2.49",
    input: { lesson: "land", location: "italy", entry: "violent", belief: "good", years: 0 },
    title: ["Lucius", "Lucius", "Lucius", "Lucius"],
    kinds: ["blocked", "blocked", "blocked", "blocked"],
  },
  {
    source: "2.43; 2.45",
    input: { lesson: "land", location: "italy", entry: "violent", belief: "bad", years: 0 },
    title: ["Lucius", "Lucius", "Lucius", "Lucius"],
    kinds: ["blocked", "blocked", "blocked", "blocked"],
  },
];
for (const entry of ["peaceful", "violent"] as const) {
  for (const belief of ["good", "bad"] as const) {
    sourceCases.push({
      source: "2.46 (scope boundary)",
      input: { lesson: "land", location: "province", entry, belief, years: 0 },
      title: Array(4).fill("Outside this model"),
      kinds: Array(4).fill("outside"),
    });
  }
}

test("all 68 supported cases agree with the independent source-concordance table", () => {
  assert.equal(sourceCases.length * 4, 68);
  for (const row of sourceCases) {
    for (const years of [0, 1, 2, 3] as const) {
      const input = { ...row.input, years };
      assert.deepEqual(readCase(input), input);
      const actual = evaluate(input);
      const label = `${row.source}: ${JSON.stringify(input)}`;
      assert.equal(actual.title, row.title[years], label);
      assert.equal(actual.kind, row.kinds[years], label);
      assert.equal(actual.possession, "Aulus", label);
    }
  }
});

test("the bonitary owner and a good-faith non-owner possessor are not conflated", () => {
  const ownerSale: Case = { lesson: "delivery", thing: "mule", form: "delivery", years: 0 };
  assert.equal(evaluate(ownerSale).bonitary, "Aulus");
  assert.equal(
    evaluate({ lesson: "good-faith", seller: "heir", belief: "good", years: 0 }).bonitary,
    "Not the 2.41 route",
  );
  assert.equal(evaluate({ ...ownerSale, years: 1 }).bonitary, "United with title");
});

test("multiple barriers remain visible, even when elapsed time is sufficient", () => {
  const result = evaluate({ lesson: "good-faith", seller: "thief", belief: "bad", years: 3 });
  assert.equal(result.conditions.filter((condition) => condition.state === "blocked").length, 2);
  assert.equal(result.conditions.find((condition) => condition.rule === "time")?.state, "met");
});

test("one-fact comparison identifies the changed premise rather than inventing causation", () => {
  const original: Case = { lesson: "good-faith", seller: "heir", belief: "good", years: 1 };
  assert.deepEqual(differences(original, { ...original, seller: "thief" }), [
    { fact: "Seller", before: "Marcus, an honestly mistaken heir", after: "Marcus, a thief" },
  ]);
  assert.equal(differences(original, { ...original, seller: "thief", years: 3 }).length, 2);
  assert.equal(differences(original, original).length, 0);
  assert.equal(
    differences(original, { lesson: "delivery", thing: "cup", form: "delivery", years: 0 })[0]
      ?.fact,
    "Investigation",
  );
});

test("editable and shared cases round-trip facts and recompute every supported result", () => {
  const pin: Case = { lesson: "delivery", thing: "mule", form: "delivery", years: 0 };
  for (const row of sourceCases) {
    for (const years of [0, 1, 2, 3] as Years[]) {
      const current = { ...row.input, years };
      const file = writeRecord(current, pin);
      const reopened = readRecord(file);
      assert.deepEqual(reopened.current, current);
      assert.deepEqual(reopened.pinned, pin);
      assert.deepEqual(evaluate(reopened.current), evaluate(current));
      const url = shareUrl("https://example.test/traditio/#reader", current, pin);
      assert.deepEqual(fromHash(new URL(url).hash), reopened);
    }
  }
  assert.equal(fromHash("#reader"), null);
});

test("records reject unsupported facts, extra results, oversize and damaged inputs", () => {
  const good: Case = { lesson: "good-faith", seller: "heir", belief: "good", years: 1 };
  for (const value of [
    null,
    [],
    {},
    { ...good, years: -1 },
    { ...good, years: 4 },
    { ...good, years: 1.5 },
    { ...good, years: "1" },
    { ...good, belief: "unknown" },
    { ...good, title: "Aulus" },
    { lesson: "delivery", thing: "cup", form: "mancipation", years: 0 },
    { lesson: "land", entry: "thief", belief: "good", location: "italy", years: 1 },
  ]) {
    assert.throws(() => readCase(value));
  }
  assert.throws(() => readRecord("{"));
  assert.throws(() => readRecord(" ".repeat(16_385)));
  assert.throws(() => readRecord(writeRecord(good, null).replace('"version": 1', '"version": 2')));
  assert.throws(() => fromHash("#case=%GG"));
  assert.throws(() => fromHash(`#case=${"x".repeat(50_000)}`));
});

test("every explanation is anchored to a retained reading and every phrase occurs in its Latin", () => {
  const ids = new Set(readings.map((item) => item.id));
  for (const row of sourceCases) {
    for (const years of [0, 1, 2, 3] as const) {
      const result = evaluate({ ...row.input, years });
      assert.ok(ids.has(result.focus));
      for (const condition of result.conditions) assert.ok(ids.has(condition.rule));
    }
  }
  for (const item of readings) {
    assert.ok(item.pages.length);
    for (const word of item.words)
      assert.ok(
        item.latin.toLowerCase().includes(word.latin.toLowerCase()),
        `${item.id}: ${word.latin}`,
      );
  }
});
