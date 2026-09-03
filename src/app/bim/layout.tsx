import type { Metadata } from "next";
import Link from "next/link";
import "./store.css";
import "./isolation.css";
export const metadata: Metadata={title:"ByGeorge BIM — Revit tools that earn their place",description:"Focused pyRevit utilities for Revit data, families, views, and sheets. One download, individual tool licenses, and a complete launch suite."};
export default function BimLayout({children}:{children:React.ReactNode}) {
  return <div className="bim-store"><header className="bim-nav"><Link className="bim-brand" href="/bim"><span className="bim-mark">B<span>G</span></span><span>ByGeorge<span className="bim-brand-sub">BIM TOOLS</span></span></Link><nav aria-label="Store"><Link href="/bim#collection">The tools</Link><Link href="/bim/install">Install guide</Link><Link href="/bim/downloads" className="bim-nav-download">My download <span>↗</span></Link></nav></header>{children}<footer className="bim-footer"><div><strong>ByGeorge BIM</strong><p>Made for the work between the big ideas.</p></div><div><Link href="/bim/install">Installation</Link><Link href="/bim/terms">License, refunds & support</Link><Link href="/bim/downloads">Downloads</Link></div><small>Independent tools for Autodesk Revit. Autodesk, Revit, and pyRevit are the property of their respective owners. ByGeorge Consulting LLC.</small></footer></div>;
}
