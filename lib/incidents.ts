import {z} from "zod";
import type {Account} from "./auth-types";
import type {Report} from "./types";
import {db} from "./server";
import {canDistrict} from "./auth";
import {readWorkspace} from "./persistence";
import {SHARED_WORKSPACE} from "./access";
const name=z.string().trim().min(1).max(250),id=z.string().min(1).max(120);
export const newReportSchema=z.object({districtId:id,title:name,text:z.string().trim().min(10).max(20000),settlement:z.string().max(120),hazard:z.enum(["Flood","Landslide","Infrastructure","Unspecified"]),severity:z.enum(["Critical","High","Moderate","Low"]),source:z.enum(["Citizen","Field team","Bulletin"]),people:z.number().int().min(0).max(10000000).nullable(),needs:z.array(name).max(30),routeId:id.optional(),observedAt:z.string().datetime(),evidenceUrl:z.string().regex(/^\/api\/evidence\/[a-f0-9-]{36}$/).optional(),analysis:z.object({model:name,label:name,score:z.number().min(-1).max(1)}).optional()});
export async function validateReportLocation(user:Account,input:{districtId:string;settlement:string;routeId?:string;evidenceUrl?:string}){
 const {workspace:w}=await readWorkspace(SHARED_WORKSPACE);
 if(!w.districts.some(d=>d.id===input.districtId))throw new Error("Choose a registered district.");
 if(user.role!=="citizen"&&!canDistrict(user,input.districtId))throw new Error("This district is outside your assignment.");
 if(input.settlement&&!w.settlements.some(s=>s.id===input.settlement&&s.districtId===input.districtId))throw new Error("Settlement does not belong to this district.");
 if(input.routeId&&!w.routes.some(r=>r.id===input.routeId&&w.settlements.some(s=>s.id===r.settlementId&&s.districtId===input.districtId)))throw new Error("Route does not belong to this district.");
 if(input.evidenceUrl){const file=await db().prepare("SELECT owner_id,district_id FROM evidence_files WHERE id=?").bind(input.evidenceUrl.split("/").at(-1)).first<{owner_id:string;district_id:string}>();if(!file||file.owner_id!==user.id||file.district_id!==input.districtId)throw new Error("Attach your own evidence file for the same district.");}
}
export async function createReport(user:Account,input:unknown){const data=newReportSchema.parse(input);await validateReportLocation(user,data);if(Date.parse(data.observedAt)>Date.now()+5*60000)throw new Error("Observation time cannot be in the future.");const now=new Date().toISOString(),id=`INC-${crypto.randomUUID().slice(0,12)}`,event={id:crypto.randomUUID(),reportId:id,actorId:user.id,actorName:user.name,action:"Submitted",message:"Submitted for independent evidence review",createdAt:now};
 const report:Report={...data,id,status:"Pending",source:user.role==="citizen"?"Citizen":data.source,submitterId:user.id,submitterName:user.name,createdAt:now,revision:1,history:[event],lastEventId:event.id};
 await db().batch([db().prepare("INSERT INTO incident_records(id,district_id,submitter_id,payload,updated_at) VALUES(?,?,?,?,?)").bind(id,data.districtId,user.id,JSON.stringify(report),now),db().prepare("INSERT INTO incident_events(id,report_id,actor_id,actor_name,action,message,created_at) VALUES(?,?,?,?,?,?,?)").bind(event.id,id,user.id,user.name,event.action,event.message,now),db().prepare("INSERT INTO audit_events(id,actor_id,actor_name,district_id,action,target_id,detail,created_at) VALUES(?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,user.name,data.districtId,"incident.submit",id,"Observation submitted",now)]);
 return report;
}
export const reviewSchema=z.object({id,revision:z.number().int().min(1),action:z.enum(["review","request-info","verify","reject","resolve","reply","reopen"]),message:z.string().trim().min(10,"Explain your decision in at least 10 characters").max(4000),settlement:z.string().max(120).optional(),hazard:z.enum(["Flood","Landslide","Infrastructure","Unspecified"]).optional(),severity:z.enum(["Critical","High","Moderate","Low"]).optional(),routeId:z.string().max(120).optional(),expiresAt:z.string().datetime().optional(),duplicateOf:id.optional()});
export async function reviewReport(user:Account,input:unknown){
 const data=reviewSchema.parse(input),row=await db().prepare("SELECT payload,revision FROM incident_records WHERE id=?").bind(data.id).first<{payload:string;revision:number}>();if(!row)throw new Error("Report not found.");const old=JSON.parse(row.payload) as Report;
 if(data.action==="reply"){if(old.submitterId!==user.id)throw new Error("Only the submitter can reply to this report.");if(old.status!=="Needs information")throw new Error("This report is not awaiting information.");}
 else{if(!canDistrict(user,old.districtId))throw new Error("You cannot review reports in this district.");if(old.submitterId===user.id)throw new Error("Independent review required: you cannot review or verify your own report.");}
 if(data.revision!==row.revision)return{conflict:true as const};
 const allowed:Record<string,string[]>={review:["Pending"],"request-info":["Pending","Under review"],verify:["Pending","Under review"],reject:["Pending","Under review","Needs information"],resolve:["Verified"],reply:["Needs information"],reopen:["Verified","Resolved","Rejected"]};
 if(!allowed[data.action].includes(old.status))throw new Error(`Cannot ${data.action} a ${old.status.toLowerCase()} report.`);
 const status:Report["status"]=({review:"Under review","request-info":"Needs information",verify:"Verified",reject:"Rejected",resolve:"Resolved",reply:"Pending",reopen:"Under review"} as const)[data.action];
 const next:Report={...old,status,revision:row.revision+1};
 if(data.action!=="reply"){next.reviewerId=user.id;next.reviewerName=user.name;next.reviewNote=data.message;}
 if(data.action==="verify"){
  next.settlement=data.settlement??old.settlement;next.hazard=data.hazard??old.hazard;next.severity=data.severity??old.severity;if(data.routeId!==undefined){if(data.routeId)next.routeId=data.routeId;else delete next.routeId;}
  if(!next.settlement&&!next.routeId)throw new Error("Confirm a settlement or a linked route before verification.");
  next.expiresAt=data.expiresAt??new Date(Date.now()+24*3600000).toISOString();if(Date.parse(next.expiresAt)<=Date.now()||Date.parse(next.expiresAt)>Date.now()+7*86400000)throw new Error("Evidence review must expire within the next seven days.");
  await validateReportLocation(user,{districtId:next.districtId,settlement:next.settlement,routeId:next.routeId});
 }
 if(data.duplicateOf&&data.action!=="reply"){if(data.duplicateOf===next.id)throw new Error("A report cannot duplicate itself.");const duplicate=await db().prepare("SELECT district_id FROM incident_records WHERE id=?").bind(data.duplicateOf).first<{district_id:string}>();if(!duplicate||duplicate.district_id!==next.districtId)throw new Error("Link a duplicate within the same district.");next.duplicateOf=data.duplicateOf;}
 const now=new Date().toISOString(),event={id:crypto.randomUUID(),reportId:next.id,actorId:user.id,actorName:user.name,action:status,message:data.message,createdAt:now};next.history=[...(old.history??[]),event].slice(-1000);next.lastEventId=event.id;
 const condition="SELECT 1 FROM incident_records WHERE id=? AND revision=? AND json_extract(payload,'$.lastEventId')=?";
 const notifications=old.submitterId&&old.submitterId!==user.id?[db().prepare(`INSERT INTO app_notifications(id,user_id,title,report_id,created_at) SELECT ?,?,?,?,? WHERE EXISTS(${condition})`).bind(crypto.randomUUID(),old.submitterId,`${old.title}: ${status}`,old.id,now,old.id,next.revision,event.id)]:[];
 const result=await db().batch([db().prepare("UPDATE incident_records SET payload=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?").bind(JSON.stringify(next),now,next.id,row.revision),db().prepare(`INSERT INTO incident_events(id,report_id,actor_id,actor_name,action,message,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(${condition})`).bind(event.id,next.id,user.id,user.name,status,data.message,now,next.id,next.revision,event.id),db().prepare(`INSERT INTO audit_events(id,actor_id,actor_name,district_id,action,target_id,detail,created_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(${condition})`).bind(crypto.randomUUID(),user.id,user.name,next.districtId,`incident.${data.action}`,next.id,data.message,now,next.id,next.revision,event.id),...notifications]);
 return result[0].meta.changes?{report:next}:{conflict:true as const};
}
