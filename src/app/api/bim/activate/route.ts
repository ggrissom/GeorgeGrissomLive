import { NextRequest,NextResponse } from "next/server";
import { errorResponse,privateHeaders,requestBody,store } from "@/lib/bim/http";
import { StoreError } from "@/lib/bim/service";
export const runtime="nodejs";
export async function POST(req:NextRequest) {
  try {
    const b=await requestBody(req);
    if([b.key,b.machine,b.feature].some(v=>typeof v!=="string")) throw new StoreError("Key, machine, and tool are required.");
    return NextResponse.json(await store().activate(b.key,b.machine,b.feature),{headers:privateHeaders});
  }catch(error){return errorResponse(error);}
}
