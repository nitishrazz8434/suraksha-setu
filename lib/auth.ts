import {db,sha} from "./server";
import type {Account,Role} from "./auth-types";
import {z} from "zod";
export const credentialsSchema=z.object({email:z.string().trim().toLowerCase().email().max(200),password:z.string().min(12,"Use at least 12 characters").max(128)});
export const accountSchema=credentialsSchema.extend({name:z.string().trim().min(2).max(120)});
const COOKIE="suraksha_session";
export interface UserRow {id:string;email:string;name:string;password_hash:string;role:Role;district_ids:string;enabled:number;must_change_password:number;created_at:string;}
export function account(row:UserRow):Account{return{id:row.id,email:row.email,name:row.name,role:row.role,districtIds:JSON.parse(row.district_ids),enabled:!!row.enabled,mustChangePassword:!!row.must_change_password,createdAt:row.created_at};}
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
export async function hashPassword(password:string,salt=hex(crypto.getRandomValues(new Uint8Array(24)))){
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
 const hash=await crypto.subtle.deriveBits({name:"PBKDF2",salt:new TextEncoder().encode(salt),iterations:100000,hash:"SHA-256"},key,256);
 return `pbkdf2-sha256:100000:${salt}:${hex(new Uint8Array(hash))}`;
}
export async function verifyPassword(password:string,stored:string){const parts=stored.split(":");if(parts.length!==4)return false;const candidate=await hashPassword(password,parts[2]);let difference=candidate.length^stored.length;for(let i=0;i<stored.length;i++)difference|=(candidate.charCodeAt(i)||0)^stored.charCodeAt(i);return difference===0;}
export async function currentAccount(request:Request):Promise<Account|null>{
 const token=request.headers.get("cookie")?.split(";").map(s=>s.trim()).find(s=>s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);
 if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 const row=await db().prepare("SELECT u.* FROM app_sessions s JOIN app_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.enabled=1").bind(await sha(token),new Date().toISOString()).first<UserRow>();return row?account(row):null;
}
export async function requireAccount(request:Request,roles?:Role[]):Promise<Account|Response>{const user=await currentAccount(request);if(!user)return Response.json({error:"Sign in to continue."},{status:401});if(user.mustChangePassword)return Response.json({error:"Change your temporary password before continuing."},{status:403});if(roles&&!roles.includes(user.role))return Response.json({error:"Your account does not have permission for this action."},{status:403});return user;}
export function canDistrict(user:Account,districtId:string){return user.role==="admin"||(user.role==="officer"&&user.districtIds.includes(districtId));}
export function sessionCookie(request:Request,token:string,maxAge=43200){return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol==="https:"?"; Secure":""}`;}
export async function newSession(request:Request,userId:string){const token=hex(crypto.getRandomValues(new Uint8Array(32)));await db().prepare("INSERT INTO app_sessions(token_hash,user_id,expires_at) VALUES(?,?,?)").bind(await sha(token),userId,new Date(Date.now()+12*3600000).toISOString()).run();return sessionCookie(request,token);}
export async function throttle(request:Request,email:string){const key=await sha(`${request.headers.get("cf-connecting-ip")??"local"}:${email}`),now=Date.now();await db().prepare("INSERT INTO auth_attempts(key,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<? THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<? THEN ? ELSE reset_at END").bind(key,now+15*60000,now,now,now+15*60000).run();const row=await db().prepare("SELECT attempts FROM auth_attempts WHERE key=?").bind(key).first<{attempts:number}>();return(row?.attempts??0)<=15;}
export function mutationGuard(request:Request){const origin=request.headers.get("origin");return origin===new URL(request.url).origin?null:Response.json({error:"A same-origin request is required."},{status:403});}
export async function audit(user:Account,action:string,targetId:string,detail:string,districtId:string|null=null){await db().prepare("INSERT INTO audit_events(id,actor_id,actor_name,district_id,action,target_id,detail,created_at) VALUES(?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,user.name,districtId,action,targetId,detail,new Date().toISOString()).run();}
