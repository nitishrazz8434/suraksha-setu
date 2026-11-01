# Operations guide

## Start with connected intelligence

An empty account connects three Kerala districts automatically. The dashboard shows source-linked population, school infrastructure, measured roads and seven-day weather. Open Relocation planning to run the preparedness model immediately; adjust assumptions, compare resource stress, save results and export allocations. Image intelligence can load the attributed historical Wayanad photograph and run a real model without requiring an upload.

Preparedness scenarios use estimated demand and candidate resources. For actual household movement, follow the reviewed operating-record workflow below.

## Register an operating area

1. In **Data register → Districts**, add each district's name, state and map centre. Select one district or **All districts** in the sidebar.
2. Register settlements with coordinates, aliases, source, observation time and verification. Aliases help English/Hindi extraction match actual records.
3. Register each household with its reference, actual size, settlement, assistance/medical needs and reviewed priority. Population totals come from these records.
4. Register receiving sites with space, water and sanitation person limits, existing occupancy, accessibility and medical support. Complete source verification and safety review before allocation.
5. For longer-term relocation, also record land, environmental and service reviews plus sustainable capacity. Retain supporting evidence in Documents.

Use blank CSV column templates for batch entry. Import districts/settlements before dependent records. Deleting referenced records is rejected until dependencies are handled. Export a backup before large changes.

## Add evidence

Import hazard GeoJSON Polygon/MultiPolygon features using longitude/latitude coordinates and closed rings. Specify category, severity, source, observation time, optional expiry and verification. Unverified or expired layers remain evidence but do not constrain allocation. Areas without evidence remain unassessed.

Add reports with district and registered settlement. Text extraction suggests fields; review them. Neural analysis downloads and runs a pretrained model. Photos are stored as account-owned evidence. Verify a report only after review. Link road obstruction reports to their registered route; resolve them when the obstruction no longer applies.

**Image intelligence** processes user images for segmentation, object detection and image-text ranking. Aligned comparison measures image differences, not their cause or engineering severity. Create a report from analyzed imagery when useful, then review it independently.

## Calculate and execute a plan

1. Fetch road routes in **Relocation planning**. Batches are limited to 40 endpoint pairs; narrow endpoint selections for larger areas. Coordinates are sent to the routing provider.
2. Review closures and hazards. Routes must match current coordinates and be under 24 hours old. Failed requests create no guessed road.
3. In **Scenario comparison**, choose emergency/longer-term purpose and cross-district policy. Compare water constraints and site/route exclusions before applying conditions.
4. Calculate allocation and inspect served/unallocated demand, destinations, household sizes and assistance coverage. Households cannot be split. Missing access, resource limits, stale routes and assistance constraints can leave demand unallocated.
5. Save and approve a reviewed draft. Changed inputs or reservations can block approval; calculate a new draft from current data when needed.
6. Start movements and confirm actual arrivals. The server updates occupancy once per household. Outstanding reservations reduce places available to other plans. Cancel outstanding movements when required; confirmed arrivals stay recorded.

Refreshing routes retains records referenced by plans. If a plan's route expires or requirements change, cancel outstanding movements and recalculate from current evidence.

## Documents and recovery

Add text or text-based PDFs under **Reports & documents**. Limits: 50 pages, 8 MB, 100,000 extracted characters per document and 30 documents. Scanned PDFs require external OCR. Copilot retrieves source-labelled passages and calculated values; review generated wording against its visible evidence.

Export briefs, allocation CSV and full JSON backups. Backups do not embed image binaries. Keep originating account/storage for evidence links or retain original images separately when migrating installations.

On a save conflict/rejection, download unsaved changes before reloading. Network loss retains an outbox after the workspace loads. **Workspace settings → Download previous workspace archive** retrieves the earlier format without inserting its records into active registers.

Basemaps, routing and first model downloads need network access. Voice features depend on browser permissions/support. Settings can check packaged inference/PDF-worker assets. Use server-side ROUTING_URL for a compatible private OSRM service when needed.
