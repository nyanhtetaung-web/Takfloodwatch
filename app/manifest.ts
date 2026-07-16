import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FloodWatch Tak",
    short_name: "FloodWatch",
    description: "Flood warning operations dashboard for five western Tak districts.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#145f5a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
