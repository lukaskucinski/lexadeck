import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LexaDeck",
    short_name: "LexaDeck",
    description: "A typographic language learning flashcard studio",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAF6",
    theme_color: "#FAFAF6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
