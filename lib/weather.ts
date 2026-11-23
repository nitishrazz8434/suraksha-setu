import type {District} from "./types";
import type {Forecast} from "./connected-types";
const numeric=(n:unknown)=>typeof n==="number"&&Number.isFinite(n)?n:null;
const record=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
const list=(value:unknown):unknown[]=>Array.isArray(value)?value:[];
export function weatherUrl(district:Pick<District,"lat"|"lng">){
 const url=new URL("https://api.open-meteo.com/v1/forecast");
 url.search=new URLSearchParams({latitude:String(district.lat),longitude:String(district.lng),current:"temperature_2m,precipitation,weather_code",daily:"precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min",timezone:"Asia/Kolkata",forecast_days:"7"}).toString();
 return url.toString();
}
export function decodeForecast(districtId:string,data:unknown):Forecast{
 const response=record(data),current=record(response.current),daily=record(response.daily),times=list(daily.time).filter((date):date is string=>typeof date==="string");
 if(typeof current.time!=="string"||!times.length)throw new Error("Weather response is incomplete");
 const localTime=current.time.length===16?`${current.time}:00`:current.time;
 const rain=list(daily.precipitation_sum),probability=list(daily.precipitation_probability_max),high=list(daily.temperature_2m_max),low=list(daily.temperature_2m_min);
 return{districtId,fetchedAt:new Date().toISOString(),observedAt:`${localTime}+05:30`,source:"https://open-meteo.com/",temperature:numeric(current.temperature_2m),precipitation:numeric(current.precipitation),weatherCode:numeric(current.weather_code),days:times.slice(0,7).map((date,i)=>({date,rain:numeric(rain[i]),probability:numeric(probability[i]),high:numeric(high[i]),low:numeric(low[i])}))};
}
export function unavailableForecast(districtId:string,error:string):Forecast{return{districtId,fetchedAt:"",observedAt:"",source:"https://open-meteo.com/",temperature:null,precipitation:null,weatherCode:null,days:[],error};}
