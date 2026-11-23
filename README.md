# SurakshaSetu

Multi-district disaster intelligence, resource assessment and household relocation management. A connected application with durable shared district records with role-scoped access, geospatial evidence, pretrained image and language models, constrained allocation and confirmed movement tracking.

## Local sign-in and setup

The local application has its own account system; hosted ChatGPT sign-in is not used. On first run, the first screen asks you to create the system administrator. Choose an email and a strong private password and keep them safe. Administrator access is claimed once and cannot be granted by citizen self-registration.

Sign in as the administrator and open **Accounts & access** to create a second officer using a temporary password, assign the officer one or more districts, and share that temporary password securely in person. The officer must choose a private password at first sign-in. Create a separate citizen account through **Create a citizen account**.

The citizen submits a report. An officer assigned to that district opens the shared review queue, checks evidence, writes a decision reason, and verifies, rejects or requests further information. Citizens can reply to a request and see the officer and review history. Accounts cannot verify reports they submitted. A report only affects assessments while verified and before its stated expiry.

Each role sees a separate dashboard. All districts share the same operational records; officers can see only their assigned districts and citizens can see only their own reports. Passwords are stored as salted PBKDF2 hashes, sign-in sessions are HttpOnly and expire after twelve hours, and the server enforces roles and district access. Account and review actions are recorded in the audit history. This project uses local accounts and is intended for a classroom demonstration; use a separate installation for shared community access.

## Start locally

Requires Node.js 22.13 or newer and npm.

```sh
npm ci
npm run build
npm run db:migrate:local
npm run dev
```

Open the Local URL printed by the server, normally http://127.0.0.1:5173. Local accounts and operational records use the local D1/R2 store. Keep `.wrangler/state` to retain accounts, reviews and records between runs. This project is configured for local classroom use.

The application automatically connects Wayanad, Idukki and Kozhikode during one-time administrator setup. It opens with real geography, nine named origins, eleven public schools, published infrastructure and eighteen measured roads, then loads current seven-day weather forecasts. Open **Relocation planning** for an immediate calculated preparedness assessment. Change resource/exposure assumptions, compare results and save/export a plan. See [Connected data and calculations](docs/CONNECTED_DATA.md).

Use **Data register** and **Registered household movements** for actual household records, field-reviewed capacity, approvals and arrivals. Existing account data is preserved. Import hazard footprints as GeoJSON with provenance. See [Operations guide](docs/OPERATIONS.md).

## Included workflows

| Area | Working capabilities |
| --- | --- |
| Multi-district management | District scope selection, settlements, variable-sized households, sites, provenance, CSV/GeoJSON import preview, row-level validation, duplicate checks and export |
| Risk map | Registered locations, uploaded Polygon/MultiPolygon evidence, expired/unverified layer styling, map/satellite basemaps and measured road routes |
| Incidents | Separate citizen submissions and district officer queues, request/reply, provenance and photos, AI suggestions, duplicate linking, independent review and expiry, verified closures and assigned field tasks |
| Accounts and accountability | Local citizen, district officer and system administrator accounts; district-scoped server permissions; one-time administrator setup; expiring sessions; salted password hashing; account management; immutable review history and audit export |
| Site resources | Space/water/sanitation bottlenecks, actual occupancy, reservations, accessibility, medical support and longer-term site reviews |
| Relocation | GLPK mixed-integer allocation of whole households, cross-district opt-in, route freshness and hazard checks, review, approval, movement and arrival confirmation |
| Scenarios | Water constraints, site/route exclusions, emergency/longer-term purpose, cross-district access and calculated comparisons |
| Image intelligence | Default disaster scene assessment with pretrained image captions and CLIP disaster-category matching; selected-district rainfall and verified hazard context; general precautions; scene masks, object detections and aligned image comparison |
| Copilot | Calculated workspace answers, multilingual semantic retrieval, Qwen2.5 Instruct chat, bounded evidence generation, numerical guard and source passages |
| Documents and reporting | PDF/text ingestion, operations briefs, print/PDF, allocation CSV, backup/restore and activity history |
| Reliability | Optimistic revisions, unsaved-edit outbox, conflict rejection, authoritative plan actions, isolated evidence files and legacy recovery |

The connected dashboard uses attributed historical census values, real infrastructure and weather feeds. Preparedness exposure, household distribution and usable capacity are explicit assumptions. Actual residents, incident reports and official hazard footprints are never fabricated. Missing hazard evidence remains **Unassessed**. Only reviewed evidence affects operational eligibility.

## Neural inference

Models execute on the device in a packaged standalone WebAssembly worker using Transformers.js. First use downloads public pretrained weights from Hugging Face; subsequent use can reuse browser cache. No inference API key is required.
Copilot chat uses the quantized Qwen2.5 0.5B Instruct model (about 480 MB on first use); FLAN-T5 Small remains for short evidence-assisted generation. Built-in calculated answers work if the chat model is disabled or unavailable. Disaster mechanisms, immediate-hazard questions, and common precautions use a small curated answer set with official NDMA/USGS links instead of free-form generation. Unknown live conditions are explicitly not verified.

| Model | Task | Interpretation |
| --- | --- | --- |
| [MobileBERT MNLI](https://huggingface.co/Xenova/mobilebert-uncased-mnli) | English zero-shot report classification | Suggested categories for review |
| [Multilingual MiniLM](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2) | Semantic retrieval and Hindi report matching | Cosine similarity, not calibrated event probability |
| [SegFormer B0 ADE20K](https://huggingface.co/Xenova/segformer-b0-finetuned-ade-512-512) | Scene segmentation | General scene classes; masks do not establish flood depth or structural safety |
| [YOLOS Tiny](https://huggingface.co/Xenova/yolos-tiny) | Object detection | General COCO categories |
| [CLIP](https://huggingface.co/Xenova/clip-vit-base-patch32) | Image-text ranking | Relative similarity to candidate descriptions |
| [ViT-GPT2 image captioner](https://huggingface.co/Xenova/vit-gpt2-image-captioning) | Plain-language image caption | General scene description; may miss or misdescribe hazards |
| [Qwen2.5 0.5B Instruct](https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct) | Copilot chat | More capable instruction-following than the previous tiny chat model; still unverified |
| [FLAN-T5 Small](https://huggingface.co/Xenova/flan-t5-small) | Short evidence-assisted generation | Review against the visible calculated evidence and source text |

Browser memory, network access and device speed affect loading. Switching tasks disposes the previous model to bound memory. Disaster scene assessment is a visual screening aid, not a calibrated disaster probability or official warning. A selected district adds the current rainfall screen and active verified workspace records; rainfall probability is not the probability of a flood or landslide. General predictions are not automatically converted into verified hazard designations.

## Allocation and capacity

- Each household has its own size. Binary variables prevent splitting it across sites.
- Capacity is the applicable minimum of space, water, sanitation and sustainable limits, minus occupancy and outstanding reservations.
- The first optimization maximizes allocated people. A second holds coverage fixed, ranks reviewed priorities and assistance needs, then prefers lower measured travel time. Time-limited feasible solutions are labelled accordingly.
- Unverified, inactive or unreviewed sites are excluded. Assistance and medical requirements are eligibility constraints. Longer-term sites additionally require land, environment, services and sustainable-capacity reviews.
- Roads come from OSRM or registered survey/provider geometry. There is no invented straight-line routing fallback. Routes expire after 24 hours and are checked against verified closures and intersecting high-severity hazards.
- Approval checks current inputs and reservations. Server actions enforce movement state and increment occupancy exactly once per confirmed arrival.

OSRM defaults to https://router.project-osrm.org. Set server-side `ROUTING_URL` to a compatible routing host when needed. Provider availability and road data coverage affect results. Map attribution appears in the interface: OpenStreetMap contributors and Esri imagery providers.

## Storage and recovery

D1 stores the shared organization workspace pointer, account and review records; immutable JSON workspace objects live in R2. Incident photographs are private to their submitter and assigned district staff. Atomic revision checks reject stale writes. The client retains unsaved changes after connection loss and stops on conflicts or rejected writes. Export the unsaved draft before reloading a conflicted session. The outbox requires an already-loaded session; the application is not a fully offline map package.

On first administrator setup, any existing local workspace is copied into the shared register, and old incident reports enter the officer queue as pending legacy records. The original workspace remains available to the administrator from **Workspace settings**. Current backups can be exported/restored through **Reports & documents**. Backup JSON contains register/document data; image evidence remains in its originating account's object storage.

## Verification

```sh
npm run typecheck
npm test
# Against the local development server:
npm run test:api
# Actual pretrained inference; downloads model weights:
npm run test:models
npm run test:models:extended
# Measured classification/retrieval metrics; downloads a small labelled image sample:
npm run evaluate:models
```

Set `RUN_ROUTING_SMOKE=1` and `RUN_FEED_SMOKE=1` to include external OSRM/weather verification in `test:api`. Test records use isolated development identities and never populate the normal workspace. See [Validation](docs/VALIDATION.md) and [Architecture](docs/ARCHITECTURE.md).

Custom model training is not needed for this project. Its pretrained model outputs are suggestions for human review, not proof of a hazard or a safety certification.

Measured model results, per-class precision/recall/F1, confusion matrices, evaluation data sources and limitations are recorded in [Model evaluation](docs/MODEL_EVALUATION.md). Text and retrieval cases are authored diagnostics; the image evaluation adapts a small deterministic subset of QCRI DisasterVQA annotations. These scores apply to those samples and do not establish real-world disaster accuracy. `npm run evaluate:models -- --report-only` regenerates the report from saved predictions without rerunning inference.
