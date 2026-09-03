import {readFile} from "node:fs/promises";
import {database} from "../src/lib/bim/db";
async function main(){await database().query(await readFile("db/bim.sql","utf8"));console.log("BIM tables and activation function are ready. Existing application tables were not changed.");}
main().then(()=>process.exit(0)).catch(()=>{console.error("Database setup failed. Check database access and the migration locally; no connection details are logged.");process.exit(1);});
