"use client";
import {useEffect,useState} from "react";
import {useSearchParams} from "next/navigation";
import Link from "next/link";
import LicenseDownload from "../downloads/download-form";
type ReceiptData={status:string;key?:string;product?:string;error?:string};
export default function Receipt(){const id=useSearchParams().get("order");const [data,setData]=useState<ReceiptData>();const [attempt,setAttempt]=useState(0);
  useEffect(()=>{let cancelled=false;fetch(`/api/bim/receipt?order=${encodeURIComponent(id||"")}`,{cache:"no-store"}).then(r=>r.json()).then(d=>{if(!cancelled)setData(d);}).catch(()=>{if(!cancelled)setData({status:"error",error:"We could not load your receipt. Please retry."});});return()=>{cancelled=true;};},[id,attempt]);
  if(!data)return <p role="status">Checking payment with Stripe…</p>;
  if(data.status==="paid"&&data.key)return <><p className="bim-lead">{data.product} is ready. Save your activation key before closing this page.</p><label className="bim-key-label">Your private activation key</label><code className="bim-key">{data.key}</code><LicenseDownload initialKey={data.key}/><Link href="/bim/install">Continue to installation instructions ↗</Link></>;
  return <><p role="status">{data.error||(data.status==="revoked"?"This license is no longer active. Please contact support.":"Payment confirmation is still pending. Some payment methods take longer; access opens only after payment clears.")}</p><button className="bim-button" onClick={()=>setAttempt(a=>a+1)}>Check again</button><p><Link href="/bim/downloads">Already have a key? Open Downloads.</Link></p></>;
}
