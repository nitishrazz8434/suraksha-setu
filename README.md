# SurakshaSetu

An integrated academic disaster-intelligence and relocation-planning project for **CSE471: Deep Learning for Computer Vision** and **CSE472: Deep Learning for NLP**. Based on problem statement 2619: hazard-based candidate red zones, carrying capacity and vulnerable-habitation relocation needs.

## Run the application

Requirements: Node.js 22.13+ and npm. From this directory:

```sh
npm ci
npm run build
npm run db:migrate:local
npm run dev
```

Open the Local URL printed by the server (normally http://127.0.0.1:5173). The development server supports local workshop identity; hosted requests use the platform's authenticated user identity. Database and file storage are local in development and separate from the hosted database.

```sh
npm run typecheck
npm test
```

If working with the original development checkout, the first SQL migration is already applied locally. The migration helper tracks applied files to avoid reapplying them. Keep `.wrangler/state` for local persistence. Do not commit its contents.

## Working application

| Surface | Functionality |
| --- | --- |
| Overview | Calculated exposure, capacity, allocation coverage, priorities and activity |
| Risk map | Pan/zoom, map/satellite basemaps, hazard layers, site markers, route overlays and settlement inspection |
| Incident reports | Text/voice entry, English/Hindi rule extraction, duplicate candidates, image uploads and verification/resolution |
| Sites & capacity | Editable resource limits, occupancy, assisted access and longer-term screening eligibility |
| Relocation planning | Integer min-cost maximum flow, shortest paths, household cohesion, assisted-site eligibility, drafts/approvals and logistics arithmetic |
| Scenario lab | Road/site exclusions, water/demand adjustments, baseline/optimized/greedy comparisons and JSON exports |
| Copilot | Calculated evidence responses, source labels, document passage retrieval, Hindi briefs, voice playback and optional checkpoint-assisted summarization |
| Reports & evidence | Text briefs, browser print-to-PDF, allocation CSV, PDF/text document ingestion, backups and an activity history |
| Vision workbench | Actual RGB heuristic mask, sensitivity controls, synthetic-ground-truth IoU, uploaded-image processing and checkpoint inference connector |
| Research studio | Syllabus mapping, provenance, methods and computed classification metrics/confusion matrices from uploaded predictions |

Owner-scoped D1 persistence uses optimistic revision checks. R2 image uploads are scoped to a hashed owner identifier. An offline outbox queues edits after the workspace has loaded; synchronization conflicts stop automatic overwrites.

## What the data and models mean

**The initial Wayanad scenario is synthetic.** Town names and basemap geography are real; populations, resource records, hazard indicators, road links and incident reports are illustrative exercise inputs. The project is not an operational disaster advisory or an official red-zone designation.

**The default runtime does not pretend to contain trained deep-learning weights.** Flood-colour segmentation is a labelled RGB heuristic; local extraction is a rule baseline; local copilot answers use deterministic calculations and extractive retrieval. The source includes real training and inference code for U-Net/DeepLab, ResNet transfer learning, paired damage assessment, TF-IDF, BiLSTM, BERT, multimodal fusion, T5 summarization, YOLO and CLIP experiments. Dataset access, training compute, checkpoints and held-out results must be supplied before making trained-model performance claims. No benchmark scores are invented.

## Train and connect research models

Use Python 3.11+ in a dedicated virtual environment:

```sh
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r ml/requirements.txt
```

Manifest JSONL records use `split` (`train`, `val`, `test`) and `event` on every row. Events must be disjoint across splits. Relative image paths resolve against the manifest directory. Formats:

```json
{"text":"A labelled field report", "label":"Flood", "event":"event-a", "split":"train"}
{"image":"images/tile.png", "mask":"masks/tile.png", "event":"event-b", "split":"val"}
{"image":"images/after.png", "reference":"images/before.png", "label":"major-damage", "event":"event-c", "split":"test"}
```

Segmentation masks are single-channel `0=land`, `1=water`, `255=ignore`. RGB checkpoints accept optical RGB [0,1] images. Sentinel-1 radar and Sentinel-2 optical channels require different preprocessing; do not interchange them.

```sh
python ml/train_vision.py data/flood.jsonl --task segmentation --output models/segmentation
python ml/train_vision.py data/flood.jsonl --task segmentation --architecture deeplab --pretrained --output experiments/deeplab
python ml/train_vision.py data/images.jsonl --task classification --pretrained --output models/classification
python ml/train_vision.py data/damage.jsonl --task damage --pretrained --output models/damage
python ml/train_text.py data/reports.jsonl --model tfidf --output experiments/tfidf
python ml/train_text.py data/reports.jsonl --model bilstm --output experiments/bilstm
python ml/train_text.py data/reports.jsonl --model bert --output models/text
python ml/train_multimodal.py data/paired.jsonl --mode fusion --output models/fusion
python ml/train_multimodal.py data/paired.jsonl --mode image --output experiments/image-only
python ml/train_multimodal.py data/paired.jsonl --mode text --output experiments/text-only
python ml/train_summarizer.py data/summaries.jsonl --output models/summarizer
uvicorn ml.service:app --host 127.0.0.1 --port 8000
```

Summarization manifests additionally need a human-written `summary`. The optional YOLO adapter needs `pip install ultralytics` and a dataset YAML; see the upstream package's licensing. The separate CLIP script ranks supplied captions. See `ml/README.md` for evaluation details.

For local model integration, put the following names in an ignored `.dev.vars` file; use your own random service token in both processes:

```text
ML_SERVICE_URL=http://127.0.0.1:8000
ML_SERVICE_TOKEN=your-own-random-service-token
```

Set `ML_SERVICE_TOKEN` on the Python process too. For hosted integration, use an authenticated HTTPS inference service and configure these values as server-side runtime secrets. The hosted Worker cannot reach the user's localhost. Never put tokens in browser code, Git or the hosting manifest.

## Planning assumptions

- A planning household contains exactly four people. Assisted/general cohorts preserve these units. This assumption must be replaced with variable-sized household records for real deployments.
- Capacity is `max(0, min(space, water × scenario factor, sanitation) − occupancy)`, rounded down to whole households for allocation.
- The allocator maximizes feasible coverage. Among maximum-flow solutions, it minimizes a cost combining risk, assisted-cohort priority and exposure-weighted route distance. This is not a claim of lexicographically maximizing every fairness objective.
- Road lengths are illustrative geodesic lengths × 1.25, not live road travel times. Only verified, unresolved linked closures affect routing.
- Risk is an interpretable weighted indicator score plus a capped verified-incident severity contribution, not a probability or forecast. Scenario intensity does not model rainfall-runoff or landslide physics.
- Longer-term allocation is preliminary screening against declared site eligibility and current resource assumptions. Land, legal, environmental and sustainable-service assessments need verified external evidence.
- Approving or completing a plan records workflow status. Actual movements and occupancy require field confirmation.

## Architecture and academic submission

See [Architecture](docs/ARCHITECTURE.md), [Project proposal](docs/PROJECT_PROPOSAL.md), [Demonstration](docs/DEMO.md) and [Research models](ml/README.md). The code uses React, TypeScript and Vinext, a Cloudflare Worker API, D1 storage and R2 uploads; Python is an independent research/inference service.

## Data sources and attribution

- [Sen1Floods11](https://github.com/cloudtostreet/Sen1Floods11): georeferenced flood imagery and labels.
- [xBD / xView2](https://www.sei.cmu.edu/projects/xview-2-challenge/): before/after building imagery and damage annotations.
- [CrisisMMD](https://crisisnlp.qcri.org/crisismmd): paired crisis text and images.
- [GSI Bhusanket](https://bhusanket.gsi.gov.in/): regional landslide information.
- [WorldPop](https://www.worldpop.org/datacatalog/): population estimates.
- Basemaps: OpenStreetMap contributors; satellite tiles: Esri and imagery providers. These are network services; the map retains a clearly illustrative background if tiles are unavailable.

Access and reuse terms vary by dataset. Use event/geography holdouts, document provenance, and report real evaluation results with their limitations.
