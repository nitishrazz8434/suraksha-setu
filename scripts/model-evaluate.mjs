import { pipeline, env, RawImage } from "@huggingface/transformers";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { classificationMetrics, retrievalMetrics, mean } from "./evaluation-metrics.mjs";

env.allowLocalModels = false;
env.cacheDir = ".sites-runtime/model-cache";
const outputDir = "docs/evaluation", cacheDir = ".sites-runtime/evaluation";
mkdirSync(outputDir, { recursive: true }); mkdirSync(cacheDir, { recursive: true });
const readJSON = path => JSON.parse(readFileSync(path, "utf8"));
const sha = value => createHash("sha256").update(value).digest("hex");
const textCases = readJSON("evaluation/text-cases.json"), retrievalCases = readJSON("evaluation/retrieval-cases.json");
const percent = value => `${(100 * value).toFixed(2)}%`;
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
const latency = values => ({ meanMs: mean(values), medianMs: median(values), p95Ms: [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * .95) - 1)] ?? 0 });
const disasterLabels = ["floodwater covering streets or homes", "mud and rocks from a landslide covering a slope or road", "collapsed or visibly damaged buildings after an earthquake", "buildings or trees damaged by a cyclone or severe wind", "an active wildfire with flames or heavy smoke", "coastal storm surge or tsunami water reaching land", "drought-affected land with very dry soil or failed crops", "an ordinary outdoor scene with no obvious disaster signs", "an ordinary indoor scene with no obvious disaster signs"];
const imageLabelMap = ["flood", "landslide", "earthquake", "hurricane", "fire", "tsunami", "drought", "not_disaster", "not_disaster"];
const imageClasses = ["earthquake", "flood", "hurricane", "fire", "landslide"];
// Verify the evaluation candidates match the live worker rather than silently testing easier prompts.
const workerSource = readFileSync("lib/ai.worker.ts", "utf8");
for (const label of [...textCases.labels, ...disasterLabels]) {
  if (!workerSource.includes(JSON.stringify(label))) throw new Error(`Evaluation label does not match worker: ${label}`);
}

const results = {
  generatedAt: new Date().toISOString(), runtime: { node: process.version, device: "cpu", dtype: "q8" },
  workerSourceSha256: sha(workerSource), textFixtureSha256: sha(readFileSync("evaluation/text-cases.json")), retrievalFixtureSha256: sha(readFileSync("evaluation/retrieval-cases.json")),
  caveats: ["Small diagnostic evaluation; no models were trained, fine-tuned or tuned against these results.", "Text and retrieval judgements are authored fixtures, not an independently annotated representative field benchmark.", "DisasterVQA images are sampled from published annotations, not a claimed held-out split. Unknown pretraining overlap cannot be ruled out.", "The image sample contains five known disaster classes and no ordinary-scene negatives, so it cannot measure disaster-vs-normal false alarms.", "Classification scores measure top-1 labels, not calibrated confidence or the probability of future disasters.", "CPU evaluation does not establish browser performance or identical numerical output across runtimes."],
  tasks: [], unavailable: [],
};
const flags = process.argv.slice(2), selectedTasks = ["text", "rag", "vision"].filter(name => flags.includes(`--${name}`));
const enabled = name => !selectedTasks.length || selectedTasks.includes(name);
if (selectedTasks.length && existsSync(`${outputDir}/model-metrics.json`)) {
  const previous = readJSON(`${outputDir}/model-metrics.json`);
  if (previous.workerSourceSha256 !== results.workerSourceSha256 || previous.textFixtureSha256 !== results.textFixtureSha256 || previous.retrievalFixtureSha256 !== results.retrievalFixtureSha256) throw new Error("Sources or fixtures changed; rerun the full evaluation instead of combining incompatible results.");
  const taskGroup = task => task.kind === "retrieval" ? "rag" : task.language ? "text" : "vision";
  results.tasks = previous.tasks.filter(task => !selectedTasks.includes(taskGroup(task)));
  results.unavailable = previous.unavailable.filter(row => !selectedTasks.includes(row.task));
  results.previousRunAt = previous.generatedAt;
}
const perClass = Number(flags.find(flag => flag.startsWith("--per-class="))?.split("=")[1] ?? 12);
if (!Number.isInteger(perClass) || perClass < 1 || perClass > 100) throw new Error("--per-class must be an integer between 1 and 100");

async function fetchData(url, json = true) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
      if (!response.ok) {
        if (attempt < 3 && [429, 500, 502, 503, 504].includes(response.status)) {
          const delay = Math.min(30000, Math.max(1000 * 2 ** attempt, (Number(response.headers.get("retry-after")) || 0) * 1000));
          await new Promise(resolve => setTimeout(resolve, delay)); continue;
        }
        throw new Error(`HTTP ${response.status}: ${new URL(url).pathname}`);
      }
      return json ? await response.json() : Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt === 3 || /HTTP 4\d\d/.test(error.message)) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
  throw new Error("Dataset request exhausted retries");
}

async function prepareImages() {
  const dir = `${cacheDir}/disastervqa`; mkdirSync(dir, { recursive: true });
  const metadata = await fetchData("https://huggingface.co/api/datasets/QCRI/DisasterVQA");
  const samplePath = `${dir}/sample-${perClass}.json`;
  let manifest;
  if (existsSync(samplePath)) manifest = readJSON(samplePath);
  else {
    const bytes = await fetchData(`https://huggingface.co/datasets/QCRI/DisasterVQA/raw/${metadata.sha}/disastervqa_annotations.jsonl`, false);
    writeFileSync(`${dir}/annotations-${metadata.sha}.jsonl`, bytes);
    const annotations = bytes.toString("utf8").trim().split("\n").map(JSON.parse);
    const grouped = new Map();
    for (const row of annotations) {
      if (typeof row.image_path !== "string" || !row.image_path.startsWith("DisasterVQA/")) throw new Error("Invalid annotation image path");
      const label = row.disaster_type === "wildfire" ? "fire" : row.disaster_type;
      const entry = grouped.get(row.image_path) ?? { imageId: row.image_id, imagePath: row.image_path, sourceDataset: row.dataset_source, labels: new Set() };
      entry.labels.add(label); grouped.set(row.image_path, entry);
    }
    const conflicts = [...grouped.values()].filter(row => row.labels.size !== 1);
    const collected = [...grouped.values()].filter(row => row.labels.size === 1).map(row => ({ imageId: row.imageId, imagePath: row.imagePath, sourceDataset: row.sourceDataset, label: [...row.labels][0] }));
    const samples = imageClasses.flatMap(label => {
      const candidates = collected.filter(row => row.label === label).sort((a, b) => sha(`suraksha-evaluation-v1:${a.imagePath}`).localeCompare(sha(`suraksha-evaluation-v1:${b.imagePath}`)));
      if (candidates.length < perClass) throw new Error(`Not enough ${label} annotated images: ${candidates.length}`);
      return candidates.slice(0, perClass);
    });
    manifest = { dataset: "QCRI/DisasterVQA", revision: metadata.sha, split: "Published annotations; no held-out split claimed", license: "Dataset card: CC-BY-SA-4.0. Underlying sources retain their attribution and terms; images are not redistributed.", source: "https://huggingface.co/datasets/QCRI/DisasterVQA", perClass, sampling: "First 12 unique paths per supported class in SHA256(seed + imagePath) order, fixed before inference. wildfire maps to fire. No image is repeated for multiple questions. Unsupported disaster labels and inconsistent image labels are excluded. All nine application candidate descriptions remain eligible predictions.", annotationSha256: sha(bytes), uniqueImages: grouped.size, conflictingLabelsExcluded: conflicts.map(row => row.imagePath), availableByClass: Object.fromEntries(imageClasses.map(label => [label, collected.filter(row => row.label === label).length])), samples };
    writeFileSync(samplePath, JSON.stringify(manifest, null, 2));
  }
  if (manifest.revision !== metadata.sha) throw new Error("DisasterVQA revision changed; review the frozen manifest before rerunning.");
  for (let index = 0; index < manifest.samples.length; index += 3) {
    await Promise.all(manifest.samples.slice(index, index + 3).map(async sample => {
      const file = `${dir}/${sha(sample.imagePath).slice(0, 24)}.jpg`;
      if (!existsSync(file)) {
        const path = sample.imagePath.split("/").map(encodeURIComponent).join("/");
        const bytes = await fetchData(`https://huggingface.co/datasets/QCRI/DisasterVQA/resolve/${metadata.sha}/${path}`, false);
        writeFileSync(file, bytes);
      }
      sample.localPath = file; sample.imageSha256 = sha(readFileSync(file));
    }));
    console.log(`CV image preparation: ${Math.min(index + 3, manifest.samples.length)}/${manifest.samples.length}`);
  }
  writeFileSync(samplePath, JSON.stringify(manifest, null, 2));
  writeFileSync(`${outputDir}/vision-sample.json`, JSON.stringify({ ...manifest, samples: manifest.samples.map(sample => ({ imageId: sample.imageId, label: sample.label, imagePath: sample.imagePath, sourceDataset: sample.sourceDataset, imageSha256: sample.imageSha256 })) }, null, 2));
  return manifest;
}

async function evaluateText() {
  const modelName = "Xenova/mobilebert-uncased-mnli", started = performance.now();
  const model = await pipeline("zero-shot-classification", modelName, { dtype: "q8", device: "cpu" });
  const loadMs = performance.now() - started;
  try {
    for (const language of ["english", "hindi"]) {
      const predictions = [], times = [];
      for (const [expected, texts] of Object.entries(textCases[language])) {
        for (const text of texts) {
          const t = performance.now(), output = await model(text, textCases.labels, { multi_label: true });
          times.push(performance.now() - t);
          predictions.push({ id: `${language}-${predictions.length + 1}`, text, expected, predicted: output.labels[0], modelScore: output.scores[0] });
        }
        console.log(`NLP ${language}: ${predictions.length} cases evaluated`);
      }
      results.tasks.push({ name: `Incident text classification (${language})`, kind: "classification", language, model: modelName, data: "Manually labelled diagnostic cases", loadMs, latency: latency(times), metrics: classificationMetrics(predictions, textCases.labels), predictions });
    }
  } finally { await model.dispose(); }
}

async function evaluateRetrieval() {
  const modelName = "Xenova/paraphrase-multilingual-MiniLM-L12-v2", started = performance.now();
  const model = await pipeline("feature-extraction", modelName, { dtype: "q8", device: "cpu" });
  const loadMs = performance.now() - started;
  try {
    const passages = retrievalCases.passages;
    const passageVectors = (await model(passages.map(row => row.text), { pooling: "mean", normalize: true })).tolist();
    const predictions = [], times = [];
    for (const query of retrievalCases.queries) {
      const t = performance.now(), vector = (await model(query.question, { pooling: "mean", normalize: true })).tolist()[0];
      const ranked = passageVectors.map((values, index) => ({ id: passages[index].id, score: values.reduce((sum, value, i) => sum + value * vector[i], 0) })).sort((a, b) => b.score - a.score);
      // Mirrors the worker's top four and the Copilot's >0.34 filter, then at most three passages.
      const selected = ranked.slice(0, 4).filter(row => row.score > .34).slice(0, 3);
      times.push(performance.now() - t);
      predictions.push({ ...query, retrieved: selected.map(row => row.id), ranked: ranked.slice(0, 4) });
    }
    results.tasks.push({ name: "RAG document retrieval", kind: "retrieval", model: modelName, data: "24 authored English/Hindi questions over 16 fictional passages", settings: { k: 3, similarityThreshold: .34, generationEvaluated: false }, loadMs, latency: latency(times), metrics: retrievalMetrics(predictions, 3), predictions });
    console.log(`RAG: ${predictions.length} questions evaluated`);
  } finally { await model.dispose(); }
}

async function evaluateVision() {
  const sample = await prepareImages(), modelName = "Xenova/clip-vit-base-patch32", started = performance.now();
  const model = await pipeline("zero-shot-image-classification", modelName, { dtype: "q8", device: "cpu" });
  const loadMs = performance.now() - started;
  try {
    const predictions = [], times = [];
    for (const row of sample.samples) {
      const image = await RawImage.read(resolve(row.localPath));
      const t = performance.now(), output = await model(image, disasterLabels);
      times.push(performance.now() - t);
      const index = disasterLabels.indexOf(output[0].label);
      if (index < 0) throw new Error("Unexpected CLIP label");
      predictions.push({ imageId: row.imageId, imagePath: row.imagePath, imageSha256: row.imageSha256, expected: row.label, predicted: imageLabelMap[index], winningDescription: output[0].label, modelScore: output[0].score });
      if (predictions.length % perClass === 0) console.log(`CV: ${predictions.length}/${sample.samples.length} images evaluated`);
    }
    results.tasks.push({ name: "Disaster image classification", kind: "classification", model: modelName, data: { dataset: sample.dataset, revision: sample.revision, split: sample.split, perClass, manifest: "vision-sample.json" }, settings: { candidates: disasterLabels, outputMapping: imageLabelMap, note: "Top-1 over the application's nine descriptions, retaining tsunami/drought/not_disaster as possible incorrect outputs. Caption generation, UI confidence thresholds and VQA answers are not evaluated." }, loadMs, latency: latency(times), metrics: classificationMetrics(predictions, imageClasses), predictions });
  } finally { await model.dispose(); }
}

function renderReport() {
  const lines = ["# Local model evaluation", "", `Generated: ${results.generatedAt}`, "", "These are observed results from quantized pretrained models on a small frozen diagnostic sample. They do not certify operational disaster accuracy. No custom model training was performed.", "", "| Task | Samples | Accuracy | Macro precision | Macro recall | Macro F1 |", "|---|---:|---:|---:|---:|---:|"];
  for (const task of results.tasks.filter(row => row.kind === "classification")) {
    const m = task.metrics;
    lines.push(`| ${task.name} | ${m.samples} | ${percent(m.accuracy)} | ${percent(m.macroPrecision)} | ${percent(m.macroRecall)} | ${percent(m.macroF1)} |`);
  }
  for (const task of results.tasks) {
    lines.push("", `## ${task.name}`, "", `Model: \`${task.model}\`. Mean inference time: ${task.latency.meanMs.toFixed(1)} ms; median: ${task.latency.medianMs.toFixed(1)} ms. Device: CPU, quantization: q8. Model loading is measured separately (${task.loadMs.toFixed(0)} ms).`);
    if (task.kind === "classification") {
      const m = task.metrics;
      lines.push("", `Correct: ${m.correct}/${m.samples}. Descriptive Wilson 95% interval: ${percent(m.accuracyWilson95[0])}–${percent(m.accuracyWilson95[1])}. This binomial interval assumes independent samples. These convenience/stratified diagnostics do not justify a population-level confidence claim, and the interval does not account for correlated images or dataset shift.`, "", "| Class | Support | TP | FP | FN | Precision | Recall | F1 |", "|---|---:|---:|---:|---:|---:|---:|---:|---:|");
      for (const row of m.perClass) lines.push(`| ${row.label} | ${row.support} | ${row.tp} | ${row.fp} | ${row.fn} | ${percent(row.precision)} | ${percent(row.recall)} | ${percent(row.f1)} |`);
      lines.push("", "Confusion matrix: rows are ground truth; columns are predictions.", "", `| Actual / predicted | ${m.labels.join(" | ")} |`, `|---|${m.labels.map(() => "---:").join("|")}|`);
      for (let index = 0; index < m.labels.length; index++) lines.push(`| ${m.labels[index]} | ${m.confusion[index].join(" | ")} |`);
    } else {
      const m = task.metrics;
      lines.push("", `Queries: ${m.queries}; corpus: ${retrievalCases.passages.length} fictional passages; k=${m.k}; cosine threshold >0.34.`, "", `- Precision@3: ${percent(m.precisionAtK)}`, `- Recall@3: ${percent(m.recallAtK)}`, `- Hit rate@3: ${percent(m.hitRateAtK)}`, `- MRR@3: ${m.mrrAtK.toFixed(4)}`, `- nDCG@3: ${m.ndcgAtK.toFixed(4)}`, "", "Precision divides by the requested three slots, including empty slots. Most queries have only one relevant passage, so a perfect retrieval can have precision@3 of one third. These metrics evaluate retrieval, not generated-answer correctness.");
    }
  }
  lines.push("", "## Data and reproducibility", "",
    "- Text cases: `evaluation/text-cases.json` (60 English, 12 Hindi; 6 classes). These are developer-authored cases with one dominant label, not independently annotated field reports.",
    "- Retrieval cases: `evaluation/retrieval-cases.json` (24 questions, 16 fictional passages). Scores use the same retrieval threshold and maximum context passages as the app, with each passage shorter than the app's chunk limit.",
    "- Vision: [QCRI DisasterVQA](https://huggingface.co/datasets/QCRI/DisasterVQA), a deterministically sampled subset of published disaster_type annotations adapted to image classification. It is not a claimed held-out test split or a VQA-answer benchmark. See `docs/evaluation/vision-sample.json` for paths, revision, selection method and image hashes. Images stay in ignored local storage and are never added to the operating workspace.",
    "- DisasterVQA reference: Al-Mohannadi et al., *DisasterVQA: A Visual Question Answering Benchmark Dataset for Disaster Scenes*, ICWSM 2026, https://arxiv.org/abs/2601.13839. The publisher's card declares CC-BY-SA-4.0; underlying image sources retain their attribution and terms. Images are not redistributed with this report.",
    "- The MEDIC dataset viewer first returned 502/429 errors, so no MEDIC test-split score is claimed. The final image evaluation uses DisasterVQA's directly downloadable publisher files.",
    "- Vision ground truth has five classes: earthquake, flood, hurricane, fire (including wildfire), and landslide. Other labels, inconsistent annotations, and repeated question rows are excluded before inference. There are no ordinary-scene negatives, so false alarms on normal photos are not measured.",
    "- All nine application descriptions remain prediction candidates. Top-1 is mapped to the corresponding class after ranking; unsupported and ordinary-scene predictions on disaster images count as errors. This preserves the app's classification configuration rather than simplifying it to five choices.",
    "- Raw predictions, confusion matrices and fixture/worker hashes are in `docs/evaluation/model-metrics.json`.",
    "- Reproduce with `npm run evaluate:models`. Use `-- --text`, `-- --rag`, or `-- --vision` for a single component; compatible previous components are retained. Use `-- --report-only` to regenerate Markdown from saved results. Internet is needed for initial model/image downloads. Node CPU latency differs from browser WebAssembly latency.",
    "", "## Metric definitions", "",
    "Accuracy = correct top-1 predictions / all samples. For each class, precision = TP / (TP + FP), recall = TP / (TP + FN), and F1 = 2 × precision × recall / (precision + recall). Macro metrics average the per-class values equally. Zero-division metrics are set to zero.",
    "Recall@3 is the fraction of judged relevant passages appearing in the three selected context slots. Hit rate is the fraction of queries retrieving at least one relevant passage. MRR rewards the rank of the first relevant passage; nDCG also considers the ranks of multiple relevant passages.",
    "", "## Interpretation and unmeasured components", "", ...results.caveats.map(value => `- ${value}`),
    "- SegFormer segmentation requires labelled pixel masks for IoU/Dice. YOLOS detection requires annotated boxes for mAP. Neither metric is inferred from image-classification labels.",
    "- Captioning and Qwen/FLAN answers require task-specific reference answers or a reviewed faithfulness/rubric evaluation. No language-generation accuracy is claimed here.",
    "- Historical GIS layers, weather forecasts, optimisation and verified incident workflows are not evaluated by these model classification scores.");
  if (results.unavailable.length) lines.push("", "## Incomplete evaluations", "", ...results.unavailable.map(row => `- ${row.task}: ${row.error}`));
  return `${lines.join("\n")}\n`;
}

if (flags.includes("--report-only")) {
  Object.assign(results, readJSON(`${outputDir}/model-metrics.json`));
  writeFileSync("docs/MODEL_EVALUATION.md", renderReport());
  console.log("Regenerated docs/MODEL_EVALUATION.md from saved results.");
  process.exit(0);
}

for (const [name, run] of [["text", evaluateText], ["rag", evaluateRetrieval], ["vision", evaluateVision]]) {
  if (!enabled(name)) continue;
  console.log(`Evaluating ${name}…`);
  try { await run(); }
  catch (error) { results.unavailable.push({ task: name, error: error.message }); console.error(`${name}: ${error.message}`); }
  writeFileSync(`${outputDir}/model-metrics.json`, JSON.stringify(results, null, 2));
  writeFileSync("docs/MODEL_EVALUATION.md", renderReport());
}
console.log(`Saved docs/MODEL_EVALUATION.md and ${outputDir}/model-metrics.json`);
for (const task of results.tasks) console.log(JSON.stringify({ task: task.name, metrics: task.kind === "classification" ? { samples: task.metrics.samples, accuracy: task.metrics.accuracy, precision: task.metrics.macroPrecision, recall: task.metrics.macroRecall, f1: task.metrics.macroF1 } : { queries: task.metrics.queries, recallAt3: task.metrics.recallAtK, mrrAt3: task.metrics.mrrAtK } }));
if (results.unavailable.length) process.exitCode = 1;
