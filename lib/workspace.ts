import type{Workspace,Scenario}from"./types";
export const DEFAULT_SCENARIO:Scenario={name:"Current conditions",unavailableSites:[],closedRoutes:[],waterFactor:1,allowCrossDistrict:false,purpose:"Emergency"};
export function createWorkspace():Workspace{return{version:2,districts:[],activeDistrictId:"",settlements:[],households:[],sites:[],hazards:[],routes:[],reports:[],scenario:structuredClone(DEFAULT_SCENARIO),plans:[],activity:[],tasks:[],documents:[]};}
export const uid=(prefix="ID")=>`${prefix}-${crypto.randomUUID().slice(0,12)}`;
export const fmt=(n:number)=>new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(n);
export function record(w:Workspace,text:string,type:Workspace["activity"][number]["type"]){w.activity.unshift({id:uid(),text,type,time:new Date().toISOString()});w.activity=w.activity.slice(0,500);return w;}
export function districtName(w:Workspace,id=w.activeDistrictId){const d=w.districts.find(d=>d.id===id);return d?`${d.name}, ${d.state}`:"All districts";}
export function scoped<T extends{districtId:string}>(items:T[],w:Workspace){return w.activeDistrictId?items.filter(i=>i.districtId===w.activeDistrictId):items;}
