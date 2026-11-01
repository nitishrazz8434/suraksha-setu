import type { Settlement, Site, Road, Workspace, Scenario } from "./types";

export const SETTLEMENTS: Settlement[] = [
  { id: "S01", name: "Mundakkai", lat: 11.441, lng: 76.166, households: 112, vulnerable: 32, flood: 72, landslide: 94, access: 85, node: "N1" },
  { id: "S02", name: "Chooralmala", lat: 11.481, lng: 76.157, households: 96, vulnerable: 24, flood: 88, landslide: 87, access: 76, node: "N2" },
  { id: "S03", name: "Meppadi", lat: 11.553, lng: 76.137, households: 124, vulnerable: 22, flood: 67, landslide: 62, access: 40, node: "N3" },
  { id: "S04", name: "Pozhuthana", lat: 11.584, lng: 75.968, households: 84, vulnerable: 18, flood: 81, landslide: 43, access: 57, node: "N4" },
  { id: "S05", name: "Vythiri", lat: 11.551, lng: 76.04, households: 72, vulnerable: 12, flood: 48, landslide: 65, access: 33, node: "N5" },
  { id: "S06", name: "Kottathara", lat: 11.664, lng: 76.028, households: 104, vulnerable: 16, flood: 86, landslide: 29, access: 48, node: "N6" },
  { id: "S07", name: "Padinjarathara", lat: 11.694, lng: 75.964, households: 64, vulnerable: 10, flood: 61, landslide: 46, access: 35, node: "N7" },
  { id: "S08", name: "Kalpetta", lat: 11.61, lng: 76.083, households: 80, vulnerable: 12, flood: 34, landslide: 24, access: 15, node: "N8" },
];
export const NODES: Record<string, [number, number]> = Object.fromEntries(SETTLEMENTS.map(s => [s.node, [s.lat, s.lng]]));
NODES.N9 = [11.645, 76.115]; NODES.N10 = [11.575, 76.092];
export const ROADS: Road[] = [
 { id:"R01", from:"N1", to:"N2", name:"Mundakkai access road", exposure:0.45 },
 { id:"R02", from:"N2", to:"N3", name:"Chooralmala bridge link", exposure:0.3 },
 { id:"R03", from:"N3", to:"N10", name:"Meppadi–centre link", exposure:0.15 },
 { id:"R04", from:"N10", to:"N8", name:"Kalpetta south corridor", exposure:0.08 },
 { id:"R05", from:"N10", to:"N5", name:"Vythiri eastern link", exposure:0.13 },
 { id:"R06", from:"N5", to:"N4", name:"Pozhuthana approach", exposure:0.2 },
 { id:"R07", from:"N4", to:"N6", name:"Western valley road", exposure:0.25 },
 { id:"R08", from:"N6", to:"N7", name:"Padinjarathara connector", exposure:0.18 },
 { id:"R09", from:"N6", to:"N8", name:"Kottathara–Kalpetta link", exposure:0.16 },
 { id:"R10", from:"N8", to:"N9", name:"Northern relief corridor", exposure:0.05 },
 { id:"R11", from:"N9", to:"N6", name:"Northern alternate route", exposure:0.11 },
];
export const BASE_SCENARIO: Scenario = { name: "Baseline assessment", intensity: 1, closedRoads: [], unavailableSites: [], waterFactor: 1, demandFactor: 1 };
export const SITES: Site[] = [
 { id:"H01", name:"Central Relief Campus", locality:"Kalpetta", lat:11.615, lng:76.087, node:"N8", space:920,water:820,sanitation:880,occupancy:120,accessible:true,medical:true,active:true,longTerm:false,environmental:true,livelihood:90 },
 { id:"H02", name:"Northern Community Hub", locality:"Kainatty", lat:11.646,lng:76.119,node:"N9",space:760,water:680,sanitation:720,occupancy:80,accessible:true,medical:true,active:true,longTerm:true,environmental:true,livelihood:82 },
 { id:"H03", name:"Valley Training Centre", locality:"Vythiri",lat:11.548,lng:76.044,node:"N5",space:560,water:480,sanitation:520,occupancy:40,accessible:true,medical:false,active:true,longTerm:false,environmental:true,livelihood:70 },
 { id:"H04", name:"Meppadi Transit Shelter",locality:"Meppadi",lat:11.558,lng:76.142,node:"N3",space:480,water:440,sanitation:400,occupancy:40,accessible:false,medical:false,active:true,longTerm:false,environmental:true,livelihood:76 },
 { id:"H05", name:"Western Resettlement Site",locality:"Kottathara",lat:11.671,lng:76.034,node:"N6",space:880,water:800,sanitation:840,occupancy:0,accessible:true,medical:true,active:true,longTerm:true,environmental:true,livelihood:65 },
];
export function seedWorkspace(): Workspace {
 return { version:1, sites: structuredClone(SITES), scenario:structuredClone(BASE_SCENARIO),plans:[],documents:[],
  reports:[
   {id:"INC-1042",title:"Water rising near residential cluster",text:"Water is rising near Chooralmala. 48 people need transport, drinking water and medicine. Elderly residents need assistance.",settlement:"S02",hazard:"Flood",severity:"Critical",status:"Verified",source:"Field team",createdAt:"2026-11-01T02:45:00Z",people:48,needs:["Transport","Water","Medical assistance"]},
   {id:"INC-1041",title:"Fresh slope movement reported",text:"Fresh cracks and slope movement near Mundakkai access road. 32 residents request evacuation support.",settlement:"S01",hazard:"Landslide",severity:"High",status:"Pending",source:"Citizen",createdAt:"2026-11-01T02:30:00Z",people:32,needs:["Transport"]},
   {id:"INC-1040",title:"Water supply disruption at Pozhuthana",text:"Water supply is interrupted at Pozhuthana. 20 families need drinking water and food.",settlement:"S04",hazard:"Flood",severity:"High",status:"Verified",source:"Field team",createdAt:"2026-11-01T01:55:00Z",people:null,needs:["Water","Food"]},
   {id:"INC-1039",title:"Road inspection requested",text:"Inspect the Chooralmala bridge link near Meppadi. Debris has been reported; closure is not yet confirmed.",settlement:"S03",hazard:"Infrastructure",severity:"Moderate",status:"Pending",source:"Citizen",createdAt:"2026-11-01T01:20:00Z",people:null,needs:["Road inspection"]},
   {id:"INC-1038",title:"Transport assistance completed",text:"Transport assistance completed for residents in Kottathara. Route remains open.",settlement:"S06",hazard:"Flood",severity:"Low",status:"Resolved",source:"Field team",createdAt:"2026-10-31T23:35:00Z",people:24,needs:["Transport"]},
  ],
  activity:[{id:"a1",text:"Field team verified the Chooralmala flood report",time:"2026-11-01T02:45:00Z",type:"report"},{id:"a2",text:"Northern Community Hub capacity reviewed",time:"2026-11-01T02:20:00Z",type:"site"},{id:"a3",text:"Baseline district assessment prepared",time:"2026-11-01T01:30:00Z",type:"scenario"}],
  tasks:[{id:"T01",title:"Verify Mundakkai slope movement",team:"Field team Alpha",done:false},{id:"T02",title:"Inspect Chooralmala bridge link",team:"Road assessment team",done:false},{id:"T03",title:"Confirm water supply at Central Relief Campus",team:"Logistics team",done:true},{id:"T04",title:"Prepare accessible transport for assisted households",team:"Transport team",done:false}]
 };
}
