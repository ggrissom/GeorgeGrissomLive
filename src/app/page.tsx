import fs from "node:fs";
import path from "node:path";
import { JukeboxPlayer, type SongForJukebox } from "@/components/JukeboxPlayer";

export const dynamic = "force-static";

const audioExtensions = new Set([".mp3", ".m4a", ".wav", ".ogg", ".aac"]);
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function titleFromFile(file: string) {
  return path
    .basename(file, path.extname(file))
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slugFromFile(file: string) {
  return path
    .basename(file, path.extname(file))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function listSongs(): SongForJukebox[] {
  const directory = "audio";
  const fullPath = path.join(process.cwd(), "public", directory);

  if (!fs.existsSync(fullPath)) {
    return [];
  }

  return fs
    .readdirSync(fullPath)
    .filter((file) => audioExtensions.has(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => ({
      slug: slugFromFile(file),
      title: titleFromFile(file),
      src: `/${directory}/${file}`,
      priceCents: 200,
    }));
}

function listPhotos() {
  const directory = "images";
  const fullPath = path.join(process.cwd(), "public", directory);

  if (!fs.existsSync(fullPath)) {
    return [];
  }

  return fs
    .readdirSync(fullPath)
    .filter((file) => {
      if (file === "reference-jukebox.png") return false;
      return imageExtensions.has(path.extname(file).toLowerCase());
    })
    .sort((a, b) => a.localeCompare(b))
    .map((file) => ({
      name: titleFromFile(file),
      src: `/${directory}/${file}`,
    }));
}

export default function Home() {
  const songs = listSongs();
  const photos = listPhotos();

  return (
    <main className="gg-page">
      <section className="gg-hero">
        <p className="gg-kicker">George Grissom Music</p>
        <h1>Songs for people who’ve lived a little.</h1>
        <p>
          Original songs, live acoustic sets, and a voice that leaves a mark.
        </p>
        <div className="gg-hero-actions">
          <a className="gg-button gg-button-primary" href="mailto:booking@georgegrissom.com?subject=Booking%20George%20Grissom%20Live">
            Book George
          </a>
          <a className="gg-button gg-button-secondary" href="#jukebox">
            Hear the Music
          </a>
        </div>
      </section>

      <section id="jukebox" className="gg-section">
        <JukeboxPlayer songs={songs} />
      </section>

      <section className="gg-section">
        <div className="gg-section-heading">
          <p className="gg-kicker">Photos</p>
          <h2>Caught in the act.</h2>
        </div>

        {photos.length > 0 ? (
          <div className="gg-photo-grid">
            {photos.map((photo) => (
              <img key={photo.src} src={photo.src} alt={`George Grissom live photo: ${photo.name}`} />
            ))}
          </div>
        ) : (
          <p className="gg-empty">New photos are coming soon.</p>
        )}
      </section>

      <section className="gg-section gg-booking">
        <p className="gg-kicker">Booking</p>
        <h2>Put George on the bill.</h2>
        <p>Send the date, place, crowd, budget, and the best number to reach you. George will take it from there.</p>
        <a className="gg-button gg-button-primary" href="mailto:booking@georgegrissom.com?subject=Booking%20George%20Grissom%20Live">
          Start the conversation
        </a>
      </section>
    </main>
  );
}
