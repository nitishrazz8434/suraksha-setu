# Validation record

Validated on 1 November 2026.

## Passed

- TypeScript strict type checking (`npm run typecheck`).
- 14 automated engine/schema checks (`npm test`): resource bottlenecks, household and capacity conservation, assisted-site eligibility, verified/pending/resolved road closures, excluded sites, global versus greedy coverage under stress, extraction, duplicates, grounded answers, invalid imports, stale-plan review, capped verified-incident risk contributions and Hindi/unknown-hazard handling.
- 8 local API integration checks (`npm run test:api`): durable write/read, optimistic revision conflicts, invalid record rejection, cross-origin rejection, assistant grounding, bilingual extraction, R2 upload/retrieval and rejection of client-forged identity through local sign-in middleware.
- All 11 Python modules parse successfully.
- Browser workflow: created and verified a synthetic bridge-closure report. Allocation changed from 2,900/2,944 to 2,112/2,944; unallocated demand changed from 44 to 832. The assistant answered from actual settlement records. The image workbench produced a computed synthetic mask and measured synthetic IoU. Basemap rendering was visually checked after changing providers.

## Limits

- Python model dependencies, GPU training, checkpoints and real model benchmarks were not executed in this environment. Syntax checking does not establish numerical correctness of training or inference.
- Voice recognition depends on browser support and microphone permission; microphone access was not exercised.
- The local authentication simulator supplies one identity. Real two-account isolation was not tested, although server-side records and uploads are owner-scoped.
- Browser automation disconnected after the initial desktop checks. A separate mobile visual pass and the final hosted browser flow could not be verified through that connection.
- Network basemaps and optional inference services depend on third-party availability. Scenario data is synthetic and is not an operational advisory.

The model metrics workspace calculates results only from imported predictions. The downloadable CSV is a format example, not a benchmark.
