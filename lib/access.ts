import type {Account} from "./auth-types";
import type {Workspace} from "./types";
import {readWorkspace,writeWorkspace} from "./persistence";
import {connectReferenceDistricts} from "./catalog";
import {db} from "./server";
import {canDistrict} from "./auth";
import type {Household,RouteRecord} from "./types";
export const SHARED_WORKSPACE="organisation:suraksha";
export async function initializeShared(){
 const existing=await readWorkspace(SHARED_WORKSPACE);if(existing.revision)return;
 const legacy=await db().prepare("SELECT owner_id FROM workspaces WHERE owner_id NOT LIKE '%:test:%' AND owner_id<>? ORDER BY updated_at DESC LIMIT 1").bind(SHARED_WORKSPACE).first<{owner_id:string}>();
 const source=legacy?await readWorkspace(legacy.owner_id):existing;
 const workspace=source.workspace.districts.length?structuredClone(source.workspace):connectReferenceDistricts(source.workspace);
 // Original legacy records and their immutable objects remain recoverable.
 for(const report of workspace.reports){const r={...report,status:"Pending",submitterId:"legacy-import",submitterName:"Imported legacy record",revision:1,history:[]};await db().prepare("INSERT OR IGNORE INTO incident_records(id,district_id,submitter_id,payload,updated_at) VALUES(?,?,?,?,?)").bind(r.id,r.districtId,r.submitterId,JSON.stringify(r),new Date().toISOString()).run();}
 workspace.reports=[];workspace.activeDistrictId="";workspace.activity=[];
 await writeWorkspace(SHARED_WORKSPACE,workspace,0,null);
}
export async function visibleReports(user:Account){
 const query=user.role==="citizen"?db().prepare("SELECT payload,revision FROM incident_records WHERE submitter_id=? ORDER BY updated_at DESC LIMIT 5000").bind(user.id):user.role==="admin"?db().prepare("SELECT payload,revision FROM incident_records ORDER BY updated_at DESC LIMIT 5000"):user.districtIds.length?db().prepare(`SELECT payload,revision FROM incident_records WHERE district_id IN (${user.districtIds.map(()=>"?").join(",")}) ORDER BY updated_at DESC LIMIT 5000`).bind(...user.districtIds):null;
 const rows=query?(await query.all<{payload:string;revision:number}>()).results:[];return rows.map(r=>({...JSON.parse(r.payload),revision:r.revision})) as Workspace["reports"];
}
export function scopeWorkspace(full:Workspace,user:Account):Workspace{
 const w=structuredClone(full);w.activeDistrictId="";w.activity=[];
 if(user.role==="citizen"){w.households=[];w.sites=[];w.hazards=[];w.routes=[];w.plans=[];w.tasks=[];w.documents=[];w.assessments=[];return w;}
 if(user.role==="admin")return w;
 w.districts=w.districts.filter(d=>canDistrict(user,d.id));const allowed=(d:string)=>canDistrict(user,d);
 w.settlements=w.settlements.filter(s=>allowed(s.districtId));const settlements=new Set(w.settlements.map(s=>s.id));
 w.households=w.households.filter(h=>settlements.has(h.settlementId));w.sites=w.sites.filter(s=>allowed(s.districtId));const sites=new Set(w.sites.map(s=>s.id));
 w.hazards=w.hazards.filter(h=>allowed(h.districtId));w.routes=w.routes.filter(r=>settlements.has(r.settlementId)&&sites.has(r.siteId));
 w.tasks=w.tasks.filter(t=>allowed(t.districtId)&&(user.role==="admin"||!t.assignedTo||t.assignedTo===user.id));w.documents=w.documents.filter(d=>allowed(d.districtId));w.assessments=w.assessments?.filter(a=>a.districtIds.every(allowed));
 w.plans=w.plans.filter(p=>(!p.districtId||allowed(p.districtId))&&p.assignments.every(a=>settlements.has(a.settlementId)&&sites.has(a.siteId)));
 w.reports=w.reports.filter(r=>allowed(r.districtId));w.scenario.unavailableSites=w.scenario.unavailableSites.filter(id=>sites.has(id));const routes=new Set(w.routes.map(r=>r.id));w.scenario.closedRoutes=w.scenario.closedRoutes.filter(id=>routes.has(id));return w;
}
export async function accountWorkspace(user:Account){let stored=await readWorkspace(SHARED_WORKSPACE);if(!stored.revision){await initializeShared();stored=await readWorkspace(SHARED_WORKSPACE);}stored.workspace.reports=await visibleReports(user);const workspace=scopeWorkspace(stored.workspace,user);const prefs=await db().prepare("SELECT scenario FROM user_preferences WHERE user_id=?").bind(user.id).first<{scenario:string}>();if(prefs&&user.role!=="citizen"){try{const scenario=JSON.parse(prefs.scenario);scenario.unavailableSites=scenario.unavailableSites.filter((id:string)=>workspace.sites.some(s=>s.id===id));scenario.closedRoutes=scenario.closedRoutes.filter((id:string)=>workspace.routes.some(r=>r.id===id));workspace.scenario=scenario;}catch{}}return{...stored,workspace};}
export function mergeWorkspace(full:Workspace,next:Workspace,user:Account){
 const visible=scopeWorkspace(full,user),w=structuredClone(full);const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
 if(user.role!=="admin"&&!equal(next.districts,visible.districts))throw new Error("Only an administrator can change the district register.");

 if(user.role==="admin")w.districts=next.districts;
 const allowed=new Set(visible.districts.map(d=>d.id));
 type RecordKey="settlements"|"households"|"sites"|"hazards"|"routes"|"documents"|"tasks";
 type RecordRow=Workspace[RecordKey][number];
 const districtOf=(key:RecordKey,row:RecordRow):string=>{
  if(key==="households"||key==="routes"){
   const settlementId=(row as Household|RouteRecord).settlementId;
   return(next.settlements.find(s=>s.id===settlementId)??full.settlements.find(s=>s.id===settlementId))?.districtId??"";
  }
  return "districtId" in row ? row.districtId : "";
 };
 const replaceRows=<K extends RecordKey>(target:Workspace,key:K,rows:Workspace[K])=>{target[key]=rows;};
 for(const key of ["settlements","households","sites","hazards","routes","documents","tasks"] as const){
  const nextRows=next[key] as RecordRow[],fullRows=full[key] as RecordRow[];
  for(const row of nextRows){if(!canDistrict(user,districtOf(key,row)))throw new Error("A record is outside your assigned districts.");if(key==="routes"&&!next.sites.some(s=>s.id===(row as RouteRecord).siteId))throw new Error("Route destination is outside your assigned districts.");const original=fullRows.find(record=>record.id===row.id);if(original&&!allowed.has(districtOf(key,original))&&user.role!=="admin")throw new Error("Record identifier belongs to another district.");}
  const visibleIds=new Set((visible[key] as RecordRow[]).map(row=>row.id));
  replaceRows(w,key,[...fullRows.filter(row=>!visibleIds.has(row.id)),...nextRows] as Workspace[typeof key]);
 }
 const visiblePlans=new Set(visible.plans.map(p=>p.id));
 for(const p of next.plans){const old=full.plans.find(x=>x.id===p.id);if(old&&!visiblePlans.has(p.id))throw new Error("Plan is outside your assigned districts.");if(old&&!equal(p,old))throw new Error("Saved plans are immutable. Use the approval or movement actions, or calculate a new draft.");if(!old&&p.status!=="Draft")throw new Error("New plans must start as drafts.");if(!old){p.createdBy=user.id;p.createdByName=user.name;p.inputDistrictIds=next.districts.map(d=>d.id);}if(p.assignments.some(a=>!next.households.some(h=>h.id===a.householdId)||!next.sites.some(s=>s.id===a.siteId)))throw new Error("Plan contains unauthorised households or destinations.");}
 if(visible.plans.some(p=>!next.plans.some(n=>n.id===p.id)))throw new Error("Saved plans cannot be deleted. Cancel outstanding movements instead.");
 w.plans=[...full.plans.filter(p=>!visiblePlans.has(p.id)),...next.plans];
 const visibleAssessments=new Set(visible.assessments?.map(a=>a.id));for(const a of next.assessments??[])if(a.districtIds.some(d=>!canDistrict(user,d)))throw new Error("Assessment is outside your assigned districts.");
 w.assessments=[...(full.assessments??[]).filter(a=>!visibleAssessments.has(a.id)),...(next.assessments??[])].slice(0,30);
 for(const site of next.sites){const previous=full.sites.find(s=>s.id===site.id);if(previous&&site.occupancy<previous.occupancy)throw new Error("Recorded occupancy cannot decrease below confirmed arrivals. Record a reviewed departure before reducing occupancy.");const arrived=next.plans.flatMap(p=>p.assignments).filter(a=>a.siteId===site.id&&a.status==="Arrived").reduce((n,a)=>n+a.people,0);if(site.occupancy<arrived)throw new Error("Capacity cannot be reduced below the number of confirmed arrivals.");}
 w.activeDistrictId="";w.reports=[];return w;
}
