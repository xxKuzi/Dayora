import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dayora",
    short_name: "Dayora",
    description: "Organize your daily plan with AI assistance.",
    start_url: "/",
    display: "standalone",
    background_color: "#090d16",
    theme_color: "#76376b",
    icons: [
      {
        src: "/logo-icon.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo-icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
