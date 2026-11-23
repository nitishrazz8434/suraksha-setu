# Validation record

Existing release checks performed on 1 November 2026; the current local account/review implementation was subsequently added on 1 November 2026.

## Current local account release

The account and independent-review implementation builds with the production bundler and passes strict TypeScript checking. The local D1 migration was applied after the source and local database were backed up. It adds separate account, session, submitted-report, review-event, notification, evidence, account-preference and audit tables. It does not erase the earlier workspace. The dev server is available at http://127.0.0.1:5173; create the first administrator in the sign-in page.

The pre-existing integration suite was not run against this authentication redesign. Create a separate officer and citizen account locally to demonstrate district visibility, independent review, request/reply, notification, verification expiry and the report's effect on planning. The browser interaction pass for those new accounts remains outstanding.

## Automated verification

- Strict TypeScript checking.
- 28 engine/schema tests, including whole-household conservation, reviewed capacities, reservations, arrivals, geometry holes/crossings, closures, district scope, reference-pack provenance/geographic consistency, preparedness resource sensitivity, stale route exclusion, vehicle grouping and valid stored totals.
- 23 local API checks with routing/weather smoke flags enabled: register persistence, revision conflicts, invalid inputs/origins, scoped evidence, plan approvals and arrivals, bilingual extraction, real OSRM geometry, automatic district connection, idempotence, public-source assistant answers, saved assessment round trips and three real seven-day weather feeds.
- The test fixtures use isolated local identities and do not populate the user's operating workspace.
- Production client/Worker bundling and packaged inference assets are checked for release.

## Browser workflows

Using the actual Chrome page, verified connected districts and weather; a calculated default preparedness allocation of 2,068/2,512 people; saving an assessment; and a changed allocation of 528/2,512 after reducing planned water to 1,000 L/facility/day.

SegFormer completed real WebAssembly inference on the attributed Wayanad photograph, producing scene classes and a rendered overlay. Browser testing exposed and fixed file-URL worker construction and framework rewrites of worker environment detection. CPU-only checks had not detected those integration defects.

Copilot displays calculated source-linked district/weather evidence immediately while model wording is generated. General model output remains subject to source review.

## Model execution and limits

The six public quantized models previously completed ONNX CPU smoke checks: MobileBERT, SegFormer, FLAN-T5, CLIP, YOLOS and multilingual MiniLM. These establish execution rather than disaster-domain accuracy.

Microphone permissions were not exercised. No custom training or operational local-domain benchmark was performed; the later small model diagnostic evaluation is recorded below. The app's rainfall bands are declared screening heuristics, not official hazard warnings. Published infrastructure and planned resources require field review before actual dispatch.

Hosted verification found HTTP 429 responses from the shared hosting egress address. The interface now uses the provider’s supported browser connection with fifteen-minute local caching. Server consumers retain explicit error/cached states and a fifteen-minute backoff. No alternate credentials or proxy rotation are used.

## Quality and model hardening (2 November 2026)

- `npm test`: all 37 unit and regression tests passed, including source-backed hazard guidance, bilingual safeguards, allocation constraints, workspace import validation and weather decoding.
- `npm run typecheck`: passed.
- `npm run lint`: passed with no errors. Four warnings remain for runtime-loaded photographs and map tiles, which use dynamic URLs and are intentionally rendered as ordinary image elements.
- `npm run test:models` and `npm run test:models:extended`: all seven pretrained models passed CPU inference and basic expected-output checks: MobileBERT, Qwen2.5, SegFormer, FLAN-T5, CLIP, YOLOS and multilingual MiniLM. These are smoke checks, not a benchmark and not evidence of disaster-domain accuracy. No custom model was trained.
- `npm run build`: passed. Route-specific screens now load on demand; the page entry chunk is about 28 KB and the build no longer reports the previous oversized client chunk. Vinext still labels dynamic API routes as unknown because its static analyzer cannot see runtime header/cookie use.
- Added English and Hindi browser speech dictation to incident reporting. The browser microphone workflow still needs manual testing with microphone permission enabled.
- Local browser checks recorded above continue to cover source-linked landslide guidance, the no-live-earthquake-claim safeguard and generated Qwen output. General model answers remain unverified; operational warnings require official sources and field review.
- The older API integration script still uses an obsolete unauthenticated test scope and can target the persistent local workspace. It was not run. Read-only checks against the running local app returned `200` for `/api/auth` and `401` for unauthenticated `/api/workspace`, confirming the session gate. The broader integration script needs a separate isolated database and authenticated test accounts before it can be a safe regression check.

## Measured model diagnostics (2 November 2026)

- Added `npm run evaluate:models`, frozen text/retrieval cases, metric calculation tests and a reproducible image sample manifest. No production model configuration or operating workspace records were changed.
- MobileBERT: 60 English diagnostic reports, accuracy 50.00%, macro precision 62.96%, macro recall 50.00%, macro F1 45.65%. The 12 Hindi stress cases scored accuracy 16.67% and macro F1 5.13%; the classifier is an English model.
- CLIP: 60 unique images from QCRI DisasterVQA's published annotations, 12 per supported disaster class; accuracy 68.33%, macro precision 76.50%, macro recall 68.33%, macro F1 68.98%. Hurricane recall is 25%. This is an adapted classification sample, not an official held-out VQA evaluation, and has no normal-scene negative images.
- MiniLM retrieval: 24 authored English/Hindi questions over 16 fictional passages; Recall@3 95.83%, MRR@3 0.9167. The app's cosine threshold >0.34 and maximum three context passages are retained. Generated answers were not evaluated.
- The MEDIC viewer returned 502/429 errors before any image scores were produced. The final image evaluation uses QCRI's directly downloadable DisasterVQA annotations/images, with the repository revision, source paths and image hashes recorded. No images were imported into operational records.
- `npm test`: all 41 tests passed, including four checks of classification/retrieval metric arithmetic and error handling. ESLint passed for the new evaluation scripts and metric tests.
- Full definitions, per-class scores, confusion matrices and limitations: [Model evaluation](MODEL_EVALUATION.md). Machine-readable predictions: [model-metrics.json](evaluation/model-metrics.json). These small-sample diagnostics do not establish operational disaster accuracy; no custom training or fine-tuning was performed.
