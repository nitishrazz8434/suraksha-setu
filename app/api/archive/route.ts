import {requireAccount} from "../../../lib/auth";
import {db} from "../../../lib/server";
import {readWorkspace} from "../../../lib/persistence";
import {SHARED_WORKSPACE} from "../../../lib/access";
export async function GET(request:Request){const user=await requireAccount(request,["admin"]);if(user instanceof Response)return user;const legacy=await db().prepare("SELECT owner_id FROM workspaces WHERE owner_id<>? AND owner_id NOT LIKE '%:test:%' ORDER BY updated_at DESC LIMIT 1").bind(SHARED_WORKSPACE).first<{owner_id:string}>();if(!legacy)return Response.json({error:"No previous workspace exists"},{status:404});return Response.json((await readWorkspace(legacy.owner_id)).workspace,{headers:{"Cache-Control":"no-store","Content-Disposition":"attachment; filename=previous-workspace.json"}});}
