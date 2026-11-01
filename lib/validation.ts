import { z } from "zod";
import {NODES,ROADS,SETTLEMENTS} from "./seed";
const finite=z.number().finite(),count=finite.int().min(0).max(1000000),str=z.string().max(20000),id=z.string().min(1).max(120);
const scenario=z.object({name:z.string().min(1).max(160),intensity:finite.min(0.5).max(2),closedRoads:z.array(id).max(50),unavailableSites:z.array(id).max(50),waterFactor:finite.min(0).max(1.5),demandFactor:finite.min(0.5).max(2)});
export const workspaceSchema=z.object({version:z.literal(1),scenario,
 sites:z.array(z.object({id,name:id,locality:id,lat:finite.min(-90).max(90),lng:finite.min(-180).max(180),node:id,space:count,water:count,sanitation:count,occupancy:count,accessible:z.boolean(),medical:z.boolean(),active:z.boolean(),longTerm:z.boolean(),environmental:z.boolean(),livelihood:finite.min(0).max(100)})).min(1).max(100),
 reports:z.array(z.object({id,title:z.string().min(1).max(250),text:str,settlement:z.string().max(120),hazard:z.enum(["Flood","Landslide","Infrastructure","Unspecified"]),severity:z.enum(["Critical","High","Moderate","Low"]),status:z.enum(["Pending","Verified","Resolved"]),source:z.enum(["Citizen","Field team","Bulletin"]),createdAt:z.string().datetime(),people:count.nullable(),needs:z.array(id).max(20),roadId:id.optional(),evidenceUrl:z.string().max(500).optional(),analysis:z.object({model:id,label:id,score:finite.min(0).max(1)}).optional()})).max(1000),
 plans:z.array(z.object({id,createdAt:z.string().datetime(),status:z.enum(["Draft","Approved","In progress","Completed"]),assignments:z.array(z.object({settlementId:id,siteId:id,households:count,people:count,distance:finite.min(0),assisted:z.boolean(),path:z.array(id).max(100)})).max(2000),served:count,demand:count,unallocated:count,distance:finite.min(0),priorityCoverage:finite.min(0).max(100),scenario})).max(100),
 activity:z.array(z.object({id,text:str,time:z.string().datetime(),type:z.enum(["report","plan","site","scenario"])})).max(500),
 tasks:z.array(z.object({id,title:id,team:id,done:z.boolean()})).max(200),
 documents:z.array(z.object({id,name:id,text:z.string().max(100000)})).max(20)
}).superRefine((w,ctx)=>{
 const siteIds=new Set(w.sites.map(s=>s.id));
 if(siteIds.size!==w.sites.length)ctx.addIssue({code:"custom",message:"Site identifiers must be unique"});
 if(new Set(w.reports.map(r=>r.id)).size!==w.reports.length)ctx.addIssue({code:"custom",message:"Report identifiers must be unique"});
 for(const s of w.sites)if(!Object.hasOwn(NODES,s.node))ctx.addIssue({code:"custom",message:"Site references an unknown road node"});
 for(const r of w.reports){if(!SETTLEMENTS.some(s=>s.id===r.settlement))ctx.addIssue({code:"custom",message:"Unknown report settlement"});if(r.roadId&&!ROADS.some(road=>road.id===r.roadId))ctx.addIssue({code:"custom",message:"Unknown linked road"});}
 for(const s of [w.scenario,...w.plans.map(p=>p.scenario)]){if(s.closedRoads.some(id=>!ROADS.some(r=>r.id===id)))ctx.addIssue({code:"custom",message:"Unknown road exclusion"});if(s.unavailableSites.some(id=>!siteIds.has(id)))ctx.addIssue({code:"custom",message:"Unknown site exclusion"});}
 for(const p of w.plans)for(const a of p.assignments)if(!siteIds.has(a.siteId)||!SETTLEMENTS.some(s=>s.id===a.settlementId)||a.path.some(n=>!Object.hasOwn(NODES,n))||a.people!==a.households*4)ctx.addIssue({code:"custom",message:"Invalid saved allocation reference or household size"});
});
