import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Floodwatch | Flood Operations Dashboard",
  description: "Flood warning operations dashboard for Tak Province, Thailand.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
