import {Suspense} from "react";
import Receipt from "./receipt";
export const metadata={title:"Purchase receipt | ByGeorge BIM",robots:{index:false,follow:false},referrer:"no-referrer" as const};
export default function ReceiptPage(){return <main className="bim-document bim-narrow"><p className="bim-eyebrow">YOUR BYGEORGE TOOLBOX</p><h1>Your next step,<br/>right here.</h1><Suspense fallback={<p>Loading your receipt…</p>}><Receipt/></Suspense></main>;}
