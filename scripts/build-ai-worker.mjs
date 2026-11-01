import {build} from "esbuild";
import {mkdirSync} from "node:fs";
mkdirSync("public/ai",{recursive:true});
// Keep inference in a real worker environment. Framework transforms for window
// detection must never rewrite Transformers.js's worker/browser capability checks.
await build({entryPoints:["lib/ai.worker.ts"],bundle:true,platform:"browser",format:"esm",target:"es2022",minify:true,legalComments:"eof",outfile:"public/ai/inference-worker.js",logLevel:"warning"});
console.log("Packaged standalone browser inference worker");
