import {parseCSVForReview,toCSV} from "./csv";
import {districtSchema,hazardSchema,householdSchema,routeSchema,settlementSchema,siteSchema,workspaceSchema} from "./validation";
import type {Workspace} from "./types";

export type RegistryKind="districts"|"settlements"|"households"|"sites"|"hazards"|"routes";
export interface ImportSourceRow {line:number;values:Record<string,unknown>;mapped:Record<string,unknown>;structuralError?:string;}
export interface RegistryImportFile {name:string;kind:RegistryKind;headers:string[];unmappedHeaders:string[];rows:ImportSourceRow[];}
export interface RegistryImportResultRow {line:number;label:string;status:"add"|"update"|"error";record?:Record<string,unknown>;errors:string[];}
export interface RegistryImportResult {workspace:Workspace;rows:RegistryImportResultRow[];added:number;updated:number;rejected:number;}

const isRecord=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==="object"&&!Array.isArray(value);
const fieldText=(row:Record<string,unknown>,key:string)=>typeof row[key]==="string"?row[key] as string:"";
const recordId=(row:Record<string,unknown>)=>fieldText(row,"id");

const headerKey=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,"");
const aliases:Record<RegistryKind,Record<string,string[]>>={
 districts:{id:["districtid","districtcode","code","uuid"],name:["district","districtname","name"],state:["state","region","stateregion"],lat:["lat","latitude","centroidlatitude"],lng:["lng","lon","longitude","centroidlongitude"]},
 settlements:{id:["settlementid","villageid","wardid","code","uuid"],districtId:["district","districtname","districtcode","districtid"],name:["settlement","settlementname","village","villagename","ward","wardname","localbody"],lat:["lat","latitude"],lng:["lng","lon","longitude"],aliases:["alias","alternativenames","othernames"],source:["source","datasource","evidence","reference"],observedAt:["observedat","updatedat","reviewedat","date"],verified:["verified","reviewed","confirmed"]},
 households:{id:["householdid","recordid","uuid"],settlementId:["settlement","settlementname","village","villagename","ward","settlementid","villageid"],reference:["householdref","householdreference","householdcode","householdno","householdnumber","hhid","familyid","reference"],size:["people","persons","residents","population","familysize","householdsize","members","membercount","size"],priority:["priorityscore","vulnerabilitypriority","reviewedpriority","priority"],assisted:["accessibilityrequired","accessibleaccommodationrequired","assisted","disabilitysupport"],medical:["medicalsupportrequired","medicalneed","medical"],notes:["notes","planningnotes","remarks"]},
 sites:{id:["siteid","facilityid","shelterid","recordid","uuid"],districtId:["district","districtname","districtcode","districtid"],name:["site","sitename","facility","facilityname","shelter","sheltername","camp","name"],locality:["locality","address","place","location","area"],lat:["lat","latitude"],lng:["lng","lon","longitude"],space:["spacecapacity","space","spacelimit"],water:["watercapacity","water","waterlimit"],sanitation:["sanitationcapacity","toiletcapacity","sanitation"],occupancy:["currentoccupancy","occupied","residents","occupancy"],accessible:["accessible","accessibility","wheelchairaccessible"],medical:["medical","medicalsupport","medicalsupportavailable"],active:["active","acceptingallocations","available"],safetyReviewed:["safetyreviewed","safetyverified"],longTerm:["longterm","longtermcandidate"],landReviewed:["landreviewed","permissionsreviewed"],environmentalReviewed:["environmentalreviewed","environmentreviewed"],servicesReviewed:["servicesreviewed","servicequalityreviewed"],sustainableCapacity:["sustainablecapacity","sustainablelimit"],livelihood:["livelihood","livelihoodsuitability"],source:["source","datasource","evidence","reference"],observedAt:["observedat","updatedat","reviewedat","date"],verified:["verified","reviewed","confirmed"]},
 hazards:{id:["hazardid","layerid","recordid","uuid"],districtId:["district","districtname","districtcode","districtid"],name:["layer","layername","hazardname","title","name"],hazard:["hazardtype","category","type","hazard"],severity:["severityscore","riskscore","score","severity"],geometry:["geometry","shape","geojson"],expiresAt:["expiry","expirydate","validuntil","expiresat"],source:["source","datasource","evidence","reference"],observedAt:["observedat","updatedat","reviewedat","date"],verified:["verified","reviewed","confirmed"]},
 routes:{id:["routeid","recordid","uuid"],settlementId:["fromsettlement","originsettlement","from","settlement","village","settlementid"],siteId:["destination","destinationid","tosite","shelter","facility","site","siteid"],distance:["routedistance","lengthkm","distancekm","distance"],duration:["travelminutes","durationminutes","duration"],geometry:["geometry","routegeometry","coordinates"],source:["source","datasource","routingprovider"],fetchedAt:["fetchedat","measuredat","surveyedat","observedat","updatedat"],blocked:["blocked","closed","unavailable"]}
};
const canonical:Record<RegistryKind,string[]>={
 districts:["id","name","state","lat","lng"],
 settlements:["id","districtId","name","lat","lng","aliases","source","observedAt","verified"],
 households:["id","settlementId","reference","size","priority","assisted","medical","notes"],
 sites:["id","districtId","name","locality","lat","lng","space","water","sanitation","occupancy","active","safetyReviewed","accessible","medical","longTerm","landReviewed","environmentalReviewed","servicesReviewed","sustainableCapacity","livelihood","source","observedAt","verified"],
 hazards:["id","districtId","name","hazard","severity","expiresAt","geometry","source","observedAt","verified"],
 routes:["id","settlementId","siteId","distance","duration","source","fetchedAt","geometry","blocked"]
};

function mapHeaders(headers:string[],kind:RegistryKind){
 const lookup=new Map<string,string>();
 for(const field of canonical[kind])lookup.set(headerKey(field),field);
 for(const [field,names] of Object.entries(aliases[kind]))for(const name of names)lookup.set(headerKey(name),field);
 const used=new Map<string,string>(),unmapped:string[]=[];
 for(const header of headers){
  const field=lookup.get(headerKey(header));
  if(!field){unmapped.push(header);continue;}
  const previous=used.get(field);
  if(previous)throw new Error("Both \""+previous+"\" and \""+header+"\" map to "+field+". Keep only one column.");
  used.set(field,header);
 }
 return{used,unmapped};
}

export async function readRegistryImport(file:File,kind:RegistryKind):Promise<RegistryImportFile>{
 if(file.size>8_000_000)throw new Error("Import files must be under 8 MB.");
 const text=await file.text();let sourceRows:{line:number;values:Record<string,unknown>;structuralError?:string}[],headers:string[];
 if(kind==="hazards"&&/\.(geojson|json)$/i.test(file.name)){
  const parsed:unknown=JSON.parse(text),input=isRecord(parsed)?parsed:{},features=input.type==="FeatureCollection"?input.features:input.type==="Feature"?[input]:null;
  if(!Array.isArray(features)||!features.length)throw new Error("Choose a GeoJSON Feature or non-empty FeatureCollection.");
  const rawRows=features.map((feature:unknown)=>{if(!isRecord(feature)||feature.type!=="Feature"||!feature.geometry||!isRecord(feature.properties))throw new Error("Each hazard feature needs geometry and a properties object.");return{...feature.properties,geometry:feature.geometry};});
  headers=[...new Set(rawRows.flatMap(Object.keys))];sourceRows=rawRows.map((values,index)=>({line:index+1,values}));
 }else{
  if(/\.(geojson|json)$/i.test(file.name))throw new Error("GeoJSON import is available for hazard layers. Export other registers as CSV.");
  if(!/\.csv$/i.test(file.name))throw new Error("Choose a CSV file. Excel files can be exported as CSV first.");
  const parsed=parseCSVForReview(text);headers=parsed.headers;sourceRows=parsed.rows.map(row=>({line:row.line,values:row.values,structuralError:row.error}));
 }
 if(!sourceRows!.length)throw new Error("The file contains no records.");
 const mapped=mapHeaders(headers,kind);
 return{name:file.name,kind,headers,unmappedHeaders:mapped.unmapped,rows:sourceRows!.map(source=>({line:source.line,values:source.values,mapped:Object.fromEntries([...mapped.used].map(([field,header])=>[field,source.values[header]])),...(source.structuralError?{structuralError:source.structuralError}:{})}))};
}

type ReferenceIndex=Map<string,Set<string>>;
function makeReferenceIndex(records:{id:string;name?:string;aliases?:string[]}[]):ReferenceIndex{
 const index:ReferenceIndex=new Map();
 for(const record of records)for(const value of [record.id,record.name,...record.aliases??[]])if(value){const key=value.trim().toLocaleLowerCase(),ids=index.get(key)??new Set<string>();ids.add(record.id);index.set(key,ids);}
 return index;
}
function resolveReference(value:unknown,index:ReferenceIndex,kind:string){
 if(typeof value!=="string"||!value.trim())throw new Error("Choose or provide a registered "+kind+".");
 const matches=index.get(value.trim().toLocaleLowerCase());
 if(!matches?.size)throw new Error("Register "+kind+" \""+value+"\" before importing this data.");
 if(matches.size!==1)throw new Error(kind+" \""+value+"\" matches more than one record.");
 return [...matches][0];
}
function parseBoolean(value:unknown,key:string){
 if(value===undefined||value===null||value==="")return false;
 if(typeof value==="boolean")return value;
 if(typeof value==="number"&&(value===0||value===1))return value===1;
 const normalized=String(value).trim().toLowerCase();
 if(["true","1","yes","y"].includes(normalized))return true;
 if(["false","0","no","n"].includes(normalized))return false;
 throw new Error(key+" must be true/false, yes/no or 1/0.");
}
function normalizeRow(source:Record<string,unknown>,kind:RegistryKind,w:Workspace,references:{districts:ReferenceIndex;settlements:ReferenceIndex;sites:ReferenceIndex}):Record<string,unknown>{
 const row:Record<string,unknown>=Object.fromEntries(Object.entries(source).map(([key,value])=>[key,typeof value==="string"?value.trim():value]));
 if(kind!=="districts"){
  if(row.districtId)row.districtId=resolveReference(row.districtId,references.districts,"district");
  else if(kind==="settlements"||kind==="sites"||kind==="hazards")row.districtId=w.activeDistrictId||undefined;
  if(kind==="households"||kind==="routes")row.settlementId=resolveReference(row.settlementId,references.settlements,"settlement");
  if(kind==="routes")row.siteId=resolveReference(row.siteId,references.sites,"site");
 }
 for(const key of ["lat","lng","size","priority","space","water","sanitation","occupancy","severity","distance","duration","sustainableCapacity","livelihood"]){
  if(!(key in row))continue;
  if(row[key]===""||row[key]===null){row[key]=["sustainableCapacity","livelihood"].includes(key)?null:undefined;continue;}
  const parsed=Number(row[key]);if(!Number.isFinite(parsed))throw new Error(key+" must be a number.");row[key]=parsed;
 }
 for(const key of ["assisted","medical","active","safetyReviewed","longTerm","landReviewed","environmentalReviewed","servicesReviewed","verified","blocked"])row[key]=parseBoolean(row[key],key);
 if(typeof row.aliases==="string"){
  const aliases=row.aliases;
  try{const parsed:unknown=JSON.parse(aliases);row.aliases=Array.isArray(parsed)?parsed.map(value=>String(value).trim()).filter(Boolean):aliases.split(/[;,|]/).map(value=>value.trim()).filter(Boolean);}
  catch{row.aliases=aliases.split(/[;,|]/).map(value=>value.trim()).filter(Boolean);}
 }
 if(kind==="hazards"&&typeof row.geometry==="string"){
  try{const parsed:unknown=JSON.parse(row.geometry);row.geometry=isRecord(parsed)&&parsed.type==="Feature"?parsed.geometry:parsed;}catch{throw new Error("geometry must contain valid Polygon or MultiPolygon GeoJSON.");}
 }
 if(kind==="routes"&&typeof row.geometry==="string"){
  try{const parsed:unknown=JSON.parse(row.geometry);row.geometry=isRecord(parsed)&&parsed.type==="LineString"?parsed.coordinates:parsed;}catch{throw new Error("geometry must be a JSON array of [longitude, latitude] points.");}
 }
 for(const key of ["observedAt","fetchedAt"])if(row[key]){const date=new Date(String(row[key]));if(!Number.isFinite(date.getTime()))throw new Error(key+" is not a valid date.");row[key]=date.toISOString();}
 if(kind==="hazards"){
  if(row.expiresAt){const date=new Date(String(row.expiresAt));if(!Number.isFinite(date.getTime()))throw new Error("expiresAt is not a valid date.");row.expiresAt=date.toISOString();}
  else row.expiresAt=null;
 }
 if(kind==="households"&&!row.reference&&typeof row.id==="string")row.reference=row.id;
 const prefix:Record<RegistryKind,string>={districts:"DST",settlements:"STL",households:"HH",sites:"SITE",hazards:"HZ",routes:"RT"};
 row.id=typeof row.id==="string"&&row.id.trim()?row.id.trim():prefix[kind]+"-"+crypto.randomUUID();
 if(kind==="routes"){
  const settlement=w.settlements.find(item=>item.id===row.settlementId),site=w.sites.find(item=>item.id===row.siteId);
  if(!settlement||!site)throw new Error("Route endpoints must be registered before importing routes.");
  row.from=[settlement.lng,settlement.lat];row.to=[site.lng,site.lat];
 }
 return row;
}

const textKey=(value:unknown)=>String(value??"").trim().toLocaleLowerCase();
function identityKey(kind:RegistryKind,row:Record<string,unknown>){
 const values=kind==="districts"?[row.name,row.state]:kind==="settlements"?[row.districtId,row.name]:kind==="households"?[row.settlementId,row.reference]:kind==="sites"?[row.districtId,row.name]:kind==="hazards"?[row.districtId,row.name,row.observedAt]:[];
 return values.length?kind+":"+values.map(textKey).join("|"):"";
}
const schemaFor=(kind:RegistryKind)=>({districts:districtSchema,settlements:settlementSchema,households:householdSchema,sites:siteSchema,hazards:hazardSchema,routes:routeSchema} as const)[kind];
function relationshipError(kind:RegistryKind,row:Record<string,unknown>,ids:{districts:Set<string>;settlements:Set<string>;sites:Set<string>}){
 if((kind==="settlements"||kind==="sites"||kind==="hazards")&&!ids.districts.has(fieldText(row,"districtId")))return"Register the district before importing this record.";
 if(kind==="households"&&!ids.settlements.has(fieldText(row,"settlementId")))return"Register the settlement before importing its households.";
 if(kind==="routes"&&(!ids.settlements.has(fieldText(row,"settlementId"))||!ids.sites.has(fieldText(row,"siteId"))))return"Register both route endpoints before importing routes.";
 return"";
}

export function buildRegistryImport(file:RegistryImportFile,workspace:Workspace,updateMatches:boolean):RegistryImportResult{
 const next=structuredClone(workspace),rows:RegistryImportResultRow[]=[],seen=new Set<string>(),seenNatural=new Set<string>(),references={districts:makeReferenceIndex(workspace.districts),settlements:makeReferenceIndex(workspace.settlements),sites:makeReferenceIndex(workspace.sites)},ids={districts:new Set(workspace.districts.map(item=>item.id)),settlements:new Set(workspace.settlements.map(item=>item.id)),sites:new Set(workspace.sites.map(item=>item.id))};let added=0,updated=0;
 const records=next[file.kind] as unknown as Record<string,unknown>[],idIndex=new Map(records.map((record,index)=>[recordId(record),index])),naturalIndex=new Map<string,Set<string>>();
 for(const record of records){const id=recordId(record),key=identityKey(file.kind,record);if(key&&id){const matches=naturalIndex.get(key)??new Set<string>();matches.add(id);naturalIndex.set(key,matches);}}
 function indexIdentity(record:Record<string,unknown>,add:boolean){const id=recordId(record),key=identityKey(file.kind,record);if(!key||!id)return;const matches=naturalIndex.get(key)??new Set<string>();if(add)matches.add(id);else matches.delete(id);if(matches.size)naturalIndex.set(key,matches);else naturalIndex.delete(key);}
 for(const source of file.rows){
  let row:Record<string,unknown>|undefined;
  try{
   if(source.structuralError)throw new Error(source.structuralError);
   row=normalizeRow(source.mapped,file.kind,next,references);
   const id=recordId(row);if(seen.has(id))throw new Error("Identifier "+id+" appears more than once in this file.");seen.add(id);
   const byId=idIndex.get(id)??-1,identity=identityKey(file.kind,row),natural=identity?naturalIndex.get(identity)??new Set<string>():new Set<string>();
   if(byId>=0&&[...natural].some(candidate=>candidate!==recordId(records[byId])))throw new Error("The record ID and natural key refer to different existing records.");
   if(natural.size>1&&byId<0)throw new Error("This row matches multiple existing records. Include its record ID to identify which one.");
   const naturalId=natural.size===1?[...natural][0]:undefined,index=byId>=0?byId:naturalId===undefined?-1:idIndex.get(naturalId)??-1;
   if(index>=0&&!updateMatches)throw new Error("Already exists as "+recordId(records[index])+". Enable “Update matching records” to review its replacement.");
   const relation=relationshipError(file.kind,row,ids);if(relation)throw new Error(relation);
   const parsed=schemaFor(file.kind).safeParse(row);
   if(!parsed.success)throw new Error(parsed.error.issues.map(issue=>(issue.path.join(".")||"record")+": "+issue.message).slice(0,4).join("; "));
   if(identity&&seenNatural.has(identity))throw new Error("This file contains the same record more than once.");if(identity)seenNatural.add(identity);
   let status:"add"|"update"="add";
   if(index>=0){const previous=records[index];indexIdentity(previous,false);row.id=recordId(previous);records[index]=row;idIndex.set(id,index);indexIdentity(row,true);status="update";updated++;}
   else{const targetIndex=records.length;records.push(row);idIndex.set(id,targetIndex);indexIdentity(row,true);added++;}
   rows.push({line:source.line,label:String(row.name??row.reference??row.id),status,record:row,errors:[]});
  }catch(error){rows.push({line:source.line,label:String(row?.name??row?.reference??row?.id??source.mapped.name??source.mapped.reference??source.mapped.id??source.mapped.settlementId??source.values.name??source.values.reference??source.values.id??"Unidentified row"),status:"error",record:row,errors:[error instanceof Error?error.message:"Row validation failed"]});}
 }
 if(file.kind==="districts"&&!next.activeDistrictId)next.activeDistrictId=next.districts[0]?.id??"";
 const validated=workspaceSchema.safeParse(next);
 if(!validated.success&&rows.some(row=>row.status!=="error")){
  const issue=validated.error.issues.slice(0,3).map(item=>item.path.join(".")+": "+item.message).join("; ");
  return{workspace,rows:rows.map(row=>row.status==="error"?row:{...row,status:"error",errors:["Final register validation: "+issue]}),added:0,updated:0,rejected:rows.length};
 }
 return{workspace:validated.success?validated.data:next,rows,added,updated,rejected:rows.filter(row=>row.status==="error").length};
}

export function rejectedImportCSV(file:RegistryImportFile,rows:RegistryImportResultRow[]){
 const failed=new Map(rows.filter(row=>row.status==="error").map(row=>[row.line,row.errors.join(" | ")]));
 return toCSV(file.rows.filter(row=>failed.has(row.line)).map(row=>({...row.values,_source_row:row.line,_import_errors:failed.get(row.line)})));
}
