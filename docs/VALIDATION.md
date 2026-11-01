# Validation record

Release checks performed on 1 November 2026.

## Automated checks

- TypeScript strict checking and production Worker/client build.
- 17 engine/schema tests: empty registers, district isolation, resource reviews, unassessed evidence, polygon holes and crossings, indivisible variable-size households, cross-district policy, stale/missing routes, reviewed closures, longer-term eligibility, reservations, exactly-once arrivals, stale signatures, import references/totals, English/Hindi extraction, calculated answers and CSV escaping.
- 17 local API checks with external routing enabled: empty current workspace, R2 persistence, stale revisions, invalid resources, origin rejection, isolated development identities, assistant values, Hindi aliases, owner-isolated uploads, stale-plan rejection, authoritative approval, occupancy updates, duplicate arrivals, completed whole-household movement, closed-plan cancellation rejection, invalid coordinates and actual OSRM geometry/distance/duration.
- Test fixtures use isolated local identities and never populate the normal operational workspace.

## Actual pretrained model execution

All six quantized public models loaded and ran through Transformers.js and the ONNX CPU backend:

| Model | Executed check |
| --- | --- |
| MobileBERT MNLI | Flood report ranked flooding above unrelated categories |
| SegFormer B0 ADE20K | Public house image produced eight scene-mask classes |
| FLAN-T5 Small | Answered 100 from supplied evidence of 100 available places |
| CLIP | Ranked house above flood for a house image |
| YOLOS Tiny | Completed detection; no category exceeded threshold in that image |
| Multilingual MiniLM | Produced normalized 384-dimensional English/Hindi embeddings |

Reproduce with npm run test:models and npm run test:models:extended. These are execution checks, not disaster-domain accuracy benchmarks. Browser deployment uses the same model identifiers with packaged WebAssembly; CPU checks do not independently verify browser-worker execution.

## Verification limits

- Browser-control infrastructure was unavailable during this release. Revised visual layout, mobile rendering and browser-model interactions were not exercised end to end. HTTP/API behavior, static assets, types and production bundling were checked separately.
- Microphone permissions and speech recognition/playback were not exercised.
- Isolation was checked with local development identities and scoped evidence reads; a two-account hosted interactive session was not exercised.
- Optional custom Python training and domain-specific benchmarks were not performed. Browser models are real pretrained general models, not regionally validated hazard forecasts.
- OSRM geometry does not establish emergency clearance. Resources, hazard evidence and decisions require maintained sources and review. No measured reduction in disaster losses or certification of site safety is claimed.
