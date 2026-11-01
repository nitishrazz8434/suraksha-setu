# Research pipelines

These scripts implement training and inference, not pre-trained domain claims. They were syntax-checked in the authoring environment; GPU training and full Python dependency installation were not performed. Run a small end-to-end dataset smoke test on the intended training environment before a large experiment.

`common.py` enforces event-disjoint train/validation/test splits. Selection uses validation data; test metrics are computed after loading the selected checkpoint. CSV classification predictions can be imported into Research studio.

| Script | Inputs | Output |
| --- | --- | --- |
| train_vision.py | RGB imagery; binary masks, image labels or aligned before/after crops | Best checkpoint, validation history, test IoU/Dice or classification metrics |
| train_text.py | Labelled reports | TF-IDF, BiLSTM or BERT, test CSV and per-class metrics |
| train_multimodal.py | Paired image/text with aligned target labels | Separately trained image-only, text-only or gated-fusion model |
| train_summarizer.py | Source text and reference summary | T5 checkpoint, test ROUGE and generated summaries |
| train_detector.py | YOLO-compatible dataset YAML | Detector weights and test mAP |
| clip_retrieval.py | An image and candidate captions | Relative image-text similarity ranking |
| prepare_manifest.py | Annotated CSV with event names | JSONL manifest with explicit holdout events |
| service.py | Locally trained compatible checkpoints | Authenticated image, text and grounded summarization endpoints |

The model server loads only local checkpoints. It does not silently download arbitrary weights. Training commands may download the explicitly selected pretrained base encoder from its model publisher.

Use `MODEL_DIR` for the model folder and `ML_SERVICE_TOKEN` for bearer authentication. Bind to loopback for local work. Remote hosting requires TLS and a token. Checkpoints are deployment assets, not user-uploaded inputs; never load untrusted pickle files into the service.

Vision service tasks: segmentation, damage, detection, gradcam. Text service loads BERT if configured, otherwise BiLSTM, otherwise TF-IDF. The assistant's T5 output receives a simple numerical consistency check; this does not establish full factuality. The TypeScript application falls back to calculated context if the service is missing or fails.

Sensor alignment, label conventions and image normalization must match across training and inference. Building damage requires aligned building crops. An image-level classifier's heatmap does not establish structural habitability. Classification softmax outputs are model scores, not automatically calibrated probabilities.

Do not combine unrelated dataset samples as if they share an event, location or time. Pair modalities using their original dataset identifiers. Keep all pre/post pairs, duplicate posts and neighboring tiles in the same event split. For a multimodal comparison, train each mode separately with the same splits and comparable budgets.

Useful evaluation: pixel IoU/Dice, class macro-F1, span-F1 for separately annotated NER, mAP for detection, ROUGE plus human factuality review, inference latency and calibration. The current rule extractor has no learned NER checkpoint; its limitations are visible in the UI.
