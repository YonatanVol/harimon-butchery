import { notFound } from "next/navigation";

/** Any unknown URL under a locale renders the localized not-found page inside the shop layout. */
export default function CatchAll() {
  notFound();
}
