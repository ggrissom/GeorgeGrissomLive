import {notFound} from "next/navigation";
import Link from "next/link";
import {dollars,productById,tools} from "@/lib/bim/catalog";
import CheckoutButton from "../../checkout-button";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const p=productById((await params).slug);return {title:p?`${p.name} | ByGeorge BIM`:"Tool not found"};}
export default async function ProductPage({params}:{params:Promise<{slug:string}>}) {
  const product=productById((await params).slug);if(!product)notFound();
  const test=process.env.BIM_PAYMENT_MODE!=="live";
  const available=product.status==="candidate"&&Boolean(process.env.BIM_STRIPE_SECRET_KEY&&process.env.BIM_RELEASE_VERSION&&process.env.BIM_STRIPE_PRICE_MAP&&(test||process.env.BIM_LIVE_APPROVED==="true"));
  return <main className="bim-document"><Link href="/bim#collection" className="bim-text-link">← All tools</Link><p className="bim-eyebrow">{product.category}</p><h1>{product.name}</h1><p className="bim-lead">{product.description}</p><div className="bim-detail-grid"><section><h2>Built for your workflow</h2><p>{product.requirements}</p><p><strong>Compatibility status:</strong> source inspection complete; in-Revit runtime verification is pending. No supported-version claim is made until that verification passes.</p><h2>Your license includes</h2><ul><li>One named user, up to two computers</li><li>One shared installer download; your key unlocks purchased tools</li><li>Perpetual use of the purchased version; online validation when a tool starts</li><li>Installation and activation support through the support contact below</li></ul>{product.features.length>1&&<><h2>Included tools</h2><ul>{product.features.map(id=><li key={id}>{tools.find(t=>t.id===id)?.name}</li>)}</ul></>}<Link href="/bim/install">Read installation requirements ↗</Link></section><aside className="bim-purchase-box"><span>ONE-TIME LAUNCH PRICE</span><strong>{dollars(product.price)}<small> USD</small></strong><p>{product.status==="deferred"?"This tool is deferred and cannot be purchased.":"Download once. Activate your purchased tools."}</p><CheckoutButton product={product.id} price={dollars(product.price)} available={available} test={test}/></aside></div></main>;
}
