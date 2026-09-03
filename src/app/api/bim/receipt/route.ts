import { NextRequest,NextResponse } from "next/server";
import { errorResponse,privateHeaders,store } from "@/lib/bim/http";
export const runtime="nodejs";
export async function GET(req:NextRequest) {
  try {
    const id=req.nextUrl.searchParams.get("order")||"";
    return NextResponse.json(await store().receipt(id,req.cookies.get(`bim_receipt_${id}`)?.value||""),{headers:privateHeaders});
  }catch(error){return errorResponse(error);}
}
