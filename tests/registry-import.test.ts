import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixtures";
import { buildRegistryImport, readRegistryImport } from "../lib/registry-import";

test("household CSV import resolves registered settlements and rejects unknown references row by row", async () => {
  const workspace = fixture();
  const csv = [
    "settlement,household reference,family size,priority,notes",
    '"Settlement A",HH-NEW,3,50,"Needs transport"',
    '"Unknown Settlement",HH-BAD,2,20,"Do not import"',
  ].join("\n");
  const file = await readRegistryImport(new File([csv], "households.csv", { type: "text/csv" }), "households");
  const result = buildRegistryImport(file, workspace, false);

  assert.equal(result.added, 1);
  assert.equal(result.updated, 0);
  assert.equal(result.rejected, 1);
  assert.equal(result.rows[0].status, "add");
  assert.equal(result.rows[1].status, "error");
  assert.match(result.rows[1].errors[0], /Register settlement/);
  assert.equal(result.workspace.households.filter(household => household.reference === "HH-NEW")[0].size, 3);
  assert.equal(workspace.households.some(household => household.reference === "HH-NEW"), false);
});

test("GeoJSON hazard import rejects malformed features before producing rows", async () => {
  const invalid = new File([JSON.stringify({ type: "FeatureCollection", features: [{ type: "Feature", geometry: null, properties: {} }] })], "hazards.geojson", { type: "application/geo+json" });
  await assert.rejects(() => readRegistryImport(invalid, "hazards"), /Each hazard feature needs geometry/);
});
