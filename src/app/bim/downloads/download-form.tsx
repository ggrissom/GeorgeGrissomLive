"use client";
import {useState} from "react";
export default function LicenseDownload({initialKey=""}:{initialKey?:string}) {
  const [key,setKey]=useState(initialKey);const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
  async function download(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");try{const r=await fetch("/api/bim/download",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key})});if(!r.ok){const d=await r.json();throw new Error(d.error);}const url=URL.createObjectURL(await r.blob());const a=document.createElement("a");a.href=url;a.download="ByGeorge-Launch.zip";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage("Your download has started. Extract the ZIP and follow INSTALL.txt.");}catch(e){setMessage(e instanceof Error?e.message:"Download unavailable.");}finally{setBusy(false);}}
  return <form onSubmit={download} className="bim-download-form"><label htmlFor="license-key">Activation key</label><input id="license-key" value={key} onChange={e=>setKey(e.target.value)} placeholder="BG-…" autoComplete="off" spellCheck={false} maxLength={100} required/><button className="bim-button" disabled={busy}>{busy?"Preparing download…":"Download my tools ↓"}</button><p role="status">{message}</p></form>;
}
