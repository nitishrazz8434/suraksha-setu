import {owner,bucket} from "../../../lib/server";
import {readWorkspace} from "../../../lib/persistence";
import {catalog} from "../../../lib/catalog";
import type {Forecast} from "../../../lib/connected-types";
import {weatherUrl,decodeForecast,unavailableForecast} from "../../../lib/weather";
export async function GET(request:Request){
 const user=owner(request);if(user instanceof Response)return user;
 const {workspace}=await readWorkspace(user),districts=workspace.districts.length?workspace.districts:catalog.profiles;
 const ids=new URL(request.url).searchParams.get("ids")?.split(",");
 const selected=districts.filter(d=>!ids||ids.includes(d.id)).slice(0,10);
 const forecasts=await Promise.all(selected.map(async district=>{
  const key=`public/weather/${district.lat.toFixed(4)}-${district.lng.toFixed(4)}.json`;
  let cached:Forecast|null=null;
  try{cached=await(await bucket()?.get(key))?.json<Forecast>()??null;}catch{}
  if(cached&&(Date.now()-Date.parse(cached.fetchedAt)<15*60000||!!cached.retryAfter&&Date.parse(cached.retryAfter)>Date.now()))return{...cached,cached:true};
  try{
   const response=await fetch(weatherUrl(district),{signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error(`Weather provider returned ${response.status}`);
   const result=decodeForecast(district.id,await response.json());
   try{await bucket()?.put(key,JSON.stringify(result),{httpMetadata:{contentType:"application/json"}});}catch{}
   return result;
  }catch(e){const failure:Forecast={...(cached??unavailableForecast(district.id,(e as Error).message)),cached:!!cached?.days.length,error:(e as Error).message,retryAfter:new Date(Date.now()+15*60000).toISOString()};try{await bucket()?.put(key,JSON.stringify(failure),{httpMetadata:{contentType:"application/json"}});}catch{}return failure;}

 }));
 return Response.json({forecasts},{headers:{"Cache-Control":"private, max-age=60"}});
}
