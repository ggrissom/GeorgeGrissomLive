import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "George Grissom Live",
  description: "Live music, requests, tips, jukebox, calendar, and fan uploads for George Grissom."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
