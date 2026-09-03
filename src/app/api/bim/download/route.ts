import { NextRequest } from "next/server";
import { errorResponse,privateHeaders,requestBody,store } from "@/lib/bim/http";
import { StoreError } from "@/lib/bim/service";
export const runtime="nodejs";
export async function POST(req:NextRequest) {
  try {
    const b=await requestBody(req,true);
    if(typeof b.key!=="string" || b.key.length>100) throw new StoreError("Enter your activation key.");
    const file=await store().download(b.key);
    return new Response(new Uint8Array(file.archive),{headers:{...privateHeaders,"Content-Type":"application/zip",
      "Content-Disposition":`attachment; filename="ByGeorge-${file.version.replace(/[^a-zA-Z0-9.-]/g,"")}.zip"`,"X-Archive-SHA256":file.sha256}});
  }catch(error){return errorResponse(error);}
}
