import { setRequestLocale } from "next-intl/server";
import { SiteFooter } from "@/ui/shop/SiteFooter";
import { SiteHeader } from "@/ui/shop/SiteHeader";

export default async function ShopLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <SiteHeader />
      <main id="main" className="min-h-[60dvh]">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
