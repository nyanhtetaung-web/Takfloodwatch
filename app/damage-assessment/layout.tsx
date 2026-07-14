import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Damage Assessment | FloodWatch Tak",
  description: "Submit a structured flood damage assessment for the five western Tak districts.",
};

export default function DamageAssessmentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
