# Validation record

Release checks performed on 1 November 2026.

## Automated verification

- Strict TypeScript checking.
- 26 engine/schema tests, including whole-household conservation, reviewed capacities, reservations, arrivals, geometry holes/crossings, closures, district scope, reference-pack provenance/geographic consistency, preparedness resource sensitivity, stale route exclusion, vehicle grouping and valid stored totals.
- 23 local API checks with routing/weather smoke flags enabled: register persistence, revision conflicts, invalid inputs/origins, scoped evidence, plan approvals and arrivals, bilingual extraction, real OSRM geometry, automatic district connection, idempotence, public-source assistant answers, saved assessment round trips and three real seven-day weather feeds.
- The test fixtures use isolated local identities and do not populate the user's operating workspace.
- Production client/Worker bundling and packaged inference assets are checked for release.

## Browser workflows

Using the actual Chrome page, verified connected districts and weather; a calculated default preparedness allocation of 2,068/2,512 people; saving an assessment; and a changed allocation of 528/2,512 after reducing planned water to 1,000 L/facility/day.

SegFormer completed real WebAssembly inference on the attributed Wayanad photograph, producing scene classes and a rendered overlay. Browser testing exposed and fixed file-URL worker construction and framework rewrites of worker environment detection. CPU-only checks had not detected those integration defects.

Copilot displays calculated source-linked district/weather evidence immediately while model wording is generated. General model output remains subject to source review.

## Model execution and limits

The six public quantized models previously completed ONNX CPU smoke checks: MobileBERT, SegFormer, FLAN-T5, CLIP, YOLOS and multilingual MiniLM. These establish execution rather than disaster-domain accuracy.

Microphone permissions and a two-account hosted interactive session were not exercised. Domain-specific training/benchmark runs were not performed. The app's rainfall bands are declared screening heuristics, not official hazard warnings. Published infrastructure and planned resources require field review before actual dispatch.
