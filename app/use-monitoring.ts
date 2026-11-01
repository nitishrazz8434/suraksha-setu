"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import type {Forecast,Monitoring} from "../lib/connected-types";
import type {District} from "../lib/types";
import {decodeForecast,unavailableForecast,weatherUrl} from "../lib/weather";
export function useMonitoring(districts:District[],ready:boolean):Monitoring{
 const[forecasts,setForecasts]=useState<Forecast[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState("");
 const inFlight=useRef(false),points=JSON.stringify(districts.slice(0,10).map(({id,lat,lng})=>({id,lat,lng})));
 const refresh=useCallback(async()=>{
  if(inFlight.current||!ready)return;inFlight.current=true;setLoading(true);
  try{
   // Browser requests avoid unrelated traffic on a shared hosting egress address.
   const selected=JSON.parse(points) as Pick<District,"id"|"lat"|"lng">[];
   const results=await Promise.all(selected.map(async district=>{
    const key=`suraksha-public-weather-${district.lat.toFixed(4)}-${district.lng.toFixed(4)}`;
    let cached:{forecast:Forecast;validUntil:number}|null=null;
    try{cached=JSON.parse(localStorage.getItem(key)??"null");}catch{}
    if(cached&&cached.validUntil>Date.now())return{...cached.forecast,cached:true,districtId:district.id};
    let forecast:Forecast;
    try{
     const response=await fetch(weatherUrl(district),{signal:AbortSignal.timeout(15000)});
     if(!response.ok)throw new Error(response.status===429?"Weather provider rate limit reached. Retrying after the cache interval.":`Weather provider returned ${response.status}`);
     forecast=decodeForecast(district.id,await response.json());
    }catch(e){forecast=cached?.forecast.days.length?{...cached.forecast,cached:true,error:(e as Error).message}:unavailableForecast(district.id,(e as Error).message);}
    try{localStorage.setItem(key,JSON.stringify({forecast,validUntil:Date.now()+15*60000}));}catch{}
    return forecast;
   }));
   setForecasts(results);setError(results.some(f=>f.error)?"Some weather feeds are unavailable. Cached observations retain their original source times.":"");
  }catch(e){setError((e as Error).message);}finally{inFlight.current=false;setLoading(false);}
 },[points,ready]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),15*60000);return()=>clearInterval(timer);},[refresh]);
 return{forecasts,loading,error,refresh};
}
