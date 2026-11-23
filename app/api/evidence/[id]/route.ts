import {requireAccount,canDistrict} from "../../../../lib/auth";
import {bucket,db} from "../../../../lib/server";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const user=await requireAccount(request);if(user instanceof Response)return user;const{id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response("Not found",{status:404});
 const row=await db().prepare("SELECT owner_id,district_id,object_key,content_type FROM evidence_files WHERE id=?").bind(id).first<{owner_id:string;district_id:string;object_key:string;content_type:string}>();if(!row||(row.owner_id!==user.id&&!canDistrict(user,row.district_id)))return new Response("Not found",{status:404});
 const file=await bucket()?.get(row.object_key);if(!file)return new Response("Not found",{status:404});return new Response(file.body,{headers:{"Content-Type":row.content_type,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}
