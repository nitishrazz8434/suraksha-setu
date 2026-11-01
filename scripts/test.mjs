import {build} from "esbuild";
import {spawnSync} from "node:child_process";
import {mkdirSync} from "node:fs";
mkdirSync(".sites-runtime",{recursive:true});
await build({entryPoints:["tests/engine.test.ts","tests/assessment.test.ts"],bundle:true,external:["glpk.js/node"],platform:"node",format:"esm",outdir:".sites-runtime/tests",logLevel:"warning"});
const result=spawnSync(process.execPath,["--test",".sites-runtime/tests/engine.test.js",".sites-runtime/tests/assessment.test.js"],{stdio:"inherit"});process.exit(result.status??1);
