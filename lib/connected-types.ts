import type {District,Geometry,RouteRecord,Settlement} from "./types";
export interface DistrictProfile extends District {population:number;populationYear:number;populationSource:string;geometry:Geometry;geographySource:string;}
export interface PublicFacility {id:string;districtId:string;name:string;lat:number;lng:number;classrooms:number;toilets:number;address:string;source:string;retrievedAt:string;kind:string;}
export interface ReferenceCatalog {retrievedAt:string;profiles:DistrictProfile[];facilities:PublicFacility[];origins:Settlement[];routes:RouteRecord[];}
export interface Forecast {districtId:string;fetchedAt:string;observedAt:string;source:string;temperature:number|null;precipitation:number|null;weatherCode:number|null;days:{date:string;rain:number|null;probability:number|null;high:number|null;low:number|null}[];cached?:boolean;error?:string;}
export interface Monitoring {forecasts:Forecast[];loading:boolean;error:string;refresh:()=>Promise<void>;}
