import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "George Grissom Music",
  description: "Original music and live acoustic performance from Seattle-area singer-songwriter George Grissom."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
