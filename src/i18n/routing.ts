import { defineRouting } from "next-intl/routing";

/**
 * i18n rute — srpski (default, bez prefiksa) + engleski (/en).
 * localePrefix "as-needed": SR URL = "/kalendar", EN URL = "/en/kalendar".
 */
export const routing = defineRouting({
  locales: ["sr", "en"],
  defaultLocale: "sr",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
