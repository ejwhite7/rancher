import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const reportPath = process.argv[2];
const mapPath = process.argv[3];
assert(
  reportPath && mapPath,
  "Usage: node scripts/quiz-source.check.mjs /path/to/archetypes.md /path/to/quiz_map.json",
);
const report = readFileSync(reportPath, "utf8");
const original = JSON.parse(readFileSync(mapPath, "utf8"));
const copied = JSON.parse(
  readFileSync(new URL("../src/data/quiz_map.json", import.meta.url), "utf8"),
);
const landings = JSON.parse(
  readFileSync(
    new URL("../src/data/quiz-landings.json", import.meta.url),
    "utf8",
  ),
);
assert.deepEqual(
  copied,
  original,
  "The checked-in map must match the supplied map.",
);
const quotes = new Map(
  [...report.matchAll(/((?:^>.*\n)+)\n\*\*(Q\d+) \|/gm)].map((match) => [
    match[2],
    match[1]
      .trimEnd()
      .split("\n")
      .map((line) => line.replace(/^> ?/, ""))
      .join("\n"),
  ]),
);
for (const [id, landing] of Object.entries(landings)) {
  assert.equal(
    landing.quote,
    quotes.get(landing.quote_id),
    `${id}: quote must match its exact source block, including punctuation and line breaks.`,
  );
  assert(
    !/@|https?:|mail\.google/.test(landing.quote),
    `${id}: public excerpt contains contact details or links.`,
  );
}
assert.deepEqual(Object.keys(landings).sort(), [...copied.archetypes].sort());
console.log(
  `PASS: original map preserved; 4 exact anonymous quote blocks verified; report SHA-256 ${createHash("sha256").update(report).digest("hex")}`,
);
