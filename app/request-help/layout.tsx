import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request Help | FloodWatch Tak",
  description: "Submit a flood assistance request for the five western Tak districts.",
};

export default function RequestHelpLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
