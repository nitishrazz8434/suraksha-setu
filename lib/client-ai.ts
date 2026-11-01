"use client";
let worker:Worker|null=null,sequence=0;
let queue:Promise<unknown>=Promise.resolve();
export function analyze(kind:"text"|"classify"|"segment"|"detect"|"summarize"|"search",input:Record<string,unknown>,progress?:(text:string)=>void):Promise<{output:any;model:string}>{
 const run=()=>new Promise<{output:any;model:string}>((resolve,reject)=>{worker??=new Worker(new URL("./ai.worker.ts",import.meta.url),{type:"module"});const id=++sequence;const timer=setTimeout(()=>{worker?.terminate();worker=null;reject(new Error("Model loading or inference timed out. Check connectivity and retry."));},600000);const listener=(event:MessageEvent)=>{if(event.data.id!==id)return;if(event.data.progress){progress?.(event.data.progress);return;}clearTimeout(timer);worker?.removeEventListener("message",listener);if(event.data.error)reject(new Error(event.data.error));else resolve({output:event.data.output,model:event.data.model});};worker.addEventListener("message",listener);worker.postMessage({id,kind,input});});
 const job=queue.then(run,run);queue=job.catch(()=>{});return job;
}
let solver:Promise<any>|null=null;
export function getSolver(){solver??=import("glpk.js").then(m=>m.default());return solver;}
