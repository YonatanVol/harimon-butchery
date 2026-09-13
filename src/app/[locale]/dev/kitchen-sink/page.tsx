import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import en from "@/i18n/messages/en.json";
import he from "@/i18n/messages/he.json";
import { KitchenSink } from "./KitchenSink";

export const metadata: Metadata = {
  title: "Kitchen sink",
  robots: { index: false, follow: false },
};

export default async function KitchenSinkPage({ params }: PageProps<"/[locale]/dev/kitchen-sink">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <KitchenSink messages={{ he, en }} />;
}
