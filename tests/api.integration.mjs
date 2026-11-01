import assert from"node:assert/strict";
import{build}from"esbuild";
import{pathToFileURL}from"node:url";
import{resolve}from"node:path";
import GLPK from"glpk.js/node";
const origin=process.env.TEST_ORIGIN??"http://127.0.0.1:5173";
if(!["127.0.0.1","localhost"].includes(new URL(origin).hostname))throw new Error("Integration tests are restricted to local development.");
await build({stdin:{contents:'export{fixture}from"./tests/fixtures.ts";export{optimize}from"./lib/engine.ts";',resolveDir:process.cwd()},bundle:true,platform:"node",format:"esm",outfile:".sites-runtime/api-fixture.mjs",logLevel:"warning"});
const{fixture,optimize}=await import(pathToFileURL(resolve(".sites-runtime/api-fixture.mjs")).href),solver=await GLPK();
const scope=crypto.randomUUID(),headers={"Content-Type":"application/json","x-suraksha-test-scope":scope};let revision=0,state;let count=0;
const pass=name=>{count++;console.log(`PASS ${name}`);};
async function get(){const r=await fetch(`${origin}/api/workspace`,{headers}),d=await r.json();assert.equal(r.status,200,JSON.stringify(d));state=d.workspace;revision=d.revision;return d;}
async function put(next){const r=await fetch(`${origin}/api/workspace`,{method:"PUT",headers,body:JSON.stringify({workspace:next,revision})}),d=await r.json();assert.equal(r.status,200,JSON.stringify(d));revision=d.revision;await get();}
async function action(type,planId,householdId,status=200){const r=await fetch(`${origin}/api/actions`,{method:"POST",headers,body:JSON.stringify({type,planId,householdId,revision})}),d=await r.json();assert.equal(r.status,status,JSON.stringify(d));if(r.ok){state=d.workspace;revision=d.revision;}return d;}
await get();assert.equal(state.version,2);assert.equal(state.districts.length,0);pass("empty multi-district workspace");
await put(fixture());assert.equal(state.districts.length,2);pass("durable data registers through object storage");
let r=await fetch(`${origin}/api/workspace`,{method:"PUT",headers,body:JSON.stringify({workspace:state,revision:revision-1})});assert.equal(r.status,409);pass("optimistic concurrency rejection");
const bad=structuredClone(state);bad.sites[0].water=-1;r=await fetch(`${origin}/api/workspace`,{method:"PUT",headers,body:JSON.stringify({workspace:bad,revision})});assert.equal(r.status,400);pass("invalid resource rejection");
r=await fetch(`${origin}/api/workspace`,{method:"PUT",headers:{...headers,Origin:"https://invalid.example"},body:JSON.stringify({workspace:state,revision})});assert.equal(r.status,403);pass("cross-origin write rejection");
const otherHeaders={...headers,"x-suraksha-test-scope":crypto.randomUUID()};const other=await fetch(`${origin}/api/workspace`,{headers:otherHeaders}).then(r=>r.json());assert.equal(other.workspace.districts.length,0);pass("separate local test identities cannot read each other's registers");
r=await fetch(`${origin}/api/assistant`,{method:"POST",headers,body:JSON.stringify({question:"Site A1 capacity",workspace:state})});assert.equal(r.status,200);assert((await r.json()).text.includes("6 available"));pass("assistant uses registered capacity values");
r=await fetch(`${origin}/api/nlp`,{method:"POST",headers,body:JSON.stringify({text:"स्थान ए में बाढ़ है और 48 लोग फंसे हैं।"})});assert.equal(r.status,200);const extraction=await r.json();assert.equal(extraction.extraction.settlement,"SA");assert.equal(extraction.extraction.people,48);pass("Hindi extraction uses the actual settlement register");
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVw8AAAAASUVORK5CYII=","base64"),form=new FormData();form.set("file",new File([png],"upload-test.png",{type:"image/png"}));r=await fetch(`${origin}/api/evidence`,{method:"POST",headers:{"x-suraksha-test-scope":scope},body:form});assert.equal(r.status,200);const upload=await r.json();assert.equal((await fetch(origin+upload.url,{headers})).status,200);assert.equal((await fetch(origin+upload.url,{headers:otherHeaders})).status,404);pass("evidence upload and owner isolation");
let plan=await optimize(state,solver);state.plans.push(plan);await put(state);const staleId=plan.id;state.sites[0].water=5;await put(state);await action("approve",staleId,undefined,400);pass("stale inputs block approval");
await put(fixture());plan=await optimize(state,solver);state.plans.push(plan);await put(state);await action("approve",plan.id);assert.equal(state.plans[0].status,"Approved");pass("server-validated plan approval");
const a=state.plans[0].assignments.find(a=>a.householdId==="H3");await action("arrive",plan.id,a.householdId);assert.equal(state.sites.find(s=>s.id===a.siteId).occupancy,3);pass("atomic arrival increases real occupancy");
await action("arrive",plan.id,a.householdId,400);assert.equal(state.sites.find(s=>s.id===a.siteId).occupancy,3);pass("duplicate arrival cannot increment occupancy twice");
for(const pending of state.plans[0].assignments.filter(a=>a.status!=="Arrived"))await action("arrive",plan.id,pending.householdId);assert.equal(state.plans[0].status,"Completed");assert.equal(state.sites.reduce((n,s)=>n+s.occupancy,0),10);pass("all variable-sized households complete movement without splitting");
await action("cancel",plan.id,undefined,400);pass("completed plans cannot be cancelled");
r=await fetch(`${origin}/api/routes`,{method:"POST",headers,body:JSON.stringify({from:{id:"a",lat:999,lng:0},to:{id:"b",lat:0,lng:0}})});assert.equal(r.status,400);pass("invalid routing coordinates rejected");
if(process.env.RUN_ROUTING_SMOKE==="1"){r=await fetch(`${origin}/api/routes`,{method:"POST",headers,body:JSON.stringify({from:{id:"FROM",lat:12.9716,lng:77.5946},to:{id:"TO",lat:12.98,lng:77.6}})});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));assert(data.routes[0].distance>0&&data.routes[0].geometry.length>=2);pass("real OSRM road geometry and measured distances");}
console.log(`${count} local API integration checks passed. Test records were isolated from the normal workspace.`);
