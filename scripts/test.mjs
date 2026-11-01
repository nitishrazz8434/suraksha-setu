import {build} from "esbuild";
import {spawnSync} from "node:child_process";
import {mkdirSync} from "node:fs";
mkdirSync(".sites-runtime",{recursive:true});
await build({entryPoints:["tests/engine.test.ts"],bundle:true,platform:"node",format:"esm",outfile:".sites-runtime/engine.test.mjs",logLevel:"warning"});
const result=spawnSync(process.execPath,["--test",".sites-runtime/engine.test.mjs"],{stdio:"inherit"});process.exit(result.status??1);
