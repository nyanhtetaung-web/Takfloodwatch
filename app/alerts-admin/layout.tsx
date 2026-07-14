import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FloodWatch | Staff Alert Desk",
  description: "Protected review and publishing desk for Western Tak flood warnings.",
};

export default function AlertsAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
