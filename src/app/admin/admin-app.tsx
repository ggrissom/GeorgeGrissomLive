"use client";

import type { PutBlobResult } from "@vercel/blob";
import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { validateAudioUpload } from "@/app/api/admin/songs/audio/metadata";
import { createAudioUploadPath } from "@/app/api/admin/songs/audio/upload-policy";
import { actionableAudioCleanupMessage } from "./audio-cleanup-message";

type Tab = "live" | "events" | "setlists" | "songs" | "import" | "search" | "record" | "uploads" | "bookings";

type EventRow = {
  id: string;
  title: string;
  venueName: string;
  city?: string | null;
  state?: string | null;
  startsAt: string;
  endsAt?: string | null;
  notes?: string | null;
  isPublic: boolean;
  googleCalendarId?: string | null;
  googleEventId?: string | null;
  googleSyncStatus?: string | null;
  googleLastSyncedAt?: string | null;
  googleSyncError?: string | null;
};

type SetlistSongRow = {
  id: string;
  setlistId: string;
  songId: string;
  position: number;
  notes?: string | null;
  song: SongRow;
};

type SetlistRow = {
  id: string;
  name: string;
  venueName: string;
  eventId?: string | null;
  notes?: string | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  event?: EventRow | null;
  songs: SetlistSongRow[];
};

type SongRow = {
  id: string;
  title: string;
  artist?: string | null;
  album?: string | null;
  audioUrl?: string | null;
  durationSeconds?: number | null;
  jukeboxOrder: number;
  isPublic: boolean;
  genre?: string | null;
  mood?: string | null;
  tempoLabel?: string | null;
  bpm?: number | null;
  songKey?: string | null;
  requestable: boolean;
  publicShortlist: boolean;
  paidCatalog: boolean;
  minTipCents: number;
  freePlayLimit?: number;
  privateRehearsalNotes?: string | null;
  privateLyricsNotes?: string | null;
  privateChordNotes?: string | null;
  sourceLinks?: any;
  lyricSearchLinks?: Record<string, string>;
  setlists?: { id: string; setlistId: string; songId: string; setlist: SetlistRow }[];
};
type RequestRow = { id: string; requesterName?: string; customSongTitle?: string; message?: string; tipAmountCents: number; paymentStatus: string; status: string; priorityScore: number; song?: SongRow; event?: EventRow; createdAt: string; };
type UploadRow = { id: string; uploaderName?: string; note?: string; storagePath: string; mimeType?: string; fileName?: string; status: string; createdAt: string; event?: EventRow };
type BookingRow = { id: string; name: string; email?: string; phone?: string; venue?: string; date?: string; message?: string; status: string; createdAt: string; };

async function finalizeSongAudio(songId: string, blob: PutBlobResult) {
  let res: Response;
  try {
    res = await fetch("/api/admin/songs/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "jukebox.finalize",
        songId,
        blob: { url: blob.url, pathname: blob.pathname }
      })
    });
  } catch {
    throw new Error(`Audio uploaded but could not be attached. Retry with uploaded URL: ${blob.url}`);
  }
  const data = await res.json().catch(() => ({}));
  const cleanupMessage = actionableAudioCleanupMessage(data);
  if (!res.ok) {
    throw new Error(cleanupMessage ? `${data.error || "Audio finalization failed."} ${cleanupMessage}` : data.error || "Audio finalization failed.");
  }
  return { ...data, cleanupMessage };
}

async function uploadSongAudio(songId: string, file: File) {
  validateAudioUpload(file);
  const pathname = createAudioUploadPath(songId, file.name);
  const blob = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/admin/songs/audio",
    clientPayload: JSON.stringify({ songId }),
    contentType: file.type,
    multipart: true
  });
  return finalizeSongAudio(songId, blob);
}

export default function AdminApp() {
  const [tab, setTab] = useState<Tab>("live");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [setlists, setSetlists] = useState<SetlistRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [toast, setToast] = useState("");

  async function refresh() {
    const [eventRows, songRows, setlistRows, requestRows, uploadRows, bookingRows] = await Promise.all([
      fetch("/api/events?admin=1").then(r => r.json()),
      fetch("/api/songs?admin=1").then(r => r.json()),
      fetch("/api/setlists?admin=1").then(r => r.json()),
      fetch("/api/requests?admin=1").then(r => r.json()),
      fetch("/api/uploads?admin=1").then(r => r.json()),
      fetch("/api/bookings?admin=1").then(r => r.json())
    ]);
    setEvents(Array.isArray(eventRows) ? eventRows : []);
    setSongs(Array.isArray(songRows) ? songRows : []);
    setSetlists(Array.isArray(setlistRows) ? setlistRows : []);
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
    ["setlists", "Setlists"],
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
            {tab === "setlists" && <Setlists setlists={setlists} events={events} songs={songs} refresh={refresh} setToast={setToast} />}
            {tab === "songs" && <Songs songs={songs} setlists={setlists} refresh={refresh} setToast={setToast} />}
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
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, isPublic: formData.get("isPublic") === "on" })
    });
    const data = await res.json().catch(() => ({}));
    setToast(res.ok ? `Event saved. Calendar sync: ${data.googleSyncStatus || "local_only"}.` : data.error || "Event failed.");
    await refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/events?id=${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <>
      <p className="eyebrow">Performance calendar</p>
      <h2>Upcoming dates</h2>
      <p className="muted">Adding a show here saves it locally and syncs it into the Google Performance Calendar when the service account env vars are configured.</p>
      <form className="form" action={submit}>
        <input name="title" placeholder="Show title" defaultValue="Live Show" />
        <input name="venueName" placeholder="Venue name" required />
        <input name="city" placeholder="City" />
        <input name="state" placeholder="State" />
        <input name="startsAt" type="datetime-local" required />
        <input name="endsAt" type="datetime-local" />
        <textarea name="notes" placeholder="Public notes" />
        <label><input name="isPublic" type="checkbox" defaultChecked /> Public</label>
        <button className="button">Add event + sync calendar</button>
      </form>
      <table className="table">
        <thead><tr><th>Date</th><th>Venue</th><th>Google Sync</th><th>Actions</th></tr></thead>
        <tbody>{events.map(event => <tr key={event.id}>
          <td>{new Date(event.startsAt).toLocaleString()}</td>
          <td>{event.venueName}<br /><span className="muted">{[event.city, event.state].filter(Boolean).join(", ")}</span></td>
          <td>
            <span className="badge">{event.googleSyncStatus || "local_only"}</span>
            {event.googleEventId && <><br /><span className="muted">Google ID: {event.googleEventId}</span></>}
            {event.googleSyncError && <><br /><span className="muted">{event.googleSyncError}</span></>}
          </td>
          <td><button className="ghost" onClick={() => remove(event.id)}>Delete</button></td>
        </tr>)}</tbody>
      </table>
    </>
  );
}

function Setlists({
  setlists,
  events,
  songs,
  refresh,
  setToast
}: {
  setlists: SetlistRow[];
  events: EventRow[];
  songs: SongRow[];
  refresh: () => Promise<void>;
  setToast: (s: string) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!selectedId && setlists[0]) setSelectedId(setlists[0].id);
    if (selectedId && !setlists.some(setlist => setlist.id === selectedId)) setSelectedId(setlists[0]?.id || "");
  }, [setlists, selectedId]);

  const selected = setlists.find(setlist => setlist.id === selectedId) || null;
  const selectedSongIds = useMemo(() => new Set((selected?.songs || []).map(item => item.songId)), [selected]);

  const filteredSongs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return songs.slice(0, 40);
    return songs.filter(song =>
      [song.title, song.artist, song.genre, song.mood, song.songKey, song.bpm ? `${song.bpm}` : ""]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    ).slice(0, 80);
  }, [songs, query]);

  async function create(formData: FormData) {
    const body = Object.fromEntries(formData.entries());
    const res = await fetch("/api/setlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, eventId: formData.get("eventId") || null, isPrivate: true })
    });
    const data = await res.json().catch(() => ({}));
    setToast(res.ok ? "Setlist created." : data.error || "Setlist failed.");
    if (data.id) setSelectedId(data.id);
    await refresh();
  }

  async function duplicate(formData: FormData) {
    const body = Object.fromEntries(formData.entries());
    const res = await fetch("/api/setlists/duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, eventId: formData.get("eventId") || null })
    });
    const data = await res.json().catch(() => ({}));
    setToast(res.ok ? "Setlist duplicated." : data.error || "Duplicate failed.");
    if (data.id) setSelectedId(data.id);
    await refresh();
  }

  async function removeSetlist(id: string) {
    await fetch(`/api/setlists?id=${id}`, { method: "DELETE" });
    setSelectedId("");
    await refresh();
  }

  async function toggleSong(songId: string, checked: boolean) {
    if (!selected) return;
    if (checked) {
      await fetch("/api/setlists/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setlistId: selected.id, songId })
      });
    } else {
      await fetch(`/api/setlists/songs?setlistId=${selected.id}&songId=${songId}`, { method: "DELETE" });
    }
    await refresh();
  }

  async function reorder(songId: string, direction: -1 | 1) {
    if (!selected) return;
    const ordered = selected.songs.map(item => item.songId);
    const index = ordered.indexOf(songId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    await fetch("/api/setlists/songs/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setlistId: selected.id, songIds: next })
    });
    await refresh();
  }

  return (
    <>
      <p className="eyebrow">Private setlists</p>
      <h2>Setlists</h2>
      <p className="muted">Setlists stay admin-only for this MVP. Create one from scratch, duplicate an old one, link it to a calendar show, then check songs on/off from the searchable builder.</p>

      <div className="admin-two-col">
        <form className="form" action={create}>
          <h3>Create setlist</h3>
          <input name="name" placeholder="Setlist name" required />
          <input name="venueName" placeholder="Venue" required />
          <select name="eventId" defaultValue="">
            <option value="">Associate with show, optional</option>
            {events.map(event => <option key={event.id} value={event.id}>{new Date(event.startsAt).toLocaleDateString()} · {event.venueName}</option>)}
          </select>
          <textarea name="notes" placeholder="Private setlist notes" />
          <button className="button">Create setlist</button>
        </form>

        <form className="form" action={duplicate}>
          <h3>Duplicate older setlist</h3>
          <select name="sourceSetlistId" defaultValue="">
            <option value="">Choose old setlist</option>
            {setlists.map(setlist => <option key={setlist.id} value={setlist.id}>{setlist.name} · {setlist.venueName}</option>)}
          </select>
          <input name="name" placeholder="New setlist name, optional" />
          <input name="venueName" placeholder="New venue, optional" />
          <select name="eventId" defaultValue="">
            <option value="">Associate with show, optional</option>
            {events.map(event => <option key={event.id} value={event.id}>{new Date(event.startsAt).toLocaleDateString()} · {event.venueName}</option>)}
          </select>
          <button className="button">Duplicate</button>
        </form>
      </div>

      <div className="setlist-builder">
        <div className="form">
          <label>
            <span className="muted">Active setlist</span>
            <select value={selectedId} onChange={event => setSelectedId(event.target.value)}>
              <option value="">Select a setlist</option>
              {setlists.map(setlist => <option key={setlist.id} value={setlist.id}>{setlist.name} · {setlist.venueName}</option>)}
            </select>
          </label>
        </div>

        {selected && (
          <>
            <div className="setlist-header">
              <div>
                <h3>{selected.name}</h3>
                <p className="muted">
                  {selected.venueName} · Created {new Date(selected.createdAt).toLocaleDateString()}
                  {selected.event && <> · Linked to {new Date(selected.event.startsAt).toLocaleDateString()}</>}
                </p>
                {selected.notes && <p>{selected.notes}</p>}
              </div>
              <button className="ghost" onClick={() => removeSetlist(selected.id)}>Delete setlist</button>
            </div>

            <div className="admin-two-col wide">
              <div>
                <h3>Current order</h3>
                <table className="table">
                  <tbody>
                    {selected.songs.length === 0 && <tr><td>No songs yet. Search and check boxes on the right.</td></tr>}
                    {selected.songs.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td><strong>{item.song.title}</strong><br /><span className="muted">{item.song.artist || ""}</span></td>
                        <td className="actions">
                          <button className="ghost" onClick={() => reorder(item.songId, -1)}>Up</button>
                          <button className="ghost" onClick={() => reorder(item.songId, 1)}>Down</button>
                          <button className="ghost" onClick={() => toggleSong(item.songId, false)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3>Search songs and check to add</h3>
                <div className="form">
                  <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search title, artist, genre, key, BPM..." />
                </div>
                <div className="check-list">
                  {filteredSongs.map(song => (
                    <label className="check-row" key={song.id}>
                      <input
                        type="checkbox"
                        checked={selectedSongIds.has(song.id)}
                        onChange={event => toggleSong(song.id, event.target.checked)}
                      />
                      <span>
                        <strong>{song.title}</strong>
                        <small>{song.artist || "George Grissom"} {song.songKey ? `· Key ${song.songKey}` : ""} {song.bpm ? `· ${song.bpm} BPM` : ""}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Songs({ songs, setlists, refresh, setToast }: { songs: SongRow[]; setlists: SetlistRow[]; refresh: () => Promise<void>; setToast: (s: string) => void }) {
  async function submit(formData: FormData) {
    const body = Object.fromEntries(formData.entries()) as any;
    const audioFile = body.audio instanceof File && body.audio.size ? body.audio : null;
    delete body.audio;
    body.requestable = formData.get("requestable") === "on";
    body.publicShortlist = formData.get("publicShortlist") === "on";
    body.paidCatalog = formData.get("paidCatalog") === "on";
    body.isPublic = formData.get("isPublic") === "on";
    body.minTipCents = Math.round(Number(body.minTip || "0.25") * 100);
    delete body.minTip;
    const res = await fetch("/api/songs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setToast(data.error || "Song failed.");
      return;
    }
    if (audioFile) {
      try {
        const audio = await uploadSongAudio(data.id, audioFile);
        setToast(audio.cleanupMessage || "Song and audio saved.");
      } catch (error) {
        setToast(error instanceof Error ? `Song saved. ${error.message}` : "Song saved, but audio upload failed.");
      }
    } else {
      setToast("Song saved.");
    }
    await refresh();
  }

  async function remove(id: string, deleteAudio: boolean) {
    const message = deleteAudio
      ? "Delete this song record and its app-owned audio file? External or legacy audio files will be left untouched."
      : "Delete this song record but keep its audio file?";
    if (!window.confirm(message)) return;
    const res = await fetch(`/api/songs?id=${encodeURIComponent(id)}&deleteAudio=${deleteAudio ? "1" : "0"}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    const cleanupMessage = actionableAudioCleanupMessage(data);
    setToast(cleanupMessage || (res.ok ? (data.audioDeleted ? "Song and owned audio deleted." : "Song deleted; audio was kept.") : data.error || "Delete failed."));
    await refresh();
  }

  async function quickAddToSetlist(songId: string, setlistName: string) {
    const name = setlistName.trim();
    if (!name) return;
    const res = await fetch("/api/setlists/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId, setlistName: name })
    });
    setToast(res.ok ? "Song associated with setlist." : "Setlist association failed.");
    await refresh();
  }

  return (
    <>
      <p className="eyebrow">Private catalog</p>
      <h2>Songs</h2>
      <form className="form" action={submit}>
        <input name="title" placeholder="Song title" required />
        <input name="artist" placeholder="Artist" />
        <input name="album" placeholder="Album; blank displays SINGLE" />
        <input name="genre" placeholder="Genre" />
        <input name="songKey" placeholder="Key" />
        <input name="bpm" type="number" placeholder="BPM" />
        <input name="audioUrl" placeholder="/audio/song.mp3 or external URL" />
        <input name="audio" type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,.mp3,.wav" />
        <input name="jukeboxOrder" type="number" min="0" step="1" defaultValue="0" placeholder="Jukebox order" />
        <input name="setlistNames" list="setlist-names" placeholder="Attach to setlists by typing names, comma separated" />
        <datalist id="setlist-names">
          {setlists.map(setlist => <option key={setlist.id} value={setlist.name} />)}
        </datalist>
        <textarea name="privateRehearsalNotes" placeholder="Private rehearsal notes" />
        <textarea name="privateLyricsNotes" placeholder="Private lyric notes; not public" />
        <textarea name="privateChordNotes" placeholder="Private chord notes; not public" />
        <label><input name="requestable" type="checkbox" defaultChecked /> Requestable</label>
        <label><input name="publicShortlist" type="checkbox" /> Show on public short list</label>
        <label><input name="paidCatalog" type="checkbox" defaultChecked /> Include in unlocked catalog</label>
        <label><input name="isPublic" type="checkbox" defaultChecked /> Visible in public jukebox</label>
        <input name="minTip" type="number" step="0.25" defaultValue="0.25" placeholder="Minimum request/tip" />
        <button className="button">Add song</button>
      </form>
      <table className="table">
        <thead><tr><th>Song metadata</th><th>Audio</th><th>Setlists</th><th>Jukebox</th><th>Actions</th></tr></thead>
        <tbody>
          {songs.map(song => (
            <SongTableRow key={song.id} song={song} setlists={setlists} remove={remove} quickAddToSetlist={quickAddToSetlist} refresh={refresh} setToast={setToast} />
          ))}
        </tbody>
      </table>
    </>
  );
}

function SongTableRow({
  song,
  setlists,
  remove,
  quickAddToSetlist,
  refresh,
  setToast
}: {
  song: SongRow;
  setlists: SetlistRow[];
  remove: (id: string, deleteAudio: boolean) => Promise<void>;
  quickAddToSetlist: (songId: string, setlistName: string) => Promise<void>;
  refresh: () => Promise<void>;
  setToast: (message: string) => void;
}) {
  const [setlistName, setSetlistName] = useState("");
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist || "");
  const [album, setAlbum] = useState(song.album || "");
  const [jukeboxOrder, setJukeboxOrder] = useState(song.jukeboxOrder || 0);
  const [isPublic, setIsPublic] = useState(song.isPublic);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewDuration, setPreviewDuration] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!audioFile) {
      setPreviewUrl("");
      setPreviewDuration(null);
      return;
    }
    const url = URL.createObjectURL(audioFile);
    const audio = new Audio(url);
    setPreviewUrl(url);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      setPreviewDuration(Number.isFinite(audio.duration) ? Math.round(audio.duration) : null);
    };
    return () => {
      audio.src = "";
      URL.revokeObjectURL(url);
    };
  }, [audioFile]);

  async function save() {
    setBusy(true);
    const res = await fetch("/api/songs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: song.id, title, artist, album, jukeboxOrder, isPublic })
    });
    const data = await res.json().catch(() => ({}));
    setToast(res.ok ? "Song metadata updated." : data.error || "Song update failed.");
    setBusy(false);
    if (res.ok) await refresh();
  }

  async function uploadAudio() {
    if (!audioFile) return;
    setBusy(true);
    try {
      const data = await uploadSongAudio(song.id, audioFile);
      setToast(data.cleanupMessage || `Audio saved (${data.durationSeconds ?? "unknown"} seconds).`);
      setAudioFile(null);
      await refresh();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Audio upload failed.");
    }
    setBusy(false);
  }

  return (
    <tr>
      <td>
        <input aria-label={`Title for ${song.title}`} value={title} onChange={event => setTitle(event.target.value)} />
        <input aria-label={`Artist for ${song.title}`} value={artist} onChange={event => setArtist(event.target.value)} placeholder="Artist" />
        <input aria-label={`Album for ${song.title}`} value={album} onChange={event => setAlbum(event.target.value)} placeholder="Album or SINGLE" />
        <span className="muted">{song.genre || ""} {song.songKey ? `· Key ${song.songKey}` : ""} {song.bpm ? `· ${song.bpm} BPM` : ""}</span>
      </td>
      <td>
        {(previewUrl || song.audioUrl) ? <audio controls preload="metadata" src={previewUrl || song.audioUrl || undefined} /> : <span className="badge">No audio</span>}
        <br /><span className="muted">Duration: {previewDuration ?? song.durationSeconds ?? "—"} seconds</span>
        <input aria-label={`Replace audio for ${song.title}`} type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,.mp3,.wav" onChange={event => setAudioFile(event.target.files?.[0] || null)} />
        <button className="ghost" disabled={!audioFile || busy} onClick={uploadAudio}>{song.audioUrl ? "Replace audio" : "Upload audio"}</button>
      </td>
      <td>
        {(song.setlists || []).map(item => <span className="badge" key={item.id}>{item.setlist?.name}</span>)}
        <div className="inline-setlist-add">
          <input value={setlistName} list={`setlist-names-${song.id}`} onChange={event => setSetlistName(event.target.value)} placeholder="type setlist" />
          <button className="ghost" onClick={() => {
            quickAddToSetlist(song.id, setlistName);
            setSetlistName("");
          }}>Add</button>
        </div>
        <datalist id={`setlist-names-${song.id}`}>
          {setlists.map(setlist => <option key={setlist.id} value={setlist.name} />)}
        </datalist>
      </td>
      <td>
        <label><input type="checkbox" checked={isPublic} onChange={event => setIsPublic(event.target.checked)} /> Public</label>
        <input aria-label={`Jukebox order for ${song.title}`} type="number" min="0" step="1" value={jukeboxOrder} onChange={event => setJukeboxOrder(Number(event.target.value))} />
        {song.publicShortlist && <span className="badge">short list</span>} {song.paidCatalog && <span className="badge">catalog</span>}
      </td>
      <td className="actions">
        <button className="ghost" disabled={busy || !title.trim()} onClick={save}>Save edits</button>
        <button className="ghost" disabled={busy} onClick={() => remove(song.id, false)}>Delete; keep audio</button>
        {song.audioUrl && <button className="ghost" disabled={busy} onClick={() => remove(song.id, true)}>Delete + owned audio</button>}
      </td>
    </tr>
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
