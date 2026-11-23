import {requireAccount,mutationGuard} from "../../../lib/auth";
import {accountWorkspace,initializeShared} from "../../../lib/access";
import {sha} from "../../../lib/server";
export async function POST(request:Request){const guard=mutationGuard(request);if(guard)return guard;const user=await requireAccount(request,["admin"]);if(user instanceof Response)return user;await initializeShared();const data=await accountWorkspace(user);return Response.json({workspace:data.workspace,revision:data.revision,workspaceKey:await sha(user.id)});}
