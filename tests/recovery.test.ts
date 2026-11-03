import assert from "node:assert/strict";
import test from "node:test";
import { makeRecovery, readRecovery, recovery } from "../src/core/recovery";

test("2.77: the paper owner’s title and unpaid writing defense are distinct", () => {
  for (const goodFaith of [true, false]) {
    const unpaid = recovery({ medium: "writing", holder: "maker", paid: false, goodFaith });
    const paid = recovery({ medium: "writing", holder: "maker", paid: true, goodFaith });
    assert.deepEqual(
      [unpaid.title, unpaid.claimant, unpaid.claim, unpaid.defense],
      ["material", "material", "ownership", "available"],
    );
    assert.equal(paid.title, unpaid.title);
    assert.equal(paid.defense, "ground-removed");
    assert.equal(
      recovery({ medium: "writing", holder: "material", paid: false, goodFaith }).claim,
      "not-supplied",
    );
  }
});
test("2.78 me possidente: the painter’s claim meets the unpaid board-value defense", () => {
  for (const goodFaith of [true, false]) {
    const unpaid = recovery({ medium: "painting", holder: "material", paid: false, goodFaith });
    assert.deepEqual(
      [unpaid.title, unpaid.claimant, unpaid.claim, unpaid.defense, unpaid.expense],
      ["maker", "maker", "ownership", "available", "The value of the board"],
    );
    assert.equal(
      recovery({ medium: "painting", holder: "material", paid: true, goodFaith }).defense,
      "ground-removed",
    );
  }
});
test("2.78 at si tu possideas: an adapted claim does not make the board owner the title holder", () => {
  const unpaid = recovery(makeRecovery());
  assert.deepEqual(
    [unpaid.title, unpaid.claimant, unpaid.claim, unpaid.defense, unpaid.expense],
    ["maker", "material", "adapted", "available", "The expense of painting"],
  );
  assert.equal(recovery({ ...makeRecovery(), paid: true }).defense, "ground-removed");
});
test("utique si gives a sufficient stated case, not an asserted converse for bad faith", () => {
  const badFaith = recovery({ ...makeRecovery(), goodFaith: false });
  assert.equal(badFaith.claim, "adapted");
  assert.equal(badFaith.title, "maker");
  assert.equal(badFaith.defense, "unresolved");
  assert.match(badFaith.reason, /does not turn the text into an express denial/);
});
test("recovery facts refuse coerced booleans, foreign media and extra results", () => {
  for (const patch of [
    { paid: "false" },
    { goodFaith: 1 },
    { holder: "court" },
    { medium: "wine" },
    { verdict: "Lucius wins" },
  ])
    assert.throws(() => readRecovery({ ...makeRecovery(), ...patch }));
  assert.deepEqual(readRecovery(makeRecovery()), makeRecovery());
});
