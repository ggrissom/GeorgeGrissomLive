import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-static";

const audioExtensions = new Set([".mp3", ".m4a", ".wav", ".ogg", ".aac"]);
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function listPublicFiles(directory: string, extensions: Set<string>) {
  const fullPath = path.join(process.cwd(), "public", directory);

  if (!fs.existsSync(fullPath)) {
    return [];
  }

  return fs
    .readdirSync(fullPath)
    .filter((file) => extensions.has(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => ({
      name: path.basename(file, path.extname(file)).replace(/[-_]+/g, " "),
      src: `/${directory}/${file}`,
    }));
}

export default function Home() {
  const songs = listPublicFiles("audio", audioExtensions);
  const photos = listPublicFiles("images", imageExtensions);

  const bookingEmail = "booking@georgegrissom.com";
  const bookingSubject = encodeURIComponent("Booking inquiry for George Grissom Live");
  const bookingBody = encodeURIComponent(
    "Hi George,\n\nI would like to book you for a gig.\n\nDate:\nVenue/Event:\nCity:\nBudget:\nContact phone:\n\nThanks,"
  );
  const bookingHref = `mailto:${bookingEmail}?subject=${bookingSubject}&body=${bookingBody}`;

  return (
    <main className="site-shell">
      <section className="hero">
        <p className="eyebrow">Live Music • Bookings Open</p>
        <h1>George Grissom Live</h1>
        <p className="hero-copy">
          Songs, photos, and quick booking info for venues, private events, and live shows.
        </p>
        <div className="hero-actions">
          <a className="button primary" href={bookingHref}>Book George</a>
          <a className="button secondary" href="#songs">Hear Songs</a>
        </div>
      </section>

      <section id="songs" className="section">
        <div className="section-heading">
          <p className="eyebrow">Showcase</p>
          <h2>Songs</h2>
        </div>

        {songs.length > 0 ? (
          <div className="song-grid">
            {songs.map((song) => (
              <article className="card" key={song.src}>
                <h3>{song.name}</h3>
                <audio controls preload="metadata" src={song.src}>
                  Your browser does not support audio playback.
                </audio>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">Upload songs to public/audio and they will appear here automatically.</p>
        )}
      </section>

      <section id="photos" className="section">
        <div className="section-heading">
          <p className="eyebrow">Gallery</p>
          <h2>Photos</h2>
        </div>

        {photos.length > 0 ? (
          <div className="photo-grid">
            {photos.map((photo) => (
              <img key={photo.src} src={photo.src} alt={`George Grissom live photo: ${photo.name}`} />
            ))}
          </div>
        ) : (
          <p className="empty-state">Upload photos to public/images and they will appear here automatically.</p>
        )}
      </section>

      <section id="booking" className="booking-card">
        <p className="eyebrow">Booking</p>
        <h2>Book George for your event</h2>
        <p>
          Send the date, venue, city, event type, and budget. George will follow up directly.
        </p>
        <a className="button primary" href={bookingHref}>Email {bookingEmail}</a>
      </section>
    </main>
  );
}
