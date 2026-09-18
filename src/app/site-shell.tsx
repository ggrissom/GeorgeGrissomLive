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

const wave = [34,52,44,72,62,38,58,78,46,66,84,54,42,74,91,66,48,70,55,81,63,44,73,88,51,69,39,76,58,83,47,72,93,60,42,67,79,53,70,86,46,61,77,55,89,64,48,74,58,82,45,68,90,57,41,73,85,52,62,76,49,71,87,56];

export default function SiteShell({
  initialEvents,
  tracks,
  siteContent,
  defaultTrackId,
  calendarWebcalUrl,
  googleCalendarSubscribeUrl
}: {
  initialEvents: EventRow[];
  tracks: Track[];
  siteContent: SiteContent;
  defaultTrackId?: string | null;
  calendarWebcalUrl: string;
  googleCalendarSubscribeUrl: string;
}) {
  const [activeTrack, setActiveTrack] = useState(() => {
    const configuredIndex = defaultTrackId
      ? tracks.findIndex(track => track.id === defaultTrackId)
      : -1;
    if (configuredIndex >= 0) return configuredIndex;

    const fallbackIndex = tracks.findIndex(track => track.slug === "what-a-shame");
    return fallbackIndex >= 0 ? fallbackIndex : 0;
  });
  const [playing, setPlaying] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | PlayerSeason>("From the Setlist");
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const [bookingStatus, setBookingStatus] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoplayAfterTrackChangeRef = useRef(false);

  const playableTracks = useMemo(
    () => tracks.filter(track =>
      track.seasons.includes("From the Setlist") || track.seasons.includes("A Taste For Crow")
    ),
    [tracks]
  );

  const current = tracks[activeTrack];

  const visibleTracks = useMemo(() => {
    if (filter === "Counterfist Archive") return [];
    const q = query.trim().toLowerCase();
    return playableTracks.filter(track => {
      const playlistMatch = filter === "all" || track.seasons.includes(filter);
      const textMatch = !q || track.title.toLowerCase().includes(q);
      return playlistMatch && textMatch;
    });
  }, [playableTracks, query, filter]);

  const upcoming = useMemo(
    () => initialEvents
      .filter(event => new Date(event.startsAt).getTime() >= Date.now() - 86400000)
      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
      .slice(0, 6),
    [initialEvents]
  );



  useEffect(() => {
    const pauseForBackground = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden || !document.hasFocus()) {
        audio.pause();
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) pauseForBackground();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", pauseForBackground);
    window.addEventListener("blur", pauseForBackground);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", pauseForBackground);
      window.removeEventListener("blur", pauseForBackground);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (filter === "Counterfist Archive") {
      audio.pause();
      setPlaying(false);
      return;
    }

    if (visibleTracks.length && (!current || !visibleTracks.some(track => track.id === current.id))) {
      audio.pause();
      setPlaying(false);
      const next = visibleTracks[0];
      const index = tracks.findIndex(track => track.id === next.id);
      if (index >= 0) setActiveTrack(index);
    }
  }, [filter, query, visibleTracks, current, tracks]);

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

  useEffect(() => {
    if (!autoplayAfterTrackChangeRef.current) return;
    const audio = audioRef.current;
    if (!audio || filter === "Counterfist Archive") {
      autoplayAfterTrackChangeRef.current = false;
      return;
    }

    autoplayAfterTrackChangeRef.current = false;
    audio.load();
    audio.play().catch(() => setPlaying(false));
  }, [activeTrack, filter]);

  function activateAndPlay(index: number) {
    if (index < 0 || index >= tracks.length) return;

    const audio = audioRef.current;
    if (index === activeTrack) {
      if (!audio || filter === "Counterfist Archive") return;
      audio.currentTime = 0;
      audio.play().catch(() => setPlaying(false));
      return;
    }

    autoplayAfterTrackChangeRef.current = true;
    setActiveTrack(index);
  }

  function selectTrack(track: Track) {
    const index = tracks.findIndex(item => item.id === track.id);
    activateAndPlay(index);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || filter === "Counterfist Archive" || !current) return;
    if (audio.paused) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }

  function moveInVisibleQueue(direction: 1 | -1) {
    if (!visibleTracks.length) return;
    const currentVisibleIndex = current
      ? visibleTracks.findIndex(track => track.id === current.id)
      : -1;
    const base = currentVisibleIndex >= 0 ? currentVisibleIndex : 0;
    const nextVisibleIndex = (base + direction + visibleTracks.length) % visibleTracks.length;
    const target = visibleTracks[nextVisibleIndex];
    const globalIndex = tracks.findIndex(track => track.id === target.id);
    activateAndPlay(globalIndex);
  }

  function previousTrack() {
    moveInVisibleQueue(-1);
  }

  function nextTrack() {
    moveInVisibleQueue(1);
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
      <audio
        ref={audioRef}
        playsInline
        src={current && filter !== "Counterfist Archive"
          ? `/api/public-audio/${encodeURIComponent(current.id)}`
          : undefined}
        preload="metadata"
      />

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
            <p className={styles.lead}>{siteContent.heroLead}</p>
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

        <section id="music" className={`${styles.section} ${styles.musicSection}`}>
          <div className={styles.musicBackdrop} aria-hidden="true" />
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>LISTEN</p>
              <h2>Music</h2>
            </div>
            <p>
              {filter === "Counterfist Archive"
                ? "Counterfist releases are linked out for listening."
                : `${visibleTracks.length} songs in this view. The player stays inside the playlist you select.`}
            </p>
          </div>

          <div className={styles.musicTools}>
            <div className={styles.filters}>
              <button className={filter === "From the Setlist" ? styles.activeFilter : ""} onClick={() => setFilter("From the Setlist")}>From the Setlist</button>
              <button className={filter === "A Taste For Crow" ? styles.activeFilter : ""} onClick={() => setFilter("A Taste For Crow")}>A Taste For Crow</button>
              <button className={filter === "Counterfist Archive" ? styles.activeFilter : ""} onClick={() => setFilter("Counterfist Archive")}>Counterfist Archive</button>
              <button className={filter === "all" ? styles.activeFilter : ""} onClick={() => setFilter("all")}>ALL</button>
            </div>
            {filter !== "Counterfist Archive" && (
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search visible tracks" aria-label="Search visible tracks" />
            )}
          </div>

          {filter === "Counterfist Archive" ? (
            <div className={styles.releaseStrip}>
              <article>
                <span>2001</span><strong>Chiral</strong><p>Counterfist</p>
                <div className={styles.serviceLinks} aria-label="Listen to Chiral">
                  <a className={styles.serviceLink} href="https://music.apple.com/us/album/chiral/156372683" target="_blank" rel="noreferrer" aria-label="Chiral on Apple Music">
                    <img src="https://cdn.simpleicons.org/applemusic/101726" alt="" aria-hidden="true" />
                    <em>Apple Music</em>
                  </a>
                  <a className={styles.serviceLink} href="https://music.amazon.com/albums/B0014MZOOA" target="_blank" rel="noreferrer" aria-label="Chiral on Amazon Music">
                    <img src="https://cdn.simpleicons.org/amazonmusic/101726" alt="" aria-hidden="true" />
                    <em>Amazon Music</em>
                  </a>
                  <a className={styles.serviceLink} href="https://open.spotify.com/album/0uIyAu42KZ8s4tAOd3tJTw" target="_blank" rel="noreferrer" aria-label="Chiral on Spotify">
                    <img src="https://cdn.simpleicons.org/spotify/101726" alt="" aria-hidden="true" />
                    <em>Spotify</em>
                  </a>
                </div>
              </article>
              <article>
                <span>2008</span><strong>Vertical Mile</strong><p>Counterfist</p>
                <div className={styles.serviceLinks} aria-label="Listen to Vertical Mile">
                  <a className={styles.serviceLink} href="https://music.apple.com/us/album/vertical-mile/281859479" target="_blank" rel="noreferrer" aria-label="Vertical Mile on Apple Music">
                    <img src="https://cdn.simpleicons.org/applemusic/101726" alt="" aria-hidden="true" />
                    <em>Apple Music</em>
                  </a>
                  <a className={styles.serviceLink} href="https://music.amazon.com/albums/B001B85JV0" target="_blank" rel="noreferrer" aria-label="Vertical Mile on Amazon Music">
                    <img src="https://cdn.simpleicons.org/amazonmusic/101726" alt="" aria-hidden="true" />
                    <em>Amazon Music</em>
                  </a>
                  <a className={styles.serviceLink} href="https://open.spotify.com/album/4NtQ8p7GN8aZH0JjkFqh4f" target="_blank" rel="noreferrer" aria-label="Vertical Mile on Spotify">
                    <img src="https://cdn.simpleicons.org/spotify/101726" alt="" aria-hidden="true" />
                    <em>Spotify</em>
                  </a>
                </div>
              </article>
              <article>
                <span>2011</span><strong>Give Up the Ghost</strong><p>Counterfist EP</p>
                <div className={styles.serviceLinks} aria-label="Listen to Give Up the Ghost">
                  <a className={styles.serviceLink} href="https://music.apple.com/us/album/give-up-the-ghost-ep/1063852643" target="_blank" rel="noreferrer" aria-label="Give Up the Ghost on Apple Music">
                    <img src="https://cdn.simpleicons.org/applemusic/101726" alt="" aria-hidden="true" />
                    <em>Apple Music</em>
                  </a>
                  <a className={styles.serviceLink} href="https://music.amazon.com/albums/B018UFQR58" target="_blank" rel="noreferrer" aria-label="Give Up the Ghost on Amazon Music">
                    <img src="https://cdn.simpleicons.org/amazonmusic/101726" alt="" aria-hidden="true" />
                    <em>Amazon Music</em>
                  </a>
                  <a className={styles.serviceLink} href="https://open.spotify.com/album/7fIv8iii2eePrvHd3ANECb" target="_blank" rel="noreferrer" aria-label="Give Up the Ghost on Spotify">
                    <img src="https://cdn.simpleicons.org/spotify/101726" alt="" aria-hidden="true" />
                    <em>Spotify</em>
                  </a>
                </div>
              </article>
            </div>
          ) : (
            <div className={styles.trackGrid}>
              {visibleTracks.map((track, visibleIndex) => {
                const index = tracks.findIndex(item => item.id === track.id);
                const selected = index === activeTrack;
                const tag = filter !== "all"
                  ? (filter === "From the Setlist" ? "SETLIST" : "CROW")
                  : track.seasons
                      .filter(season => season !== "Counterfist Archive")
                      .map(season => season === "From the Setlist" ? "SETLIST" : "CROW")
                      .join(" / ");
                return (
                  <button key={track.id} className={selected ? styles.trackActive : styles.track} onClick={() => selectTrack(track)}>
                    <span className={styles.trackIndex}>{String(visibleIndex + 1).padStart(2, "0")}</span>
                    <span className={styles.trackTitle}>{track.title}</span>
                    <span className={styles.trackEra}>{tag}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section id="shows" className={styles.showSection}>
          <div className={styles.showGlow} />
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>LIVE</p>
              <h2>Upcoming shows</h2>
            </div>
            <p>Public dates from George&apos;s performance calendar.</p>
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

          <div className={styles.showCalendarTools}>
            <div>
              <a className={styles.calendarSubscribe} href={calendarWebcalUrl}>Subscribe to calendar</a>
              <a
                className={styles.calendarSubscribeSecondary}
                href={googleCalendarSubscribeUrl}
                target="_blank"
                rel="noreferrer"
              >
                Google Calendar ↗
              </a>
            </div>
          </div>
        </section>

        <section id="booking" className={styles.bookingSection}>
          <div className={styles.bookingIntro}>
            <p className={styles.kicker}>BOOKING</p>
            <h2>Put a date on the calendar.</h2>
            <p>{siteContent.bookingIntro}</p>
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
            <p>{siteContent.storyIntro}</p>
          </div>

          <div className={styles.chapterGrid}>
            <article className={styles.chapter}>
              <span className={styles.chapterNo}>01</span>
              <p className={styles.chapterLabel}>COUNTERFIST</p>
              <h3>{siteContent.counterfistHeading}</h3>
              <p>{siteContent.counterfistBody}</p>
              <p className={styles.storyContext}>{siteContent.heroProof}</p>
              <div className={styles.textLinks}>
                <a href="https://music.apple.com/us/artist/counterfist/449060552" target="_blank" rel="noreferrer">Apple Music ↗</a>
                <a href="https://open.spotify.com/artist/0v55V86JsnB0FjvSlfkHzW" target="_blank" rel="noreferrer">Spotify ↗</a>
              </div>
            </article>

            <article className={styles.chapter}>
              <span className={styles.chapterNo}>02</span>
              <p className={styles.chapterLabel}>FROM THE SETLIST</p>
              <h3>{siteContent.setlistHeading}</h3>
              <p>{siteContent.setlistBody}</p>
              <a className={styles.inlineCta} href="#music">Hear the recordings →</a>
            </article>

            <article className={styles.chapter}>
              <span className={styles.chapterNo}>03</span>
              <p className={styles.chapterLabel}>A TASTE FOR CROW</p>
              <h3>{siteContent.crowHeading}</h3>
              <p>{siteContent.crowBody}</p>
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

      {filter !== "Counterfist Archive" && current && visibleTracks.length > 0 && (
        <div className={styles.player} aria-label="Music player">
          <div className={styles.playerIdentity}>
            <span className={styles.playerMark}>GG</span>
            <div><strong>{current.title}</strong><small>{filter === "all" ? current.seasons.filter(season => season !== "Counterfist Archive").join(" · ") : filter}</small></div>
          </div>

          <div className={styles.controls}>
            <button onClick={previousTrack} aria-label="Previous visible track">‹</button>
            <button className={`${styles.playButton} ${!playing ? styles.playPrompt : ""}`} onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>{playing ? "Ⅱ" : "▶"}</button>
            <button onClick={nextTrack} aria-label="Next visible track">›</button>
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
      )}
    </div>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}
