"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Tab = "player" | "content" | "live" | "events" | "setlists" | "songs" | "import" | "search" | "record" | "uploads" | "bookings";

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
  slug?: string | null;
  title: string;
  artist?: string | null;
  album?: string | null;
  audioUrl?: string | null;
  isPublic?: boolean;
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
type BookingRow = { id: string; name: string; email?: string; phone?: string; venue?: string; date?: string; message?: string; createdAt: string; };

type SiteContent = {
  heroLead: string;
  heroProof: string;
  bookingIntro: string;
  storyIntro: string;
  counterfistHeading: string;
  counterfistBody: string;
  setlistHeading: string;
  setlistBody: string;
  crowHeading: string;
  crowBody: string;
};

const PUBLIC_PLAYER_SEASONS = ["From the Setlist", "A Taste For Crow"] as const;
type PublicPlayerSeason = typeof PUBLIC_PLAYER_SEASONS[number];

function configuredPlayerSeasons(song: SongRow): PublicPlayerSeason[] {
  const raw = song.sourceLinks?.publicPlayerSeasons;
  if (Array.isArray(raw)) {
    return raw.filter((value: unknown): value is PublicPlayerSeason =>
      PUBLIC_PLAYER_SEASONS.includes(String(value) as PublicPlayerSeason)
    );
  }
  return PUBLIC_PLAYER_SEASONS.includes(song.album as PublicPlayerSeason)
    ? [song.album as PublicPlayerSeason]
    : [];
}

export default function AdminApp() {
  const [tab, setTab] = useState<Tab>("player");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [songs, setSongs] = useState<SongRow[]>([]);
  const [setlists, setSetlists] = useState<SetlistRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
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
    fetch("/api/site-content").then(r => r.json()).then(data => {
      if (data && !data.error) setSiteContent(data);
    });
    const interval = window.setInterval(refresh, 5000);
    return () => window.clearInterval(interval);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/admin/login";
  }

  const tabs: [Tab, string][] = [
    ["player", "Media Player"],
    ["content", "Site Content"],
    ["bookings", "Booking"],
    ["events", "Calendar"],
    ["songs", "Songs / Advanced"],
    ["setlists", "Setlists"],
    ["live", "Live Queue"],
    ["import", "Import"],
    ["search", "Song Search"],
    ["record", "Record"],
    ["uploads", "Uploads"]
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
            {tab === "player" && <PlayerManager songs={songs} refresh={refresh} setToast={setToast} />}
            {tab === "content" && siteContent && <SiteContentEditor content={siteContent} setContent={setSiteContent} setToast={setToast} />}
            {tab === "content" && !siteContent && <p className="muted">Loading site content…</p>}
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
    body.requestable = formData.get("requestable") === "on";
    body.publicShortlist = formData.get("publicShortlist") === "on";
    body.paidCatalog = false;
    body.isPublic = true;
    body.minTipCents = Math.round(Number(body.minTip || "0") * 100);
    const publicPlayerSeasons: PublicPlayerSeason[] = [
      formData.get("seasonSetlist") === "on" ? "From the Setlist" : null,
      formData.get("seasonCrow") === "on" ? "A Taste For Crow" : null
    ].filter(Boolean) as PublicPlayerSeason[];
    body.album = publicPlayerSeasons.includes("A Taste For Crow")
      ? "A Taste For Crow"
      : publicPlayerSeasons[0] || "Unsorted";
    const fullMp3DriveFileId = String(formData.get("fullMp3DriveFileId") || "").trim();
    const hostedFileName = String(formData.get("hostedFileName") || "").trim();
    body.sourceLinks = {
      ...(fullMp3DriveFileId ? { fullMp3DriveFileId } : {}),
      ...(hostedFileName ? { hostedFileName } : {}),
      publicPlayerSeasons
    };
    delete body.fullMp3DriveFileId;
    delete body.hostedFileName;
    delete body.seasonSetlist;
    delete body.seasonCrow;
    delete body.minTip;
    const res = await fetch("/api/songs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setToast(res.ok ? "Song saved." : data.error || "Song failed.");
    await refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/songs?id=${id}`, { method: "DELETE" });
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
        <input name="artist" placeholder="Artist" defaultValue="George Grissom" />
        <fieldset>
          <legend>Public player playlists</legend>
          <label><input name="seasonSetlist" type="checkbox" /> From the Setlist</label>
          <label><input name="seasonCrow" type="checkbox" defaultChecked /> A Taste For Crow</label>
        </fieldset>
        <input name="genre" placeholder="Genre" />
        <input name="songKey" placeholder="Key" />
        <input name="bpm" type="number" placeholder="BPM" />
        <input name="hostedFileName" placeholder="Namecheap MP3 filename, e.g. 01 - Song.mp3" />
        <input name="fullMp3DriveFileId" placeholder="Google Drive MP3 file ID (fallback)" />
        <input name="audioUrl" placeholder="Optional direct MP3 URL" />
        <input name="setlistNames" list="setlist-names" placeholder="Attach to setlists by typing names, comma separated" />
        <datalist id="setlist-names">
          {setlists.map(setlist => <option key={setlist.id} value={setlist.name} />)}
        </datalist>
        <textarea name="privateRehearsalNotes" placeholder="Private rehearsal notes" />
        <textarea name="privateLyricsNotes" placeholder="Private lyric notes; not public" />
        <textarea name="privateChordNotes" placeholder="Private chord notes; not public" />
        <label><input name="requestable" type="checkbox" defaultChecked /> Requestable</label>
        <label><input name="publicShortlist" type="checkbox" /> Live on public player</label>
        <input name="minTip" type="number" step="0.25" defaultValue="0" placeholder="Minimum request/tip" />
        <button className="button">Add song</button>
      </form>
      <table className="table">
        <thead><tr><th>Title</th><th>Private info</th><th>Setlists</th><th>Visibility</th><th>Actions</th></tr></thead>
        <tbody>
          {songs.map(song => (
            <SongTableRow key={song.id} song={song} setlists={setlists} remove={remove} quickAddToSetlist={quickAddToSetlist} setToast={setToast} />
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
  setToast
}: {
  song: SongRow;
  setlists: SetlistRow[];
  remove: (id: string) => Promise<void>;
  quickAddToSetlist: (songId: string, setlistName: string) => Promise<void>;
  setToast: (s: string) => void;
}) {
  const [setlistName, setSetlistName] = useState("");
  const [seasons, setSeasons] = useState<PublicPlayerSeason[]>(configuredPlayerSeasons(song));
  const [audioUrl, setAudioUrl] = useState(String(song.audioUrl || ""));
  const [hostedFileName, setHostedFileName] = useState(String(song.sourceLinks?.hostedFileName || ""));
  const [liveOnPlayer, setLiveOnPlayer] = useState(Boolean(song.publicShortlist));

  function toggleSeason(season: PublicPlayerSeason, checked: boolean) {
    setSeasons(current => checked
      ? Array.from(new Set([...current, season]))
      : current.filter(item => item !== season)
    );
  }

  async function savePlayerSettings() {
    if (liveOnPlayer && seasons.length === 0) {
      setToast("Choose at least one player playlist before making this song live.");
      return;
    }
    const sourceLinks = {
      ...(song.sourceLinks && typeof song.sourceLinks === "object" ? song.sourceLinks : {}),
      hostedFileName: hostedFileName.trim() || null,
      publicPlayerSeasons: seasons
    };
    const res = await fetch("/api/songs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: song.id,
        audioUrl: audioUrl.trim() || null,
        album: seasons.includes("A Taste For Crow") ? "A Taste For Crow" : seasons[0] || "Unsorted",
        publicShortlist: liveOnPlayer,
        isPublic: true,
        sourceLinks
      })
    });
    setToast(res.ok ? "Public player updated." : "Player update failed.");
  }

  return (
    <tr>
      <td><strong>{song.title}</strong><br />{song.artist || ""}<br /><span className="muted">{song.genre || ""} {song.songKey ? `· Key ${song.songKey}` : ""} {song.bpm ? `· ${song.bpm} BPM` : ""}</span></td>
      <td><span className="badge">{song.privateLyricsNotes ? "lyrics notes" : "no lyrics notes"}</span> <span className="badge">{song.privateChordNotes ? "chords notes" : "no chord notes"}</span></td>
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
        <div className="form">
          {PUBLIC_PLAYER_SEASONS.map(season => (
            <label key={season}>
              <input
                type="checkbox"
                checked={seasons.includes(season)}
                onChange={event => toggleSeason(season, event.target.checked)}
              /> {season}
            </label>
          ))}
          <input
            value={hostedFileName}
            onChange={event => setHostedFileName(event.target.value)}
            placeholder="Namecheap MP3 filename"
          />
          <label><input type="checkbox" checked={liveOnPlayer} onChange={event => setLiveOnPlayer(event.target.checked)} /> Live on player</label>
          <button className="ghost" onClick={savePlayerSettings}>Save player settings</button>
        </div>
      </td>
      <td><button className="ghost" onClick={() => remove(song.id)}>Delete song</button></td>
    </tr>
  );
}

function PlayerManager({
  songs,
  refresh,
  setToast
}: {
  songs: SongRow[];
  refresh: () => Promise<void>;
  setToast: (s: string) => void;
}) {
  const [catalogSongs, setCatalogSongs] = useState<SongRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [selectedDefaultKey, setSelectedDefaultKey] = useState("");

  async function loadCatalog() {
    setCatalogLoading(true);
    const res = await fetch("/api/player-catalog?admin=1", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data)) {
      setCatalogSongs(data);
      setCatalogError("");
    } else {
      setCatalogError(data.error || "Could not load the hosted MP3 catalog.");
    }
    setCatalogLoading(false);
  }

  useEffect(() => {
    void loadCatalog();
  }, []);

  async function addSong(formData: FormData) {
    const seasons: PublicPlayerSeason[] = [
      formData.get("seasonSetlist") === "on" ? "From the Setlist" : null,
      formData.get("seasonCrow") === "on" ? "A Taste For Crow" : null
    ].filter(Boolean) as PublicPlayerSeason[];

    const audioUrl = String(formData.get("audioUrl") || "").trim();
    if (!audioUrl) {
      setToast("Enter the full MP3 URL.");
      return;
    }

    const body = {
      title: String(formData.get("title") || "").trim(),
      artist: String(formData.get("artist") || "George Grissom").trim(),
      audioUrl,
      album: seasons.includes("A Taste For Crow") ? "A Taste For Crow" : seasons[0] || "Unsorted",
      isPublic: true,
      publicShortlist: formData.get("liveOnPlayer") === "on",
      paidCatalog: false,
      requestable: false,
      sourceLinks: {
        publicPlayerSeasons: seasons,
        publicPlayerDefault: false
      }
    };

    const res = await fetch("/api/songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    setToast(res.ok ? "Song added to the media library." : data.error || "Could not add song.");
    await refresh();
    await loadCatalog();
  }

  const playerSongs = useMemo(() => {
    const merged = new Map<string, SongRow>();

    for (const song of catalogSongs) {
      merged.set(song.slug || song.id, song);
    }

    for (const song of songs) {
      if (song.artist === "Counterfist") continue;
      const seasons = configuredPlayerSeasons(song);
      const hasMp3Source = Boolean(song.audioUrl || song.sourceLinks?.hostedFileName || song.sourceLinks?.fullMp3DriveFileId || seasons.length);
      if (!hasMp3Source) continue;
      const key = song.slug || song.id;
      if (!merged.has(key)) merged.set(key, song);
    }

    return Array.from(merged.values());
  }, [catalogSongs, songs]);

  const defaultSong =
    playerSongs.find(song => song.sourceLinks?.publicPlayerDefault === true) ||
    playerSongs.find(song => song.slug === "what-a-shame" && song.publicShortlist) ||
    playerSongs.find(song => song.publicShortlist) ||
    null;

  const defaultSongKey = defaultSong ? (defaultSong.slug || defaultSong.id) : "";

  useEffect(() => {
    if (!selectedDefaultKey || !playerSongs.some(song => (song.slug || song.id) === selectedDefaultKey)) {
      setSelectedDefaultKey(defaultSongKey);
    }
  }, [defaultSongKey, playerSongs, selectedDefaultKey]);

  async function setDefaultSong(songKey: string) {
    const target = playerSongs.find(song => (song.slug || song.id) === songKey);
    if (!target) {
      setToast("Choose a song first.");
      return;
    }

    const currentSeasons = configuredPlayerSeasons(target);
    const seasons: PublicPlayerSeason[] = currentSeasons.length
      ? currentSeasons
      : ["From the Setlist"];

    try {
      if (target.sourceLinks?.catalogSeed && target.slug) {
        const res = await fetch("/api/player-catalog", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: target.slug,
            isDefault: true,
            publicShortlist: true,
            seasons
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not save default song.");
      } else {
        for (const row of playerSongs) {
          const isTarget = row.id === target.id;
          const sourceLinks = {
            ...(row.sourceLinks && typeof row.sourceLinks === "object" ? row.sourceLinks : {}),
            publicPlayerSeasons: isTarget
              ? seasons
              : configuredPlayerSeasons(row),
            publicPlayerDefault: isTarget
          };

          const res = await fetch("/api/songs", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: row.id,
              ...(isTarget ? {
                album: seasons.includes("A Taste For Crow") ? "A Taste For Crow" : seasons[0] || "Unsorted",
                publicShortlist: true,
                isPublic: true
              } : {}),
              sourceLinks
            })
          });
          if (!res.ok) throw new Error("Could not save default song.");
        }
      }

      setToast(`${target.title} is now the default song.`);
      await refresh();
      await loadCatalog();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not save the default song.");
    }
  }

  return (
    <>
      <p className="eyebrow">Public site</p>
      <h2>Media Player</h2>
      <p className="muted">
        Hosted MP3s are listed below by their full URL. Choose what is visible, which playlist each song belongs to,
        and the default song queued when a visitor first presses Play. Counterfist albums remain separate external album links.
      </p>

      <div className="form">
        <h3>Default song</h3>
        <p className="muted">This is the song queued when a visitor first presses Play.</p>
        <select
          value={selectedDefaultKey}
          onChange={event => setSelectedDefaultKey(event.target.value)}
        >
          <option value="">Choose default song</option>
          {playerSongs.map(song => (
            <option key={song.slug || song.id} value={song.slug || song.id}>
              {song.title}
            </option>
          ))}
        </select>
        <button
          className="button"
          type="button"
          disabled={!selectedDefaultKey}
          onClick={() => void setDefaultSong(selectedDefaultKey)}
        >
          Set default song
        </button>
        {defaultSong && <p className="muted">Current default: <strong>{defaultSong.title}</strong></p>}
      </div>

      <form className="form" action={addSong}>
        <h3>Add a player song</h3>
        <input name="title" placeholder="Song title" required />
        <input name="artist" placeholder="Artist" defaultValue="George Grissom" />
        <input name="audioUrl" type="url" placeholder="Full MP3 URL" required />
        <fieldset>
          <legend>Playlist</legend>
          <label><input name="seasonSetlist" type="checkbox" defaultChecked /> From the Setlist</label>
          <label><input name="seasonCrow" type="checkbox" /> A Taste For Crow</label>
        </fieldset>
        <label><input name="liveOnPlayer" type="checkbox" defaultChecked /> Visible on public player</label>
        <button className="button">Add to media library</button>
      </form>

      {catalogLoading && <p className="muted">Loading hosted MP3 catalog…</p>}
      {catalogError && <p className="muted">{catalogError}</p>}

      <table className="table">
        <thead><tr><th>Song</th><th>Full MP3 URL</th><th>Playlist / visibility / default</th></tr></thead>
        <tbody>
          {playerSongs.map(song => (
            <PlayerSongEditor
              key={song.slug || song.id}
              song={song}
              isDefault={(song.slug || song.id) === defaultSongKey}
              refresh={refresh}
              reloadCatalog={loadCatalog}
              setToast={setToast}
            />
          ))}
          {!catalogLoading && playerSongs.length === 0 && (
            <tr><td colSpan={3} className="muted">No hosted MP3s were found.</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}

function PlayerSongEditor({
  song,
  isDefault,
  refresh,
  reloadCatalog,
  setToast
}: {
  song: SongRow;
  isDefault: boolean;
  refresh: () => Promise<void>;
  reloadCatalog: () => Promise<void>;
  setToast: (s: string) => void;
}) {
  const [seasons, setSeasons] = useState<PublicPlayerSeason[]>(configuredPlayerSeasons(song));
  const [audioUrl, setAudioUrl] = useState(String(song.audioUrl || ""));
  const [liveOnPlayer, setLiveOnPlayer] = useState(Boolean(song.publicShortlist));

  useEffect(() => {
    setSeasons(configuredPlayerSeasons(song));
    setAudioUrl(String(song.audioUrl || ""));
    setLiveOnPlayer(Boolean(song.publicShortlist));
  }, [song]);

  function toggleSeason(season: PublicPlayerSeason, checked: boolean) {
    setSeasons(current => checked
      ? Array.from(new Set([...current, season]))
      : current.filter(item => item !== season)
    );
  }

  async function save() {
    if (!audioUrl.trim()) {
      setToast("This song needs a full MP3 URL.");
      return;
    }
    if (liveOnPlayer && seasons.length === 0) {
      setToast("Choose From the Setlist and/or A Taste For Crow before making the song visible.");
      return;
    }

    let res: Response;
    if (song.sourceLinks?.catalogSeed && song.slug) {
      res = await fetch("/api/player-catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: song.slug,
          audioUrl: audioUrl.trim(),
          seasons,
          publicShortlist: liveOnPlayer,
          isDefault: liveOnPlayer ? isDefault : false
        })
      });
    } else {
      const sourceLinks = {
        ...(song.sourceLinks && typeof song.sourceLinks === "object" ? song.sourceLinks : {}),
        publicPlayerSeasons: seasons,
        publicPlayerDefault: liveOnPlayer ? isDefault : false
      };

      res = await fetch("/api/songs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: song.id,
          audioUrl: audioUrl.trim(),
          album: seasons.includes("A Taste For Crow") ? "A Taste For Crow" : seasons[0] || "Unsorted",
          publicShortlist: liveOnPlayer,
          isPublic: true,
          sourceLinks
        })
      });
    }

    const data = await res.json().catch(() => ({}));
    setToast(res.ok ? "Media player updated." : data.error || "Could not update media player.");
    await refresh();
    await reloadCatalog();
  }

  return (
    <tr>
      <td>
        <strong>{song.title}</strong><br />
        <span className="muted">{song.artist || "George Grissom"}</span>
      </td>
      <td>
        <input
          type="url"
          value={audioUrl}
          onChange={event => setAudioUrl(event.target.value)}
          placeholder="https://…/song.mp3"
        />
        {audioUrl && (
          <><br /><a className="ghost" href={audioUrl} target="_blank" rel="noreferrer">Test MP3</a></>
        )}
      </td>
      <td>
        <div className="form">
          <label>
            <input
              type="checkbox"
              checked={seasons.includes("From the Setlist")}
              onChange={event => toggleSeason("From the Setlist", event.target.checked)}
            /> From the Setlist
          </label>
          <label>
            <input
              type="checkbox"
              checked={seasons.includes("A Taste For Crow")}
              onChange={event => toggleSeason("A Taste For Crow", event.target.checked)}
            /> A Taste For Crow
          </label>
          <label>
            <input
              type="checkbox"
              checked={liveOnPlayer}
              onChange={event => setLiveOnPlayer(event.target.checked)}
            /> Visible on public player
          </label>
          {isDefault && <span className="badge">CURRENT DEFAULT</span>}
          <button className="ghost" onClick={save}>Save</button>
        </div>
      </td>
    </tr>
  );
}

function SiteContentEditor({
  content,
  setContent,
  setToast
}: {
  content: SiteContent;
  setContent: (content: SiteContent) => void;
  setToast: (s: string) => void;
}) {
  const [draft, setDraft] = useState<SiteContent>(content);

  useEffect(() => setDraft(content), [content]);

  function field(key: keyof SiteContent, label: string, rows = 4) {
    return (
      <label>
        {label}
        <textarea
          rows={rows}
          value={draft[key]}
          onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))}
        />
      </label>
    );
  }

  async function save() {
    const res = await fetch("/api/site-content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setContent(data);
      setToast("Site text updated.");
    } else {
      setToast(data.error || "Could not update site text.");
    }
  }

  return (
    <>
      <p className="eyebrow">Public site</p>
      <h2>Site Content</h2>
      <p className="muted">Edit the main public-facing copy here. Changes appear on the site after you save and refresh the public page.</p>
      <div className="form">
        {field("heroLead", "Home — primary booking pitch", 3)}
        {field("heroProof", "Home — voice / performance promotion", 5)}
        {field("bookingIntro", "Booking section intro", 4)}
        {field("storyIntro", "Story section intro", 4)}
        {field("counterfistHeading", "Counterfist heading", 2)}
        {field("counterfistBody", "Counterfist story", 5)}
        {field("setlistHeading", "From the Setlist heading", 2)}
        {field("setlistBody", "From the Setlist story", 5)}
        {field("crowHeading", "A Taste For Crow heading", 2)}
        {field("crowBody", "A Taste For Crow story", 6)}
        <button className="button" onClick={save}>Save site text</button>
      </div>
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
  async function remove(id: string) {
    if (!confirm("Delete this booking inquiry?")) return;
    await fetch(`/api/bookings?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <>
      <p className="eyebrow">Booking</p>
      <h2>Inquiries</h2>
      <p className="muted">New booking inquiries from the public site appear here immediately.</p>
      <table className="table">
        <tbody>{bookings.map(booking => <tr key={booking.id}>
          <td>
            <strong>{booking.name}</strong><br />
            {booking.email} {booking.phone}<br />
            <span className="muted">{booking.date} · {booking.venue}</span>
            <p>{booking.message}</p>
            <span className="muted">Received {new Date(booking.createdAt).toLocaleString()}</span>
          </td>
          <td><button className="ghost" onClick={() => remove(booking.id)}>Delete</button></td>
        </tr>)}</tbody>
      </table>
    </>
  );
}
