import {owner,safeMutation,bucket,sha} from "../../../lib/server";
export async function POST(request:Request){
 const user=owner(request);if(user instanceof Response)return user;if(!safeMutation(request))return Response.json({error:"Invalid origin"},{status:403});
 if(Number(request.headers.get("content-length")??0)>8500000)return Response.json({error:"Maximum upload size is 8 MB"},{status:413});
 try{const data=await request.formData(),file=data.get("file");if(!(file instanceof File)||file.size>8000000||!["image/png","image/jpeg","image/webp"].includes(file.type))return Response.json({error:"Choose a PNG, JPEG or WebP image under 8 MB"},{status:400});const store=bucket();if(!store)return Response.json({error:"Upload storage is not configured"},{status:503});const id=crypto.randomUUID(),prefix=await sha(user);await store.put(`${prefix}/${id}`,await file.arrayBuffer(),{httpMetadata:{contentType:file.type},customMetadata:{owner:prefix}});return Response.json({url:`/api/evidence/${id}`});}
 catch{return Response.json({error:"Image upload failed"},{status:503});}
}
