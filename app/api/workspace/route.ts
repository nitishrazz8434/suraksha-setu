import { db, owner, safeMutation, sha } from "../../../lib/server";
import { seedWorkspace } from "../../../lib/seed";
import { workspaceSchema } from "../../../lib/validation";
export async function GET(request:Request){
 const user=owner(request);if(user instanceof Response)return user;
 try{const row=await db().prepare("SELECT payload, revision FROM workspaces WHERE owner_id = ?").bind(user).first<{payload:string;revision:number}>();return Response.json({workspace:row?JSON.parse(row.payload):seedWorkspace(),revision:row?.revision??0,workspaceKey:await sha(user)},{headers:{"Cache-Control":"no-store"}});}
 catch{ return Response.json({error:"Workspace storage is unavailable. Check database migrations."},{status:503}); }
}
export async function PUT(request:Request){
 const user=owner(request);if(user instanceof Response)return user;if(!safeMutation(request))return Response.json({error:"Invalid origin"},{status:403});
 if(Number(request.headers.get("content-length")??0)>3000000)return Response.json({error:"Workspace exceeds size limit"},{status:413});
 try{const raw=await request.text();if(raw.length>3000000)return Response.json({error:"Workspace exceeds size limit"},{status:413});const body=JSON.parse(raw),parsed=workspaceSchema.safeParse(body.workspace);if(!parsed.success||!Number.isInteger(body.revision)||body.revision<0)return Response.json({error:"Invalid workspace data"},{status:400});
  const payload=JSON.stringify(parsed.data),now=new Date().toISOString();
  const result=body.revision===0?await db().prepare("INSERT INTO workspaces (owner_id,payload,revision,updated_at) VALUES (?,?,1,?) ON CONFLICT(owner_id) DO NOTHING").bind(user,payload,now).run():await db().prepare("UPDATE workspaces SET payload=?,revision=revision+1,updated_at=? WHERE owner_id=? AND revision=?").bind(payload,now,user,body.revision).run();
  if(!result.meta.changes)return Response.json({error:"Another session changed this workspace. Reload to review the latest version."},{status:409});
  return Response.json({revision:body.revision+1});
 }catch{return Response.json({error:"Unable to save workspace"},{status:503});}
}
