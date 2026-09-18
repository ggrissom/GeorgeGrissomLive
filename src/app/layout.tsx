import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "George Grissom | Music, Live Shows & Booking",
  description: "George Grissom — Seattle musician, songwriter and performer. Counterfist, From the Setlist, and A Taste For Crow: stream the music, see upcoming shows, and book a performance."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
