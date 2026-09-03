"use client";
import {useState} from "react";
import Link from "next/link";
import {dollars,tools} from "@/lib/bim/catalog";
export default function Catalog({available,mode}:{available:boolean;mode:string}) {
  const [category,setCategory]=useState("All tools");
  const categories=["All tools",...Array.from(new Set(tools.map(t=>t.category)))];
  return <><div className="bim-filters" aria-label="Filter tools">{categories.map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="bim-cards">{tools.filter(t=>category==="All tools"||t.category===category).map((t)=><article className="bim-card" key={t.id}><div className="bim-card-top"><span className="bim-tool-icon" aria-hidden="true">{t.id==="datalink"?"⇄":t.id.includes("view")?"▱":t.id==="cennerit"?"⊕":"⌑"}</span><span>{t.status==="deferred"?"DEFERRED":t.category.toUpperCase()}</span></div><h3>{t.name}</h3><p>{t.description}</p><div className="bim-card-bottom"><strong>{dollars(t.price)} <small>USD</small></strong><Link href={`/bim/products/${t.id}`}>{t.status==="deferred"?"See status": "Explore tool"} ↗</Link></div></article>)}</div>{(!available||mode==="test")&&<p className="bim-note">Launch preview: prices are proposed launch prices. Test payments only when checkout is configured. Live sales remain closed until payment and Revit compatibility checks pass.</p>}</>;
}
