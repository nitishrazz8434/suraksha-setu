export const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const divide = (a, b) => b ? a / b : 0;

export function classificationMetrics(rows, classes) {
  if (!rows.length) throw new Error("Cannot measure classification without labelled predictions.");
  const labels = [...new Set([...classes, ...rows.map(row => row.predicted)])];
  if (rows.some(row => !classes.includes(row.expected))) throw new Error("Unexpected ground-truth class.");
  const confusion = labels.map(expected => labels.map(predicted => rows.filter(row => row.expected === expected && row.predicted === predicted).length));
  const perClass = classes.map(label => {
    const tp = rows.filter(row => row.expected === label && row.predicted === label).length;
    const fp = rows.filter(row => row.expected !== label && row.predicted === label).length;
    const fn = rows.filter(row => row.expected === label && row.predicted !== label).length;
    const support = tp + fn, precision = divide(tp, tp + fp), recall = divide(tp, support);
    return { label, support, tp, fp, fn, precision, recall, f1: divide(2 * precision * recall, precision + recall) };
  });
  const correct = rows.filter(row => row.expected === row.predicted).length;
  const accuracy = correct / rows.length, n = rows.length, z = 1.96, denominator = 1 + z * z / n;
  const midpoint = (accuracy + z * z / (2 * n)) / denominator;
  const radius = z * Math.sqrt(accuracy * (1 - accuracy) / n + z * z / (4 * n * n)) / denominator;
  return { samples: n, correct, accuracy, accuracyWilson95: [midpoint - radius, midpoint + radius], macroPrecision: mean(perClass.map(row => row.precision)), macroRecall: mean(perClass.map(row => row.recall)), macroF1: mean(perClass.map(row => row.f1)), weightedF1: perClass.reduce((sum, row) => sum + row.f1 * row.support, 0) / n, labels, confusion, perClass };
}

export function retrievalMetrics(rows, k = 3) {
  if (!rows.length) throw new Error("Cannot measure retrieval without relevance judgements.");
  const cases = rows.map(row => {
    if (!row.relevant.length) throw new Error("Each scored retrieval query must have relevant documents.");
    const retrieved = row.retrieved.slice(0, k), relevant = new Set(row.relevant);
    const hits = retrieved.filter(id => relevant.has(id)).length;
    const rank = retrieved.findIndex(id => relevant.has(id));
    const dcg = retrieved.reduce((sum, id, index) => sum + (relevant.has(id) ? 1 / Math.log2(index + 2) : 0), 0);
    const idcg = Array.from({ length: Math.min(k, relevant.size) }, (_, index) => 1 / Math.log2(index + 2)).reduce((a, b) => a + b, 0);
    return { id: row.id, precision: hits / k, recall: hits / relevant.size, hit: hits ? 1 : 0, reciprocalRank: rank < 0 ? 0 : 1 / (rank + 1), ndcg: dcg / idcg };
  });
  return { queries: rows.length, k, precisionAtK: mean(cases.map(row => row.precision)), recallAtK: mean(cases.map(row => row.recall)), hitRateAtK: mean(cases.map(row => row.hit)), mrrAtK: mean(cases.map(row => row.reciprocalRank)), ndcgAtK: mean(cases.map(row => row.ndcg)), cases };
}
