import{pipeline,env}from"@huggingface/transformers";
import{mkdirSync,writeFileSync}from"node:fs";
env.allowLocalModels=false;env.cacheDir=".sites-runtime/model-cache";
mkdirSync(".sites-runtime",{recursive:true});
const results=[];
const cases=[
 {task:"zero-shot-classification",model:"Xenova/mobilebert-uncased-mnli",run:p=>p("Flood water has entered the village and blocked the road.",["flooding","food delivery","unrelated information"])},
 {task:"image-segmentation",model:"Xenova/segformer-b0-finetuned-ade-512-512",run:p=>p("https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/house.jpg")},
 {task:"text2text-generation",model:"Xenova/flan-t5-small",run:p=>p("Answer from evidence: Available accommodation is 100 people. Question: How many people can be accommodated?",{max_new_tokens:30,do_sample:false})},
];
const extended=process.argv.includes("--extended");
if(extended)cases.splice(0,cases.length,
 {task:"zero-shot-image-classification",model:"Xenova/clip-vit-base-patch32",run:p=>p("https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/house.jpg",["a house","a flood"])},
 {task:"object-detection",model:"Xenova/yolos-tiny",run:p=>p("https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/house.jpg",{threshold:.35})},
 {task:"feature-extraction",model:"Xenova/paraphrase-multilingual-MiniLM-L12-v2",run:async p=>{const output=await p(["Evacuation assistance is needed","निकासी के लिए मदद चाहिए","The meeting is tomorrow"],{pooling:"mean",normalize:true});const v=output.tolist();return{shape:output.dims,englishHindiSimilarity:v[0].reduce((n,x,i)=>n+x*v[1][i],0)};}}
);
for(const item of cases){console.log(`Loading ${item.model}`);const start=Date.now();try{const p=await pipeline(item.task,item.model,{dtype:"q8",device:"cpu"});const output=await item.run(p);if(!output)throw new Error("Empty model output");const summary=item.task==="image-segmentation"?{labels:output.map(s=>s.label),masks:output.length}:output;results.push({model:item.model,status:"passed",milliseconds:Date.now()-start,output:summary});console.log(JSON.stringify(results.at(-1)));await p.dispose();}catch(e){results.push({model:item.model,status:"failed",error:e.message});console.error(`${item.model}: ${e.message}`);}}
writeFileSync(extended?".sites-runtime/model-smoke-extended.json":".sites-runtime/model-smoke-results.json",JSON.stringify(results,null,2));if(results.some(r=>r.status!=="passed"))process.exitCode=1;
