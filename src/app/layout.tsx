import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TKA SD",
  description: "Fondasi aplikasi TKA SD.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
