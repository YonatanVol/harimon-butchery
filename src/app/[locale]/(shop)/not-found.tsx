import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("shop.notFound");
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-24 sm:px-6">
      <p className="text-wine-600 text-sm font-semibold tabular-nums">404</p>
      <h1 className="font-display text-4xl font-light md:text-5xl">{t("title")}</h1>
      <p className="font-reading text-char-700 text-lg">{t("body")}</p>
      <Link href="/" className="bg-char-900 text-bone-50 inline-flex min-h-12 items-center rounded-[2px] px-6 font-medium">
        {t("back")}
      </Link>
    </div>
  );
}
