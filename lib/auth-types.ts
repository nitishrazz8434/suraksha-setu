export type Role = "citizen" | "officer" | "admin";
export interface Account { id:string; name:string; email:string; role:Role; districtIds:string[]; enabled:boolean; mustChangePassword:boolean; createdAt:string; }
export const roleName = (role:Role) => ({citizen:"Citizen",officer:"District officer",admin:"System administrator"}[role]);
export interface ReportEvent {id:string;reportId:string;actorId:string;actorName:string;action:string;message:string;createdAt:string;}
export interface Notification {id:string;title:string;reportId:string|null;createdAt:string;readAt:string|null;}
