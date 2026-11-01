import type {District} from "./types";
import type {Forecast} from "./connected-types";
const numeric=(n:unknown)=>typeof n==="number"&&Number.isFinite(n)?n:null;
export function weatherUrl(district:Pick<District,"lat"|"lng">){
 const url=new URL("https://api.open-meteo.com/v1/forecast");
 url.search=new URLSearchParams({latitude:String(district.lat),longitude:String(district.lng),current:"temperature_2m,precipitation,weather_code",daily:"precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min",timezone:"Asia/Kolkata",forecast_days:"7"}).toString();
 return url.toString();
}
export function decodeForecast(districtId:string,data:any):Forecast{
 if(typeof data.current?.time!=="string"||!Array.isArray(data.daily?.time)||!data.daily.time.length)throw new Error("Weather response is incomplete");
 const localTime=data.current.time.length===16?`${data.current.time}:00`:data.current.time;
 return{districtId,fetchedAt:new Date().toISOString(),observedAt:`${localTime}+05:30`,source:"https://open-meteo.com/",temperature:numeric(data.current.temperature_2m),precipitation:numeric(data.current.precipitation),weatherCode:numeric(data.current.weather_code),days:data.daily.time.slice(0,7).map((date:string,i:number)=>({date,rain:numeric(data.daily.precipitation_sum?.[i]),probability:numeric(data.daily.precipitation_probability_max?.[i]),high:numeric(data.daily.temperature_2m_max?.[i]),low:numeric(data.daily.temperature_2m_min?.[i])}))};
}
export function unavailableForecast(districtId:string,error:string):Forecast{return{districtId,fetchedAt:"",observedAt:"",source:"https://open-meteo.com/",temperature:null,precipitation:null,weatherCode:null,days:[],error};}
