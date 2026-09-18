"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "./record-site.module.css";

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

type PlayerSeason = "Counterfist Archive" | "From the Setlist" | "A Taste For Crow";

type Track = {
  id: string;
  slug?: string | null;
  title: string;
  seasons: PlayerSeason[];
};

const wave = [34,52,44,72,62,38,58,78,46,66,84,54,42,74,91,66,48,70,55,81,63,44,73,88,51,69,39,76,58,83,47,72,93,60,42,67,79,53,70,86,46,61,77,55,89,64,48,74,58,82,45,68,90,57,41,73,85,52,62,76,49,71,87,56];

export default function SiteShell({
  initialEvents,
  tracks
}: {
  initialEvents: EventRow[];
  tracks: Track[];
}) {
  const [activeTrack, setActiveTrack] = useState(() => {
    const index = tracks.findIndex(track => track.slug === "what-a-shame");
    return index >= 0 ? index : 0;
  });
  const [playing, setPlaying] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | PlayerSeason>("From the Setlist");
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const [bookingStatus, setBookingStatus] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = tracks[activeTrack];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tracks.filter(track => {
      const eraMatch = filter === "all" || track.seasons.includes(filter);
      const textMatch = !q || track.title.toLowerCase().includes(q);
      return eraMatch && textMatch;
    });
  }, [tracks, query, filter]);

  const upcoming = useMemo(
    () => initialEvents
      .filter(event => new Date(event.startsAt).getTime() >= Date.now() - 86400000)
      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
      .slice(0, 6),
    [initialEvents]
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const update = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setElapsed(formatTime(audio.currentTime));
        setDuration(formatTime(audio.duration));
      }
    };
    const ended = () => nextTrack();
    const pause = () => setPlaying(false);
    const play = () => setPlaying(true);

    audio.addEventListener("timeupdate", update);
    audio.addEventListener("loadedmetadata", update);
    audio.addEventListener("ended", ended);
    audio.addEventListener("pause", pause);
    audio.addEventListener("play", play);

    return () => {
      audio.removeEventListener("timeupdate", update);
      audio.removeEventListener("loadedmetadata", update);
      audio.removeEventListener("ended", ended);
      audio.removeEventListener("pause", pause);
      audio.removeEventListener("play", play);
    };
  });

  function selectTrack(track: Track) {
    const index = tracks.findIndex(item => item.id === track.id);
    if (index < 0) return;
    setActiveTrack(index);
    setTimeout(() => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.load();
      audio.play().catch(() => setPlaying(false));
    }, 0);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }

  function previousTrack() {
    if (!tracks.length) return;
    setActiveTrack(index => (index - 1 + tracks.length) % tracks.length);
    setTimeout(() => audioRef.current?.play().catch(() => setPlaying(false)), 0);
  }

  function nextTrack() {
    if (!tracks.length) return;
    setActiveTrack(index => (index + 1) % tracks.length);
    setTimeout(() => audioRef.current?.play().catch(() => setPlaying(false)), 0);
  }

  function seek(percent: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = audio.duration * (percent / 100);
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookingStatus("Sending…");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const details = [
      form.get("message"),
      "",
      "Location: " + (form.get("location") || "Not provided"),
      "Event type: " + (form.get("eventType") || "Not provided"),
      "Audience: " + (form.get("audience") || "Not provided"),
      "Budget / fee range: " + (form.get("budget") || "Not provided")
    ].join("\n");

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        date: form.get("date"),
        venue: form.get("venue"),
        message: details
      })
    });

    if (response.ok) {
      setBookingStatus("Inquiry received.");
      formElement.reset();
    } else {
      setBookingStatus("Could not send. Try again in a moment.");
    }
  }

  return (
    <div className={styles.site}>
      <audio ref={audioRef} src={current ? `/api/public-audio/${encodeURIComponent(current.id)}` : undefined} preload="metadata" />

      <aside className={styles.rail} aria-label="Site navigation">
        <a className={styles.railMark} href="#home" aria-label="George Grissom home">GG</a>
        <nav>
          <a href="#home" title="Home">⌂</a>
          <a href="#music" title="Music">▤</a>
          <a href="#shows" title="Shows">▦</a>
          <a href="#booking" title="Booking">＋</a>
          <a href="#story" title="Story">◇</a>
        </nav>
      </aside>

      <main className={styles.main}>
        <section id="home" className={styles.hero}>
          <div className={styles.heroTexture} />
          <div className={styles.heroContent}>
            <p className={styles.kicker}>SEATTLE · SONGWRITER · PERFORMER</p>
            <h1>George<br />Grissom</h1>
            <p className={styles.lead}>One voice, one guitar, loops and rhythm underfoot—an acoustic performance that can stay intimate or grow until it feels like a full band in the room.</p>
            <p className={styles.heroProof}>Early Counterfist histories called George the “perfect choice” to front the band. Listeners have singled out the voice and the dark, forceful energy around it. Two decades later, that same voice can fill a winery patio, a bar room, a wedding, or a late happy hour without losing the closeness of a solo performance.</p>
            <div className={styles.actions}>
              <a href="#music" className={styles.primary}>Listen Now</a>
              <a href="#shows" className={styles.secondary}>Shows</a>
              <a href="#booking" className={styles.secondary}>Book George</a>
            </div>
          </div>
          <div className={styles.heroMonogram} aria-hidden="true">
            <span>G</span><span>G</span>
          </div>
        </section>

        <section id="music" className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>THE RECORDS + THE WORKBENCH</p>
              <h2>Music</h2>
            </div>
            <p>{tracks.length} songs are live right now. Add, remove, or re-season them from the private admin dashboard.</p>
          </div>

          <div className={styles.musicTools}>
            <div className={styles.filters}>
              <button className={filter === "all" ? styles.activeFilter : ""} onClick={() => setFilter("all")}>ALL</button>
              <button className={filter === "Counterfist Archive" ? styles.activeFilter : ""} onClick={() => setFilter("Counterfist Archive")}>Counterfist Archive</button>
              <button className={filter === "From the Setlist" ? styles.activeFilter : ""} onClick={() => setFilter("From the Setlist")}>From the Setlist</button>
              <button className={filter === "A Taste For Crow" ? styles.activeFilter : ""} onClick={() => setFilter("A Taste For Crow")}>A Taste For Crow</button>
            </div>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tracks" aria-label="Search tracks" />
          </div>

          <div className={styles.trackGrid}>
            {filtered.map(track => {
              const index = tracks.findIndex(item => item.id === track.id);
              const selected = index === activeTrack;
              const tag = filter !== "all"
                ? (filter === "Counterfist Archive" ? "ARCHIVE" : filter === "From the Setlist" ? "SETLIST" : "CROW")
                : track.seasons.map(season => season === "Counterfist Archive" ? "ARCHIVE" : season === "From the Setlist" ? "SETLIST" : "CROW").join(" / ");
              return (
                <button key={track.id} className={selected ? styles.trackActive : styles.track} onClick={() => selectTrack(track)}>
                  <span className={styles.trackIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.trackTitle}>{track.title}</span>
                  <span className={styles.trackEra}>{tag}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.releaseStrip}>
            <article>
              <span>2001</span><strong>Chiral</strong><p>Counterfist</p>
            </article>
            <article>
              <span>2008</span><strong>Vertical Mile</strong><p>Counterfist</p>
              <a href="https://open.spotify.com/album/4NtQ8p7GN8aZH0JjkFqh4f" target="_blank" rel="noreferrer">Listen ↗</a>
            </article>
            <article>
              <span>2011</span><strong>Give Up the Ghost</strong><p>Counterfist EP</p>
              <a href="https://music.apple.com/us/album/give-up-the-ghost-ep/1063852643" target="_blank" rel="noreferrer">Listen ↗</a>
            </article>
          </div>
        </section>

        <section id="shows" className={styles.showSection}>
          <div className={styles.showGlow} />
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>LIVE</p>
              <h2>Upcoming shows</h2>
            </div>
            <p>Public dates from George's performance calendar.</p>
          </div>

          <div className={styles.events}>
            {upcoming.length === 0 && (
              <article className={styles.emptyEvent}>
                <span>NEW DATES</span>
                <h3>More shows are being added.</h3>
                <a href="#booking">Book a date →</a>
              </article>
            )}
            {upcoming.map(event => (
              <article className={styles.eventCard} key={event.id}>
                <time>
                  <strong>{new Date(event.startsAt).toLocaleDateString("en-US", { day: "2-digit" })}</strong>
                  <span>{new Date(event.startsAt).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</span>
                </time>
                <div>
                  <p>{event.title}</p>
                  <h3>{event.venueName}</h3>
                  <span>{[event.city, event.state].filter(Boolean).join(", ")}</span>
                </div>
                <span className={styles.eventTime}>{new Date(event.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
              </article>
            ))}
          </div>
        </section>

        <section id="booking" className={styles.bookingSection}>
          <div className={styles.bookingIntro}>
            <p className={styles.kicker}>BOOKING</p>
            <h2>Put a date on the calendar.</h2>
            <p>Bars, wineries, weddings, corporate events, private parties, listening rooms, or something that does not fit neatly into a category. Solo acoustic can stay stripped down or expand with looping and drum machines for a fuller-band feel.</p>
          </div>

          <form className={styles.bookingForm} onSubmit={submitBooking}>
            <label>Name<input name="name" required /></label>
            <label>Email<input name="email" type="email" /></label>
            <label>Phone<input name="phone" /></label>
            <label>Date<input name="date" type="date" /></label>
            <label>Venue / event<input name="venue" /></label>
            <label>City / location<input name="location" /></label>
            <label>Event type<input name="eventType" placeholder="Venue, private event, winery…" /></label>
            <label>Estimated audience<input name="audience" /></label>
            <label>Budget / fee range<input name="budget" /></label>
            <label className={styles.fullField}>Tell me about the gig<textarea name="message" rows={5} /></label>
            <div className={styles.formFooter}>
              <button className={styles.primary} type="submit">Send inquiry</button>
              <span>{bookingStatus}</span>
            </div>
          </form>
        </section>

        <section id="story" className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>THE STORY SO FAR</p>
              <h2>Three currents, still moving</h2>
            </div>
            <p>Counterfist, the acoustic set, and A Taste For Crow have never behaved like tidy chapters. They overlap, disappear, return, and keep feeding the same instinct: follow the song wherever it wants to go.</p>
          </div>

          <div className={styles.chapterGrid}>
            <article className={styles.chapter}>
              <span className={styles.chapterNo}>01</span>
              <p className={styles.chapterLabel}>COUNTERFIST</p>
              <h3>1999–2012, roughly</h3>
              <p>Counterfist was the most explosive version of it: loud, physical, progressive/alternative rock built for clubs, volume, and a full band moving at once. George fronted the band through <em>Chiral</em>, <em>Vertical Mile</em>, and the <em>Give Up the Ghost</em> EP, with Seattle shows including The Showbox, Neumos, and El Corazón.</p>
              <div className={styles.textLinks}>
                <a href="https://music.apple.com/us/artist/counterfist/449060552" target="_blank" rel="noreferrer">Apple Music ↗</a>
                <a href="https://open.spotify.com/artist/0v55V86JsnB0FjvSlfkHzW" target="_blank" rel="noreferrer">Spotify ↗</a>
              </div>
            </article>

            <article className={styles.chapter}>
              <span className={styles.chapterNo}>02</span>
              <p className={styles.chapterLabel}>FROM THE SETLIST</p>
              <h3>2000–present</h3>
              <p>Running alongside the band years and continuing today: bars, wineries, wedding receptions, corporate rooms, and private events. Acoustic guitar, looping, and drum machines let one performer build the weight and movement of a full band without losing the intimacy of a solo set.</p>
              <a className={styles.inlineCta} href="#music">Hear the recordings →</a>
            </article>

            <article className={styles.chapter}>
              <span className={styles.chapterNo}>03</span>
              <p className={styles.chapterLabel}>A TASTE FOR CROW</p>
              <h3>The words came back</h3>
              <p><em>A Taste For Crow</em> began with one lonely songwriting session just after George got married, then went quiet lyrically for more than eleven years. After the marriage ended, the pain opened something again. Old instrumentals started finding new words and new lives. For George, writing is discovery more than assignment: the feeling arrives, the words follow, and once it starts there is very little choice but to let the song come through.</p>
              <a className={styles.inlineCta} href="#shows">See upcoming dates →</a>
            </article>
          </div>
        </section>

        <footer className={styles.footer}>
          <strong>GEORGE GRISSOM</strong>
          <span>Seattle, Washington</span>
          <div>
            <a href="#music">Music</a>
            <a href="#shows">Shows</a>
            <a href="#booking">Booking</a>
            <a href="/admin/login">Admin</a>
          </div>
          <small>© {new Date().getFullYear()} George Grissom</small>
        </footer>
      </main>

      <div className={styles.player} aria-label="Music player">
        <div className={styles.playerIdentity}>
          <span className={styles.playerMark}>GG</span>
          <div><strong>{current?.title || "Select a track"}</strong><small>{current?.seasons.join(" · ") || "George Grissom"}</small></div>
        </div>

        <div className={styles.controls}>
          <button onClick={previousTrack} aria-label="Previous track">‹</button>
          <button className={styles.playButton} onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>{playing ? "Ⅱ" : "▶"}</button>
          <button onClick={nextTrack} aria-label="Next track">›</button>
        </div>

        <div className={styles.wave} onClick={event => {
          const rect = event.currentTarget.getBoundingClientRect();
          seek(((event.clientX - rect.left) / rect.width) * 100);
        }}>
          {wave.map((height, index) => (
            <i key={index} style={{ height: `${height}%` }} className={(index / wave.length) * 100 <= progress ? styles.wavePlayed : ""} />
          ))}
        </div>

        <div className={styles.time}><span>{elapsed}</span><b>/</b><span>{duration}</span></div>
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}
