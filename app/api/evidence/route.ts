import {requireAccount,mutationGuard} from "../../../lib/auth";
import {bucket,db} from "../../../lib/server";
import {validateReportLocation} from "../../../lib/incidents";
export async function POST(request:Request){const guard=mutationGuard(request);if(guard)return guard;const user=await requireAccount(request);if(user instanceof Response)return user;
 if(Number(request.headers.get("content-length")??0)>8500000)return Response.json({error:"Maximum upload size is 8 MB"},{status:413});
 try{const form=await request.formData(),file=form.get("file"),districtId=form.get("districtId");if(typeof districtId!=="string")throw new Error("Select a district before attaching evidence");await validateReportLocation(user,{districtId,settlement:""});
 if(!(file instanceof File)||file.size>8000000||!["image/png","image/jpeg","image/webp"].includes(file.type))throw new Error("Choose a PNG, JPEG or WebP image under 8 MB");
 const bytes=new Uint8Array(await file.arrayBuffer()),valid=file.type==="image/png"?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:file.type==="image/jpeg"?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:new TextDecoder().decode(bytes.slice(0,4))==="RIFF"&&new TextDecoder().decode(bytes.slice(8,12))==="WEBP";if(!valid)throw new Error("Image contents do not match its file type");
 const id=crypto.randomUUID(),key=`evidence/${id}`,store=bucket();if(!store)throw new Error("Evidence storage is unavailable");await store.put(key,bytes,{httpMetadata:{contentType:file.type}});try{await db().prepare("INSERT INTO evidence_files(id,owner_id,district_id,object_key,content_type,original_name,created_at) VALUES(?,?,?,?,?,?,?)").bind(id,user.id,districtId,key,file.type,file.name.slice(0,250),new Date().toISOString()).run();}catch(e){await store.delete(key);throw e;}return Response.json({url:`/api/evidence/${id}`});
 }catch(e){return Response.json({error:(e as Error).message},{status:400});}}
