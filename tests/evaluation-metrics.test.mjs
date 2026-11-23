import test from "node:test";
import assert from "node:assert/strict";
import { classificationMetrics, retrievalMetrics } from "../scripts/evaluation-metrics.mjs";

test("classification metrics count true positives, false positives and false negatives", () => {
  const rows = [{ expected: "a", predicted: "a" }, { expected: "a", predicted: "b" }, { expected: "b", predicted: "a" }, { expected: "b", predicted: "b" }];
  const actual = classificationMetrics(rows, ["a", "b"]);
  assert.deepEqual(actual.confusion, [[1, 1], [1, 1]]);
  assert.equal(actual.accuracy, .5); assert.equal(actual.macroPrecision, .5); assert.equal(actual.macroRecall, .5); assert.equal(actual.macroF1, .5);
  assert(actual.accuracyWilson95[0] < .5 && actual.accuracyWilson95[1] > .5);
});

test("unsupported predictions remain errors instead of disappearing from the denominator", () => {
  const actual = classificationMetrics([{ expected: "a", predicted: "outside" }, { expected: "b", predicted: "b" }], ["a", "b"]);
  assert.equal(actual.samples, 2); assert.equal(actual.accuracy, .5); assert.equal(actual.macroF1, .5);
  assert.deepEqual(actual.confusion[0], [0, 0, 1]);
});

test("retrieval scores respect ranking, multiple relevant documents and empty results", () => {
  const actual = retrievalMetrics([{ id: "q1", relevant: ["a", "b"], retrieved: ["x", "b", "a"] }, { id: "q2", relevant: ["c"], retrieved: [] }], 3);
  assert.equal(actual.recallAtK, .5); assert.equal(actual.hitRateAtK, .5); assert.equal(actual.mrrAtK, .25); assert.equal(actual.precisionAtK, 1 / 3);
  const expectedNDCG = ((1 / Math.log2(3) + .5) / (1 + 1 / Math.log2(3))) / 2;
  assert(Math.abs(actual.ndcgAtK - expectedNDCG) < 1e-12);
});

test("metrics reject an empty evaluation rather than reporting a perfect score", () => {
  assert.throws(() => classificationMetrics([], ["a"])); assert.throws(() => retrievalMetrics([]));
});
