# Connected district intelligence

The application opens with Wayanad, Idukki and Kozhikode connected automatically when an account has no districts. Existing registers are preserved. The reference pack includes three administrative boundaries, nine named planning origins, eleven real schools, 419 reported classrooms, reported toilet counts and eighteen measured road connections.

Every facility links to its individual Kerala KITE Sametham record. Census 2011 district populations are historical reference values, not current evacuee counts. The GeoNames/OSM coordinates and OSM boundaries retain their source links. See [data attribution](../public/data/ATTRIBUTION.md). The importer validates school districts; the test suite checks all origins and facilities against their district geometry.

Open-Meteo provides current model conditions and seven-day daily forecasts at district reference coordinates. The browser retrieves public forecasts directly and caches them for fifteen minutes with observation time. The optional server endpoint uses R2 caching and a retry interval on provider failures. Unavailable feeds retain explicitly marked cached data or show unavailable values. Rainfall bands are screening heuristics over the next three days: below 15, 15–35, 35–65 and at least 65 mm/day. They are not official warning categories or validated flood/landslide probabilities.

## Preparedness allocation

The connected planner calculates immediately using visible defaults:

- Modeled exposed population: 0.05% of the historical district population.
- Planning household: four people. Demand is rounded up to whole groups and divided evenly among mapped origins within a district.
- Usable classroom area: assumed 45 m² × published classroom count × 60% availability.
- Covered space: 3.5 m²/person.
- Sanitation: reported toilets × 20 people × availability fraction.
- Planned water budget: 10,000 L/facility/day at 20 L/person/day.
- Maximum measured one-way travel: 120 minutes.
- Vehicles: forty passenger seats, keeping modeled household groups intact.
- Cross-district destinations: disabled unless selected.

These inputs are assumptions and can be changed. Published classroom and toilet counts do not establish building safety, permissions, present occupancy or available water. The minimum of space, sanitation and water constraints determines estimated candidate capacity.

GLPK allocates integer household cohort counts. Phase one maximizes people accommodated. Phase two holds coverage fixed and uses district rainfall screening priority and measured travel time to rank alternatives. Verified local hazard geometry, closures, site exclusions, travel limits and route freshness constrain the graph. Routes older than 24 hours are excluded and can be refreshed from OSRM. There is no invented travel-time fallback.

Saved assessments retain their inputs, allocations and supply totals. JSON/CSV exports support review. They remain separate from actual registered-household movements and cannot themselves confirm real arrivals.

In the 1 November 2026 reference pack, default inputs yielded 2,512 modeled people, 2,068 accommodated and 444 unallocated. Reducing each facility's planned water budget to 1,000 L/day reduced accommodated people to 528. These are calculated scenario results, not actual residents or verified evacuation outcomes.

## Operational records

Use the Registered household movements tab for actual variable-sized household records, reviewed receiving-site resources, approvals and confirmed arrivals. Connected buildings begin as unreviewed candidates. No residents, incident reports or hazard polygons are invented during initialization.

## Browser inference

The neural worker is built as a standalone browser ESM asset before development/build. This avoids framework rewrites of browser/worker detection and file-URL worker construction. Runtime assets are packaged locally. Real public weights load on first use and can reuse browser cache.

Image intelligence includes an attributed historical Wayanad photograph for immediate analysis. Model results do not turn it into a current incident. Generated overlays from this reference retain its CC BY-SA 4.0 attribution. Copilot shows calculated evidence immediately while optional neural wording runs, with source evidence kept available.
