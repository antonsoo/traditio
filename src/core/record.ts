import { type ArgumentDraft, claimIds, MAX_NOTE_LENGTH } from "./argument";
import { type Case, type Lesson, ruleIds, type Years } from "./model";

type LegacyRecord = {
  format: "traditio-case";
  version: 1;
  current: Case;
  pinned: Case | null;
};
export type RecordFile =
  | LegacyRecord
  | (Omit<LegacyRecord, "version"> & {
      version: 2;
      argument: ArgumentDraft;
    });

export const MAX_RECORD_BYTES = 16_384;

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected a case object.");
  }
  return value as Record<string, unknown>;
}

function keys(value: Record<string, unknown>, expected: string[]): void {
  if (
    Object.keys(value).length !== expected.length ||
    expected.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new Error("This case has missing or unrecognized fields. Use a case saved by Traditio.");
  }
}

function member<T extends string>(value: unknown, options: readonly T[], label: string): T {
  if (typeof value !== "string" || !options.includes(value as T)) {
    throw new Error(`Invalid ${label}. Expected ${options.join(" or ")}.`);
  }
  return value as T;
}

export function readCase(value: unknown): Case {
  const input = object(value);
  const lesson = member<Lesson>(input.lesson, ["delivery", "good-faith", "land"], "investigation");
  if (!Number.isInteger(input.years) || ![0, 1, 2, 3].includes(input.years as number)) {
    throw new Error("Possession must be 0, 1, 2, or 3 completed years.");
  }
  const years = input.years as Years;
  if (lesson === "delivery") {
    keys(input, ["lesson", "thing", "form", "years"]);
    const thing = member(input.thing, ["cup", "mule", "field"], "thing");
    const form = member(input.form, ["delivery", "mancipation"], "conveyance");
    if (thing === "cup" && form !== "delivery") {
      throw new Error(
        "The cup case uses delivery alone. Formal conveyances of res nec mancipi are outside this workshop.",
      );
    }
    return { lesson, thing, form, years };
  }
  const belief = member(input.belief, ["good", "bad"], "buyer's belief");
  if (lesson === "good-faith") {
    keys(input, ["lesson", "seller", "belief", "years"]);
    return { lesson, seller: member(input.seller, ["heir", "thief"], "seller"), belief, years };
  }
  keys(input, ["lesson", "entry", "location", "belief", "years"]);
  return {
    lesson,
    entry: member(input.entry, ["peaceful", "violent"], "entry"),
    location: member(input.location, ["italy", "province"], "location"),
    belief,
    years,
  };
}

export function readArgument(value: unknown): ArgumentDraft {
  const input = object(value);
  keys(input, ["claim", "witness", "citations", "note"]);
  const claim = member(input.claim, claimIds, "argument claim");
  if (!Array.isArray(input.citations) || input.citations.length > ruleIds.length) {
    throw new Error("The argument must cite a list of retained passages.");
  }
  const citations = input.citations.map((id) => member(id, ruleIds, "cited passage"));
  if (new Set(citations).size !== citations.length) {
    throw new Error("Each passage can be cited only once in an argument.");
  }
  if (typeof input.note !== "string" || input.note.length > MAX_NOTE_LENGTH) {
    throw new Error(
      `The written explanation must be text of at most ${MAX_NOTE_LENGTH} characters.`,
    );
  }
  return {
    claim,
    witness: input.witness === null ? null : readCase(input.witness),
    citations,
    note: input.note,
  };
}

export function readRecord(text: string): RecordFile {
  if (new TextEncoder().encode(text).byteLength > MAX_RECORD_BYTES) {
    throw new Error("This file is too large. Traditio cases must be smaller than 16 KiB.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This is not valid JSON. Open a case saved by Traditio.");
  }
  const record = object(parsed);
  if (record.format !== "traditio-case" || (record.version !== 1 && record.version !== 2)) {
    throw new Error(
      "This is not a supported Traditio case. Expected format traditio-case, version 1 or 2.",
    );
  }
  keys(
    record,
    record.version === 1
      ? ["format", "version", "current", "pinned"]
      : ["format", "version", "current", "pinned", "argument"],
  );
  const cases: LegacyRecord = {
    format: "traditio-case",
    version: 1,
    current: readCase(record.current),
    pinned: record.pinned === null ? null : readCase(record.pinned),
  };
  return record.version === 1
    ? cases
    : { ...cases, version: 2, argument: readArgument(record.argument) };
}

export function writeRecord(
  current: Case,
  pinned: Case | null,
  argument: ArgumentDraft | null = null,
): string {
  return JSON.stringify(
    (argument
      ? { format: "traditio-case", version: 2, current, pinned, argument }
      : { format: "traditio-case", version: 1, current, pinned }) satisfies RecordFile,
    null,
    2,
  );
}

export function shareUrl(
  base: string,
  current: Case,
  pinned: Case | null,
  argument: ArgumentDraft | null = null,
): string {
  const url = new URL(base);
  url.hash = `case=${encodeURIComponent(writeRecord(current, pinned, argument))}`;
  return url.href;
}

export function fromHash(hash: string): RecordFile | null {
  if (!hash.startsWith("#case=")) return null;
  if (hash.length > MAX_RECORD_BYTES * 3) throw new Error("The shared case is too large.");
  let text: string;
  try {
    text = decodeURIComponent(hash.slice(6));
  } catch {
    throw new Error("The shared case link is damaged. Try opening the saved JSON instead.");
  }
  return readRecord(text);
}
