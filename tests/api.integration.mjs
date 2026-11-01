import assert from "node:assert/strict";
const origin=process.env.TEST_ORIGIN??"http://127.0.0.1:5173";
if(!["127.0.0.1","localhost"].includes(new URL(origin).hostname))throw new Error("This test is limited to local development.");
const headers={"oai-authenticated-user-id":"local-integration-test","Content-Type":"application/json"};
const initial=await fetch(`${origin}/api/workspace`,{headers}).then(r=>r.json());assert(initial.workspace);let revision=initial.revision;
try{
 const state=structuredClone(initial.workspace);state.scenario.name="API integration exercise";
 let response=await fetch(`${origin}/api/workspace`,{method:"PUT",headers,body:JSON.stringify({workspace:state,revision})});assert.equal(response.status,200);revision=(await response.json()).revision;
 response=await fetch(`${origin}/api/workspace`,{headers});assert.equal((await response.json()).workspace.scenario.name,"API integration exercise");console.log("PASS durable workspace write/read");
 response=await fetch(`${origin}/api/workspace`,{method:"PUT",headers,body:JSON.stringify({workspace:state,revision:revision-1})});assert.equal(response.status,409);console.log("PASS optimistic conflict rejection");
 const invalid=structuredClone(state);invalid.sites[0].water=-1;response=await fetch(`${origin}/api/workspace`,{method:"PUT",headers,body:JSON.stringify({workspace:invalid,revision})});assert.equal(response.status,400);console.log("PASS invalid capacity rejection");
 response=await fetch(`${origin}/api/workspace`,{method:"PUT",headers:{...headers,Origin:"https://invalid.example"},body:JSON.stringify({workspace:state,revision})});assert.equal(response.status,403);console.log("PASS cross-origin mutation rejection");
 response=await fetch(`${origin}/api/assistant`,{method:"POST",headers,body:JSON.stringify({question:"What limits accommodation capacity?",workspace:state})});assert.equal(response.status,200);const answer=await response.json();assert(answer.text.includes("Central Relief Campus"));assert.equal(answer.mode,"grounded-local");console.log("PASS grounded assistant API");
 response=await fetch(`${origin}/api/nlp`,{method:"POST",headers,body:JSON.stringify({text:"मेप्पाडी में बाढ़ है और 48 लोग फंसे हैं।"})});assert.equal(response.status,200);const extraction=await response.json();assert.equal(extraction.extraction.settlement,"S03");assert.equal(extraction.extraction.people,48);assert.equal(extraction.mode,"rule-baseline");console.log("PASS bilingual report-extraction API");
 const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVw8AAAAASUVORK5CYII=","base64"),form=new FormData();form.set("file",new File([png],"integration-test.png",{type:"image/png"}));response=await fetch(`${origin}/api/evidence`,{method:"POST",headers:{"oai-authenticated-user-id":"local-integration-test"},body:form});assert.equal(response.status,200);const upload=await response.json();response=await fetch(origin+upload.url,{headers});assert.equal(response.status,200);assert.equal(response.headers.get("content-type"),"image/png");console.log("PASS R2 upload and authorized retrieval");
 const other=await fetch(`${origin}/api/workspace`,{headers:{"oai-authenticated-user-id":"forged-client-identity"}}).then(r=>r.json());assert.equal(other.workspaceKey,initial.workspaceKey);console.log("PASS local sign-in overrides untrusted client identity headers");
 // Cross-account isolation requires two real authenticated sessions; the local mock deliberately supplies one identity.
}finally{
 const latest=await fetch(`${origin}/api/workspace`,{headers}).then(r=>r.json());await fetch(`${origin}/api/workspace`,{method:"PUT",headers,body:JSON.stringify({workspace:initial.workspace,revision:latest.revision})});
}
