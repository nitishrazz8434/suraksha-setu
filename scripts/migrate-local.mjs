import {existsSync,readFileSync,readdirSync,writeFileSync,mkdirSync} from "node:fs";
import {spawnSync} from "node:child_process";
const config="dist/server/wrangler.json";
if(!existsSync(config))throw new Error("Run npm run build before applying local migrations.");
mkdirSync(".sites-runtime",{recursive:true});const ledger=".sites-runtime/applied-migrations.json";
const done=existsSync(ledger)?JSON.parse(readFileSync(ledger,"utf8")):[];
for(const file of readdirSync("drizzle").filter(f=>f.endsWith(".sql")).sort()){
 if(done.includes(file))continue;
 const result=spawnSync(process.execPath,["--import","./scripts/sites-env.mjs","./node_modules/wrangler/bin/wrangler.js","d1","execute","DB","--local","--config",config,"--persist-to",".wrangler/state","--file",`drizzle/${file}`],{stdio:"inherit"});
 if(result.status!==0)process.exit(result.status??1);done.push(file);writeFileSync(ledger,JSON.stringify(done));
}
console.log("Local database migrations are up to date.");
