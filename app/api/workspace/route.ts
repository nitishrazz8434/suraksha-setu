import {requireAccount,mutationGuard,audit} from "../../../lib/auth";
import {sha,db} from "../../../lib/server";
import {accountWorkspace,mergeWorkspace,SHARED_WORKSPACE} from "../../../lib/access";
import {readWorkspace,writeWorkspace} from "../../../lib/persistence";
import {workspaceSchema} from "../../../lib/validation";
export async function GET(request:Request){const user=await requireAccount(request);if(user instanceof Response)return user;try{const data=await accountWorkspace(user);return Response.json({workspace:data.workspace,revision:data.revision,workspaceKey:await sha(user.id),archiveAvailable:user.role==="admin"},{headers:{"Cache-Control":"no-store"}});}catch(e){console.error((e as Error).message);return Response.json({error:"Shared records are unavailable. Check local database migrations."},{status:503});}}
export async function PUT(request:Request){const guard=mutationGuard(request);if(guard)return guard;const user=await requireAccount(request,["officer","admin"]);if(user instanceof Response)return user;
 try{const raw=await request.text();if(new TextEncoder().encode(raw).length>12000000)return Response.json({error:"Workspace exceeds 12 MB"},{status:413});const body=JSON.parse(raw),parsed=workspaceSchema.safeParse(body.workspace);if(!parsed.success||!Number.isInteger(body.revision)||body.revision<0)return Response.json({error:parsed.success?"Invalid revision":parsed.error.issues[0]?.message},{status:400});
 const previous=await readWorkspace(SHARED_WORKSPACE);if(previous.revision!==body.revision)return Response.json({error:"Shared records changed in another session. Refresh before saving."},{status:409});
 const next=workspaceSchema.parse(mergeWorkspace(previous.workspace,parsed.data,user));
 if(!await writeWorkspace(SHARED_WORKSPACE,next,previous.revision,previous.raw))return Response.json({error:"Concurrent update rejected. Refresh and retry."},{status:409});
 await db().prepare("INSERT INTO user_preferences(user_id,scenario) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET scenario=excluded.scenario").bind(user.id,JSON.stringify(parsed.data.scenario)).run();
 try{await audit(user,"workspace.update",SHARED_WORKSPACE,`Saved scoped registers at revision ${previous.revision+1}`,user.role==="officer"&&user.districtIds.length===1?user.districtIds[0]:null);}catch(e){console.error("Workspace audit delayed",e);}
 const data=await accountWorkspace(user);return Response.json({revision:data.revision,workspace:data.workspace});
 }catch(e){return Response.json({error:(e as Error).message},{status:400});}
}
