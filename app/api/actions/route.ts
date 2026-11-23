import {requireAccount,mutationGuard,audit} from "../../../lib/auth";
import {readWorkspace,writeWorkspace} from "../../../lib/persistence";
import {SHARED_WORKSPACE,accountWorkspace,visibleReports,scopeWorkspace} from "../../../lib/access";
import {confirmArrival,planIssues,signature} from "../../../lib/engine";
import {z} from "zod";
const schema=z.object({type:z.enum(["approve","start","arrive","cancel"]),planId:z.string().min(1).max(120),householdId:z.string().max(120).optional(),revision:z.number().int().min(0)});
export async function POST(request:Request){const guard=mutationGuard(request);if(guard)return guard;const user=await requireAccount(request,["officer","admin"]);if(user instanceof Response)return user;
 try{const action=schema.parse(await request.json()),previous=await readWorkspace(SHARED_WORKSPACE);if(previous.revision!==action.revision)return Response.json({error:"Shared records changed. Refresh before applying this action."},{status:409});
 const w=structuredClone(previous.workspace);w.reports=await visibleReports(user);const p=w.plans.find(p=>p.id===action.planId);
 if(!p||!scopeWorkspace(w,user.role==="admin"?user:{...user,role:"officer"}).plans.some(v=>v.id===p.id))return Response.json({error:"Plan not found in your assigned districts."},{status:403});
 if(action.type==="approve"){
  if(p.createdBy===user.id)return Response.json({error:"Independent approval required. Another authorised officer must approve your plan."},{status:403});
  if(p.status!=="Draft")throw new Error("Only draft plans can be approved");
  const inputs=scopeWorkspace(w,{...user,role:"officer",districtIds:p.inputDistrictIds??w.districts.map(d=>d.id)});inputs.scenario=p.scenario;
  if(p.inputSignature!==await signature(inputs,p.scenario))throw new Error("Plan inputs or verified evidence changed. Recalculate before approval.");
  const issues=planIssues(p,w);if(issues.length)throw new Error(issues[0]);p.status="Approved";p.approvedBy=user.id;p.approvedByName=user.name;p.approvedAt=new Date().toISOString();
 }else if(action.type==="start"){
  if(p.status!=="Approved")throw new Error("Approve this plan before starting movement");const issues=planIssues(p,w);if(issues.length)throw new Error(issues[0]);p.status="In progress";p.assignments.filter(a=>a.status==="Planned").forEach(a=>{a.status="In transit";});
 }else if(action.type==="arrive")confirmArrival(w,p.id,action.householdId??"");
 else{if(["Completed","Cancelled"].includes(p.status))throw new Error("This plan is already closed");p.assignments.filter(a=>a.status!=="Arrived").forEach(a=>{a.status="Cancelled";});p.status=p.assignments.some(a=>a.status==="Arrived")?"Completed":"Cancelled";}
 w.reports=[];if(!await writeWorkspace(SHARED_WORKSPACE,w,previous.revision,previous.raw))return Response.json({error:"Concurrent update rejected. Refresh and retry."},{status:409});try{await audit(user,`plan.${action.type}`,p.id,action.householdId??`${p.served} people; ${p.scenario.purpose}`,p.districtId||null);}catch(e){console.error("Plan activity audit delayed",e);}
 const data=await accountWorkspace(user);return Response.json({workspace:data.workspace,revision:data.revision});
 }catch(e){return Response.json({error:(e as Error).message},{status:400});}
}
