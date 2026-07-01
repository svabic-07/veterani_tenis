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
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
    ],
  };
}
