import type { MetadataRoute } from "next";

/** What phones, tablets and computers need to install the site as an app (icon, name, colours). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Zero-2-Hero English",
    short_name: "Zero-2-Hero",
    description:
      "Learn English step by step: lessons, practice and progress for schools and learners.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0e223d",
    theme_color: "#0e223d",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
