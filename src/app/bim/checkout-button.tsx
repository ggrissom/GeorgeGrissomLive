"use client";
import {useState} from "react";
import Link from "next/link";
export default function CheckoutButton({product,price,available,test}:{product:string;price:string;available:boolean;test:boolean}) {
  const [accepted,setAccepted]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  async function checkout(){setBusy(true);setError("");try{const response=await fetch("/api/bim/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({product,acceptedTerms:accepted})});const data=await response.json();if(!response.ok)throw new Error(data.error);window.location.assign(data.url);}catch(e){setError(e instanceof Error?e.message:"Checkout unavailable.");setBusy(false);}}
  return <div className="bim-checkout"><label className="bim-checkbox"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>I have checked the compatibility notes and accept the <Link href="/bim/terms">license and refund terms</Link>.</span></label><button className="bim-button" disabled={!available||!accepted||busy} onClick={checkout}>{busy?"Opening checkout…":!available?"Sales opening after verification":`${test?"Test checkout":"Buy license"} · ${price}`} <span>↗</span></button><p className="bim-form-status" role="status">{error||(test&&available?"Stripe sandbox. No real money is charged.":"")}</p></div>;
}
