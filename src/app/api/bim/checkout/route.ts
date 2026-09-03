import { NextRequest,NextResponse } from "next/server";
import { errorResponse,privateHeaders,requestBody,store } from "@/lib/bim/http";
import { StoreError } from "@/lib/bim/service";
export const runtime="nodejs";
export async function POST(req: NextRequest) {
  try {
    const body=await requestBody(req,true);
    if(typeof body.product!=="string" || body.acceptedTerms!==true) throw new StoreError("Please accept the license terms before checkout.");
    const result=await store().checkout(body.product);
    const response=NextResponse.json({url:result.url},{headers:privateHeaders});
    response.cookies.set(`bim_receipt_${result.id}`,result.receipt,{httpOnly:true,secure:req.nextUrl.protocol==="https:",sameSite:"lax",path:"/",maxAge:60*60*24*30});
    return response;
  } catch(error) {return errorResponse(error);}
}
