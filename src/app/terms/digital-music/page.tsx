export const metadata = {
  title: "Digital Music License & Purchase Terms | George Grissom",
  description: "License and purchase terms for digital music sold on GeorgeGrissom.com."
};

export default function DigitalMusicTermsPage() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#07101d",
      color: "#d6dbe3",
      padding: "clamp(48px, 8vw, 96px) clamp(22px, 8vw, 120px)",
      fontFamily: "Arial, Helvetica, sans-serif"
    }}>
      <article style={{ maxWidth: 820, margin: "0 auto", lineHeight: 1.7 }}>
        <p style={{ color: "#ff3154", letterSpacing: ".14em", fontSize: 12, fontWeight: 700 }}>
          GEORGE GRISSOM · DIGITAL MUSIC
        </p>
        <h1 style={{ color: "#fff", fontSize: "clamp(36px, 6vw, 64px)", lineHeight: 1.05, margin: "12px 0 20px" }}>
          Digital Music License &amp; Purchase Terms
        </h1>
        <p style={{ color: "#8f99a9" }}>Effective September 27, 2026</p>

        <h2 style={{ color: "#fff", marginTop: 42 }}>1. What you are buying</h2>
        <p>
          A purchase of a digital track gives you a copy of the identified audio file and the limited license below.
          It does not transfer ownership of the sound recording, musical composition, lyrics, artwork, trademarks,
          or any other intellectual-property rights.
        </p>

        <h2 style={{ color: "#fff", marginTop: 34 }}>2. Personal-use license</h2>
        <p>
          After payment, you receive a non-exclusive, non-transferable license to download, store, make reasonable
          personal backup copies of, and play the purchased recording for your own personal, non-commercial use.
          This license continues as long as you comply with these terms.
        </p>

        <h2 style={{ color: "#fff", marginTop: 34 }}>3. Rights not included</h2>
        <p>
          Unless George Grissom gives you separate written permission, you may not resell, redistribute, share,
          publicly post, upload to a file-sharing service, sublicense, or give copies of the purchased file to
          other people. The purchase does not grant synchronization, advertising, commercial-use, sampling,
          remix, derivative-work, broadcast, or public-performance rights.
        </p>

        <h2 style={{ color: "#fff", marginTop: 34 }}>4. Copyright</h2>
        <p>
          Copyright and all rights not expressly granted remain with George Grissom and any other applicable
          rightsholders. Copyright notices and metadata supplied with the recording remain part of the work and
          may not be intentionally removed to facilitate unauthorized distribution.
        </p>

        <h2 style={{ color: "#fff", marginTop: 34 }}>5. Pre-orders</h2>
        <p>
          A product identified as a pre-order is purchased before final delivery. Its checkout description controls
          the expected product and format. A pre-order does not create an immediate download entitlement unless the
          product page expressly says otherwise.
        </p>

        <h2 style={{ color: "#fff", marginTop: 34 }}>6. Delivery problems and refunds</h2>
        <p>
          If a paid download cannot be delivered or the file is defective, use the booking/contact form on this
          site so the purchase can be verified and the file re-delivered or otherwise resolved. Nothing in these
          terms limits rights that cannot legally be waived under applicable consumer law.
        </p>

        <h2 style={{ color: "#fff", marginTop: 34 }}>7. Commercial or creative licensing</h2>
        <p>
          For synchronization, film/video, commercial, sampling, remix, broadcast, public-performance, or other
          licensing beyond personal listening, request a separate license directly from George Grissom.
        </p>

        <p style={{ marginTop: 48 }}>
          <a href="/#booking" style={{ color: "#ff3154" }}>Request a separate license or contact George →</a>
        </p>
        <p>
          <a href="/#music" style={{ color: "#c7cfda" }}>← Back to music</a>
        </p>
      </article>
    </main>
  );
}
