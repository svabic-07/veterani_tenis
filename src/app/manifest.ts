import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Teniski Veterani Srbije",
    short_name: "TVS",
    description:
      "Zvanični informacioni sistem — kalendar, žreb i rezultati, rang liste i profili igrača.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F3EC",
    theme_color: "#15233A",
    lang: "sr",
    dir: "ltr",
    orientation: "portrait",
    categories: ["sports"],
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/manifest-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/manifest-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/manifest-icon/192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/manifest-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
