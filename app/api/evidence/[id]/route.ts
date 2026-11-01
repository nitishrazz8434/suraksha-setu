import {owner,bucket,sha} from "../../../../lib/server";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const user=owner(request);if(user instanceof Response)return user;const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response("Not found",{status:404});const file=await bucket()?.get(`${await sha(user)}/${id}`);if(!file)return new Response("Not found",{status:404});return new Response(file.body,{headers:{"Content-Type":file.httpMetadata?.contentType??"application/octet-stream","Cache-Control":"private, max-age=600","X-Content-Type-Options":"nosniff"}});
}
