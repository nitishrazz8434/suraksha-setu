"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import type {Forecast,Monitoring} from "../lib/connected-types";
import type {District} from "../lib/types";
export function useMonitoring(districts:District[],ready:boolean):Monitoring{
 const[forecasts,setForecasts]=useState<Forecast[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState("");
 const inFlight=useRef(false),ids=districts.map(d=>d.id).slice(0,10).join(",");
 const refresh=useCallback(async()=>{if(inFlight.current||!ready)return;inFlight.current=true;setLoading(true);try{const response=await fetch(`/api/monitor${ids?`?ids=${encodeURIComponent(ids)}`:""}`),data=await response.json() as {forecasts:Forecast[];error?:string};if(!response.ok)throw new Error(data.error||"Weather connection unavailable");setForecasts(data.forecasts);setError(data.forecasts.some((f:Forecast)=>f.error)?"Some weather feeds are unavailable. Source times show which records are cached.":"");}catch(e){setError((e as Error).message);}finally{inFlight.current=false;setLoading(false);}},[ids,ready]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),15*60000);return()=>clearInterval(timer);},[refresh]);
 return{forecasts,loading,error,refresh};
}
