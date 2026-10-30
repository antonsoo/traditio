import assert from "node:assert/strict";
import test from "node:test";
import {
  type Act,
  makeRehearsal,
  readRehearsal,
  replay,
  writeRehearsal,
} from "../src/core/ceremony";

test("1.119: at least five witnesses plus another person, three acquirer's acts", () => {
  for (const witnesses of [4, 5, 6] as const)
    for (const holder of ["separate", "shared"] as const) {
      const record = makeRehearsal();
      record.arrangement.witnesses = witnesses;
      record.arrangement.holder = holder;
      record.events = ["buyer-claim", "strike", "give"];
      assert.equal(replay(record).complete, witnesses >= 5 && holder === "separate");
    }
  const record = makeRehearsal();
  record.arrangement.witnesses = 5;
  for (const event of [
    "give",
    "seller-claim",
    "buyer-claim",
    "give",
    "strike",
    "give",
    "give",
  ] as Act[])
    record.events.push(event);
  assert.deepEqual(
    replay(record).steps.map((s) => s.accepted),
    [false, false, true, false, true, true, false],
  );
});
test("1.121: absent land and absent animal are different; presence does not grant title alone", () => {
  const record = makeRehearsal();
  record.arrangement.witnesses = 5;
  record.arrangement.present = false;
  record.events = ["buyer-claim", "strike", "give"];
  assert.equal(replay(record).complete, false);
  record.arrangement.thing = "field";
  assert.equal(replay(record).complete, true);
  record.events = ["buyer-claim", "strike"];
  assert.equal(replay(record).title, "Lucius");
});
test("2.24: silence and disclaimer require an award; counterclaim does not fabricate a winner", () => {
  for (const response of ["silence", "disclaim", "counterclaim"] as const) {
    const record = makeRehearsal();
    record.arrangement.route = "magistrate";
    record.events = ["award", "silence", "buyer-claim", "ask", response];
    const before = replay(record);
    assert.deepEqual(
      before.steps.map((s) => s.accepted),
      [false, false, true, true, true],
    );
    assert.equal(before.complete, false);
    record.events.push("award");
    const after = replay(record);
    assert.equal(after.complete, response !== "counterclaim");
    assert.equal(after.title, response === "counterclaim" ? "Dispute outside this model" : "Aulus");
  }
});
test("record is facts and attempts, rejects forged results, unknown events and coercible arrangement fields", () => {
  const record = makeRehearsal();
  record.note = "<script>literal learner text</script>";
  record.events = ["give", "buyer-claim"];
  assert.deepEqual(readRehearsal(writeRehearsal(record)), record);
  for (const bad of [
    { ...record, result: "Aulus" },
    { ...record, events: ["invented"] },
    { ...record, events: Array(41).fill("give") },
    { ...record, arrangement: { ...record.arrangement, route: ["bronze"] } },
    { ...record, arrangement: { ...record.arrangement, thing: ["mule"] } },
    { ...record, arrangement: { ...record.arrangement, holder: ["separate"] } },
    { ...record, arrangement: { ...record.arrangement, route: "magistrate", thing: "field" } },
  ])
    assert.throws(() => readRehearsal(JSON.stringify(bad)));
});
