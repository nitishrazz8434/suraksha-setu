import { env } from "cloudflare:workers";
export function owner(request: Request): string | Response {
 const id=request.headers.get("oai-authenticated-user-id");
 if(id)return id;
 const url=new URL(request.url);
 if(process.env.NODE_ENV!=="production"&&["localhost","127.0.0.1","[::1]"].includes(url.hostname))return "local-workshop";
 return Response.json({error:"Sign in to access your workspace."},{status:401});
}
export function safeMutation(request:Request) {
 const origin=request.headers.get("origin");return !origin||origin===new URL(request.url).origin;
}
export function db(){if(!env.DB)throw new Error("Database binding is not configured.");return env.DB;}
export const bucket=()=>env.BUCKET;
export async function sha(value:string){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,"0")).join("");}
export function config(){return env as Cloudflare.Env & {ML_SERVICE_URL?:string;ML_SERVICE_TOKEN?:string};}
