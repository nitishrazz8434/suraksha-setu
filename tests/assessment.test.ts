import {test} from "node:test";
import assert from "node:assert/strict";
import GLPK from "glpk.js/node";
import {catalog,connectReferenceDistricts} from "../lib/catalog";
import {createWorkspace} from "../lib/workspace";
import {workspaceSchema} from "../lib/validation";
import {contains,capacity} from "../lib/engine";
import {assess,assessmentSchema,assumptionSchema,DEFAULT_ASSUMPTIONS,potential,rainOutlook} from "../lib/assessment";
const solver=await GLPK(),fresh=()=>catalog.routes.map(r=>({...r,fetchedAt:new Date().toISOString()}));
test("reference geography and every mapped origin/facility agree on district",()=>{
 assert.equal(catalog.profiles.length,3);assert.equal(catalog.facilities.length,11);assert.equal(catalog.origins.length,9);
 for(const point of [...catalog.origins,...catalog.facilities]){const district=catalog.profiles.find(p=>p.id===point.districtId)!;assert(contains(district.geometry,[point.lng,point.lat]),`${point.name} falls outside ${district.name}`);}
 assert(catalog.facilities.every(f=>f.source.startsWith("https://sametham.kite.kerala.gov.in/")&&f.classrooms>0&&f.toilets>0));
});
test("connecting real references preserves custom records without inventing households or hazard events",()=>{
 const original=createWorkspace();original.districts.push({id:"CUSTOM",name:"Custom district",state:"Kerala",lat:10,lng:76});
 const connected=connectReferenceDistricts(original),again=connectReferenceDistricts(connected);
 assert(workspaceSchema.safeParse(connected).success);assert.equal(connected.districts.length,4);assert.equal(connected.households.length,0);assert.equal(connected.reports.length,0);assert.equal(connected.hazards.length,0);assert(connected.sites.every(s=>!capacity(s).eligible));assert.equal(again.sites.length,connected.sites.length);assert.equal(again.routes.length,connected.routes.length);assert.equal(again.documents.length,connected.documents.length);
});
test("preparedness allocation conserves integer household cohorts and all site limits",async()=>{
 const w=connectReferenceDistricts(createWorkspace()),a=DEFAULT_ASSUMPTIONS,p=await assess(catalog,w,a,solver,fresh());
 assert(p.served>0&&p.unallocated>0);assert.equal(p.demand,p.served+p.unallocated);assert(p.assignments.every(m=>m.people===m.households*a.householdSize&&Number.isInteger(m.households)));
 for(const facility of catalog.facilities){const load=p.assignments.filter(m=>m.siteId===facility.id).reduce((n,m)=>n+m.people,0);assert(load<=potential(facility,a).total);}
 assert.equal(p.waterLitresDay,p.served*a.litresPerPerson);assert.equal(p.mealsDay,p.served*3);assert.equal(p.vehicleTrips,p.assignments.reduce((n,m)=>n+Math.ceil(m.households/Math.floor(a.vehicleSeats/a.householdSize)),0));assert(assessmentSchema.safeParse(p).success);
});
test("water stress changes the calculated result and zero water cannot accommodate anyone",async()=>{
 const w=connectReferenceDistricts(createWorkspace()),normal=await assess(catalog,w,DEFAULT_ASSUMPTIONS,solver,fresh()),stress=await assess(catalog,w,{...DEFAULT_ASSUMPTIONS,waterPerSite:1000},solver,fresh()),none=await assess(catalog,w,{...DEFAULT_ASSUMPTIONS,waterFactor:0},solver,fresh());
 assert(stress.served<normal.served);assert.equal(none.served,0);assert.equal(none.unallocated,none.demand);
});
test("district scope and excluded facilities constrain candidate allocations",async()=>{
 const w=connectReferenceDistricts(createWorkspace());w.activeDistrictId="KL-WAYANAD";const excluded=catalog.facilities.find(f=>f.districtId===w.activeDistrictId)!.id;
 const p=await assess(catalog,w,{...DEFAULT_ASSUMPTIONS,excludedSites:[excluded]},solver,fresh());assert.deepEqual(p.districtIds,[w.activeDistrictId]);assert(p.assignments.every(m=>catalog.origins.find(o=>o.id===m.originId)?.districtId===w.activeDistrictId&&m.siteId!==excluded));
});
test("expired road evidence cannot create a usable preparedness movement",async()=>{
 const p=await assess(catalog,connectReferenceDistricts(createWorkspace()),DEFAULT_ASSUMPTIONS,solver,catalog.routes.map(r=>({...r,fetchedAt:"2020-01-01T00:00:00.000Z"})));assert.equal(p.served,0);assert.equal(p.assignments.length,0);
});
test("reviewed high-severity geometry excludes affected candidate sites and routes",async()=>{
 const w=connectReferenceDistricts(createWorkspace());w.hazards.push({id:"TEST-GEOMETRY",districtId:"KL-WAYANAD",name:"Unit test exclusion",hazard:"Flood",severity:90,geometry:{type:"Polygon",coordinates:[[[70,5],[80,5],[80,15],[70,15],[70,5]]]},source:"Unit-test geometry",verified:true,observedAt:new Date().toISOString(),expiresAt:null});
 const p=await assess(catalog,w,DEFAULT_ASSUMPTIONS,solver,fresh());assert.equal(p.served,0);
});
test("invalid vehicle grouping and inconsistent stored totals are rejected",async()=>{
 assert(!assumptionSchema.safeParse({...DEFAULT_ASSUMPTIONS,householdSize:10,vehicleSeats:5}).success);const p=await assess(catalog,connectReferenceDistricts(createWorkspace()),DEFAULT_ASSUMPTIONS,solver,fresh());assert(!assessmentSchema.safeParse({...p,served:p.served+1}).success);
});
test("missing rainfall observations stay unknown and screening never changes the hazard register",()=>{
 const w=createWorkspace();assert.equal(rainOutlook().label,"Awaiting forecast");const r=rainOutlook({districtId:"test",fetchedAt:new Date().toISOString(),observedAt:"",source:"Unit-test forecast",temperature:null,precipitation:null,weatherCode:null,days:[{date:"2026-11-01",rain:70,probability:100,high:30,low:20}]});assert.equal(r.label,"High rainfall outlook");assert.equal(w.hazards.length,0);
});

import {decodeForecast,unavailableForecast,weatherUrl} from "../lib/weather";
test("weather decoding preserves zero measurements, nulls and source time",()=>{
 const f=decodeForecast("D",{current:{time:"2026-11-01T22:00",temperature_2m:0,precipitation:0,weather_code:0},daily:{time:["2026-11-01"],precipitation_sum:[0],temperature_2m_max:[null]}});
 assert.equal(f.temperature,0);assert.equal(f.days[0].rain,0);assert.equal(f.days[0].high,null);assert.equal(f.observedAt,"2026-11-01T22:00:00+05:30");assert.throws(()=>decodeForecast("D",{}));assert.equal(unavailableForecast("D","rate limited").temperature,null);
});
test("weather request uses a fixed public provider and only district coordinates",()=>{
 const url=new URL(weatherUrl({lat:11.7,lng:76.1}));assert.equal(url.origin,"https://api.open-meteo.com");assert.equal(url.searchParams.get("latitude"),"11.7");assert.equal(url.searchParams.get("forecast_days"),"7");assert.equal(url.searchParams.get("timezone"),"Asia/Kolkata");
});
