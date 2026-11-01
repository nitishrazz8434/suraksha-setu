# SurakshaSetu

Multi-district disaster intelligence, resource assessment and household relocation management. A connected application with durable account-scoped records, geospatial evidence, pretrained image and language models, constrained allocation and confirmed movement tracking.

## Start locally

Requires Node.js 22.13 or newer and npm.

```sh
npm ci
npm run build
npm run db:migrate:local
npm run dev
```

Open the Local URL printed by the server, normally http://127.0.0.1:5173. Local development identity and storage are separate from hosted accounts. Keep `.wrangler/state` to retain local records. Hosted access uses platform sign-in and account-scoped D1/R2 storage.

The application starts with empty registers. Add districts, settlements, actual households and reviewed sites through **Data register**, or import CSV files using the blank column templates downloaded there. Import hazard footprints as GeoJSON with source and observation time. See [Operations guide](docs/OPERATIONS.md) for the complete workflow.

## Included workflows

| Area | Working capabilities |
| --- | --- |
| Multi-district management | District scope selection, settlements, variable-sized households, sites, provenance, CSV import/export and validated references |
| Risk map | Registered locations, uploaded Polygon/MultiPolygon evidence, expired/unverified layer styling, map/satellite basemaps and measured road routes |
| Incidents | English/Hindi extraction, neural classification, photo evidence, duplicate candidates, verification, linked closures, voice input and field tasks |
| Site resources | Space/water/sanitation bottlenecks, actual occupancy, reservations, accessibility, medical support and longer-term site reviews |
| Relocation | GLPK mixed-integer allocation of whole households, cross-district opt-in, route freshness and hazard checks, review, approval, movement and arrival confirmation |
| Scenarios | Water constraints, site/route exclusions, emergency/longer-term purpose, cross-district access and calculated comparisons |
| Image intelligence | SegFormer scene masks, YOLOS detections, CLIP image-text ranking and aligned image comparison on user uploads |
| Copilot | Calculated workspace answers, multilingual semantic retrieval, FLAN-T5 generation with supplied evidence, numerical guard and source passages |
| Documents and reporting | PDF/text ingestion, operations briefs, print/PDF, allocation CSV, backup/restore and activity history |
| Reliability | Optimistic revisions, unsaved-edit outbox, conflict rejection, authoritative plan actions, isolated evidence files and legacy recovery |

No population, incident, capacity, hazard footprint or route is preloaded into operational registers. Missing evidence remains **Unassessed**. Only verified, unexpired hazard evidence contributes to assessment; model outputs require explicit incident review.

## Neural inference

Models execute on the device in a WebAssembly worker using Transformers.js. First use downloads public pretrained weights from Hugging Face; subsequent use can reuse browser cache. No inference API key is required.

| Model | Task | Interpretation |
| --- | --- | --- |
| [MobileBERT MNLI](https://huggingface.co/Xenova/mobilebert-uncased-mnli) | English zero-shot report classification | Suggested categories for review |
| [Multilingual MiniLM](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2) | Semantic retrieval and Hindi report matching | Cosine similarity, not calibrated event probability |
| [SegFormer B0 ADE20K](https://huggingface.co/Xenova/segformer-b0-finetuned-ade-512-512) | Scene segmentation | General scene classes; masks do not establish flood depth or structural safety |
| [YOLOS Tiny](https://huggingface.co/Xenova/yolos-tiny) | Object detection | General COCO categories |
| [CLIP](https://huggingface.co/Xenova/clip-vit-base-patch32) | Image-text ranking | Relative similarity to candidate descriptions |
| [FLAN-T5 Small](https://huggingface.co/Xenova/flan-t5-small) | Evidence-assisted generation | Review against the visible calculated evidence and source text |

Browser memory, network access and device speed affect loading. Switching tasks disposes the previous model to bound memory. General predictions are not automatically converted into verified hazard designations.

## Allocation and capacity

- Each household has its own size. Binary variables prevent splitting it across sites.
- Capacity is the applicable minimum of space, water, sanitation and sustainable limits, minus occupancy and outstanding reservations.
- The first optimization maximizes allocated people. A second holds coverage fixed, ranks reviewed priorities and assistance needs, then prefers lower measured travel time. Time-limited feasible solutions are labelled accordingly.
- Unverified, inactive or unreviewed sites are excluded. Assistance and medical requirements are eligibility constraints. Longer-term sites additionally require land, environment, services and sustainable-capacity reviews.
- Roads come from OSRM or registered survey/provider geometry. There is no invented straight-line routing fallback. Routes expire after 24 hours and are checked against verified closures and intersecting high-severity hazards.
- Approval checks current inputs and reservations. Server actions enforce movement state and increment occupancy exactly once per confirmed arrival.

OSRM defaults to https://router.project-osrm.org. Set server-side `ROUTING_URL` to a compatible routing host when needed. Provider availability and road data coverage affect results. Map attribution appears in the interface: OpenStreetMap contributors and Esri imagery providers.

## Storage and recovery

D1 stores owner-scoped revision pointers; immutable JSON workspace objects and evidence live in R2. Atomic revision checks reject stale writes. The client retains unsaved changes after connection loss and stops on conflicts or rejected writes. Export the unsaved draft before reloading a conflicted session. The outbox requires an already-loaded session; the application is not a fully offline map package.

The previous workspace format is archived before an empty current-format workspace opens. Download it from **Workspace settings**. Current backups can be exported/restored through **Reports & documents**. Backup JSON contains register/document data; image evidence remains in its originating account's object storage.

## Verification

```sh
npm run typecheck
npm test
# Against the local development server:
npm run test:api
# Actual pretrained inference; downloads model weights:
npm run test:models
npm run test:models:extended
```

Set `RUN_ROUTING_SMOKE=1` to include external OSRM verification in `test:api`. Test records use isolated development identities and never populate the normal workspace. See [Validation](docs/VALIDATION.md) and [Architecture](docs/ARCHITECTURE.md).

Additional Python pipelines support domain-specific model development independently of the working browser models; see [Model extensions](ml/README.md). Dataset licensing, event-disjoint validation and measured performance are necessary before domain-specific forecasting or safety claims.
