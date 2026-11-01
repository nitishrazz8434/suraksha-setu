import {owner,safeMutation,config} from "../../../lib/server";
import {workspaceSchema} from "../../../lib/validation";
import {answer} from "../../../lib/engine";
export async function POST(request:Request){
 const user=owner(request);if(user instanceof Response)return user;if(!safeMutation(request))return Response.json({error:"Invalid origin"},{status:403});
 try{const raw=await request.text();if(raw.length>3000000)return Response.json({error:"Request too large"},{status:413});const body=JSON.parse(raw),w=workspaceSchema.safeParse(body.workspace);if(!w.success||typeof body.question!=="string"||body.question.length>2000)return Response.json({error:"Invalid question"},{status:400});
  const language=body.language==="hi"?"hi":"en",grounded=answer(body.question,w.data,language),cfg=config();
  if(cfg.ML_SERVICE_URL){try{const response=await fetch(`${cfg.ML_SERVICE_URL.replace(/\/$/,"")}/assistant`,{method:"POST",headers:{"Content-Type":"application/json",...(cfg.ML_SERVICE_TOKEN?{Authorization:`Bearer ${cfg.ML_SERVICE_TOKEN}`}:{})},body:JSON.stringify({question:body.question,language,context:grounded.text}),signal:AbortSignal.timeout(20000)});if(response.ok){const generated=await response.json() as {text?:string};if(generated.text)return Response.json({...grounded,text:generated.text,mode:"model-assisted"});}}catch{/* Fall back to calculated evidence, never fabricate a model response. */}}
  return Response.json({...grounded,mode:"grounded-local"});
 }catch{return Response.json({error:"Could not process question"},{status:400});}
}
