# Model extensions

The main application already runs six pretrained browser models for images, classification, retrieval and generation; see the root README. These Python pipelines support additional domain-specific training and authenticated inference.

The Python source was syntax-checked during authoring. Its full dependency installation, GPU training and domain benchmark runs have not been performed. Run a small end-to-end dataset test on the intended compute environment before a large training run.

## Setup

```sh
python -m venv .venv
# Activate the environment, then:
pip install -r ml/requirements.txt
```

Every JSONL manifest row needs split (train, val or test) and event. Event identifiers must be disjoint across splits; relative image paths resolve against the manifest directory.

| Script | Input and output |
| --- | --- |
| train_vision.py | RGB images with masks/labels/aligned pairs; segmentation or classification checkpoints and metrics |
| train_text.py | Labelled reports; TF-IDF, BiLSTM or BERT with per-class test results |
| train_multimodal.py | Paired image/text with matching labels; image, text or fusion model |
| train_summarizer.py | Source text and reference summary; T5 checkpoint and test outputs |
| train_detector.py | YOLO dataset YAML; detector weights and test mAP |
| clip_retrieval.py | Image and descriptions; relative similarity ranking |
| prepare_manifest.py | Annotated CSV and held-out events; split JSONL |
| service.py | Local compatible checkpoints; authenticated inference endpoints |

```sh
python ml/train_vision.py data/flood.jsonl --task segmentation --output models/segmentation
python ml/train_text.py data/reports.jsonl --model bert --output models/text
python ml/train_multimodal.py data/paired.jsonl --mode fusion --output models/fusion
python ml/train_summarizer.py data/summaries.jsonl --output models/summarizer
uvicorn ml.service:app --host 127.0.0.1 --port 8000
```

Binary segmentation masks use 0=land, 1=water and 255=ignore. Optical RGB and radar require different preprocessing. Before/after damage inputs must be aligned. Keep all pairs, duplicates and nearby tiles within one event split. Evaluate each modality on comparable splits and budgets.

Use MODEL_DIR for checkpoints and ML_SERVICE_TOKEN for bearer authentication. The service loads local compatible checkpoints rather than arbitrary user uploads. Never load untrusted pickle files. The detector adapter additionally needs ultralytics and its applicable licensing.

For the existing optional API bridge, configure ML_SERVICE_URL and ML_SERVICE_TOKEN as server-side values in ignored .dev.vars locally or hosted runtime secrets. A hosted Worker cannot reach a user's localhost. Hosted services need authenticated HTTPS. Browser model inference does not require this Python service.

Report measured pixel IoU/Dice, class macro-F1, detector mAP, ROUGE with factuality review and inference latency as appropriate. Scene masks, heatmaps and similarity scores do not establish structural habitability or calibrated hazard probabilities.

Useful domain data references: [Sen1Floods11](https://github.com/cloudtostreet/Sen1Floods11), [xView2](https://www.sei.cmu.edu/projects/xview-2-challenge/) and [CrisisMMD](https://crisisnlp.qcri.org/crisismmd). Check each dataset's access and reuse terms.
