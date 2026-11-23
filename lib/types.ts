import type {Assessment} from "./assessment";
export type Hazard="Flood"|"Landslide"|"Infrastructure"|"Unspecified";
export type Severity="Critical"|"High"|"Moderate"|"Low";
export interface District{id:string;name:string;state:string;lat:number;lng:number;}
export interface Provenance{source:string;observedAt:string;verified:boolean;}
export interface Settlement extends Provenance{id:string;districtId:string;name:string;lat:number;lng:number;aliases:string[];}
export interface Household{id:string;settlementId:string;reference:string;size:number;assisted:boolean;medical:boolean;priority:number;notes:string;}
export interface Site extends Provenance{id:string;districtId:string;name:string;locality:string;lat:number;lng:number;space:number;water:number;sanitation:number;occupancy:number;accessible:boolean;medical:boolean;active:boolean;safetyReviewed:boolean;longTerm:boolean;landReviewed:boolean;environmentalReviewed:boolean;servicesReviewed:boolean;sustainableCapacity:number|null;livelihood:number|null;}
export type Position=[number,number];
export interface Geometry{type:"Polygon"|"MultiPolygon";coordinates:Position[][]|Position[][][];}
export interface HazardLayer extends Provenance{id:string;districtId:string;name:string;hazard:Hazard|"Road closure";severity:number;geometry:Geometry;expiresAt:string|null;}
export interface RouteRecord{id:string;settlementId:string;siteId:string;from:Position;to:Position;distance:number;duration:number;geometry:Position[];source:string;fetchedAt:string;blocked:boolean;}
export interface Report{id:string;districtId:string;title:string;text:string;settlement:string;hazard:Hazard;severity:Severity;status:"Pending"|"Under review"|"Needs information"|"Verified"|"Rejected"|"Resolved";source:"Citizen"|"Field team"|"Bulletin";createdAt:string;people:number|null;needs:string[];routeId?:string;evidenceUrl?:string;analysis?:{model:string;label:string;score:number};submitterId?:string;submitterName?:string;reviewerId?:string;reviewerName?:string;reviewNote?:string;observedAt?:string;expiresAt?:string;duplicateOf?:string;revision?:number;history?:import("./auth-types").ReportEvent[];lastEventId?:string;}
export interface Scenario{name:string;unavailableSites:string[];closedRoutes:string[];waterFactor:number;allowCrossDistrict:boolean;purpose:"Emergency"|"Long-term";}
export interface Assignment{householdId:string;settlementId:string;siteId:string;people:number;assisted:boolean;routeId:string;distance:number;status:"Planned"|"In transit"|"Arrived"|"Cancelled";}
export interface Plan{id:string;createdAt:string;districtId:string;status:"Draft"|"Approved"|"In progress"|"Completed"|"Cancelled";assignments:Assignment[];served:number;demand:number;unallocated:number;distance:number;priorityCoverage:number;scenario:Scenario;solverStatus:"Optimal"|"Feasible";inputSignature:string;inputDistrictIds?:string[];createdBy?:string;createdByName?:string;approvedBy?:string;approvedByName?:string;approvedAt?:string;}
export interface Activity{id:string;text:string;time:string;type:"report"|"plan"|"site"|"registry"|"scenario";}
export interface Workspace{assessments?:Assessment[];version:2;districts:District[];activeDistrictId:string;settlements:Settlement[];households:Household[];sites:Site[];hazards:HazardLayer[];routes:RouteRecord[];reports:Report[];scenario:Scenario;plans:Plan[];activity:Activity[];tasks:{id:string;districtId:string;title:string;team:string;assignedTo?:string;done:boolean}[];documents:{id:string;districtId:string;name:string;text:string}[];}
export interface Extraction{hazard:Hazard;severity:Severity;settlement:string;people:number|null;needs:string[];entities:{text:string;type:string}[];}
