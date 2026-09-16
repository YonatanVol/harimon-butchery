/**
 * The shop's identity. This is a fictional demo brand — changing the name is one edit here.
 */
export const brand = {
  name: { he: "קצביית הרימון", en: "Harimon Butchery" },
  tagline: {
    he: "בשר ועוף טריים, כשרים למהדרין, עד הבית",
    en: "Fresh kosher meat and poultry, delivered",
  },
  isDemo: true,
  /** The shop's WhatsApp number in E.164, for "ask the butcher". Empty while this is a demo brand. */
  whatsappE164: "" as string,
} as const;
