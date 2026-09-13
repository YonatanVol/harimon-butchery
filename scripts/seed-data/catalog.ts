/**
 * Demo catalog. Prices are indicative Israeli retail ₪/kg (VAT included) and fictional.
 * Kashrut authorities are invented and do not represent any real certification body.
 */

export type Occasion = "SHABBAT" | "GRILL" | "HOLIDAY" | "SLOW_COOK" | "WEEKNIGHT";
export type Flag = "REQUIRES_BROILING_TZLIYA" | "REQUIRES_SALTING" | "FROZEN" | "BONE_IN" | "VACUUM_PACKED";
export type Animal = "BEEF" | "VEAL" | "LAMB" | "CHICKEN" | "TURKEY" | "MIXED";

export interface SeedCategory {
  slug: string;
  nameHe: string;
  nameEn: string;
  descriptionHe: string;
  descriptionEn: string;
}

export const categories: SeedCategory[] = [
  { slug: "beef", nameHe: "בקר", nameEn: "Beef", descriptionHe: "נתחי בקר טריים, מנוקרים ונחתכים אצלנו לפי ההזמנה.", descriptionEn: "Fresh beef cuts, trimmed and cut to order in our shop." },
  { slug: "dry-aged", nameHe: "בקר מיושן", nameEn: "Dry-aged beef", descriptionHe: "יישון יבש במקרר ייעודי — טעם עמוק ומרקם רך במיוחד.", descriptionEn: "Dry-aged in a dedicated chamber for deep flavour and a tender bite." },
  { slug: "chicken", nameHe: "עוף", nameEn: "Chicken", descriptionHe: "עוף טרי שמגיע אלינו כל בוקר, חלק ומומלח.", descriptionEn: "Fresh chicken delivered every morning, glatt and salted." },
  { slug: "turkey", nameHe: "הודו", nameEn: "Turkey", descriptionHe: "הודו טרי — רזה, עסיסי ומושלם לשווארמה ולצלייה.", descriptionEn: "Fresh turkey — lean, juicy, ideal for shawarma and roasting." },
  { slug: "lamb", nameHe: "טלה", nameEn: "Lamb", descriptionHe: "טלה צעיר לצלייה איטית ולגריל.", descriptionEn: "Young lamb for slow roasting and the grill." },
  { slug: "ground", nameHe: "טחון ונקניקיות", nameEn: "Ground & sausages", descriptionHe: "נטחן אצלנו מנתחים שלמים — בלי תוספות שאתם לא רואים.", descriptionEn: "Ground in-house from whole cuts — nothing added that you can't see." },
  { slug: "grill", nameHe: "מוכן למנגל", nameEn: "Ready for the grill", descriptionHe: "שיפודים, קבבים ונתחים מתובלים — רק להדליק את הגחלים.", descriptionEn: "Skewers, kebabs and seasoned cuts — just light the coals." },
  { slug: "offal", nameHe: "מוצרי פנים", nameEn: "Offal", descriptionHe: "כבדים, לבבות ולשון — לאוהבי הטעמים המסורתיים.", descriptionEn: "Livers, hearts and tongue for traditional cooking." },
  { slug: "packages", nameHe: "מארזים", nameEn: "Bundles", descriptionHe: "מארזים מוכנים לשבת, למנגל ולחג — במחיר קבוע.", descriptionEn: "Ready bundles for Shabbat, the grill and holidays — at a fixed price." },
];

export interface SeedAuthority {
  slug: string;
  nameHe: string;
  nameEn: string;
  badgeHe: string;
  badgeEn: string;
  certificateNumber: string;
  /** Days from seed time until the certificate expires. */
  validForDays: number;
}

export const authorities: SeedAuthority[] = [
  { slug: "maale-inbar", nameHe: "בד״ץ מעלה ענבר", nameEn: "Beit Din Ma'ale Inbar", badgeHe: "מעלה ענבר", badgeEn: "Ma'ale Inbar", certificateNumber: "MI-5787-0412", validForDays: 214 },
  { slug: "golden-pomegranate", nameHe: "השגחת רימון הזהב", nameEn: "Golden Pomegranate Supervision", badgeHe: "רימון הזהב", badgeEn: "Golden Pomegranate", certificateNumber: "RZ-22871", validForDays: 21 },
  { slug: "four-winds", nameHe: "ועד כשרות ארבע הרוחות", nameEn: "Four Winds Kashrut Council", badgeHe: "ארבע הרוחות", badgeEn: "Four Winds", certificateNumber: "4R-3319-B", validForDays: 330 },
];

type VariantPreset = "steak" | "roast" | "stew" | "ground" | "chickenParts" | "whole" | "plain" | "schnitzel" | "shawarma";

export const variantPresets: Record<VariantPreset, Array<{ key: string; nameHe: string; nameEn: string; cutHe?: string; cutEn?: string; deltaAgorot?: number }>> = {
  plain: [{ key: "std", nameHe: "רגיל", nameEn: "Standard" }],
  steak: [
    { key: "whole", nameHe: "נתח שלם", nameEn: "Whole piece", cutHe: "לא לפרוס", cutEn: "Do not slice" },
    { key: "2cm", nameHe: "סטייקים 2 ס״מ", nameEn: "Steaks, 2 cm", cutHe: "לפרוס לסטייקים בעובי 2 ס״מ", cutEn: "Slice into 2 cm steaks" },
    { key: "3cm", nameHe: "סטייקים 3 ס״מ", nameEn: "Steaks, 3 cm", cutHe: "לפרוס לסטייקים בעובי 3 ס״מ", cutEn: "Slice into 3 cm steaks" },
  ],
  roast: [
    { key: "whole", nameHe: "נתח שלם", nameEn: "Whole piece", cutHe: "נתח שלם לצלייה", cutEn: "Whole roasting piece" },
    { key: "tied", nameHe: "קשור לצלי", nameEn: "Tied for roasting", cutHe: "לקשור ברשת לצלי", cutEn: "Net-tie for roasting" },
  ],
  stew: [
    { key: "whole", nameHe: "נתח שלם", nameEn: "Whole piece", cutHe: "לא לחתוך", cutEn: "Do not cut" },
    { key: "cubes", nameHe: "קוביות לגולש", nameEn: "Stew cubes", cutHe: "לחתוך לקוביות 3 ס״מ", cutEn: "Cut into 3 cm cubes" },
  ],
  ground: [
    { key: "fine", nameHe: "טחינה דקה", nameEn: "Fine grind", cutHe: "טחינה דקה (פעמיים)", cutEn: "Fine grind (twice)" },
    { key: "coarse", nameHe: "טחינה גסה", nameEn: "Coarse grind", cutHe: "טחינה גסה (פעם אחת)", cutEn: "Coarse grind (once)" },
  ],
  chickenParts: [
    { key: "whole", nameHe: "שלם", nameEn: "Whole", cutHe: "לא לחתוך", cutEn: "Do not cut" },
    { key: "skinless", nameHe: "ללא עור", nameEn: "Skinless", cutHe: "להסיר עור", cutEn: "Remove skin", deltaAgorot: 400 },
  ],
  whole: [
    { key: "whole", nameHe: "שלם", nameEn: "Whole", cutHe: "עוף שלם", cutEn: "Whole bird" },
    { key: "8", nameHe: "מפורק ל-8", nameEn: "Cut into 8", cutHe: "לפרק ל-8 חלקים", cutEn: "Cut into 8 pieces" },
    { key: "butterfly", nameHe: "פתוח (פרפר)", nameEn: "Butterflied", cutHe: "לפתוח לפרפר", cutEn: "Butterfly" },
  ],
  schnitzel: [
    { key: "thin", nameHe: "פרוס דק", nameEn: "Thin slices", cutHe: "לפרוס דק לשניצל", cutEn: "Slice thin for schnitzel" },
    { key: "whole", nameHe: "פילה שלם", nameEn: "Whole fillets", cutHe: "פילה שלם, לא לפרוס", cutEn: "Whole fillets, unsliced" },
  ],
  shawarma: [
    { key: "strips", nameHe: "רצועות לשווארמה", nameEn: "Shawarma strips", cutHe: "לפרוס לרצועות דקות", cutEn: "Slice into thin strips" },
    { key: "whole", nameHe: "נתח שלם", nameEn: "Whole piece", cutHe: "לא לפרוס", cutEn: "Do not slice" },
  ],
};

interface KashrutSpec {
  authority: "maale-inbar" | "golden-pomegranate" | "four-winds";
  shechita: "BEIT_YOSEF" | "ASHKENAZI" | "CHABAD";
  glatt: "GLATT_CHALAK" | "GLATT" | "REGULAR";
  nikur: "MENUKAR" | "NOT_MENUKAR" | "NOT_APPLICABLE";
  salted: "SALTED" | "REQUIRES_SALTING" | "NOT_APPLICABLE";
  passover: "KOSHER_LEPESACH" | "NOT_FOR_PESACH";
}

const beefK: KashrutSpec = { authority: "maale-inbar", shechita: "BEIT_YOSEF", glatt: "GLATT_CHALAK", nikur: "MENUKAR", salted: "SALTED", passover: "KOSHER_LEPESACH" };
const poultryK: KashrutSpec = { authority: "golden-pomegranate", shechita: "ASHKENAZI", glatt: "GLATT", nikur: "NOT_APPLICABLE", salted: "SALTED", passover: "KOSHER_LEPESACH" };
const lambK: KashrutSpec = { authority: "four-winds", shechita: "BEIT_YOSEF", glatt: "GLATT_CHALAK", nikur: "MENUKAR", salted: "SALTED", passover: "KOSHER_LEPESACH" };
const spiced = (k: KashrutSpec): KashrutSpec => ({ ...k, passover: "NOT_FOR_PESACH" });

interface WeightRules {
  pricePerKg: number; // whole shekels
  min: number;
  max: number;
  step: number;
  def: number;
  avgPiece?: number;
  tolerance?: number;
}

export interface SeedProduct {
  slug: string;
  category: string;
  nameHe: string;
  nameEn: string;
  shortHe: string;
  shortEn: string;
  longHe: string;
  longEn: string;
  cookingHe: string;
  cookingEn: string;
  animal: Animal;
  originHe?: string;
  originEn?: string;
  weight?: WeightRules;
  pkg?: { price: number; contentsHe: string; contentsEn: string; nominalG: number };
  variants: VariantPreset;
  kashrut: KashrutSpec;
  occasions: Occasion[];
  flags?: Flag[];
  agingDays?: number;
  bestSeller?: boolean;
  stock?: "in" | "low" | "out";
}

const steakRules = (pricePerKg: number, avgPiece: number): WeightRules => ({ pricePerKg, min: 250, max: 5000, step: 250, def: 1000, avgPiece });
const roastRules = (pricePerKg: number, def = 1500): WeightRules => ({ pricePerKg, min: 750, max: 6000, step: 250, def });
const partsRules = (pricePerKg: number, def = 1000): WeightRules => ({ pricePerKg, min: 500, max: 5000, step: 250, def });

export const products: SeedProduct[] = [
  // ── Beef ─────────────────────────────────────────────
  {
    slug: "entrecote", category: "beef", nameHe: "אנטריקוט", nameEn: "Entrecôte (rib-eye)",
    shortHe: "מלך הסטייקים — שיש שומן עדין ועסיסיות מלאה.", shortEn: "The king of steaks — fine marbling and full juiciness.",
    longHe: "נחתך מגב הצלעות, עם עין שומן במרכז שנמסה על האש ומשאירה סטייק עסיסי ועשיר. אנחנו חותכים לפי העובי שתבחרו, ישר לפני האריזה.", longEn: "Cut from the rib section, with a centre eye of fat that melts over the flame. We cut to the thickness you choose, right before packing.",
    cookingHe: "גריל חם מאוד, 3–4 דקות לכל צד לסטייק 3 ס״מ, ומנוחה של 5 דקות.", cookingEn: "Very hot grill, 3–4 minutes a side for a 3 cm steak, then rest 5 minutes.",
    animal: "BEEF", originHe: "חלק קדמי · צלעות גב", originEn: "Forequarter · rib",
    weight: steakRules(179, 400), variants: "steak", kashrut: beefK, occasions: ["GRILL", "SHABBAT"], bestSeller: true,
  },
  {
    slug: "beef-fillet", category: "beef", nameHe: "פילה בקר", nameEn: "Beef fillet",
    shortHe: "הנתח הרך ביותר, מנוקר חלק אחורי.", shortEn: "The most tender cut, with hindquarter nikur.",
    longHe: "פילה אמיתי מהחלק האחורי, שעבר ניקור מלא על ידי מנקר מוסמך. רך כחמאה, רזה ומתאים לאירוח.", longEn: "True fillet from the hindquarter, fully deveined (nikur) by a certified menaker. Butter-soft, lean and made for hosting.",
    cookingHe: "צריבה במחבת ברזל ומעבר לתנור 200° עד 54° במרכז.", cookingEn: "Sear in cast iron, finish in a 200° oven to 54° in the centre.",
    animal: "BEEF", originHe: "חלק אחורי · מנוקר", originEn: "Hindquarter · deveined",
    weight: steakRules(299, 300), variants: "steak", kashrut: beefK, occasions: ["HOLIDAY", "SHABBAT"],
  },
  {
    slug: "shayetel", category: "beef", nameHe: "שייטל", nameEn: "Shayetel (sirloin)",
    shortHe: "רזה, טעים ומשתלם — לסטייקים ולקרפצ׳יו.", shortEn: "Lean, flavourful and good value — for steaks and carpaccio.",
    longHe: "נתח רזה עם מרקם אחיד וטעם בקרי נקי. מצוין לסטייק מהיר, לרוסטביף ולקרפצ׳יו.", longEn: "A lean cut with an even texture and clean beef flavour. Excellent as a quick steak, roast beef or carpaccio.",
    cookingHe: "לרוסטביף: צריבה מכל הצדדים ו-25 דקות בתנור 180°.", cookingEn: "For roast beef: sear all sides, then 25 minutes at 180°.",
    animal: "BEEF", originHe: "חלק אחורי · מנוקר", originEn: "Hindquarter · deveined",
    weight: steakRules(139, 500), variants: "steak", kashrut: beefK, occasions: ["GRILL", "WEEKNIGHT"],
  },
  {
    slug: "asado", category: "beef", nameHe: "אסאדו", nameEn: "Asado (short ribs)",
    shortHe: "צלעות קצרות לבישול ארוך או לעישון.", shortEn: "Short ribs for long cooking or smoking.",
    longHe: "רצועת צלעות עם שכבות בשר ושומן שמתפרקות אחרי שעות על אש נמוכה. מנה של יום שישי.", longEn: "A strip of ribs layered with meat and fat that falls apart after hours on low heat. A Friday classic.",
    cookingHe: "6 שעות בתנור 140° מכוסה, או לילה שלם בחמין.", cookingEn: "6 hours covered at 140°, or overnight in cholent.",
    animal: "BEEF", originHe: "חלק קדמי · צלעות", originEn: "Forequarter · ribs",
    weight: roastRules(99, 2000), variants: "roast", kashrut: beefK, occasions: ["SLOW_COOK", "SHABBAT"], flags: ["BONE_IN"], bestSeller: true,
  },
  {
    slug: "denver", category: "beef", nameHe: "דנוור", nameEn: "Denver steak",
    shortHe: "הסוד של הקצבים — סטייק מהכתף עם שיש מפתיע.", shortEn: "The butcher's secret — a shoulder steak with surprising marbling.",
    longHe: "נחתך מעומק הכתף, עם שומן תוך-שרירי שנותן טעם של אנטריקוט במחיר נוח יותר.", longEn: "Cut from deep in the shoulder, with intramuscular fat that tastes like entrecôte for less.",
    cookingHe: "גריל חם, 3 דקות לכל צד, לפרוס נגד הסיבים.", cookingEn: "Hot grill, 3 minutes a side, slice against the grain.",
    animal: "BEEF", originHe: "חלק קדמי · כתף", originEn: "Forequarter · chuck",
    weight: steakRules(149, 350), variants: "steak", kashrut: beefK, occasions: ["GRILL"],
  },
  {
    slug: "mock-fillet", category: "beef", nameHe: "פילה מדומה", nameEn: "Mock tender",
    shortHe: "צלי כתף רזה לצלייה ולבישול.", shortEn: "A lean shoulder roast for roasting and braising.",
    longHe: "נתח גלילי מהכתף שנראה כמו פילה. מצוין לצלי בקר ברוטב ולפרוסות דקות לסנדוויץ׳.", longEn: "A cylindrical shoulder cut that looks like fillet. Great braised in sauce or thinly sliced for sandwiches.",
    cookingHe: "צלי בסיר: 3 שעות על אש נמוכה עם יין ובצל.", cookingEn: "Pot roast: 3 hours on low heat with wine and onion.",
    animal: "BEEF", originHe: "חלק קדמי · כתף", originEn: "Forequarter · shoulder",
    weight: roastRules(109), variants: "roast", kashrut: beefK, occasions: ["SHABBAT", "SLOW_COOK"],
  },
  {
    slug: "beef-shoulder", category: "beef", nameHe: "כתף בקר", nameEn: "Beef shoulder",
    shortHe: "לגולש, לחמין ולתבשילים עשירים.", shortEn: "For goulash, cholent and rich stews.",
    longHe: "נתח עבודה עם הרבה קולגן — אחרי בישול ארוך הוא הופך לרך ועשיר.", longEn: "A working muscle full of collagen that turns soft and rich with long cooking.",
    cookingHe: "2.5–3 שעות בבישול איטי.", cookingEn: "2.5–3 hours of slow cooking.",
    animal: "BEEF", originHe: "חלק קדמי · כתף", originEn: "Forequarter · shoulder",
    weight: roastRules(85, 1500), variants: "stew", kashrut: beefK, occasions: ["SLOW_COOK", "WEEKNIGHT"],
  },
  {
    slug: "brisket", category: "beef", nameHe: "חזה בקר (בריסקט)", nameEn: "Brisket",
    shortHe: "לעישון, לבישול בתנור ולקורנביף ביתי.", shortEn: "For smoking, oven braising and homemade corned beef.",
    longHe: "נתח החזה עם שכבת שומן עליונה. דורש סבלנות ומחזיר בגדול.", longEn: "The chest cut with a fat cap on top. Asks for patience and repays it.",
    cookingHe: "10–12 שעות במעשנה ב-110°, או 5 שעות בתנור מכוסה.", cookingEn: "10–12 hours in a smoker at 110°, or 5 hours covered in the oven.",
    animal: "BEEF", originHe: "חלק קדמי · חזה", originEn: "Forequarter · brisket",
    weight: roastRules(99, 2500), variants: "roast", kashrut: beefK, occasions: ["SLOW_COOK", "HOLIDAY"],
  },
  {
    slug: "osso-buco", category: "beef", nameHe: "אוסובוקו", nameEn: "Osso buco (beef shank)",
    shortHe: "פרוסות שוק עם מח עצם — לחמין ולמרק.", shortEn: "Shank slices with marrow — for cholent and soup.",
    longHe: "פרוסות שוק בעובי 4 ס״מ עם עצם מח במרכז. הלב של כל מרק בקר טוב.", longEn: "4 cm shank slices with marrow bone in the centre. The heart of any good beef soup.",
    cookingHe: "3 שעות בסיר, או לילה בחמין.", cookingEn: "3 hours in the pot, or overnight in cholent.",
    animal: "BEEF", originHe: "חלק קדמי · שוק", originEn: "Forequarter · shank",
    weight: roastRules(69, 1500), variants: "plain", kashrut: beefK, occasions: ["SLOW_COOK", "SHABBAT"], flags: ["BONE_IN"],
  },
  {
    slug: "flank", category: "beef", nameHe: "ואסיו", nameEn: "Flank (vacío)",
    shortHe: "נתח ארגנטינאי עם סיבים ארוכים וטעם חזק.", shortEn: "An Argentinian favourite with long fibres and bold flavour.",
    longHe: "נתח שטוח שנצלה בשלמותו על הגריל ונפרס דק נגד הסיבים.", longEn: "A flat cut grilled whole and sliced thin against the grain.",
    cookingHe: "גריל בינוני-חם, 8 דקות לכל צד, מנוחה ופריסה.", cookingEn: "Medium-hot grill, 8 minutes a side, rest and slice.",
    animal: "BEEF", originHe: "חלק אחורי · מנוקר", originEn: "Hindquarter · deveined",
    weight: roastRules(129, 1000), variants: "plain", kashrut: beefK, occasions: ["GRILL"],
  },
  {
    slug: "beef-cheeks", category: "beef", nameHe: "לחי בקר", nameEn: "Beef cheeks",
    shortHe: "הנתח שנמס בפה אחרי בישול ארוך.", shortEn: "Melts in the mouth after a long braise.",
    longHe: "שריר עמוס ג׳לטין שהופך למשי אחרי שעות ביין אדום.", longEn: "A gelatin-rich muscle that turns silky after hours in red wine.",
    cookingHe: "4 שעות בתנור 150° ביין אדום.", cookingEn: "4 hours at 150° in red wine.",
    animal: "BEEF", originHe: "ראש", originEn: "Head",
    weight: partsRules(119, 1000), variants: "plain", kashrut: beefK, occasions: ["SLOW_COOK", "HOLIDAY"], stock: "low",
  },

  // ── Dry-aged ─────────────────────────────────────────
  {
    slug: "aged-entrecote-28", category: "dry-aged", nameHe: "אנטריקוט מיושן 28 יום", nameEn: "Entrecôte, dry-aged 28 days",
    shortHe: "28 יום ביישון יבש — ארומה אגוזית ומרקם רך.", shortEn: "28 days dry-aged — nutty aroma, tender texture.",
    longHe: "אנטריקוט שיושן אצלנו 28 יום בתא יישון עם בקרת לחות. הקליפה היבשה מוסרת ואתם מקבלים רק את הלב.", longEn: "Entrecôte aged 28 days in our humidity-controlled chamber. The dry crust is trimmed away; you get only the heart.",
    cookingHe: "בטמפרטורת החדר 30 דקות, גריל חם מאוד, מלח גס בסוף.", cookingEn: "30 minutes at room temperature, very hot grill, coarse salt at the end.",
    animal: "BEEF", originHe: "חלק קדמי · צלעות גב", originEn: "Forequarter · rib",
    weight: steakRules(289, 450), variants: "steak", kashrut: beefK, occasions: ["GRILL", "HOLIDAY"], agingDays: 28, bestSeller: true,
  },
  {
    slug: "aged-tomahawk-35", category: "dry-aged", nameHe: "טומהוק מיושן 35 יום", nameEn: "Tomahawk, dry-aged 35 days",
    shortHe: "צלע עם עצם ארוכה — מרכז שולחן של ממש.", shortEn: "A long-bone rib steak — a true centrepiece.",
    longHe: "סטייק צלע עבה על עצם ארוכה, מיושן 35 יום. נמכר ביחידות של כקילו וחצי.", longEn: "A thick rib steak on a long bone, aged 35 days. Sold in pieces of about 1.5 kg.",
    cookingHe: "צלייה עקיפה עד 50° במרכז, וצריבה חזקה בסוף.", cookingEn: "Indirect heat to 50° in the centre, then a hard sear.",
    animal: "BEEF", originHe: "חלק קדמי · צלע", originEn: "Forequarter · rib",
    weight: { pricePerKg: 259, min: 1250, max: 5000, step: 250, def: 1500, avgPiece: 1500 }, variants: "plain", kashrut: beefK, occasions: ["GRILL", "HOLIDAY"], agingDays: 35, flags: ["BONE_IN"], stock: "out",
  },
  {
    slug: "aged-denver-21", category: "dry-aged", nameHe: "דנוור מיושן 21 יום", nameEn: "Denver, dry-aged 21 days",
    shortHe: "הדנוור שאתם אוהבים, עם עומק של יישון.", shortEn: "The Denver you love, with the depth of ageing.",
    longHe: "21 יום של יישון יבש מעצימים את השיש הטבעי של הדנוור.", longEn: "21 days of dry ageing intensify the Denver's natural marbling.",
    cookingHe: "גריל חם, 3 דקות לכל צד.", cookingEn: "Hot grill, 3 minutes a side.",
    animal: "BEEF", originHe: "חלק קדמי · כתף", originEn: "Forequarter · chuck",
    weight: steakRules(199, 350), variants: "steak", kashrut: beefK, occasions: ["GRILL"], agingDays: 21,
  },

  // ── Chicken ──────────────────────────────────────────
  {
    slug: "whole-chicken", category: "chicken", nameHe: "עוף שלם", nameEn: "Whole chicken",
    shortHe: "עוף טרי במשקל כ-1.8 ק״ג, חלק ומומלח.", shortEn: "A fresh chicken of about 1.8 kg, glatt and salted.",
    longHe: "עוף שלם טרי שהגיע הבוקר. אפשר לבקש שלם, מפורק ל-8 או פתוח לצלייה.", longEn: "A fresh whole chicken that arrived this morning. Whole, cut into 8, or butterflied for roasting.",
    cookingHe: "צלייה ב-200° כשעה ורבע, עד שהמיצים שקופים.", cookingEn: "Roast at 200° for about 1¼ hours, until the juices run clear.",
    animal: "CHICKEN",
    weight: { pricePerKg: 29, min: 1800, max: 9000, step: 1800, def: 1800, avgPiece: 1800 }, variants: "whole", kashrut: poultryK, occasions: ["SHABBAT", "WEEKNIGHT"], bestSeller: true,
  },
  {
    slug: "chicken-breast", category: "chicken", nameHe: "חזה עוף", nameEn: "Chicken breast",
    shortHe: "פילה חזה נקי, לשניצל, לגריל ולמוקפץ.", shortEn: "Clean breast fillet for schnitzel, grilling and stir-fries.",
    longHe: "פילה חזה ללא עור וללא עצם, מנוקה משומנים. אפשר לבקש פרוס דק לשניצל.", longEn: "Skinless, boneless breast fillet, trimmed clean. Ask for thin slices for schnitzel.",
    cookingHe: "מחבת חמה, 4 דקות לכל צד לפילה שלם.", cookingEn: "Hot pan, 4 minutes a side for a whole fillet.",
    animal: "CHICKEN",
    weight: partsRules(52), variants: "schnitzel", kashrut: poultryK, occasions: ["WEEKNIGHT"], bestSeller: true,
  },
  {
    slug: "pargiyot", category: "chicken", nameHe: "פרגיות", nameEn: "Pargiyot (boneless thighs)",
    shortHe: "ירכי עוף ללא עצם — העסיסי ביותר על הגריל.", shortEn: "Boneless chicken thighs — the juiciest thing on the grill.",
    longHe: "הפרגית הישראלית: ירך עוף נקייה, ללא עור ועצם, שנשארת עסיסית גם כשמתלהבים עם האש.", longEn: "The Israeli pargit: a clean thigh, skinless and boneless, that stays juicy even when the fire gets enthusiastic.",
    cookingHe: "גריל חם, 5 דקות לכל צד.", cookingEn: "Hot grill, 5 minutes a side.",
    animal: "CHICKEN",
    weight: partsRules(62), variants: "plain", kashrut: poultryK, occasions: ["GRILL", "WEEKNIGHT"], bestSeller: true,
  },
  {
    slug: "chicken-drumsticks", category: "chicken", nameHe: "שוקיים עוף", nameEn: "Chicken drumsticks",
    shortHe: "שוקיים לתנור, לגריל ולסיר.", shortEn: "Drumsticks for the oven, grill and pot.",
    longHe: "שוקיים טריים בגודל אחיד, כך שכולם מוכנים באותו זמן.", longEn: "Fresh drumsticks of even size, so they all finish together.",
    cookingHe: "45 דקות ב-200° עם תיבול לבחירה.", cookingEn: "45 minutes at 200° with your choice of seasoning.",
    animal: "CHICKEN",
    weight: partsRules(29), variants: "chickenParts", kashrut: poultryK, occasions: ["WEEKNIGHT", "SHABBAT"], flags: ["BONE_IN"],
  },
  {
    slug: "chicken-leg-quarters", category: "chicken", nameHe: "כרעיים עוף", nameEn: "Chicken leg quarters",
    shortHe: "ירך ושוק בחתיכה אחת — לחמין ולצלייה.", shortEn: "Thigh and drumstick in one piece — for cholent and roasting.",
    longHe: "הכרע המלא, עם עור שמשחים בתנור. חביב במיוחד בחמין של שבת.", longEn: "The whole leg, with skin that crisps in the oven. A Shabbat cholent favourite.",
    cookingHe: "שעה ב-190°, או לילה בחמין.", cookingEn: "An hour at 190°, or overnight in cholent.",
    animal: "CHICKEN",
    weight: partsRules(27, 1500), variants: "chickenParts", kashrut: poultryK, occasions: ["SHABBAT", "SLOW_COOK"], flags: ["BONE_IN"],
  },
  {
    slug: "chicken-wings", category: "chicken", nameHe: "כנפיים", nameEn: "Chicken wings",
    shortHe: "כנפיים שלמות לתנור ולגריל.", shortEn: "Whole wings for the oven and grill.",
    longHe: "כנפיים שלמות וטריות. תנו להן זמן בתנור והן יחזירו לכם עור פריך.", longEn: "Fresh whole wings. Give them time in the oven and they return crisp skin.",
    cookingHe: "50 דקות ב-210°, להפוך באמצע.", cookingEn: "50 minutes at 210°, turning halfway.",
    animal: "CHICKEN",
    weight: partsRules(24), variants: "plain", kashrut: poultryK, occasions: ["GRILL", "WEEKNIGHT"], flags: ["BONE_IN"],
  },
  {
    slug: "chicken-schnitzel", category: "chicken", nameHe: "שניצל עוף דק", nameEn: "Thin chicken schnitzel",
    shortHe: "חזה עוף פרוס דק ומוכן לציפוי.", shortEn: "Chicken breast sliced thin and ready to coat.",
    longHe: "פרוסות חזה אחידות בעובי חצי סנטימטר — מתבשלות מהר ונשארות רכות.", longEn: "Even breast slices half a centimetre thick — they cook fast and stay tender.",
    cookingHe: "טיגון עמוק 2 דקות לכל צד.", cookingEn: "Deep-fry 2 minutes a side.",
    animal: "CHICKEN",
    weight: partsRules(62), variants: "plain", kashrut: poultryK, occasions: ["WEEKNIGHT"],
  },
  {
    slug: "soup-bones-chicken", category: "chicken", nameHe: "גבות ועצמות למרק", nameEn: "Chicken backs for soup",
    shortHe: "בסיס למרק עוף עשיר.", shortEn: "The base of a rich chicken soup.",
    longHe: "גבות, צוואר ועצמות עוף — מה שהופך מרק למרק של סבתא.", longEn: "Backs, necks and bones — what turns soup into grandma's soup.",
    cookingHe: "3 שעות על אש נמוכה עם ירקות שורש.", cookingEn: "3 hours on low heat with root vegetables.",
    animal: "CHICKEN",
    weight: partsRules(12, 1500), variants: "plain", kashrut: poultryK, occasions: ["SHABBAT", "SLOW_COOK"], flags: ["BONE_IN"],
  },

  // ── Turkey ───────────────────────────────────────────
  {
    slug: "turkey-breast", category: "turkey", nameHe: "חזה הודו", nameEn: "Turkey breast",
    shortHe: "רזה ורב-שימושי — לצלי, לשניצל ולסטייק.", shortEn: "Lean and versatile — for roasts, schnitzel and steaks.",
    longHe: "נתח חזה שלם ללא עור, מתאים לצלייה בשלמותו או לפריסה.", longEn: "A whole skinless breast, roasted whole or sliced.",
    cookingHe: "צלי: שעה ב-180° עד 68° במרכז.", cookingEn: "Roast: an hour at 180° to 68° in the centre.",
    animal: "TURKEY",
    weight: roastRules(64, 1500), variants: "schnitzel", kashrut: poultryK, occasions: ["WEEKNIGHT", "HOLIDAY"],
  },
  {
    slug: "turkey-shawarma", category: "turkey", nameHe: "שווארמה הודו", nameEn: "Turkey shawarma",
    shortHe: "פרגית הודו עם שומן כבש — כמו בדוכן.", shortEn: "Turkey thigh with lamb fat — just like the stand.",
    longHe: "ירך הודו פרוסה דק לשווארמה, עם תוספת שומן טלה לעסיסיות.", longEn: "Turkey thigh sliced thin for shawarma, with added lamb fat for juiciness.",
    cookingHe: "מחבת רחבה וחמה מאוד, לא להעמיס.", cookingEn: "A wide, very hot pan — don't crowd it.",
    animal: "TURKEY",
    weight: partsRules(58), variants: "shawarma", kashrut: poultryK, occasions: ["WEEKNIGHT", "GRILL"], bestSeller: true,
  },
  {
    slug: "turkey-shank", category: "turkey", nameHe: "שוק הודו", nameEn: "Turkey drumstick",
    shortHe: "לבישול ארוך ולצלייה איטית.", shortEn: "For long cooking and slow roasting.",
    longHe: "שוק הודו גדולה עם הרבה בשר כהה — מושלמת לתבשיל.", longEn: "A large turkey drumstick with plenty of dark meat — perfect for stews.",
    cookingHe: "2.5 שעות בתנור מכוסה.", cookingEn: "2.5 hours covered in the oven.",
    animal: "TURKEY",
    weight: roastRules(36, 1500), variants: "plain", kashrut: poultryK, occasions: ["SLOW_COOK"], flags: ["BONE_IN"],
  },
  {
    slug: "turkey-wings", category: "turkey", nameHe: "כנפי הודו", nameEn: "Turkey wings",
    shortHe: "לחמין, למרק ולתנור.", shortEn: "For cholent, soup and the oven.",
    longHe: "כנפיים בשרניות שמוסיפות עומק לכל תבשיל.", longEn: "Meaty wings that add depth to any stew.",
    cookingHe: "2 שעות בבישול איטי.", cookingEn: "2 hours of slow cooking.",
    animal: "TURKEY",
    weight: partsRules(32, 1500), variants: "plain", kashrut: poultryK, occasions: ["SLOW_COOK", "SHABBAT"], flags: ["BONE_IN"],
  },

  // ── Lamb ─────────────────────────────────────────────
  {
    slug: "lamb-rack", category: "lamb", nameHe: "צלעות טלה", nameEn: "Rack of lamb",
    shortHe: "קרה טלה מנוקה — אלגנטי ומהיר.", shortEn: "A French-trimmed lamb rack — elegant and quick.",
    longHe: "צלעות טלה עם עצמות מנוקות, לצלייה בשלמותן או לחיתוך לצלעות בודדות.", longEn: "Lamb ribs with cleaned bones, roasted whole or cut into chops.",
    cookingHe: "צריבה ו-15 דקות ב-200°.", cookingEn: "Sear, then 15 minutes at 200°.",
    animal: "LAMB", originHe: "חלק קדמי · צלעות", originEn: "Forequarter · rack",
    weight: { pricePerKg: 209, min: 500, max: 3000, step: 250, def: 750, avgPiece: 750 }, variants: "plain", kashrut: lambK, occasions: ["HOLIDAY", "GRILL"], flags: ["BONE_IN"],
  },
  {
    slug: "lamb-shoulder", category: "lamb", nameHe: "כתף טלה", nameEn: "Lamb shoulder",
    shortHe: "לצלייה איטית שמתפרקת במזלג.", shortEn: "For a slow roast that pulls apart with a fork.",
    longHe: "כתף שלמה עם עצם — שבע שעות בתנור, והמשפחה כולה מגיעה בזמן.", longEn: "A whole bone-in shoulder — seven hours in the oven and the whole family arrives on time.",
    cookingHe: "7 שעות ב-130°, מכוסה, עם שום ורוזמרין.", cookingEn: "7 hours at 130°, covered, with garlic and rosemary.",
    animal: "LAMB", originHe: "חלק קדמי · כתף", originEn: "Forequarter · shoulder",
    weight: roastRules(149, 2000), variants: "roast", kashrut: lambK, occasions: ["HOLIDAY", "SLOW_COOK"], flags: ["BONE_IN"],
  },
  {
    slug: "lamb-neck", category: "lamb", nameHe: "צוואר טלה", nameEn: "Lamb neck",
    shortHe: "פרוסות צוואר לתבשילים ולקוסקוס.", shortEn: "Neck slices for stews and couscous.",
    longHe: "הנתח הכי טעים לתבשיל — עצם, מח ובשר רך.", longEn: "The tastiest stew cut — bone, marrow and tender meat.",
    cookingHe: "2 שעות בסיר עם ירקות.", cookingEn: "2 hours in the pot with vegetables.",
    animal: "LAMB", originHe: "חלק קדמי · צוואר", originEn: "Forequarter · neck",
    weight: partsRules(109), variants: "plain", kashrut: lambK, occasions: ["SLOW_COOK"], flags: ["BONE_IN"],
  },

  // ── Ground & sausages ───────────────────────────────
  {
    slug: "ground-beef", category: "ground", nameHe: "טחון בקר", nameEn: "Ground beef",
    shortHe: "נטחן אצלנו מכתף ומחזה — 15% שומן.", shortEn: "Ground in-house from shoulder and brisket — 15% fat.",
    longHe: "תערובת קבועה של כתף וחזה בקר, נטחנת ביום המשלוח. בחרו טחינה דקה או גסה.", longEn: "A fixed blend of shoulder and brisket, ground on delivery day. Choose fine or coarse.",
    cookingHe: "לקציצות, לבולונז ולהמבורגר ביתי.", cookingEn: "For meatballs, bolognese and homemade burgers.",
    animal: "BEEF",
    weight: partsRules(72), variants: "ground", kashrut: beefK, occasions: ["WEEKNIGHT"], bestSeller: true,
  },
  {
    slug: "ground-chicken", category: "ground", nameHe: "טחון עוף", nameEn: "Ground chicken",
    shortHe: "מפרגיות וחזה — קל ועסיסי.", shortEn: "From thighs and breast — light and juicy.",
    longHe: "טחון מפרגיות וחזה עוף, ללא עור.", longEn: "Ground from chicken thighs and breast, skinless.",
    cookingHe: "לקציצות ברוטב ולפשטידות.", cookingEn: "For meatballs in sauce and savoury pies.",
    animal: "CHICKEN",
    weight: partsRules(49), variants: "ground", kashrut: poultryK, occasions: ["WEEKNIGHT"],
  },
  {
    slug: "ground-lamb", category: "ground", nameHe: "טחון טלה", nameEn: "Ground lamb",
    shortHe: "לקבב, לקובה ולמילויים.", shortEn: "For kebab, kubbeh and stuffings.",
    longHe: "טחון טלה נקי עם שומן מאוזן.", longEn: "Clean ground lamb with balanced fat.",
    cookingHe: "לתבל בכמון, פטרוזיליה ובצל.", cookingEn: "Season with cumin, parsley and onion.",
    animal: "LAMB",
    weight: partsRules(119), variants: "ground", kashrut: lambK, occasions: ["GRILL", "HOLIDAY"],
  },
  {
    slug: "kebab-spiced", category: "ground", nameHe: "קבב מתובל", nameEn: "Spiced kebab mix",
    shortHe: "בקר וטלה עם פטרוזיליה, בצל ובהרט.", shortEn: "Beef and lamb with parsley, onion and baharat.",
    longHe: "תערובת הבית, מוכנה ליצירת קבבים. מכילה תבלינים — לא לפסח.", longEn: "Our house blend, ready to shape. Contains spices — not for Passover.",
    cookingHe: "גריל חם, 3 דקות לכל צד.", cookingEn: "Hot grill, 3 minutes a side.",
    animal: "MIXED",
    weight: partsRules(79), variants: "plain", kashrut: spiced(beefK), occasions: ["GRILL"],
  },
  {
    slug: "merguez", category: "ground", nameHe: "נקניקיות מרגז", nameEn: "Merguez sausages",
    shortHe: "חריפות, בקר וטלה, בקייסינג טבעי.", shortEn: "Spicy beef and lamb in natural casing.",
    longHe: "מרגז בעבודת יד עם הריסה ושום. לא לפסח.", longEn: "Handmade merguez with harissa and garlic. Not for Passover.",
    cookingHe: "גריל בינוני, 8 דקות, להפוך הרבה.", cookingEn: "Medium grill, 8 minutes, turning often.",
    animal: "MIXED",
    weight: partsRules(84, 500), variants: "plain", kashrut: spiced(lambK), occasions: ["GRILL"],
  },
  {
    slug: "burgers-6", category: "ground", nameHe: "המבורגרים 220 גר׳ × 6", nameEn: "Burgers, 220 g × 6",
    shortHe: "שישה המבורגרים מבקר טחון טרי.", shortEn: "Six burgers from freshly ground beef.",
    longHe: "המבורגרים עבים של 220 גרם, עם 20% שומן, מופרדים בנייר.", longEn: "Thick 220 g burgers with 20% fat, separated with paper.",
    cookingHe: "גריל חם, 4 דקות לכל צד למדיום.", cookingEn: "Hot grill, 4 minutes a side for medium.",
    animal: "BEEF",
    pkg: { price: 119, contentsHe: "6 המבורגרים של 220 גר׳", contentsEn: "6 × 220 g burgers", nominalG: 1320 },
    variants: "plain", kashrut: beefK, occasions: ["GRILL", "WEEKNIGHT"],
  },

  // ── Grill-ready ─────────────────────────────────────
  {
    slug: "pargiyot-skewers", category: "grill", nameHe: "שיפודי פרגית", nameEn: "Pargit skewers",
    shortHe: "קוביות פרגית מתובלות על שיפוד.", shortEn: "Seasoned pargit cubes on skewers.",
    longHe: "פרגיות בתיבול שום, לימון ופפריקה, מושחלות על שיפודים. לא לפסח.", longEn: "Pargiyot in garlic, lemon and paprika, threaded on skewers. Not for Passover.",
    cookingHe: "גריל חם, 10 דקות, להפוך כל 2 דקות.", cookingEn: "Hot grill, 10 minutes, turning every 2 minutes.",
    animal: "CHICKEN",
    weight: partsRules(74), variants: "plain", kashrut: spiced(poultryK), occasions: ["GRILL"], bestSeller: true,
  },
  {
    slug: "entrecote-skewers", category: "grill", nameHe: "שיפודי אנטריקוט", nameEn: "Entrecôte skewers",
    shortHe: "קוביות אנטריקוט עם בצל ופלפל.", shortEn: "Entrecôte cubes with onion and pepper.",
    longHe: "קוביות אנטריקוט נדיבות עם ירקות, מוכנות לגחלים.", longEn: "Generous entrecôte cubes with vegetables, ready for the coals.",
    cookingHe: "גריל חם מאוד, 6 דקות סה״כ.", cookingEn: "Very hot grill, 6 minutes total.",
    animal: "BEEF",
    weight: partsRules(199), variants: "plain", kashrut: beefK, occasions: ["GRILL"],
  },
  {
    slug: "bbq-wings", category: "grill", nameHe: "כנפיים ברביקיו", nameEn: "BBQ wings",
    shortHe: "כנפיים ממורנדות ברוטב ברביקיו מעושן.", shortEn: "Wings marinated in smoky barbecue sauce.",
    longHe: "כנפיים שהושרו לילה שלם במרינדה מעושנת. לא לפסח.", longEn: "Wings marinated overnight in a smoky rub. Not for Passover.",
    cookingHe: "גריל בינוני, 20 דקות.", cookingEn: "Medium grill, 20 minutes.",
    animal: "CHICKEN",
    weight: partsRules(34), variants: "plain", kashrut: spiced(poultryK), occasions: ["GRILL"], flags: ["BONE_IN"],
  },
  {
    slug: "kebab-skewers", category: "grill", nameHe: "קבב על שיפוד", nameEn: "Kebab skewers",
    shortHe: "קבבי הבית, כבר על שיפודים.", shortEn: "House kebabs, already on skewers.",
    longHe: "תערובת הקבב שלנו, מעוצבת ידנית על שיפודים שטוחים. לא לפסח.", longEn: "Our kebab blend, hand-shaped on flat skewers. Not for Passover.",
    cookingHe: "גריל חם, 3 דקות לכל צד.", cookingEn: "Hot grill, 3 minutes a side.",
    animal: "MIXED",
    weight: partsRules(89), variants: "plain", kashrut: spiced(beefK), occasions: ["GRILL"],
  },

  // ── Offal ───────────────────────────────────────────
  {
    slug: "chicken-liver", category: "offal", nameHe: "כבד עוף", nameEn: "Chicken livers",
    shortHe: "כבדים טריים. דורשים צלייה (הכשרה) לפני בישול.", shortEn: "Fresh livers. Must be broiled (kashered) before cooking.",
    longHe: "כבד אינו מוכשר במליחה ולכן חובה לצלות אותו על אש גלויה לפני כל בישול. אפשר לבקש כבד צלוי מראש.", longEn: "Liver cannot be kashered by salting, so it must be broiled over an open flame before any cooking.",
    cookingHe: "לצלות על אש גלויה עד שאין סימני דם, ורק אז לטגן או לקצוץ.", cookingEn: "Broil over an open flame until no blood remains, then fry or chop.",
    animal: "CHICKEN",
    weight: partsRules(35, 500), variants: "plain", kashrut: { ...poultryK, salted: "NOT_APPLICABLE" }, occasions: ["SHABBAT"], flags: ["REQUIRES_BROILING_TZLIYA"],
  },
  {
    slug: "chicken-hearts", category: "offal", nameHe: "לבבות עוף", nameEn: "Chicken hearts",
    shortHe: "לגריל ולמעורב ירושלמי.", shortEn: "For the grill and Jerusalem mixed grill.",
    longHe: "לבבות מנוקים, מוכנים לשיפוד או למחבת.", longEn: "Cleaned hearts, ready for skewers or the pan.",
    cookingHe: "מחבת חמה עם בצל, 8 דקות.", cookingEn: "Hot pan with onion, 8 minutes.",
    animal: "CHICKEN",
    weight: partsRules(39, 500), variants: "plain", kashrut: poultryK, occasions: ["GRILL"],
  },
  {
    slug: "chicken-gizzards", category: "offal", nameHe: "קורקבנים", nameEn: "Chicken gizzards",
    shortHe: "לתבשיל ארוך ולמרק.", shortEn: "For long stews and soup.",
    longHe: "קורקבנים מנוקים לחלוטין.", longEn: "Fully cleaned gizzards.",
    cookingHe: "שעתיים בבישול עם עגבניות.", cookingEn: "Two hours braised with tomatoes.",
    animal: "CHICKEN",
    weight: partsRules(29, 500), variants: "plain", kashrut: poultryK, occasions: ["SLOW_COOK"],
  },
  {
    slug: "beef-tongue", category: "offal", nameHe: "לשון בקר", nameEn: "Beef tongue",
    shortHe: "לשון שלמה לבישול ולפרוסות ברוטב.", shortEn: "A whole tongue for boiling and slicing in sauce.",
    longHe: "לשון שלמה במשקל כקילו וחצי. מנה חגיגית במטבח המסורתי.", longEn: "A whole tongue of about 1.5 kg. A festive dish in traditional kitchens.",
    cookingHe: "3 שעות בישול, קילוף, ופריסה ברוטב פטריות.", cookingEn: "Boil 3 hours, peel, slice into mushroom sauce.",
    animal: "BEEF",
    weight: { pricePerKg: 109, min: 1000, max: 3000, step: 500, def: 1500, avgPiece: 1500 }, variants: "plain", kashrut: beefK, occasions: ["HOLIDAY", "SLOW_COOK"], stock: "out",
  },

  // ── Bundles ─────────────────────────────────────────
  {
    slug: "family-chicken-bundle", category: "packages", nameHe: "מארז עוף למשפחה", nameEn: "Family chicken bundle",
    shortHe: "כל העוף לשבוע שלם, במחיר קבוע.", shortEn: "A week of chicken at a fixed price.",
    longHe: "עוף שלם, קילו חזה, קילו פרגיות, קילו שוקיים וחצי קילו כנפיים.", longEn: "A whole chicken, 1 kg breast, 1 kg pargiyot, 1 kg drumsticks and 500 g wings.",
    cookingHe: "לחלק למנות ולהקפיא מה שלא בשימוש השבוע.", cookingEn: "Portion and freeze what you won't use this week.",
    animal: "CHICKEN",
    pkg: { price: 149, contentsHe: "עוף שלם · 1 ק״ג חזה · 1 ק״ג פרגיות · 1 ק״ג שוקיים · 500 גר׳ כנפיים", contentsEn: "Whole chicken · 1 kg breast · 1 kg pargiyot · 1 kg drumsticks · 500 g wings", nominalG: 5300 },
    variants: "plain", kashrut: poultryK, occasions: ["WEEKNIGHT", "SHABBAT"], bestSeller: true,
  },
  {
    slug: "grill-bundle-8", category: "packages", nameHe: "מארז מנגל ל-8", nameEn: "Grill bundle for 8",
    shortHe: "אנטריקוט, פרגיות, קבבים ומרגז — מנגל שלם.", shortEn: "Entrecôte, pargiyot, kebabs and merguez — a whole barbecue.",
    longHe: "מספיק לשמונה סועדים רעבים, מסודר לפי סדר ההעלאה לגריל. לא לפסח.", longEn: "Enough for eight hungry guests, packed in grilling order. Not for Passover.",
    cookingHe: "מתחילים מהמרגז, ממשיכים לפרגיות ומסיימים באנטריקוט.", cookingEn: "Start with merguez, move to pargiyot, finish with entrecôte.",
    animal: "MIXED",
    pkg: { price: 399, contentsHe: "1 ק״ג אנטריקוט · 1.5 ק״ג פרגיות · 1 ק״ג קבב · 500 גר׳ מרגז", contentsEn: "1 kg entrecôte · 1.5 kg pargiyot · 1 kg kebab · 500 g merguez", nominalG: 4000 },
    variants: "plain", kashrut: spiced(beefK), occasions: ["GRILL"], bestSeller: true,
  },
  {
    slug: "shabbat-bundle", category: "packages", nameHe: "מארז שבת", nameEn: "Shabbat bundle",
    shortHe: "מהמרק ועד החמין.", shortEn: "From the soup to the cholent.",
    longHe: "עוף שלם, עצמות למרק, אסאדו לחמין וקילו טחון לקציצות.", longEn: "A whole chicken, soup bones, asado for cholent and a kilo of ground beef for meatballs.",
    cookingHe: "המרק ביום חמישי, החמין נכנס לפני הדלקת נרות.", cookingEn: "Soup on Thursday; cholent goes in before candle lighting.",
    animal: "MIXED",
    pkg: { price: 249, contentsHe: "עוף שלם · 1 ק״ג עצמות למרק · 1.5 ק״ג אסאדו · 1 ק״ג טחון בקר", contentsEn: "Whole chicken · 1 kg soup bones · 1.5 kg asado · 1 kg ground beef", nominalG: 5300 },
    variants: "plain", kashrut: beefK, occasions: ["SHABBAT"],
  },
  {
    slug: "pesach-bundle", category: "packages", nameHe: "מארז כשר לפסח", nameEn: "Kosher for Passover bundle",
    shortHe: "הכול לליל הסדר ולחג, בהשגחה לפסח.", shortEn: "Everything for the Seder and the holiday, certified for Passover.",
    longHe: "כתף טלה, בריסקט, שני עופות וכבד לצלייה — הכול כשר לפסח ללא קטניות.", longEn: "Lamb shoulder, brisket, two chickens and liver for broiling — all kosher for Passover, no kitniyot.",
    cookingHe: "הבריסקט מוכן יום לפני וטעים יותר למחרת.", cookingEn: "Make the brisket a day ahead — it's better the next day.",
    animal: "MIXED",
    pkg: { price: 329, contentsHe: "2 ק״ג כתף טלה · 2 ק״ג בריסקט · 2 עופות שלמים · 500 גר׳ כבד", contentsEn: "2 kg lamb shoulder · 2 kg brisket · 2 whole chickens · 500 g liver", nominalG: 8100 },
    variants: "plain", kashrut: beefK, occasions: ["HOLIDAY"], flags: ["REQUIRES_BROILING_TZLIYA"],
  },
  {
    slug: "aged-steak-bundle", category: "packages", nameHe: "מארז סטייקים מיושנים", nameEn: "Dry-aged steak bundle",
    shortHe: "טעימה של כל היישונים שלנו.", shortEn: "A tasting of all our dry-aged cuts.",
    longHe: "שני אנטריקוט מיושנים 28 יום, שני דנוור מיושנים 21 יום ומלח ים גס.", longEn: "Two 28-day entrecôtes, two 21-day Denvers and coarse sea salt.",
    cookingHe: "לצלות מהקל לעמוק: קודם דנוור, אחר כך אנטריקוט.", cookingEn: "Grill from lightest to deepest: Denver first, then entrecôte.",
    animal: "BEEF",
    pkg: { price: 499, contentsHe: "2 אנטריקוט מיושן (כ-900 גר׳) · 2 דנוור מיושן (כ-700 גר׳)", contentsEn: "2 aged entrecôte (~900 g) · 2 aged Denver (~700 g)", nominalG: 1600 },
    variants: "plain", kashrut: beefK, occasions: ["GRILL", "HOLIDAY"], agingDays: 28, flags: ["VACUUM_PACKED"],
  },
];

export interface SeedZone {
  slug: string;
  nameHe: string;
  nameEn: string;
  citiesHe: string[];
  citiesEn: string[];
  fee: number;
  freeOver: number | null;
  minOrder: number;
  leadHours: number;
  active?: boolean;
}

export const zones: SeedZone[] = [
  { slug: "tel-aviv", nameHe: "תל אביב–יפו", nameEn: "Tel Aviv–Jaffa", citiesHe: ["תל אביב", "תל אביב-יפו", "יפו"], citiesEn: ["Tel Aviv", "Jaffa"], fee: 25, freeOver: 350, minOrder: 180, leadHours: 3 },
  { slug: "ramat-gan", nameHe: "רמת גן וגבעתיים", nameEn: "Ramat Gan & Givatayim", citiesHe: ["רמת גן", "גבעתיים", "בני ברק"], citiesEn: ["Ramat Gan", "Givatayim", "Bnei Brak"], fee: 25, freeOver: 350, minOrder: 180, leadHours: 3 },
  { slug: "sharon", nameHe: "הרצליה ורעננה", nameEn: "Herzliya & Ra'anana", citiesHe: ["הרצליה", "רעננה", "כפר סבא", "הוד השרון"], citiesEn: ["Herzliya", "Ra'anana", "Kfar Saba", "Hod HaSharon"], fee: 35, freeOver: 450, minOrder: 220, leadHours: 4 },
  { slug: "rishon-holon", nameHe: "ראשון לציון וחולון", nameEn: "Rishon LeZion & Holon", citiesHe: ["ראשון לציון", "חולון", "בת ים"], citiesEn: ["Rishon LeZion", "Holon", "Bat Yam"], fee: 30, freeOver: 400, minOrder: 200, leadHours: 4 },
  { slug: "jerusalem", nameHe: "ירושלים", nameEn: "Jerusalem", citiesHe: ["ירושלים", "מבשרת ציון"], citiesEn: ["Jerusalem", "Mevaseret Zion"], fee: 45, freeOver: 500, minOrder: 250, leadHours: 6 },
  { slug: "modiin", nameHe: "מודיעין", nameEn: "Modi'in", citiesHe: ["מודיעין-מכבים-רעות", "מודיעין", "שוהם"], citiesEn: ["Modi'in", "Shoham"], fee: 40, freeOver: 450, minOrder: 220, leadHours: 5 },
  { slug: "haifa", nameHe: "חיפה והקריות", nameEn: "Haifa & the Krayot", citiesHe: ["חיפה", "קריית ביאליק", "קריית מוצקין", "קריית אתא"], citiesEn: ["Haifa", "Kiryat Bialik", "Kiryat Motzkin", "Kiryat Ata"], fee: 55, freeOver: 600, minOrder: 300, leadHours: 24 },
  { slug: "beer-sheva", nameHe: "באר שבע", nameEn: "Be'er Sheva", citiesHe: ["באר שבע", "עומר", "להבים"], citiesEn: ["Be'er Sheva", "Omer", "Lehavim"], fee: 55, freeOver: 600, minOrder: 300, leadHours: 24 },
  { slug: "eilat", nameHe: "אילת", nameEn: "Eilat", citiesHe: ["אילת"], citiesEn: ["Eilat"], fee: 90, freeOver: null, minOrder: 500, leadHours: 48, active: false },
];

export const staff = [
  { phone: "+972501110001", nameHe: "מאיר אלמוג", nameEn: "Meir Almog", role: "OWNER" },
  { phone: "+972501110002", nameHe: "רונית בן דוד", nameEn: "Ronit Ben David", role: "MANAGER" },
  { phone: "+972501110003", nameHe: "יוסי קורן", nameEn: "Yossi Koren", role: "BUTCHER" },
  { phone: "+972501110004", nameHe: "אבי שטרן", nameEn: "Avi Stern", role: "BUTCHER" },
  { phone: "+972501110005", nameHe: "נועה לוי", nameEn: "Noa Levi", role: "PACKER" },
  { phone: "+972501110006", nameHe: "דניאל חדד", nameEn: "Daniel Hadad", role: "DRIVER" },
] as const;
