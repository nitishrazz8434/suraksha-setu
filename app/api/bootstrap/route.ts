import {owner,safeMutation,sha} from "../../../lib/server";
import {readWorkspace,writeWorkspace} from "../../../lib/persistence";
import {connectReferenceDistricts} from "../../../lib/catalog";
import {workspaceSchema} from "../../../lib/validation";
export async function POST(request:Request){
 const user=owner(request);if(user instanceof Response)return user;
 if(!safeMutation(request))return Response.json({error:"Invalid origin"},{status:403});
 try{
  const previous=await readWorkspace(user);
  if(previous.workspace.districts.length)return Response.json({workspace:previous.workspace,revision:previous.revision,workspaceKey:await sha(user)});
  const workspace=workspaceSchema.parse(connectReferenceDistricts(previous.workspace));
  if(!await writeWorkspace(user,workspace,previous.revision,previous.raw))return Response.json({error:"Workspace changed. Reload to connect the districts."},{status:409});
  return Response.json({workspace,revision:previous.revision+1,workspaceKey:await sha(user)});
 }catch(e){console.error("District connection failed",(e as Error).message);return Response.json({error:"Unable to connect public district references."},{status:503});}
}
