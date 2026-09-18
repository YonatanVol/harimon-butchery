import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals, the phone's icons, and files with an extension.
  matcher: "/((?!api|icons|apple-icon|_next|_vercel|.*\\..*).*)",
};
