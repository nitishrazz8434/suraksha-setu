# Local model evaluation

Generated: 2026-11-02T06:52:33.024Z

These are observed results from quantized pretrained models on a small frozen diagnostic sample. They do not certify operational disaster accuracy. No custom model training was performed.

| Task | Samples | Accuracy | Macro precision | Macro recall | Macro F1 |
|---|---:|---:|---:|---:|---:|
| Incident text classification (english) | 60 | 50.00% | 62.96% | 50.00% | 45.65% |
| Incident text classification (hindi) | 12 | 16.67% | 3.03% | 16.67% | 5.13% |
| Disaster image classification | 60 | 68.33% | 76.50% | 68.33% | 68.98% |

## Incident text classification (english)

Model: `Xenova/mobilebert-uncased-mnli`. Mean inference time: 103.6 ms; median: 100.0 ms. Device: CPU, quantization: q8. Model loading is measured separately (1401 ms).

Correct: 30/60. Descriptive Wilson 95% interval: 37.73%–62.27%. This binomial interval assumes independent samples. These convenience/stratified diagnostics do not justify a population-level confidence claim, and the interval does not account for correlated images or dataset shift.

| Class | Support | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| flood or inundation | 10 | 4 | 1 | 6 | 80.00% | 40.00% | 53.33% |
| landslide or slope failure | 10 | 1 | 0 | 9 | 100.00% | 10.00% | 18.18% |
| damaged or blocked infrastructure | 10 | 10 | 26 | 0 | 27.78% | 100.00% | 43.48% |
| request for food, water or shelter | 10 | 7 | 3 | 3 | 70.00% | 70.00% | 70.00% |
| medical assistance | 10 | 8 | 0 | 2 | 100.00% | 80.00% | 88.89% |
| unrelated information | 10 | 0 | 0 | 10 | 0.00% | 0.00% | 0.00% |

Confusion matrix: rows are ground truth; columns are predictions.

| Actual / predicted | flood or inundation | landslide or slope failure | damaged or blocked infrastructure | request for food, water or shelter | medical assistance | unrelated information |
|---|---:|---:|---:|---:|---:|---:|
| flood or inundation | 4 | 0 | 6 | 0 | 0 | 0 |
| landslide or slope failure | 1 | 1 | 8 | 0 | 0 | 0 |
| damaged or blocked infrastructure | 0 | 0 | 10 | 0 | 0 | 0 |
| request for food, water or shelter | 0 | 0 | 3 | 7 | 0 | 0 |
| medical assistance | 0 | 0 | 1 | 1 | 8 | 0 |
| unrelated information | 0 | 0 | 8 | 2 | 0 | 0 |

## Incident text classification (hindi)

Model: `Xenova/mobilebert-uncased-mnli`. Mean inference time: 166.6 ms; median: 145.8 ms. Device: CPU, quantization: q8. Model loading is measured separately (1401 ms).

Correct: 2/12. Descriptive Wilson 95% interval: 4.70%–44.80%. This binomial interval assumes independent samples. These convenience/stratified diagnostics do not justify a population-level confidence claim, and the interval does not account for correlated images or dataset shift.

| Class | Support | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| flood or inundation | 2 | 0 | 0 | 2 | 0.00% | 0.00% | 0.00% |
| landslide or slope failure | 2 | 0 | 0 | 2 | 0.00% | 0.00% | 0.00% |
| damaged or blocked infrastructure | 2 | 2 | 9 | 0 | 18.18% | 100.00% | 30.77% |
| request for food, water or shelter | 2 | 0 | 1 | 2 | 0.00% | 0.00% | 0.00% |
| medical assistance | 2 | 0 | 0 | 2 | 0.00% | 0.00% | 0.00% |
| unrelated information | 2 | 0 | 0 | 2 | 0.00% | 0.00% | 0.00% |

Confusion matrix: rows are ground truth; columns are predictions.

| Actual / predicted | flood or inundation | landslide or slope failure | damaged or blocked infrastructure | request for food, water or shelter | medical assistance | unrelated information |
|---|---:|---:|---:|---:|---:|---:|
| flood or inundation | 0 | 0 | 2 | 0 | 0 | 0 |
| landslide or slope failure | 0 | 0 | 2 | 0 | 0 | 0 |
| damaged or blocked infrastructure | 0 | 0 | 2 | 0 | 0 | 0 |
| request for food, water or shelter | 0 | 0 | 2 | 0 | 0 | 0 |
| medical assistance | 0 | 0 | 1 | 1 | 0 | 0 |
| unrelated information | 0 | 0 | 2 | 0 | 0 | 0 |

## RAG document retrieval

Model: `Xenova/paraphrase-multilingual-MiniLM-L12-v2`. Mean inference time: 7.3 ms; median: 6.5 ms. Device: CPU, quantization: q8. Model loading is measured separately (1215 ms).

Queries: 24; corpus: 16 fictional passages; k=3; cosine threshold >0.34.

- Precision@3: 34.72%
- Recall@3: 95.83%
- Hit rate@3: 95.83%
- MRR@3: 0.9167
- nDCG@3: 0.9242

Precision divides by the requested three slots, including empty slots. Most queries have only one relevant passage, so a perfect retrieval can have precision@3 of one third. These metrics evaluate retrieval, not generated-answer correctness.

## Disaster image classification

Model: `Xenova/clip-vit-base-patch32`. Mean inference time: 56.9 ms; median: 53.9 ms. Device: CPU, quantization: q8. Model loading is measured separately (1202 ms).

Correct: 41/60. Descriptive Wilson 95% interval: 55.77%–78.69%. This binomial interval assumes independent samples. These convenience/stratified diagnostics do not justify a population-level confidence claim, and the interval does not account for correlated images or dataset shift.

| Class | Support | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| earthquake | 12 | 10 | 8 | 2 | 55.56% | 83.33% | 66.67% |
| flood | 12 | 9 | 3 | 3 | 75.00% | 75.00% | 75.00% |
| hurricane | 12 | 3 | 1 | 9 | 75.00% | 25.00% | 37.50% |
| fire | 12 | 9 | 0 | 3 | 100.00% | 75.00% | 85.71% |
| landslide | 12 | 10 | 3 | 2 | 76.92% | 83.33% | 80.00% |

Confusion matrix: rows are ground truth; columns are predictions.

| Actual / predicted | earthquake | flood | hurricane | fire | landslide | drought | tsunami | not_disaster |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| earthquake | 10 | 0 | 0 | 0 | 1 | 1 | 0 | 0 |
| flood | 0 | 9 | 1 | 0 | 1 | 0 | 1 | 0 |
| hurricane | 4 | 3 | 3 | 0 | 1 | 0 | 0 | 1 |
| fire | 2 | 0 | 0 | 9 | 0 | 0 | 1 | 0 |
| landslide | 2 | 0 | 0 | 0 | 10 | 0 | 0 | 0 |
| drought | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| tsunami | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| not_disaster | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Data and reproducibility

- Text cases: `evaluation/text-cases.json` (60 English, 12 Hindi; 6 classes). These are developer-authored cases with one dominant label, not independently annotated field reports.
- Retrieval cases: `evaluation/retrieval-cases.json` (24 questions, 16 fictional passages). Scores use the same retrieval threshold and maximum context passages as the app, with each passage shorter than the app's chunk limit.
- Vision: [QCRI DisasterVQA](https://huggingface.co/datasets/QCRI/DisasterVQA), a deterministically sampled subset of published disaster_type annotations adapted to image classification. It is not a claimed held-out test split or a VQA-answer benchmark. See `docs/evaluation/vision-sample.json` for paths, revision, selection method and image hashes. Images stay in ignored local storage and are never added to the operating workspace.
- DisasterVQA reference: Al-Mohannadi et al., *DisasterVQA: A Visual Question Answering Benchmark Dataset for Disaster Scenes*, ICWSM 2026, https://arxiv.org/abs/2601.13839. The publisher's card declares CC-BY-SA-4.0; underlying image sources retain their attribution and terms. Images are not redistributed with this report.
- The MEDIC dataset viewer first returned 502/429 errors, so no MEDIC test-split score is claimed. The final image evaluation uses DisasterVQA's directly downloadable publisher files.
- Vision ground truth has five classes: earthquake, flood, hurricane, fire (including wildfire), and landslide. Other labels, inconsistent annotations, and repeated question rows are excluded before inference. There are no ordinary-scene negatives, so false alarms on normal photos are not measured.
- All nine application descriptions remain prediction candidates. Top-1 is mapped to the corresponding class after ranking; unsupported and ordinary-scene predictions on disaster images count as errors. This preserves the app's classification configuration rather than simplifying it to five choices.
- Raw predictions, confusion matrices and fixture/worker hashes are in `docs/evaluation/model-metrics.json`.
- Reproduce with `npm run evaluate:models`. Use `-- --text`, `-- --rag`, or `-- --vision` for a single component; compatible previous components are retained. Use `-- --report-only` to regenerate Markdown from saved results. Internet is needed for initial model/image downloads. Node CPU latency differs from browser WebAssembly latency.

## Metric definitions

Accuracy = correct top-1 predictions / all samples. For each class, precision = TP / (TP + FP), recall = TP / (TP + FN), and F1 = 2 × precision × recall / (precision + recall). Macro metrics average the per-class values equally. Zero-division metrics are set to zero.
Recall@3 is the fraction of judged relevant passages appearing in the three selected context slots. Hit rate is the fraction of queries retrieving at least one relevant passage. MRR rewards the rank of the first relevant passage; nDCG also considers the ranks of multiple relevant passages.

## Interpretation and unmeasured components

- Small diagnostic evaluation; no models were trained, fine-tuned or tuned against these results.
- Text and retrieval judgements are authored fixtures, not an independently annotated representative field benchmark.
- DisasterVQA images are sampled from published annotations, not a claimed held-out split. Unknown pretraining overlap cannot be ruled out.
- The image sample contains five known disaster classes and no ordinary-scene negatives, so it cannot measure disaster-vs-normal false alarms.
- Classification scores measure top-1 labels, not calibrated confidence or the probability of future disasters.
- CPU evaluation does not establish browser performance or identical numerical output across runtimes.
- SegFormer segmentation requires labelled pixel masks for IoU/Dice. YOLOS detection requires annotated boxes for mAP. Neither metric is inferred from image-classification labels.
- Captioning and Qwen/FLAN answers require task-specific reference answers or a reviewed faithfulness/rubric evaluation. No language-generation accuracy is claimed here.
- Historical GIS layers, weather forecasts, optimisation and verified incident workflows are not evaluated by these model classification scores.
