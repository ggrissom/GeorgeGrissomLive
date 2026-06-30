"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Tab = "live" | "events" | "songs" | "import" | "search" | "record" | "uploads" | "bookings";

type EventRow = { id: string; title: string; venueName: string; city?: string; state?: string; startsAt: string; notes?: string; isPublic: boolean; };
type SongRow = {
  id: string;
  title: string;
  artist?: string;
  genre?: string;
  mood?: string;
  tempoLabel?: string;
  bpm?: number;
  songKey?: string;
  requestable: boolean;
  publicShortlist: boolean;
  paidCatalog: boolean;
  minTipCents: number;
  privateRehearsalNotes?: string;
  privateLyricsNotes?: string;
  privateChordNotes?: string;
  sourceLinks?: any;
  lyricSearchLinks?: Record<string, string>;
};
type RequestRow = { id: string; requesterName?: string; customSongTitle?: string; message?: string; tipAmountCents: number; paymentStatus: string; status: string; priorityScore: number; song?: SongRow; event?: EventRow; createdAt: string; };
type UploadRow = { id: string; uploaderName?: string; note?: string; storagePath: string; mimeType?: string; fileName?: string; status: string; createdAt: string; event?: EventRow };
type BookingRow = { id: string; name: string; email?: string; phone?: string; venue?: string; date?: string; message?: string; status: string; createdAt: string; };

export default function AdminApp() {
  const [tab, setTab] = useState<Tab>("live");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [toast, setToast] = useState("");

  async function refresh() {
    const [eventRows, songRows, requestRows, uploadRows, bookingRows] = await Promise.all([
      fetch("/api/events?admin=1").then(r => r.json()),
      fetch("/api/songs?admin=1").then(r => r.json()),
      fetch("/api/requests?admin=1").then(r => r.json()),
      fetch("/api/uploads?admin=1").then(r => r.json()),
      fetch("/api/bookings?admin=1").then(r => r.json())
    ]);
    setEvents(Array.isArray(eventRows) ? eventRows : []);
    setSongs(Array.isArray(songRows) ? songRows : []);
    setRequests(Array.isArray(requestRows) ? requestRows : []);
    setUploads(Array.isArray(uploadRows) ? uploadRows : []);
    setBookings(Array.isArray(bookingRows) ? bookingRows : []);
  }

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => window.clearInterval(interval);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/admin/login";
  }

  const tabs: [Tab, string][] = [
    ["live", "Live Queue"],
    ["events", "Calendar"],
    ["songs", "Songs"],
    ["import", "Import"],
    ["search", "Song Search"],
    ["record", "Record"],
    ["uploads", "Uploads"],
    ["bookings", "Booking"]
  ];

  return (
    <>
      <header className="site-header">
        <a className="brand" href="/">
          <span className="mic">🎙️</span>
          <span><strong>George Admin</strong><small>Private performer dashboard</small></span>
        </a>
        <nav><a href="/">Public site</a></nav>
        <button className="ghost" onClick={logout}>Log out</button>
      </header>
      <main className="admin-shell">
        {toast && <p className="toast">{toast}</p>}
        <div className="admin-grid">
          <aside className="admin-nav">
            {tabs.map(([key, label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}
          </aside>
          <section className="panel">
            {tab === "live" && <LiveQueue requests={requests} refresh={refresh} />}
            {tab === "events" && <Events events={events} refresh={refresh} setToast={setToast} />}
            {tab === "songs" && <Songs songs={songs} refresh={refresh} setToast={setToast} />}
            {tab === "import" && <ImportSongs refresh={refresh} setToast={setToast} />}
            {tab === "search" && <SongSearch refresh={refresh} setToast={setToast} />}
            {tab === "record" && <Recorder events={events} songs={songs} setToast={setToast} />}
            {tab === "uploads" && <Uploads uploads={uploads} refresh={refresh} />}
            {tab === "bookings" && <Bookings bookings={bookings} refresh={refresh} />}
          </section>
        </div>
      </main>
    </>
  );
}

function money(cents: number) {
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function LiveQueue({ requests, refresh }: { requests: RequestRow[]; refresh: () => Promise<void> }) {
  async function setStatus(id: string, status: string) {
    await fetch("/api/requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    await refresh();
  }

  const sorted = useMemo(() => [...requests].sort((a, b) => b.priorityScore - a.priorityScore), [requests]);

  return (
    <>
      <p className="eyebrow">Live show mode</p>
      <h2>Request queue</h2>
      <table className="table">
        <thead><tr><th>Priority</th><th>Song</th><th>Fan</th><th>Tip</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {sorted.map(req => (
            <tr key={req.id}>
              <td>{req.priorityScore}</td>
              <td><strong>{req.song?.title || req.customSongTitle || "Custom request"}</strong><br /><span className="muted">{req.message}</span></td>
              <td>{req.requesterName || "Anonymous"}</td>
              <td>{money(req.tipAmountCents)}<br /><span className="badge">{req.paymentStatus}</span></td>
              <td><span className="badge">{req.status}</span></td>
              <td className="actions">
                {["accepted", "played", "skipped"].map(status => <button className="ghost" key={status} onClick={() => setStatus(req.id, status)}>{status}</button>)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Events({ events, refresh, setToast }: { events: EventRow[]; refresh: () => Promise<void>; setToast: (s: string) => void }) {
  async function submit(formData: FormData) {
    const body = Object.fromEntries(formData.entries());
    const res = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, isPublic: formData.get("isPublic") === "on" }) });
    setToast(res.ok ? "Event saved." : "Event failed.");
    await refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/events?id=${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <>
      <p className="eyebrow">Manual calendar</p>
      <h2>Upcoming dates</h2>
      <form className="form" action={submit}>
        <input name="title" placeholder="Show title" defaultValue="Live Show" />
        <input name="venueName" placeholder="Venue name" required />
        <input name="city" placeholder="City" />
        <input name="state" placeholder="State" />
        <input name="startsAt" type="datetime-local" required />
        <textarea name="notes" placeholder="Public notes" />
        <label><input name="isPublic" type="checkbox" defaultChecked /> Public</label>
        <button className="button">Add event</button>
      </form>
      <table className="table">
        <tbody>{events.map(event => <tr key={event.id}><td>{new Date(event.startsAt).toLocaleString()}</td><td>{event.venueName}<br /><span className="muted">{[event.city, event.state].filter(Boolean).join(", ")}</span></td><td><button className="ghost" onClick={() => remove(event.id)}>Delete</button></td></tr>)}</tbody>
      </table>
    </>
  );
}

function Songs({ songs, refresh, setToast }: { songs: SongRow[]; refresh: () => Promise<void>; setToast: (s: string) => void }) {
  async function submit(formData: FormData) {
    const body = Object.fromEntries(formData.entries()) as any;
    body.requestable = formData.get("requestable") === "on";
    body.publicShortlist = formData.get("publicShortlist") === "on";
    body.paidCatalog = formData.get("paidCatalog") === "on";
    body.minTipCents = Math.round(Number(body.minTip || "0.25") * 100);
    delete body.minTip;
    const res = await fetch("/api/songs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setToast(res.ok ? "Song saved." : "Song failed.");
    await refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/songs?id=${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <>
      <p className="eyebrow">Private catalog</p>
      <h2>Songs</h2>
      <form className="form" action={submit}>
        <input name="title" placeholder="Song title" required />
        <input name="artist" placeholder="Artist" />
        <input name="genre" placeholder="Genre" />
        <input name="songKey" placeholder="Key" />
        <input name="bpm" type="number" placeholder="BPM" />
        <input name="audioUrl" placeholder="/audio/song.mp3 or external URL" />
        <textarea name="privateRehearsalNotes" placeholder="Private rehearsal notes" />
        <textarea name="privateLyricsNotes" placeholder="Private lyric notes; not public" />
        <textarea name="privateChordNotes" placeholder="Private chord notes; not public" />
        <label><input name="requestable" type="checkbox" defaultChecked /> Requestable</label>
        <label><input name="publicShortlist" type="checkbox" /> Show on public short list</label>
        <label><input name="paidCatalog" type="checkbox" defaultChecked /> Include in unlocked catalog</label>
        <input name="minTip" type="number" step="0.25" defaultValue="0.25" placeholder="Minimum request/tip" />
        <button className="button">Add song</button>
      </form>
      <table className="table">
        <thead><tr><th>Title</th><th>Private info</th><th>Visibility</th><th>Actions</th></tr></thead>
        <tbody>
          {songs.map(song => (
            <tr key={song.id}>
              <td><strong>{song.title}</strong><br />{song.artist || ""}<br /><span className="muted">{song.genre || ""} {song.songKey ? `· Key ${song.songKey}` : ""} {song.bpm ? `· ${song.bpm} BPM` : ""}</span></td>
              <td><span className="badge">{song.privateLyricsNotes ? "lyrics notes" : "no lyrics notes"}</span> <span className="badge">{song.privateChordNotes ? "chords notes" : "no chord notes"}</span></td>
              <td>{song.publicShortlist && <span className="badge">short list</span>} {song.paidCatalog && <span className="badge">catalog</span>}</td>
              <td><button className="ghost" onClick={() => remove(song.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ImportSongs({ refresh, setToast }: { refresh: () => Promise<void>; setToast: (s: string) => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    const res = await fetch("/api/import", { method: "POST", body: formData });
    const data = await res.json();
    setLoading(false);
    if (data.rows) setRows(data.rows);
    setToast(res.ok ? "Import staged for review." : data.error || "Import failed.");
  }

  async function approve(id: string) {
    const res = await fetch("/api/import/approve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rowId: id }) });
    setToast(res.ok ? "Imported song approved and saved." : "Approve failed.");
    setRows(rows.map(row => row.id === id ? { ...row, status: "approved" } : row));
    await refresh();
  }

  return (
    <>
      <p className="eyebrow">AI-compatible import</p>
      <h2>Import CSV, Excel, PDF, text, or scanned material</h2>
      <p className="muted">Text PDFs parse locally. Scanned PDFs are staged for OCR/manual review unless OpenAI enhancement is added and configured. All imported lyrics/chords are private notes by default.</p>
      <form className="form" action={submit}>
        <input name="file" type="file" accept=".csv,.xlsx,.xls,.pdf,text/*,image/*" required />
        <button className="button" disabled={loading}>{loading ? "Parsing..." : "Upload and normalize"}</button>
      </form>
      {!!rows.length && (
        <table className="table">
          <thead><tr><th>Raw</th><th>Proposed</th><th>Warnings</th><th></th></tr></thead>
          <tbody>{rows.map(row => {
            const proposed = row.proposed || {};
            return <tr key={row.id}><td>{row.rawText}</td><td><strong>{proposed.title}</strong><br />{proposed.artist}<br />{proposed.songKey} {proposed.bpm}</td><td>{(proposed.warnings || []).join("; ")}</td><td>{row.status === "approved" ? <span className="badge">approved</span> : <button className="ghost" onClick={() => approve(row.id)}>Approve</button>}</td></tr>;
          })}</tbody>
        </table>
      )}
    </>
  );
}

function SongSearch({ refresh, setToast }: { refresh: () => Promise<void>; setToast: (s: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [privateNotes, setPrivateNotes] = useState("");

  async function search() {
    const res = await fetch(`/api/search/music?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data.results || []);
  }

  async function save(result: any) {
    const res = await fetch("/api/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: result.title,
        artist: result.artist,
        sourceLinks: [{ label: "MusicBrainz", url: result.sourceUrl }, ...(Object.entries(result.searchLinks || {}).map(([label, url]) => ({ label, url })))],
        privateRehearsalNotes: privateNotes,
        rightsStatus: "private_reference",
        requestable: true,
        publicShortlist: false,
        paidCatalog: true,
        minTipCents: 25
      })
    });
    setToast(res.ok ? "Search result saved to private catalog." : "Save failed.");
    await refresh();
  }

  return (
    <>
      <p className="eyebrow">Search and learn</p>
      <h2>Find song info and save private notes</h2>
      <div className="form">
        <input value={q} onChange={event => setQ(event.target.value)} placeholder="Song title, artist, lyric phrase, key, BPM..." />
        <textarea value={privateNotes} onChange={event => setPrivateNotes(event.target.value)} placeholder="Paste/write private practice notes here. These are not public." />
        <button className="button" onClick={search}>Search metadata</button>
      </div>
      <table className="table">
        <tbody>{results.map(result => (
          <tr key={result.id}>
            <td><strong>{result.title}</strong><br />{result.artist}<br /><span className="muted">{result.firstReleaseDate || ""}</span></td>
            <td className="actions">
              <a className="ghost" href={result.sourceUrl} target="_blank">MusicBrainz</a>
              {Object.entries(result.searchLinks || {}).map(([label, url]) => <a className="ghost" key={label} href={url as string} target="_blank">{label}</a>)}
              <button className="ghost" onClick={() => save(result)}>Save private</button>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </>
  );
}

function Recorder({ events, songs, setToast }: { events: EventRow[]; songs: SongRow[]; setToast: (s: string) => void }) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [recording, setRecording] = useState(false);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [title, setTitle] = useState("");
  const [eventId, setEventId] = useState("");
  const [songId, setSongId] = useState("");
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop());
        return navigator.mediaDevices.enumerateDevices();
      })
      .then(list => setDevices(list.filter(device => device.kind === "audioinput")))
      .catch(() => setToast("Microphone/device permission is needed for one-button recording."));
  }, [setToast]);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true
    });
    const mediaRecorder = new MediaRecorder(stream);
    const localChunks: Blob[] = [];
    mediaRecorder.ondataavailable = event => {
      if (event.data.size) localChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
      setChunks(localChunks);
      setDuration(Math.round((Date.now() - startedAtRef.current) / 1000));
    };
    recorderRef.current = mediaRecorder;
    startedAtRef.current = Date.now();
    mediaRecorder.start(1000);
    setRecording(true);
    setToast("Recording started.");
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
    setToast("Recording stopped. Save it to attach it to this session.");
  }

  async function save() {
    const blob = new Blob(chunks, { type: "audio/webm" });
    const form = new FormData();
    form.append("file", new File([blob], `${title || "recording"}.webm`, { type: "audio/webm" }));
    form.append("title", title || "Untitled recording");
    form.append("eventId", eventId);
    form.append("songId", songId);
    form.append("durationSeconds", String(duration));
    const label = devices.find(device => device.deviceId === deviceId)?.label || "Default input";
    form.append("inputDeviceLabel", label);
    const res = await fetch("/api/recordings", { method: "POST", body: form });
    setToast(res.ok ? "Recording saved privately." : "Recording save failed.");
    if (res.ok) setChunks([]);
  }

  return (
    <>
      <p className="eyebrow">One-button recording</p>
      <h2>Record mic, mixer, or interface input</h2>
      <div className="form">
        <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Recording title" />
        <select value={deviceId} onChange={event => setDeviceId(event.target.value)}>
          <option value="">Default audio input</option>
          {devices.map(device => <option key={device.deviceId} value={device.deviceId}>{device.label || `Audio input ${device.deviceId.slice(0, 6)}`}</option>)}
        </select>
        <select value={eventId} onChange={event => setEventId(event.target.value)}>
          <option value="">Attach to event, optional</option>
          {events.map(event => <option key={event.id} value={event.id}>{new Date(event.startsAt).toLocaleDateString()} · {event.venueName}</option>)}
        </select>
        <select value={songId} onChange={event => setSongId(event.target.value)}>
          <option value="">Attach to song, optional</option>
          {songs.map(song => <option key={song.id} value={song.id}>{song.title}</option>)}
        </select>
        <div className="actions">
          {!recording ? <button className="button" onClick={start}>● Record</button> : <button className="button secondary" onClick={stop}>■ Stop</button>}
          {!!chunks.length && <button className="button" onClick={save}>Save recording</button>}
        </div>
        <p className="muted">For an external mixer/audio interface, connect it to the computer/tablet first, then pick it from the input list.</p>
      </div>
    </>
  );
}

function Uploads({ uploads, refresh }: { uploads: UploadRow[]; refresh: () => Promise<void> }) {
  async function setStatus(id: string, status: string) {
    await fetch("/api/uploads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    await refresh();
  }

  return (
    <>
      <p className="eyebrow">Moderation</p>
      <h2>Fan photos/videos</h2>
      <table className="table">
        <tbody>{uploads.map(upload => <tr key={upload.id}><td><a href={upload.storagePath} target="_blank">{upload.fileName || upload.storagePath}</a><br />{upload.uploaderName || "Anonymous"} · {upload.note}</td><td><span className="badge">{upload.status}</span></td><td className="actions"><button className="ghost" onClick={() => setStatus(upload.id, "approved")}>Approve</button><button className="ghost" onClick={() => setStatus(upload.id, "rejected")}>Reject</button></td></tr>)}</tbody>
      </table>
    </>
  );
}

function Bookings({ bookings, refresh }: { bookings: BookingRow[]; refresh: () => Promise<void> }) {
  async function setStatus(id: string, status: string) {
    await fetch("/api/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    await refresh();
  }

  return (
    <>
      <p className="eyebrow">Booking</p>
      <h2>Inquiries</h2>
      <table className="table">
        <tbody>{bookings.map(booking => <tr key={booking.id}><td><strong>{booking.name}</strong><br />{booking.email} {booking.phone}<br /><span className="muted">{booking.date} · {booking.venue}</span><p>{booking.message}</p></td><td><span className="badge">{booking.status}</span></td><td><button className="ghost" onClick={() => setStatus(booking.id, "handled")}>Mark handled</button></td></tr>)}</tbody>
      </table>
    </>
  );
}
