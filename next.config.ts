import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (public buckets: foto, galerija, dokumenti)
      { protocol: "https", hostname: "ckfbofnjgotarmpiphgz.supabase.co" },
    ],
  },
};

export default withNextIntl(nextConfig);
