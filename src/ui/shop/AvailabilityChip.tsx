import { getFormatter, getTranslations } from "next-intl/server";
import type { Availability } from "@/domain/catalog/availability";
import { Badge } from "../primitives/Badge";

export async function AvailabilityChip({ availability }: { availability: Availability }) {
  const t = await getTranslations("shop.availability");
  const format = await getFormatter();

  if (availability.kind === "IN_STOCK") return <Badge tone="ok">{t("IN_STOCK")}</Badge>;
  if (availability.kind === "LOW") return <Badge tone="warn">{t("LOW")}</Badge>;
  return (
    <Badge tone="bad">
      {availability.restockDate
        ? t("OUT_restock", { date: formatRestock(format, availability.restockDate) })
        : t("OUT")}
    </Badge>
  );
}

export function formatRestock(format: Awaited<ReturnType<typeof getFormatter>>, isoDate: string) {
  return format.dateTime(new Date(`${isoDate}T12:00:00Z`), { weekday: "short", day: "numeric", month: "numeric" });
}
