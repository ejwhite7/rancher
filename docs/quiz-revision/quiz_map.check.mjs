import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const map = JSON.parse(
  fs.readFileSync(path.join(directory, "quiz_map.json"), "utf8"),
);
const ids = ["AO", "OS", "MC", "AP"];
assert.deepEqual(map.archetypes, ids);
assert.deepEqual(Object.keys(map.endings), ids);
assert.equal(new Set(Object.values(map.endings)).size, 4);
const questions = new Map(
  map.questions.map((question) => [question.id, question]),
);
assert.equal(questions.size, map.questions.length);
assert.equal(
  map.questions.filter((question) => question.type === "open").length,
  2,
);
for (const question of map.questions) {
  assert.equal(typeof question.text, "string");
  assert.equal(typeof question.shared, "boolean");
  assert.ok(["choice", "open"].includes(question.type));
  if (question.type === "open") assert.equal(question.options.length, 0);
  else assert.ok(question.options.length >= 2);
  for (const option of question.options) {
    assert.deepEqual(Object.keys(option.weights), ids);
    assert.ok(
      Object.values(option.weights).every(
        (value) => Number.isFinite(value) && value >= 0 && value <= 1,
      ),
    );
  }
  for (const [role, target] of Object.entries(question.next.branch)) {
    assert.ok(ids.includes(role));
    assert.ok(questions.has(target));
  }
  if (question.next.default !== null)
    assert.ok(questions.has(question.next.default));
}
const paths = [];
function visit(id, visited = []) {
  if (id === null) {
    paths.push(visited);
    return;
  }
  assert.ok(!visited.includes(id), `Cycle at ${id}`);
  const question = questions.get(id);
  for (const target of new Set([
    question.next.default,
    ...Object.values(question.next.branch),
  ]))
    visit(target, [...visited, id]);
}
visit("q1");
for (const route of paths) {
  const nodes = route.map((id) => questions.get(id));
  assert.deepEqual(route.slice(0, 2), ["q1", "q2"]);
  assert.ok(
    nodes
      .slice(0, 2)
      .every((question) => question.shared && question.type === "choice"),
  );
  assert.ok(route.length >= 6 && route.length <= 8, route.join(" → "));
  assert.equal(nodes.filter((question) => question.type === "open").length, 2);
  assert.ok(nodes.filter((question) => question.type === "choice").length >= 4);
  assert.deepEqual(route.slice(-2), ["q7_dataset", "q8_discussion"]);
  assert.equal(route.length, 8);
  assert.equal(
    nodes.filter((question) => question.type === "choice").length,
    6,
  );
}
assert.deepEqual([...new Set(paths.map((route) => route.length))].sort(), [8]);
console.log(
  `PASS: ${questions.size} definitions; ${paths.length} structural paths; every path has 6–8 questions, 4–6 choices, and exactly 2 open answers.`,
);
