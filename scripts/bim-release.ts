import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve,sep} from "node:path";
import {database} from "../src/lib/bim/db";
async function main(){
 const file=resolve(process.argv[2]||"");if(!file.startsWith(resolve(".bim-private")+sep)||!file.endsWith(".zip"))throw new Error("Use a private release ZIP");
 const manifest=JSON.parse(await readFile(file.replace(/\.zip$/,".json"),"utf8"));const archive=await readFile(file);
 if(archive.length>4000000||createHash("sha256").update(archive).digest("hex")!==manifest.sha256)throw new Error("Archive verification failed");
 if(manifest.mode!==(process.env.BIM_PAYMENT_MODE||"test"))throw new Error("Release/payment mode mismatch");
 await database().query("INSERT INTO bim_releases(version,archive,sha256,features,runtime_verified) VALUES($1,$2,$3,$4,false)",[manifest.version,archive,manifest.sha256,manifest.features]);
 console.log(`Private release ${manifest.version} uploaded. Runtime verification remains false.`);
}
main().then(()=>process.exit(0)).catch(()=>{console.error("Release upload failed. Check the archive, unique version, mode, and database access. Existing versions are never overwritten.");process.exit(1);});
