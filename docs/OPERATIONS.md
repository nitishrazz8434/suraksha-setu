# Operations guide

## Create accounts and sign in

1. Start the local project using the README instructions and open the printed local URL.
2. On first run, create the administrator with your own email and strong, private password. This can be done once.
3. In **Accounts & access**, create a separate **District officer** account, select its district assignment and set a temporary password. Give that password directly to the person using the account. On first login the officer chooses a new password.
4. Create a **Citizen account** from the sign-in page. Citizens can also register themselves.
5. Sign in as the citizen in a separate browser profile or after signing out. Citizen submissions are visible to the assigned officers; officers see operational registers only in their assigned districts.

Never share the administrator password. Citizens cannot register as officers, and officers cannot change their own role or district assignment.

## Report, review and resolve an incident

1. As a citizen, choose **New report**, describe what happened, choose a district, select a location where known, enter when it was observed, and attach a photograph when available.
2. **Classify with AI** runs a pretrained language model to suggest a category. The suggestion helps sort the report; it does not verify what happened.
3. Submit the report. It enters the officer queue as **Pending**. Only its submitter can see it in the citizen dashboard.
4. Sign in using a different, district-assigned officer account. Open **Incident reports**, inspect the original observation and photo, and record a decision reason. The reporting officer cannot verify their own report.
5. The officer may start review, request more information, verify, reject or resolve the report. Verification requires a confirmed settlement or a linked route and sets an evidence expiry within seven days.
6. If information is requested, the citizen replies from the report. The officer then reviews the additional information. Decision names, reasons, dates and report history remain visible to the submitter; consequential activity is recorded in **Audit history**.
7. Verified flood or landslide reports can affect the settlement assessment until expiry. Verified linked road obstructions make their route ineligible until the evidence expires or the report is resolved. Reassess expired evidence before relying on it.

Use only genuine observations as verified evidence. Clearly label classroom practice examples and never enter invented incidents into a real operational workspace.

## Start with connected intelligence

The administrator's empty shared workspace connects three Kerala districts using source-linked population, school infrastructure, measured roads and seven-day weather. Open **Relocation planning** to run the preparedness model; adjust assumptions, compare resource stress, save results and export allocations. A prepared exposure scenario is an estimate, not a list of affected residents. Image intelligence can load the attributed historical Wayanad photograph and run a pretrained model.

## Read the risk map and use Copilot

Settlement markers and hazard polygons use evidence severity colors: red Critical (85–100), orange High (65–84), yellow Moderate (40–64), green Low recorded severity (below 40), and gray Unassessed or inactive evidence. Green means low recorded evidence, not a certified safe zone. Select a hazard polygon to inspect its hazard type, verification state, source, observation time and expiry.

District outlines have a separate rainfall layer using the maximum single-day rain forecast in the next three days: red at 65 mm or more, orange at 35–64 mm, yellow at 15–34 mm, and green below 15 mm. Gray means no forecast is available. Where the rain screen is at least 35 mm/day, the interface adds a flood-monitoring concern; it does not predict a flood. The map popup lists potential hazards from active verified local records and the weather screen. These bands are heuristics, not validated probabilities or official warnings. Do not label a location safe from the map alone.

For a ready-made geographic demonstration, open **Risk map → Map layers → Open Wayanad susceptibility example**. This loads the KSDMA-distributed NCESS 2010 landslide susceptibility zones for Wayanad: 110 High, 149 Medium and 10 Low polygons. Select a polygon to read its class and source. This historical reference layer is kept separate from live reports and does not change the workspace, risk calculations, routes or saved plans. It is not a current warning.

Copilot answers questions about workspace records and indexed documents with calculated or retrieved evidence when available. General questions and follow-ups use the packaged quantized Qwen2.5 0.5B Instruct model; its first use downloads about 480 MB of weights. General answers are labeled unverified; the model has no live web access and can be wrong. Curated disaster explanations and common safety prompts are answered with links to official NDMA guidance, and immediate local conditions are never inferred by the language model. Built-in project answers remain available when language generation is disabled or unavailable. The model can explain concepts, but it cannot verify a citizen report, predict a disaster, approve a plan or replace official emergency instructions.

Preparedness scenarios use estimated demand and candidate resources. Actual household movements use the reviewed register workflow below.

## Register an operating area

1. In **Data register → Districts**, add each district's name, state and map centre. Select one district or **All districts** in the sidebar.
2. Register settlements with coordinates, aliases, source, observation time and verification. Aliases help English/Hindi extraction match actual records.
3. Register each household with its reference, actual size, settlement, assistance/medical needs and reviewed priority. Population totals come from these records.
4. Register receiving sites with space, water and sanitation person limits, existing occupancy, accessibility and medical support. Complete source verification and safety review before allocation.
5. For longer-term relocation, also record land, environmental and service reviews plus sustainable capacity. Retain supporting evidence in Documents.

Use **Download template** for a blank CSV header row, then open it in Excel or another spreadsheet editor and save as CSV. The importer recognizes common alternatives such as village, family size, latitude, shelter capacity and district. It previews every row, validates numbers, source dates, record references and duplicates, then lets you save valid rows while downloading rejected rows with their error reasons. Existing records are not overwritten unless you turn on **Update matching records** and review the preview. To update safely, include the stable record ID or household reference. Import districts and settlements before dependent records. Hazard layers also accept Polygon/MultiPolygon GeoJSON; uploaded verification values and provenance are shown in the preview. Export a backup before large changes.

Household imports use one row per household: the allocator needs each household’s actual size and reviewed priority so it never splits a family to fill a site. Aggregate settlement population totals cannot substitute for the household register. An imported route must include its surveyed distance, travel time, source, geometry and measurement date. An old route remains stale after import; importing does not refresh its timestamp.

## Add evidence

Import hazard GeoJSON Polygon/MultiPolygon features using longitude/latitude coordinates and closed rings. Specify category, severity, source, observation time, optional expiry and verification. Unverified or expired layers remain evidence but do not constrain allocation. Areas without evidence remain unassessed.

Incident reports use the independent citizen and officer workflow above. Uploaded evidence is private to its submitter and the staff assigned to its district. Supporting geometry retains its source, observed time, verifier and expiry.

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

On a save conflict/rejection, download unsaved changes before reloading. Network loss retains an outbox after the workspace loads. **The system administrator → Workspace settings → Download previous workspace archive** retrieves the earlier format without inserting its records into active registers.

Basemaps, routing and first model downloads need network access. Voice features depend on browser permissions/support. Settings can check packaged inference/PDF-worker assets. Use server-side ROUTING_URL for a compatible private OSRM service when needed.
