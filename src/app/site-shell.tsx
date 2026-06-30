"use client";

import { useEffect, useRef, useState } from "react";
import ReferenceJukebox, { JukeboxSongWheel } from "../components/reference-jukebox";

type EventRow = {
  id: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  venueName: string;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
};

type SongRow = {
  id: string;
  title: string;
  artist?: string | null;
  genre?: string | null;
  mood?: string | null;
  tempoLabel?: string | null;
  audioUrl?: string | null;
  minTipCents: number;
  freePlayLimit: number;
};

export default function SiteShell({ initialEvents, initialSongs }: { initialEvents: EventRow[]; initialSongs: SongRow[] }) {
  const [theme, setTheme] = useState("dark");
  const [songs, setSongs] = useState<SongRow[]>(initialSongs);
  const [events] = useState<EventRow[]>(initialEvents);
  const [currentSong, setCurrentSong] = useState<SongRow | null>(null);
  const [creditModal, setCreditModal] = useState(false);
  const [toast, setToast] = useState("");
  const [catalogUnlocked, setCatalogUnlocked] = useState(false);
  const [plays, setPlays] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("gg-theme") || "dark";
    const unlocked = localStorage.getItem("gg-catalog-unlocked") === "1";
    setPlays(JSON.parse(localStorage.getItem("gg-song-plays") || "{}"));
    setTheme(savedTheme);
    setCatalogUnlocked(unlocked);
    document.documentElement.dataset.theme = savedTheme;
  }, []);

  useEffect(() => {
    if (!catalogUnlocked) return;
    fetch("/api/songs?unlock=1")
      .then(res => res.json())
      .then(setSongs)
      .catch(() => {});
  }, [catalogUnlocked]);

  function changeTheme(next: string) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("gg-theme", next);
  }

  async function playSong(song: SongRow) {
    const currentPlays = plays[song.id] || 0;
    if (currentPlays >= song.freePlayLimit && !catalogUnlocked) {
      setCreditModal(true);
      return;
    }

    const updated = { ...plays, [song.id]: currentPlays + 1 };
    localStorage.setItem("gg-song-plays", JSON.stringify(updated));
    setPlays(updated);
    setCurrentSong(song);

    if (song.audioUrl && audioRef.current) {
      audioRef.current.src = song.audioUrl;
      await audioRef.current.play().catch(() => setToast("Browser blocked autoplay. Tap play on the audio player."));
    } else {
      setToast(`${song.title} selected. Add an audio file URL in admin to play real music.`);
    }
  }

  async function buyCredits() {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "jukebox_credits", label: "Jukebox credits", amountCents: 100 })
    });
    const data = await res.json();
    if (data.checkoutUrl) location.href = data.checkoutUrl;
    if (data.demoMode) {
      localStorage.setItem("gg-catalog-unlocked", "1");
      setCatalogUnlocked(true);
      setCreditModal(false);
      setToast("Demo mode: catalog unlocked locally. Connect Stripe for real credit purchases.");
    }
  }

  async function unlockCatalog() {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "catalog_unlock", label: "Full song catalog unlock", amountCents: 100 })
    });
    const data = await res.json();
    if (data.checkoutUrl) location.href = data.checkoutUrl;
    if (data.demoMode) {
      localStorage.setItem("gg-catalog-unlocked", "1");
      setCatalogUnlocked(true);
      setToast("Demo mode: full catalog unlocked for this browser.");
    }
  }

  function venueSearch(event: EventRow) {
    const query = encodeURIComponent([event.venueName, event.city, event.state].filter(Boolean).join(" "));
    window.open(`https://www.google.com/search?q=${query}`, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <div className="stage-bg" aria-hidden="true" />
      <header className="site-header">
        <a className="brand" href="#top" aria-label="George Grissom Live home">
          <span className="mic">🎙️</span>
          <span>
            <strong>George Grissom</strong>
            <small>Dive-bar soul · Winery daylight · Jukebox attitude</small>
          </span>
        </a>
        <nav>
          <a href="#jukebox">Jukebox</a>
          <a href="#calendar">Calendar</a>
          <a href="#requests">Requests</a>
          <a href="#promote">Promote</a>
          <a href="#uploads">Uploads</a>
          <a href="#booking">Booking</a>
          <a href="/admin">Admin</a>
        </nav>
        <button className="ghost" onClick={() => changeTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀️" : "🌙"}</button>
      </header>

      <aside className="jukebox-scene reference-jukebox-scene" aria-label="Jukebox player">
        <ReferenceJukebox
          songs={songs}
          plays={plays}
          catalogUnlocked={catalogUnlocked}
          currentSong={currentSong}
          selectedSongId={currentSong?.id}
          onSelect={setCurrentSong}
          onPlay={playSong}
          audioRef={audioRef}
        />
      </aside>

      <main id="top">
        <section className="hero snap">
          <div className="copy">
            <p className="eyebrow">Live web app MVP</p>
            <h1>Requests, tips, private setlists, and a quarter jukebox built for the show.</h1>
            <p>Fans get the vibe. George gets the dashboard. The private learning catalog stays private inside the app.</p>
            <div className="actions">
              <a className="button" href="#requests">Request a song</a>
              <button className="button secondary" onClick={unlockCatalog}>Tip to unlock full catalog</button>
            </div>
            {toast && <p className="toast">{toast}</p>}
          </div>
        </section>

        <section id="jukebox" className="card-section snap">
          <div className="panel">
            <p className="eyebrow">Jukebox</p>
            <h2>Spin the wheel, pick the center title, then play.</h2>
            <p className="muted">The jukebox renders only the visible wheel rows, so the catalog stays fast as it grows. Audio files can be attached in the admin dashboard.</p>
            <JukeboxSongWheel
              songs={songs}
              plays={plays}
              catalogUnlocked={catalogUnlocked}
              selectedSongId={currentSong?.id}
              onSelect={setCurrentSong}
              onPlay={playSong}
              visibleRadius={5}
            />
          </div>
        </section>

        <section id="calendar" className="card-section snap light-scene">
          <div className="panel">
            <p className="eyebrow">Calendar</p>
            <h2>Upcoming dates</h2>
            <p className="muted">Dates are pulled from the Performance Google Calendar when configured, while this page keeps the custom site styling.</p>
            <div className="event-list">
              {events.length === 0 && <p>No public dates yet. Add shows in the admin dashboard.</p>}
              {events.map(event => (
                <article className="event" key={event.id}>
                  <time>{new Date(event.startsAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time>
                  <button onClick={() => venueSearch(event)}>{event.venueName}</button>
                  <span>{[event.city, event.state].filter(Boolean).join(", ") || event.title}</span>
                  {event.notes && <p>{event.notes}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="requests" className="card-section snap">
          <RequestForm songs={songs.filter(song => song.id)} events={events} setToast={setToast} />
        </section>

        <section id="promote" className="card-section snap daytime">
          <div className="panel">
            <p className="eyebrow">Promote Me</p>
            <h2>Post a live clip or photo, then claim a free request.</h2>
            <p>Fans can add a promo link in their request message. In the admin queue, promoted requests get a small priority bump for review.</p>
            <a className="button" href="#requests">Claim through a request</a>
          </div>
        </section>

        <section id="uploads" className="card-section snap">
          <FanUploadForm events={events} setToast={setToast} />
        </section>

        <section id="booking" className="card-section snap daytime">
          <BookingForm setToast={setToast} />
        </section>
      </main>

      {creditModal && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setCreditModal(false);
        }}>
          <div className="modal" role="dialog" aria-modal="true">
            <h2>Jukebox credits</h2>
            <p>You used the free plays for that song. Buy credits or come back later.</p>
            <div className="actions">
              <button className="button" onClick={buyCredits}>Buy credits</button>
              <button className="button secondary" onClick={() => setCreditModal(false)}>Maybe later</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RequestForm({ songs, events, setToast }: { songs: SongRow[]; events: EventRow[]; setToast: (value: string) => void }) {
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    const tip = Math.round(Number(formData.get("tipAmount") || "0") * 100);
    const body = {
      songId: formData.get("songId") || null,
      eventId: formData.get("eventId") || null,
      customSongTitle: formData.get("customSongTitle"),
      requesterName: formData.get("requesterName"),
      message: formData.get("message"),
      tipAmountCents: tip,
      promoteUrl: formData.get("promoteUrl")
    };
    const res = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    setLoading(false);
    if (data.checkoutUrl) location.href = data.checkoutUrl;
    else setToast(data.demoMode ? "Request submitted in demo/manual-payment mode." : "Request submitted.");
  }

  return (
    <form className="panel form" action={submit}>
      <p className="eyebrow">Setlist & Requests</p>
      <h2>Request a song for the live queue.</h2>
      <select name="eventId" defaultValue="">
        <option value="">Tonight / no event selected</option>
        {events.map(event => <option key={event.id} value={event.id}>{new Date(event.startsAt).toLocaleDateString()} · {event.venueName}</option>)}
      </select>
      <select name="songId" defaultValue="">
        <option value="">Pick from visible list</option>
        {songs.map(song => <option key={song.id} value={song.id}>{song.title} — {song.artist || "George Grissom"}</option>)}
      </select>
      <input name="customSongTitle" placeholder="Or type a song not shown" />
      <input name="requesterName" placeholder="Your name" />
      <input name="tipAmount" type="number" min="0" step="0.25" placeholder="Tip amount, e.g. 5.00" />
      <input name="promoteUrl" placeholder="Promo post link, optional" />
      <textarea name="message" placeholder="Message for George" />
      <button className="button" disabled={loading}>{loading ? "Submitting..." : "Send request / tip"}</button>
      <p className="muted">The audience cannot see George’s private live setlist.</p>
    </form>
  );
}

function FanUploadForm({ events, setToast }: { events: EventRow[]; setToast: (value: string) => void }) {
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    const res = await fetch("/api/uploads", { method: "POST", body: formData });
    setLoading(false);
    setToast(res.ok ? "Upload received. George/admin can approve it before it appears publicly." : "Upload failed.");
  }

  return (
    <form className="panel form" action={submit}>
      <p className="eyebrow">Photos & Video</p>
      <h2>Send show media to George.</h2>
      <select name="eventId" defaultValue="">
        <option value="">Select event, optional</option>
        {events.map(event => <option key={event.id} value={event.id}>{new Date(event.startsAt).toLocaleDateString()} · {event.venueName}</option>)}
      </select>
      <input name="uploaderName" placeholder="Your name" />
      <input name="file" type="file" accept="image/*,video/*,audio/*" required />
      <textarea name="note" placeholder="What should George know about this upload?" />
      <button className="button" disabled={loading}>{loading ? "Uploading..." : "Upload for review"}</button>
    </form>
  );
}

function BookingForm({ setToast }: { setToast: (value: string) => void }) {
  async function submit(formData: FormData) {
    const body = Object.fromEntries(formData.entries());
    const res = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setToast(res.ok ? "Booking inquiry sent." : "Booking inquiry failed.");
  }

  return (
    <form className="panel form" action={submit}>
      <p className="eyebrow">Booking</p>
      <h2>Book George Grissom.</h2>
      <input name="name" placeholder="Your name" required />
      <input name="email" type="email" placeholder="Email" />
      <input name="phone" placeholder="Phone" />
      <input name="date" placeholder="Event date" />
      <input name="venue" placeholder="Venue / event" />
      <textarea name="message" placeholder="Tell us about the gig" />
      <button className="button">Send booking inquiry</button>
    </form>
  );
}
