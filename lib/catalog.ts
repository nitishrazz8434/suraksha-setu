import data from "../public/data/district-reference.json";
import type {ReferenceCatalog} from "./connected-types";
import type {Workspace} from "./types";
import {record} from "./workspace";
export const catalog=data as unknown as ReferenceCatalog;
export function connectReferenceDistricts(workspace:Workspace){
 const w=structuredClone(workspace);
 for(const profile of catalog.profiles){
  if(!w.districts.some(d=>d.id===profile.id))w.districts.push({id:profile.id,name:profile.name,state:profile.state,lat:profile.lat,lng:profile.lng});
  for(const origin of catalog.origins.filter(o=>o.districtId===profile.id))if(!w.settlements.some(s=>s.id===origin.id))w.settlements.push(origin);
  for(const f of catalog.facilities.filter(f=>f.districtId===profile.id))if(!w.sites.some(s=>s.id===f.id))w.sites.push({id:f.id,districtId:f.districtId,name:f.name,locality:f.address||profile.name,lat:f.lat,lng:f.lng,space:0,water:0,sanitation:0,occupancy:0,accessible:false,medical:false,active:true,safetyReviewed:false,longTerm:false,landReviewed:false,environmentalReviewed:false,servicesReviewed:false,sustainableCapacity:null,livelihood:null,source:f.source,observedAt:f.retrievedAt,verified:false});
  const documentId=`SOURCE-${profile.id}`;
  if(w.documents.length<30&&!w.documents.some(d=>d.id===documentId))w.documents.push({id:documentId,districtId:profile.id,name:`${profile.name} — public district and infrastructure references`,text:`${profile.name}, Kerala. Census ${profile.populationYear} population: ${profile.population}. Source: ${profile.populationSource}. This is a historical district population reference, not a count of evacuees. Geography: ${profile.geographySource}. Public school infrastructure from Kerala KITE Sametham, retrieved ${catalog.retrievedAt}:\n${catalog.facilities.filter(f=>f.districtId===profile.id).map(f=>`${f.name}: ${f.classrooms} classrooms; ${f.toilets} reported toilets. Source ${f.source}.`).join("\n")}\nThese are mapped candidate facilities, not designated or cleared evacuation shelters. Preparedness estimates use explicit room-area, availability, water and sanitation assumptions. Operational capacity and safety require field review.`});
 }
 for(const route of catalog.routes)if(!w.routes.some(r=>r.id===route.id))w.routes.push(route);
 return record(w,"Connected Wayanad, Idukki and Kozhikode public geography, infrastructure and road references","registry");
}
