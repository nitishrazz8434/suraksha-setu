import {owner,bucket} from "../../../lib/server";
import {readWorkspace} from "../../../lib/persistence";
import {catalog} from "../../../lib/catalog";
import type {Forecast} from "../../../lib/connected-types";
const value=(n:unknown)=>typeof n==="number"&&Number.isFinite(n)?n:null;
export async function GET(request:Request){
 const user=owner(request);if(user instanceof Response)return user;
 const {workspace}=await readWorkspace(user),districts=workspace.districts.length?workspace.districts:catalog.profiles;
 const ids=new URL(request.url).searchParams.get("ids")?.split(",");
 const selected=districts.filter(d=>!ids||ids.includes(d.id)).slice(0,10);
 const forecasts=await Promise.all(selected.map(async district=>{
  const key=`public/weather/${district.lat.toFixed(4)}-${district.lng.toFixed(4)}.json`;
  let cached:Forecast|null=null;
  try{cached=await(await bucket()?.get(key))?.json<Forecast>()??null;}catch{}
  if(cached&&Date.now()-Date.parse(cached.fetchedAt)<15*60000)return{...cached,cached:true};
  try{
   const url=new URL("https://api.open-meteo.com/v1/forecast");
   url.search=new URLSearchParams({latitude:String(district.lat),longitude:String(district.lng),current:"temperature_2m,precipitation,weather_code",daily:"precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min",timezone:"Asia/Kolkata",forecast_days:"7"}).toString();
   const response=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error(`Weather provider returned ${response.status}`);
   const data=await response.json() as any;
   if(!data.current?.time||!Array.isArray(data.daily?.time)||!data.daily.time.length)throw new Error("Weather response is incomplete");
   const result:Forecast={districtId:district.id,fetchedAt:new Date().toISOString(),observedAt:`${data.current.time}:00+05:30`,source:"https://open-meteo.com/",temperature:value(data.current.temperature_2m),precipitation:value(data.current.precipitation),weatherCode:value(data.current.weather_code),days:data.daily.time.slice(0,7).map((date:string,i:number)=>({date,rain:value(data.daily.precipitation_sum?.[i]),probability:value(data.daily.precipitation_probability_max?.[i]),high:value(data.daily.temperature_2m_max?.[i]),low:value(data.daily.temperature_2m_min?.[i])}))};
   try{await bucket()?.put(key,JSON.stringify(result),{httpMetadata:{contentType:"application/json"}});}catch{}
   return result;
  }catch(e){return cached?{...cached,cached:true,error:(e as Error).message}:{districtId:district.id,fetchedAt:"",observedAt:"",source:"https://open-meteo.com/",temperature:null,precipitation:null,weatherCode:null,days:[],error:(e as Error).message};}
 }));
 return Response.json({forecasts},{headers:{"Cache-Control":"private, max-age=60"}});
}
