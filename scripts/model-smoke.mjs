import {pipeline,env} from "@huggingface/transformers";
import {mkdirSync,writeFileSync} from "node:fs";

env.allowLocalModels=false;
env.cacheDir=".sites-runtime/model-cache";
mkdirSync(".sites-runtime",{recursive:true});

const cases=[
 {task:"zero-shot-classification",model:"Xenova/mobilebert-uncased-mnli",run:p=>p("Flood water has entered the village and blocked the road.",["flooding","food delivery","unrelated information"]),check:output=>{
  if(output?.labels?.[0]!=="flooding")throw new Error("Expected the flood report to rank 'flooding' first.");
 }},
 {task:"text-generation",model:"onnx-community/Qwen2.5-0.5B-Instruct",dtype:"q4f16",run:p=>p([{role:"system",content:"Answer clearly and briefly."},{role:"user",content:"In one sentence, what does a barometer measure?"}],{max_new_tokens:50,do_sample:false}),check:output=>{
  const generated=output?.[0]?.generated_text,answer=Array.isArray(generated)?[...generated].reverse().find(message=>message?.role==="assistant")?.content:String(generated??"");
  if(!/\bpressure\b/i.test(String(answer)))throw new Error("Qwen did not mention pressure in its barometer answer.");
 }},
 {task:"image-segmentation",model:"Xenova/segformer-b0-finetuned-ade-512-512",run:p=>p("https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/house.jpg"),check:output=>{
  if(!Array.isArray(output)||!output.some(segment=>/^(wall|building|house)$/i.test(segment.label)))throw new Error("SegFormer did not label any expected house-scene region.");
 }},
 {task:"text2text-generation",model:"Xenova/flan-t5-small",run:p=>p("Answer from evidence: Available accommodation is 100 people. Question: How many people can be accommodated?",{max_new_tokens:30,do_sample:false}),check:output=>{
  if(!/\b100\b/.test(String(output?.[0]?.generated_text??"")))throw new Error("FLAN-T5 did not return the supported value 100.");
 }},
];

const extended=process.argv.includes("--extended");
if(extended)cases.splice(0,cases.length,
 {task:"zero-shot-image-classification",model:"Xenova/clip-vit-base-patch32",run:p=>p("https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/house.jpg",["a house","a flood"]),check:output=>{
  if(output?.[0]?.label!=="a house")throw new Error("CLIP did not rank the house description first for the house image.");
 }},
 {task:"object-detection",model:"Xenova/yolos-tiny",run:p=>p("https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/house.jpg",{threshold:.35}),check:output=>{
  if(!Array.isArray(output)||output.some(item=>typeof item.score!=="number"||!item.box))throw new Error("YOLOS returned an invalid detection structure.");
 }},
 {task:"feature-extraction",model:"Xenova/paraphrase-multilingual-MiniLM-L12-v2",run:async p=>{const output=await p(["Evacuation assistance is needed","निकासी के लिए मदद चाहिए","The meeting is tomorrow"],{pooling:"mean",normalize:true}),vectors=output.tolist();return{shape:output.dims,englishHindiSimilarity:vectors[0].reduce((sum,value,index)=>sum+value*vectors[1][index],0)};},check:output=>{
  if(output?.shape?.[0]!==3||output?.shape?.[1]!==384||!Number.isFinite(output.englishHindiSimilarity)||output.englishHindiSimilarity<.4)throw new Error("Multilingual embeddings did not produce the expected vector shape and translation similarity.");
 }}
);

const results=[];
for(const item of cases){
 console.log(`Loading ${item.model}`);
 const start=Date.now();
 let model;
 try{
  model=await pipeline(item.task,item.model,{dtype:item.dtype??"q8",device:"cpu"});
  const output=await item.run(model);
  if(!output)throw new Error("Model returned no output.");
  item.check(output);
  const summary=item.task==="image-segmentation"?{labels:output.map(segment=>segment.label),masks:output.length}:output;
  results.push({model:item.model,status:"passed",check:"inference plus expected-behavior smoke check",milliseconds:Date.now()-start,output:summary});
  console.log(JSON.stringify(results.at(-1)));
 }catch(error){
  results.push({model:item.model,status:"failed",error:error.message});
  console.error(`${item.model}: ${error.message}`);
 }finally{
  await model?.dispose().catch(()=>{});
 }
}

writeFileSync(extended?".sites-runtime/model-smoke-extended.json":".sites-runtime/model-smoke-results.json",JSON.stringify(results,null,2));
if(results.some(result=>result.status!=="passed"))process.exitCode=1;
