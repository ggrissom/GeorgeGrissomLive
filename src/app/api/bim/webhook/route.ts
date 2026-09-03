import { NextRequest,NextResponse } from "next/server";
import Stripe from "stripe";
import { errorResponse,privateHeaders,store } from "@/lib/bim/http";
import { liveMode,StoreError,stripeClient } from "@/lib/bim/service";
export const runtime="nodejs";
export async function POST(req:NextRequest) {
  let event:Stripe.Event;
  try {
    const signingSecret=process.env.BIM_STRIPE_WEBHOOK_SECRET;
    if(!signingSecret) throw new Error("Webhook not configured");
    event=stripeClient().webhooks.constructEvent(await req.text(),req.headers.get("stripe-signature")||"",signingSecret);
  }catch{return NextResponse.json({error:"Invalid webhook signature or configuration."},{status:400,headers:privateHeaders});}
  try {
    if(event.livemode!==liveMode()) throw new StoreError("Payment mode mismatch.");
    const service=store();
    if(["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type))
      await service.fulfill((event.data.object as Stripe.Checkout.Session).id);
    if(event.type==="charge.refunded" || event.type==="charge.dispute.created") {
      const charge=event.type==="charge.refunded" ? event.data.object as Stripe.Charge :
        await stripeClient().charges.retrieve(String((event.data.object as Stripe.Dispute).charge));
      const intent=typeof charge.payment_intent==="string"?charge.payment_intent:charge.payment_intent?.id;
      if(intent) await service.revoke(intent,event.type);
    }
    return NextResponse.json({received:true},{headers:privateHeaders});
  }catch(error){return errorResponse(error);}
}
