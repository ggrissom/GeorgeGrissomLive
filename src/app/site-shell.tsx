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

type Track = {
  slug: string;
  title: string;
  era: "now" | "archive";
};

const wave = [34,52,44,72,62,38,58,78,46,66,84,54,42,74,91,66,48,70,55,81,63,44,73,88,51,69,39,76,58,83,47,72,93,60,42,67,79,53,70,86,46,61,77,55,89,64,48,74,58,82,45,68,90,57,41,73,85,52,62,76,49,71,87,56];

export default function SiteShell({
  initialEvents,
  tracks
}: {
  initialEvents: EventRow[];
  tracks: Track[];
}) {
  const [activeTrack, setActiveTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "now" | "archive">("all");
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const [bookingStatus, setBookingStatus] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = tracks[activeTrack];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tracks.filter(track => {
      const eraMatch = filter === "all" || track.era === filter;
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
    const index = tracks.findIndex(item => item.slug === track.slug);
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
    setActiveTrack(index => (index - 1 + tracks.length) % tracks.length);
    setTimeout(() => audioRef.current?.play().catch(() => setPlaying(false)), 0);
  }

  function nextTrack() {
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
    const form = new FormData(event.currentTarget);
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
      event.currentTarget.reset();
    } else {
      setBookingStatus("Could not send. Try again in a moment.");
    }
  }

  return (
    <div className={styles.site}>
      <audio ref={audioRef} src={current ? `/api/public-audio/${encodeURIComponent(current.slug)}` : undefined} preload="metadata" />

      <aside className={styles.rail} aria-label="Site navigation">
        <a className={styles.railMark} href="#home" aria-label="George Grissom home">GG</a>
        <nav>
          <a href="#home" title="Home">⌂</a>
          <a href="#chapters" title="Story">◇</a>
          <a href="#music" title="Music">▤</a>
          <a href="#shows" title="Shows">▦</a>
          <a href="#booking" title="Booking">＋</a>
        </nav>
      </aside>

      <main className={styles.main}>
        <section id="home" className={styles.hero}>
          <div className={styles.heroTexture} />
          <div className={styles.heroContent}>
            <p className={styles.kicker}>SEATTLE · SONGWRITER · PERFORMER</p>
            <h1>George<br />Grissom</h1>
            <p className={styles.lead}>Three chapters. One catalog. Music built for loud rooms, close rooms, and everything between.</p>
            <div className={styles.actions}>
              <button onClick={togglePlay} className={styles.primary}>{playing ? "Pause" : "Listen now"}</button>
              <a href="#shows" className={styles.secondary}>Shows</a>
              <a href="#booking" className={styles.secondary}>Book George</a>
            </div>
          </div>
          <div className={styles.heroMonogram} aria-hidden="true">
            <span>G</span><span>G</span>
          </div>
        </section>

        <section id="chapters" className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>THE LONG VERSION, CUT SHORT</p>
              <h2>Three seasons</h2>
            </div>
            <p>Not a reinvention. A through-line—from Seattle stages, to stripped-down rooms, to the recordings and performances happening now.</p>
          </div>

          <div className={styles.chapterGrid}>
            <article className={styles.chapter}>
              <span className={styles.chapterNo}>01</span>
              <p className={styles.chapterLabel}>COUNTERFIST</p>
              <h3>The band years</h3>
              <p>George fronted Seattle progressive/alternative rock band Counterfist. The catalog includes <em>Chiral</em>, <em>Vertical Mile</em>, and the <em>Give Up the Ghost</em> EP, with documented Seattle shows at The Showbox, Neumos, and El Corazón.</p>
              <div className={styles.textLinks}>
                <a href="https://music.apple.com/us/artist/counterfist/449060552" target="_blank" rel="noreferrer">Apple Music ↗</a>
                <a href="https://open.spotify.com/artist/0v55V86JsnB0FjvSlfkHzW" target="_blank" rel="noreferrer">Spotify ↗</a>
              </div>
            </article>

            <article className={styles.chapter}>
              <span className={styles.chapterNo}>02</span>
              <p className={styles.chapterLabel}>SOLO / ACOUSTIC</p>
              <h3>The room gets closer</h3>
              <p>Electric history stripped to voice, guitar, rhythm, and the song itself. Built for intimate rooms where the performance has nowhere to hide.</p>
              <a className={styles.inlineCta} href="#music">Hear the recordings →</a>
            </article>

            <article className={styles.chapter}>
              <span className={styles.chapterNo}>03</span>
              <p className={styles.chapterLabel}>GEORGE GRISSOM LIVE</p>
              <h3>What is happening now</h3>
              <p>Current originals, works in progress, live dates, and the evolving archive. The player below opens the full working catalog currently online.</p>
              <a className={styles.inlineCta} href="#shows">See upcoming dates →</a>
            </article>
          </div>
        </section>

        <section id="music" className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>THE RECORDS + THE WORKBENCH</p>
              <h2>Music</h2>
            </div>
            <p>{tracks.length} playable files from the current master inventory. No paywall here; sales comes next.</p>
          </div>

          <div className={styles.musicTools}>
            <div className={styles.filters}>
              <button className={filter === "all" ? styles.activeFilter : ""} onClick={() => setFilter("all")}>All</button>
              <button className={filter === "now" ? styles.activeFilter : ""} onClick={() => setFilter("now")}>Current / solo</button>
              <button className={filter === "archive" ? styles.activeFilter : ""} onClick={() => setFilter("archive")}>Counterfist archive</button>
            </div>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tracks" aria-label="Search tracks" />
          </div>

          <div className={styles.trackGrid}>
            {filtered.map(track => {
              const index = tracks.findIndex(item => item.slug === track.slug);
              const selected = index === activeTrack;
              return (
                <button key={track.slug} className={selected ? styles.trackActive : styles.track} onClick={() => selectTrack(track)}>
                  <span className={styles.trackIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.trackTitle}>{track.title}</span>
                  <span className={styles.trackEra}>{track.era === "archive" ? "ARCHIVE" : "PLAY"}</span>
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
            <p>Venue, private event, winery, bar, listening room, or something that does not fit neatly into a category.</p>
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

        <footer className={styles.footer}>
          <strong>GEORGE GRISSOM</strong>
          <span>Seattle, Washington</span>
          <div>
            <a href="#music">Music</a>
            <a href="#shows">Shows</a>
            <a href="#booking">Booking</a>
          </div>
          <small>© {new Date().getFullYear()} George Grissom</small>
        </footer>
      </main>

      <div className={styles.player} aria-label="Music player">
        <div className={styles.playerIdentity}>
          <span className={styles.playerMark}>GG</span>
          <div><strong>{current?.title || "Select a track"}</strong><small>{current?.era === "archive" ? "Counterfist archive" : "George Grissom"}</small></div>
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
