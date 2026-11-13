import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Morning Feed",
    short_name: "Morning",
    description: "Today's newsletters, ready before your commute.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F5F7F8",
    theme_color: "#F5F7F8",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
    ],
  };
}
