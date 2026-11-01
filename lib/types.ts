export type Hazard = "Flood" | "Landslide" | "Infrastructure" | "Unspecified";
export type Severity = "Critical" | "High" | "Moderate" | "Low";
export interface Settlement { id: string; name: string; lat: number; lng: number; households: number; vulnerable: number; flood: number; landslide: number; access: number; node: string; }
export interface Site { id: string; name: string; locality: string; lat: number; lng: number; node: string; space: number; water: number; sanitation: number; occupancy: number; accessible: boolean; medical: boolean; active: boolean; longTerm: boolean; environmental: boolean; livelihood: number; }
export interface Road { id: string; from: string; to: string; name: string; exposure: number; }
export interface Report { id: string; title: string; text: string; settlement: string; hazard: Hazard; severity: Severity; status: "Pending" | "Verified" | "Resolved"; source: "Citizen" | "Field team" | "Bulletin"; createdAt: string; people: number | null; needs: string[]; roadId?: string; evidenceUrl?: string; analysis?: {model:string;label:string;score:number}; }
export interface Scenario { name: string; intensity: number; closedRoads: string[]; unavailableSites: string[]; waterFactor: number; demandFactor: number; }
export interface Assignment { settlementId: string; siteId: string; households: number; people: number; distance: number; assisted: boolean; path: string[]; }
export interface Plan { id: string; createdAt: string; status: "Draft" | "Approved" | "In progress" | "Completed"; assignments: Assignment[]; served: number; demand: number; unallocated: number; distance: number; priorityCoverage: number; scenario: Scenario; }
export interface Activity { id: string; text: string; time: string; type: "report" | "plan" | "site" | "scenario"; }
export interface Workspace { version: 1; reports: Report[]; sites: Site[]; scenario: Scenario; plans: Plan[]; activity: Activity[]; tasks: { id: string; title: string; team: string; done: boolean }[]; documents: { id: string; name: string; text: string }[]; }
export interface Extraction { hazard: Hazard; severity: Severity; settlement: string; people: number | null; needs: string[]; entities: { text: string; type: string }[]; confidence: number; }
