import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Sve rute osim API, Next internih fajlova, i fajlova sa ekstenzijom.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
