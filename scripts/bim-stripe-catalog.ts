import {writeFile,mkdir} from "node:fs/promises";
import {products} from "../src/lib/bim/catalog";
import {stripeClient,liveMode} from "../src/lib/bim/service";
async function main(){
 if(liveMode())throw new Error("This bootstrap script only configures sandbox products");
 const stripe=stripeClient();const account=await stripe.accounts.retrieve();
 if(account.id!==process.env.BIM_STRIPE_ACCOUNT_ID)throw new Error("Verify the expected Stripe account before setup");
 const map:Record<string,string>={};const ids:Record<string,{product:string;price:string}>={};
 for(const p of products.filter(p=>p.status==="candidate")){
  const lookup=`bygeorge_${p.id}_${p.price}_usd_v1`;
  let price=(await stripe.prices.list({lookup_keys:[lookup],limit:1})).data[0];
  if(!price){
   const product=await stripe.products.create({name:p.name,description:p.description,metadata:{bim_product:p.id,bim_release:"launch-v1"}},{idempotencyKey:`bim-product-${p.id}-v1`});
   price=await stripe.prices.create({product:product.id,currency:"usd",unit_amount:p.price,lookup_key:lookup,metadata:{bim_product:p.id}},{idempotencyKey:lookup});
  }
  if(price.livemode||price.unit_amount!==p.price||price.metadata.bim_product!==p.id)throw new Error("Existing price mismatch");
  map[p.id]=price.id;ids[p.id]={product:String(price.product),price:price.id};
 }
 await mkdir(".bim-private",{recursive:true});await writeFile(".bim-private/stripe-test-catalog.json",JSON.stringify({account:account.id,mode:"test",ids,priceMap:map},null,2));
 console.log(JSON.stringify({mode:"test",account:account.id,ids},null,2));
}
main().then(()=>process.exit(0)).catch(()=>{console.error("Sandbox catalog setup stopped. Verify sandbox credentials, account ID, and price metadata. No live data was modified.");process.exit(1);});
