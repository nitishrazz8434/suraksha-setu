"use client";
import type {GLPK} from "glpk.js";
let worker:Worker|null=null,sequence=0;
let queue:Promise<unknown>=Promise.resolve();
type WorkerReply={id:number;progress?:string;error?:string;output?:unknown;model?:string};
export function analyze(kind:"text"|"classify"|"segment"|"detect"|"disaster"|"summarize"|"chat"|"search",input:Record<string,unknown>,progress?:(text:string)=>void):Promise<{output:unknown;model:string}>{
 const run=()=>new Promise<{output:unknown;model:string}>((resolve,reject)=>{worker??=new Worker("/ai/inference-worker.js",{type:"module"});const active=worker,id=++sequence;const clean=()=>{clearTimeout(timer);active.removeEventListener("message",listener);active.removeEventListener("error",failure);};const timeout=kind==="chat"?180000:600000;const timer=setTimeout(()=>{clean();active.terminate();worker=null;reject(new Error("Model loading or inference timed out. Check connectivity and retry."));},timeout);const failure=(event:ErrorEvent)=>{clean();active.terminate();worker=null;reject(new Error(event.message||"The model worker could not load. Reload the page and retry."));};const listener=(event:MessageEvent<WorkerReply>)=>{if(event.data.id!==id)return;if(event.data.progress){progress?.(event.data.progress);return;}clean();if(event.data.error)reject(new Error(event.data.error));else if(typeof event.data.model!=="string")reject(new Error("The model worker returned an incomplete response."));else resolve({output:event.data.output,model:event.data.model});};active.addEventListener("message",listener);active.addEventListener("error",failure);active.postMessage({id,kind,input});});
 const job=queue.then(run,run);queue=job.catch(()=>{});return job;
}
let solver:Promise<GLPK>|null=null;
export function getSolver(){solver??=import("glpk.js").then(m=>m.default());return solver;}
