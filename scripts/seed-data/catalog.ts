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
  { slug: "beef", nameHe: "בקר", nameEn: "Beef", descriptionHe: "נתחי בקר טריים, מנוקרים ונחתכים אצלנו לפי ההזמנה ובעובי שתבחרו.", descriptionEn: "Fresh beef, deveined and cut to order in our shop, at the thickness you choose." },
  { slug: "dry-aged", nameHe: "בקר מיושן", nameEn: "Dry-aged beef", descriptionHe: "בקר שמיושן אצלנו 21 עד 35 יום בתא עם בקרת לחות. הבשר מאבד מים, הטעם מתרכז והסיבים מתרככים.", descriptionEn: "Beef aged 21 to 35 days in our humidity-controlled chamber. It loses water, concentrates in flavour and softens in texture." },
  { slug: "chicken", nameHe: "עוף", nameEn: "Chicken", descriptionHe: "עוף טרי שמגיע כל בוקר, חלק ומוכשר במליחה. מפרקים ומנקים אצלנו ביום המשלוח.", descriptionEn: "Fresh chicken every morning, glatt and kosher-salted. Cut and cleaned in our shop on delivery day." },
  { slug: "turkey", nameHe: "הודו", nameEn: "Turkey", descriptionHe: "חזה הודו רזה לצלי ולשניצל, ובשר כהה מהירך ומהשוק לשווארמה ולבישול איטי.", descriptionEn: "Lean turkey breast for roasts and schnitzel; dark thigh and drumstick meat for shawarma and slow cooking." },
  { slug: "lamb", nameHe: "טלה", nameEn: "Lamb", descriptionHe: "טלה צעיר, מנוקר ומוכשר. צלעות לצלייה קצרה, כתף וצוואר לשעות ארוכות בתנור.", descriptionEn: "Young lamb, deveined and kosher-salted. Racks for a quick roast; shoulder and neck for long hours in the oven." },
  { slug: "ground", nameHe: "טחון ונקניקיות", nameEn: "Ground & sausages", descriptionHe: "נטחן אצלנו מנתחים שלמים ביום המשלוח. אחוז השומן והתבלינים כתובים על כל מוצר.", descriptionEn: "Ground in-house from whole cuts on delivery day. Fat percentage and spices are listed on every item." },
  { slug: "grill", nameHe: "מוכן למנגל", nameEn: "Ready for the grill", descriptionHe: "שיפודים, קבבים ונתחים מתובלים שהוכנו הבוקר ומוכנים לגחלים.", descriptionEn: "Skewers, kebabs and seasoned cuts prepared this morning and ready for the coals." },
  { slug: "offal", nameHe: "מוצרי פנים", nameEn: "Offal", descriptionHe: "כבד, לבבות, קורקבנים ולשון לפי המטבח היהודי המסורתי. לכבד מצורפות הוראות צלייה להכשרה.", descriptionEn: "Liver, hearts, gizzards and tongue for traditional Jewish cooking. Liver comes with broiling instructions for kashering." },
  { slug: "packages", nameHe: "מארזים", nameEn: "Bundles", descriptionHe: "מארזים לשבת, למנגל ולחג, מורכבים מהנתחים שלנו — במחיר קבוע ובמשקל ידוע.", descriptionEn: "Bundles for Shabbat, the grill and holidays, built from our own cuts — at a fixed price and a known weight." },
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
    shortHe: "שיש שומן עדין שנמס על האש ומשאיר את הסטייק עסיסי.", shortEn: "Fine marbling that melts over the fire and keeps the steak juicy.",
    longHe: "נחתך מגב הצלעות בחלק הקדמי, עם עין שומן במרכז. על אש חזקה השומן נמס לתוך הבשר ונותן טעם עמוק ומרקם רך. הקצב שלנו מנקה את השומן החיצוני וחותך לפי העובי שבחרתם, רגע לפני האריזה.", longEn: "Cut from the rib section of the forequarter, with an eye of fat at its centre. Over high heat the fat renders into the meat for deep flavour and a tender bite. Our butcher trims the outer fat and cuts to your chosen thickness just before packing.",
    cookingHe: "גריל או מחבת ברזל חמים מאוד: 3–4 דקות לכל צד לסטייק בעובי 3 ס״מ, עד 54°C במרכז. מנוחה של 5 דקות על קרש, ורק אז פורסים.", cookingEn: "A very hot grill or cast-iron pan: 3–4 minutes a side for a 3 cm steak, to 54°C at the centre. Rest 5 minutes on a board before slicing.",
    animal: "BEEF", originHe: "חלק קדמי · גב הצלעות", originEn: "Forequarter · rib",
    weight: steakRules(179, 400), variants: "steak", kashrut: beefK, occasions: ["GRILL", "SHABBAT"], bestSeller: true,
  },
  {
    slug: "beef-fillet", category: "beef", nameHe: "פילה בקר", nameEn: "Beef fillet",
    shortHe: "השריר הרך ביותר בבקר — רזה, ומנוקר ביד מנקר מוסמך.", shortEn: "The most tender muscle on the animal — lean, and deveined by a certified menaker.",
    longHe: "הפילה יושב מתחת לחוליות המותן בחלק האחורי, שריר שכמעט אינו עובד ולכן רך מאוד. בשר מהחלק האחורי מחייב ניקור מלא של שומנים אסורים וגידים, והמנקר שלנו עושה אותו ביד. מרקם עדין וטעם נקי, לצריבה קצרה או לצלי שלם.", longEn: "The fillet sits beneath the loin vertebrae in the hindquarter, a muscle that barely works and is therefore very tender. Hindquarter meat requires full nikur of forbidden fat and veins, and our menaker does it by hand. A delicate texture and clean flavour, for a quick sear or a whole roast.",
    cookingHe: "צורבים במחבת ברזל חמה 2 דקות מכל צד, ומעבירים לתנור 200°C עד 54°C במרכז — כ-10–15 דקות לנתח שלם. מנוחה של 10 דקות לפני הפריסה.", cookingEn: "Sear in hot cast iron for 2 minutes a side, then finish in a 200°C oven to 54°C at the centre — about 10–15 minutes for a whole piece. Rest 10 minutes before slicing.",
    animal: "BEEF", originHe: "חלק אחורי · מותן פנימי · מנוקר", originEn: "Hindquarter · tenderloin · deveined",
    weight: steakRules(299, 300), variants: "steak", kashrut: beefK, occasions: ["HOLIDAY", "SHABBAT"],
  },
  {
    slug: "shayetel", category: "beef", nameHe: "שייטל", nameEn: "Shayetel (sirloin)",
    shortHe: "נתח רזה עם טעם בקרי נקי — לסטייק מהיר, לרוסטביף ולקרפצ׳יו.", shortEn: "Lean with a clean beef flavour — for quick steaks, roast beef and carpaccio.",
    longHe: "נתח מהחלק העליון של הירך, רזה ובעל סיבים אחידים. כשלא מבשלים אותו יתר על המידה הוא שומר על עסיסיות ונפרס יפה. אנחנו מסירים את קרום הכסף ומשאירים שכבת שומן דקה.", longEn: "A cut from the top of the hip, lean with an even grain. Cooked no further than medium-rare it stays juicy and slices cleanly. We remove the silverskin and leave a thin layer of fat.",
    cookingHe: "סטייק בעובי 2 ס״מ: מחבת חמה מאוד, 3 דקות לכל צד; רוסטביף: צריבה מכל הצדדים ו-25 דקות בתנור 180°C — בשני המקרים עד 54°C במרכז. מנוחה של 5–10 דקות ופריסה דקה נגד הסיבים.", cookingEn: "For a 2 cm steak, a very hot pan for 3 minutes a side; for roast beef, sear all over and roast 25 minutes at 180°C — either way to 54°C at the centre. Rest 5–10 minutes and slice thinly against the grain.",
    animal: "BEEF", originHe: "חלק אחורי · ירך עליונה · מנוקר", originEn: "Hindquarter · top sirloin · deveined",
    weight: steakRules(139, 500), variants: "steak", kashrut: beefK, occasions: ["GRILL", "WEEKNIGHT"],
  },
  {
    slug: "asado", category: "beef", nameHe: "אסאדו", nameEn: "Asado (short ribs)",
    shortHe: "רצועת צלעות עם שכבות שומן, שמתרככת אחרי שעות על אש נמוכה.", shortEn: "A strip of ribs layered with fat that turns tender after hours on low heat.",
    longHe: "נחתך לרוחב הצלעות הקצרות בחלק הקדמי, כך שכל רצועה מחזיקה כמה עצמות ושכבות של בשר ושומן. בבישול ארוך הקולגן נמס, הבשר נפרד מהעצם והרוטב מקבל גוף. אנחנו חותכים רצועות ברוחב אחיד ומורידים את השומן העודף מבחוץ.", longEn: "Cut across the short ribs of the forequarter, so each strip holds several bones and layers of meat and fat. With long cooking the collagen melts, the meat leaves the bone and the sauce gains body. We cut strips of even width and trim excess fat from the outside.",
    cookingHe: "בסיר מכוסה עם בצל ומעט נוזלים בתנור 140°C במשך 5–6 שעות, או לילה שלם בחמין. ב-20 הדקות האחרונות מסירים את המכסה ומעלים ל-200°C כדי שייווצר קרום.", cookingEn: "In a covered pot with onion and a little liquid at 140°C for 5–6 hours, or overnight in cholent. For the last 20 minutes, uncover and raise the oven to 200°C to build a crust.",
    animal: "BEEF", originHe: "חלק קדמי · צלעות קצרות", originEn: "Forequarter · short ribs",
    weight: roastRules(99, 2000), variants: "roast", kashrut: beefK, occasions: ["SLOW_COOK", "SHABBAT"], flags: ["BONE_IN"], bestSeller: true,
  },
  {
    slug: "denver", category: "beef", nameHe: "דנוור", nameEn: "Denver steak",
    shortHe: "סטייק מעומק הכתף, עם שיש שמתקרב לאנטריקוט במחיר נמוך יותר.", shortEn: "A steak from deep in the chuck, with marbling close to rib-eye at a lower price.",
    longHe: "שריר מתחת לעצם השכמה שעובד מעט, ולכן נשאר רך יחסית ועשיר בשומן תוך-שרירי. הטעם בקרי ומלא, והביס מעט לעיס יותר מאנטריקוט. הקצב שלנו מפריד אותו מהכתף, מנקה את הגידים וחותך לסטייקים.", longEn: "A muscle beneath the shoulder blade that does little work, so it stays relatively tender and rich in intramuscular fat. The flavour is full and beefy, the bite a little chewier than rib-eye. Our butcher separates it from the chuck, cleans the sinew and cuts it into steaks.",
    cookingHe: "גריל חם, 3 דקות לכל צד לסטייק בעובי 2 ס״מ, עד 54°C במרכז. מנוחה של 5 דקות ופריסה דקה נגד הסיבים.", cookingEn: "Hot grill, 3 minutes a side for a 2 cm steak, to 54°C at the centre. Rest 5 minutes and slice thinly against the grain.",
    animal: "BEEF", originHe: "חלק קדמי · כתף, מתחת לשכמה", originEn: "Forequarter · chuck, under the blade",
    weight: steakRules(149, 350), variants: "steak", kashrut: beefK, occasions: ["GRILL"],
  },
  {
    slug: "mock-fillet", category: "beef", nameHe: "פילה מדומה", nameEn: "Mock tender",
    shortHe: "נתח כתף גלילי ורזה — לצלי בסיר ולפרוסות דקות לכריכים.", shortEn: "A lean, cylindrical shoulder cut — for pot roast and thin sandwich slices.",
    longHe: "שריר מעל עצם השכמה שצורתו מזכירה פילה, אבל הוא עובד יותר ולכן מחוזק ברקמת חיבור. בבישול איטי ברוטב הוא מתרכך ונפרס לפרוסות נקיות שלא מתפוררות. אנחנו מנקים את הקרום החיצוני, ולפי בקשה קושרים ברשת לצלי.", longEn: "A muscle above the shoulder blade shaped like a fillet, but it works harder and carries more connective tissue. Braised slowly in sauce it softens and slices cleanly without crumbling. We trim the outer membrane and, on request, net-tie it for roasting.",
    cookingHe: "צורבים בסיר כבד, מוסיפים בצל, יין אדום וכוס מים, ומבשלים מכוסה ב-160°C כ-3 שעות. מקררים בתוך הנוזלים, פורסים קר ומחממים את הפרוסות ברוטב.", cookingEn: "Sear in a heavy pot, add onion, red wine and a cup of water, and braise covered at 160°C for about 3 hours. Cool in the liquid, slice cold and reheat the slices in the sauce.",
    animal: "BEEF", originHe: "חלק קדמי · כתף, מעל השכמה", originEn: "Forequarter · chuck tender, above the blade",
    weight: roastRules(109), variants: "roast", kashrut: beefK, occasions: ["SHABBAT", "SLOW_COOK"],
  },
  {
    slug: "beef-shoulder", category: "beef", nameHe: "כתף בקר", nameEn: "Beef shoulder",
    shortHe: "נתח עשיר בקולגן שמתרכך בבישול ארוך — לגולש, לחמין ולתבשיל.", shortEn: "Collagen-rich and made for long cooking — goulash, cholent and stews.",
    longHe: "שריר עבודה מהכתף, עם רקמת חיבור ושומן בין הסיבים. אחרי שעתיים וחצי על אש נמוכה הקולגן הופך לג׳לטין והבשר נעשה רך ועסיסי. אפשר לקבל נתח שלם או קוביות אחידות של 3 ס״מ.", longEn: "A working shoulder muscle with connective tissue and fat between the fibres. After two and a half hours on low heat the collagen turns to gelatin and the meat becomes soft and juicy. Order it as a whole piece or in even 3 cm cubes.",
    cookingHe: "צורבים את הקוביות במנות קטנות עד השחמה, מוסיפים בצל ונוזלים עד כיסוי ומבשלים 2.5–3 שעות על אש נמוכה מאוד. מכבים ונותנים לתבשיל לנוח 20 דקות לפני ההגשה.", cookingEn: "Brown the cubes in small batches, add onion and liquid to cover, and simmer on very low heat for 2.5–3 hours. Turn off the heat and let the stew rest 20 minutes before serving.",
    animal: "BEEF", originHe: "חלק קדמי · כתף", originEn: "Forequarter · chuck",
    weight: roastRules(85, 1500), variants: "stew", kashrut: beefK, occasions: ["SLOW_COOK", "WEEKNIGHT"],
  },
  {
    slug: "brisket", category: "beef", nameHe: "חזה בקר (בריסקט)", nameEn: "Brisket",
    shortHe: "נתח החזה עם שכבת שומן עליונה — לעישון, לצלי בתנור ולקורנביף.", shortEn: "The brisket with its fat cap — for smoking, oven braising and corned beef.",
    longHe: "שריר החזה נושא את משקל הבהמה, ולכן הוא עשיר ברקמת חיבור ודורש זמן. שכבת השומן העליונה שומרת עליו לח לאורך שעות, והתוצאה פרוסות רכות שנשארות שלמות. אנחנו משאירים כחצי סנטימטר שומן ומסירים את השאר.", longEn: "The chest muscle carries the animal's weight, so it is rich in connective tissue and needs time. The fat cap keeps it moist through long hours, giving tender slices that hold together. We leave about half a centimetre of fat and trim the rest.",
    cookingHe: "במעשנה ב-110°C במשך 10–12 שעות, או בסיר מכוסה בתנור 150°C כ-5 שעות, עד שמזלג נכנס בלי התנגדות. עוטפים ונותנים מנוחה של שעה לפחות לפני פריסה נגד הסיבים.", cookingEn: "Smoke at 110°C for 10–12 hours, or braise covered in a 150°C oven for about 5 hours, until a fork slides in without resistance. Wrap and rest for at least an hour before slicing against the grain.",
    animal: "BEEF", originHe: "חלק קדמי · חזה", originEn: "Forequarter · brisket",
    weight: roastRules(99, 2500), variants: "roast", kashrut: beefK, occasions: ["SLOW_COOK", "HOLIDAY"],
  },
  {
    slug: "osso-buco", category: "beef", nameHe: "אוסובוקו", nameEn: "Osso buco (beef shank)",
    shortHe: "פרוסות שוק בעובי 4 ס״מ עם עצם מח — למרק, לחמין ולתבשיל.", shortEn: "4 cm shank slices with marrow bone — for soup, cholent and stews.",
    longHe: "השוק הוא שריר עבודה מלא בגידים, שנמסים לג׳לטין בבישול ארוך. כל פרוסה נחתכת במסור בעובי 4 ס״מ עם עצם במרכז, והמח נמס לתוך המרק ומעבה אותו. אנחנו שוטפים את הפרוסות אחרי החיתוך, כך שהעצם נקייה משבבים.", longEn: "The shank is a working muscle full of sinew that melts into gelatin with long cooking. Each slice is band-sawn 4 cm thick around a marrow bone, and the marrow melts into the broth and thickens it. We rinse every slice after cutting so the bone is free of fragments.",
    cookingHe: "מכסים במים קרים, מביאים לרתיחה, מסירים קצף ומבשלים 3 שעות על אש נמוכה, או לילה שלם בחמין. את המח מוציאים בכפית ומורחים על לחם קלוי.", cookingEn: "Cover with cold water, bring to the boil, skim, and simmer on low heat for 3 hours, or overnight in cholent. Scoop the marrow out with a spoon and spread it on toasted bread.",
    animal: "BEEF", originHe: "חלק קדמי · שוק, פרוס עם עצם מח", originEn: "Forequarter · shank, cross-cut with marrow bone",
    weight: roastRules(69, 1500), variants: "plain", kashrut: beefK, occasions: ["SLOW_COOK", "SHABBAT"], flags: ["BONE_IN"],
  },
  {
    slug: "flank", category: "beef", nameHe: "ואסיו", nameEn: "Flank (vacío)",
    shortHe: "נתח שטוח מדופן הבטן, עם סיבים ארוכים וטעם בקרי חזק.", shortEn: "A flat cut from the flank, with long fibres and bold beef flavour.",
    longHe: "הוואסיו נחתך מדופן הבטן בחלק האחורי ועובר ניקור מלא. הוא שטוח, עם שכבת שומן בצד אחד וסיבים ארוכים שנותנים ביס עסיסי כשפורסים נכון. באסאדו הארגנטינאי צולים אותו שלם, ואנחנו מוכרים אותו כך.", longEn: "Vacío is cut from the flank of the hindquarter and fully deveined. It is flat, with fat on one side and long fibres that eat juicy when sliced correctly. Argentinians grill it whole, and that is how we sell it.",
    cookingHe: "גריל בינוני-חם, כ-8 דקות לכל צד כשצד השומן מתחיל למטה, עד 57°C במרכז. מנוחה של 10 דקות ופריסה דקה נגד הסיבים.", cookingEn: "Medium-hot grill, about 8 minutes a side starting fat-side down, to 57°C at the centre. Rest 10 minutes and slice thinly against the grain.",
    animal: "BEEF", originHe: "חלק אחורי · דופן הבטן · מנוקר", originEn: "Hindquarter · flank · deveined",
    weight: roastRules(129, 1000), variants: "plain", kashrut: beefK, occasions: ["GRILL"],
  },
  {
    slug: "beef-cheeks", category: "beef", nameHe: "לחי בקר", nameEn: "Beef cheeks",
    shortHe: "שריר לעיסה עמוס ג׳לטין, שנעשה רך ודביק אחרי 4 שעות ביין.", shortEn: "A gelatin-rich chewing muscle that turns soft and glossy after 4 hours in wine.",
    longHe: "שריר הלחי עובד כל היום בלעיסה, ולכן הוא מלא ברקמת חיבור. בבישול ארוך היא נמסה, הבשר נעשה רך והרוטב מקבל ברק. אנחנו מנקים את הקרום והשומן החיצוני, וכל לחי שוקלת כ-300–400 גר׳.", longEn: "The cheek works all day chewing, so it is packed with connective tissue. A long braise melts it, softening the meat and giving the sauce a sheen. We trim the membrane and outer fat; each cheek weighs about 300–400 g.",
    cookingHe: "צורבים היטב, מכסים ביין אדום, ירקות שורש וציר, ומבשלים בסיר מכוסה בתנור 150°C כ-4 שעות. מוציאים את הלחיים, מצמצמים את הרוטב על הכיריים ומחזירים אותן לתוכו.", cookingEn: "Sear well, cover with red wine, root vegetables and stock, and braise covered in a 150°C oven for about 4 hours. Lift out the cheeks, reduce the sauce on the stove and return them to it.",
    animal: "BEEF", originHe: "ראש · שריר הלחי", originEn: "Head · cheek muscle",
    weight: partsRules(119, 1000), variants: "plain", kashrut: beefK, occasions: ["SLOW_COOK", "HOLIDAY"], stock: "low",
  },

  // ── Dry-aged ─────────────────────────────────────────
  {
    slug: "aged-entrecote-28", category: "dry-aged", nameHe: "אנטריקוט מיושן 28 יום", nameEn: "Entrecôte, dry-aged 28 days",
    shortHe: "28 יום ביישון יבש — ארומה אגוזית, טעם מרוכז ומרקם רך.", shortEn: "28 days dry-aged — a nutty aroma, concentrated flavour and tender texture.",
    longHe: "האנטריקוט מיושן אצלנו על העצם 28 יום, בתא עם בקרת לחות וזרימת אוויר. הבשר מאבד כ-15% ממשקלו, הטעם מתרכז ואנזימים טבעיים מרככים את הסיבים. לפני האריזה אנחנו מסירים את הקליפה היבשה ומוכרים רק את הלב.", longEn: "Our entrecôte ages on the bone for 28 days in a chamber with controlled humidity and airflow. It loses about 15% of its weight, the flavour concentrates and natural enzymes soften the fibres. Before packing we trim away the dry crust and sell only the heart.",
    cookingHe: "מוציאים מהמקרר 30 דקות לפני, וצולים על גריל חם מאוד 3–4 דקות לכל צד עד 54°C במרכז. מנוחה של 5 דקות, ומלח גס רק לפני ההגשה.", cookingEn: "Take it out of the fridge 30 minutes ahead and grill over very high heat for 3–4 minutes a side, to 54°C at the centre. Rest 5 minutes and add coarse salt just before serving.",
    animal: "BEEF", originHe: "חלק קדמי · גב הצלעות · יישון 28 יום", originEn: "Forequarter · rib · aged 28 days",
    weight: steakRules(289, 450), variants: "steak", kashrut: beefK, occasions: ["GRILL", "HOLIDAY"], agingDays: 28, bestSeller: true,
  },
  {
    slug: "aged-tomahawk-35", category: "dry-aged", nameHe: "טומהוק מיושן 35 יום", nameEn: "Tomahawk, dry-aged 35 days",
    shortHe: "צלע עבה על עצם ארוכה, מיושנת 35 יום — נתח למרכז השולחן.", shortEn: "A thick rib steak on a long bone, aged 35 days — a cut for the centre of the table.",
    longHe: "סטייק צלע בעובי כ-5 ס״מ, עם עצם ארוכה שהקצב מנקה עד הקצה. 35 ימי יישון יבש נותנים לו ארומה עמוקה ואגוזית ומרקם רך במיוחד. כל יחידה שוקלת כקילו וחצי ומספיקה לשלושה-ארבעה סועדים.", longEn: "A rib steak about 5 cm thick, on a long bone scraped clean to the tip. 35 days of dry ageing give it a deep, nutty aroma and a notably tender texture. Each piece weighs about 1.5 kg and serves three to four.",
    cookingHe: "צולים בחום עקיף של 120°C, בתנור או בגריל סגור, עד 50°C במרכז — כשעה. צורבים דקה-שתיים מכל צד על אש חזקה עד 54°C, ונותנים מנוחה של 10 דקות.", cookingEn: "Cook with indirect heat at 120°C, in the oven or a covered grill, to 50°C at the centre — about an hour. Sear 1–2 minutes a side over high heat to 54°C, then rest 10 minutes.",
    animal: "BEEF", originHe: "חלק קדמי · צלע עם עצם ארוכה · יישון 35 יום", originEn: "Forequarter · long-bone rib · aged 35 days",
    weight: { pricePerKg: 259, min: 1250, max: 5000, step: 250, def: 1500, avgPiece: 1500 }, variants: "plain", kashrut: beefK, occasions: ["GRILL", "HOLIDAY"], agingDays: 35, flags: ["BONE_IN"], stock: "out",
  },
  {
    slug: "aged-denver-21", category: "dry-aged", nameHe: "דנוור מיושן 21 יום", nameEn: "Denver, dry-aged 21 days",
    shortHe: "דנוור אחרי 21 יום יישון — השיש של הכתף עם טעם מרוכז יותר.", shortEn: "Denver after 21 days of ageing — chuck marbling with a more concentrated flavour.",
    longHe: "21 ימי יישון יבש מרככים את הסיבים של הדנוור ומעמיקים את הטעם הבקרי. השומן התוך-שרירי נשאר, והמרקם עדין יותר מדנוור טרי. אנחנו מסירים את השכבה היבשה וחותכים לסטייקים בעובי שבחרתם.", longEn: "21 days of dry ageing soften the Denver's fibres and deepen its beefy flavour. The intramuscular fat stays, and the texture is finer than fresh Denver. We trim the dry outer layer and cut steaks at the thickness you choose.",
    cookingHe: "גריל חם, 3 דקות לכל צד לסטייק בעובי 2 ס״מ, עד 54°C במרכז. מנוחה של 5 דקות ופריסה נגד הסיבים.", cookingEn: "Hot grill, 3 minutes a side for a 2 cm steak, to 54°C at the centre. Rest 5 minutes and slice against the grain.",
    animal: "BEEF", originHe: "חלק קדמי · כתף, מתחת לשכמה · יישון 21 יום", originEn: "Forequarter · chuck, under the blade · aged 21 days",
    weight: steakRules(199, 350), variants: "steak", kashrut: beefK, occasions: ["GRILL"], agingDays: 21,
  },

  // ── Chicken ──────────────────────────────────────────
  {
    slug: "whole-chicken", category: "chicken", nameHe: "עוף שלם", nameEn: "Whole chicken",
    shortHe: "עוף טרי של כ-1.8 ק״ג — שלם, מפורק ל-8 או פתוח לצלייה.", shortEn: "A fresh bird of about 1.8 kg — whole, cut into 8 or butterflied.",
    longHe: "העוף מגיע אלינו טרי כל בוקר, חלק ומוכשר במליחה. אנחנו מסירים שאריות נוצות ושומן עודף, ומפרקים לפי הבחירה שלכם. עוף פתוח (פרפר) נצלה באחידות ובפחות זמן.", longEn: "The chicken arrives fresh every morning, glatt and kosher-salted. We remove stray feathers and excess fat and cut it the way you choose. A butterflied bird roasts more evenly and in less time.",
    cookingHe: "צולים בתנור 200°C כשעה ורבע, עד 74°C בחלק העבה של הירך. מנוחה של 10 דקות לפני הפירוק, כדי שהמיצים יישארו בבשר.", cookingEn: "Roast at 200°C for about 1¼ hours, to 74°C in the thickest part of the thigh. Rest 10 minutes before carving so the juices stay in the meat.",
    animal: "CHICKEN", originHe: "עוף שלם · כ-1.8 ק״ג", originEn: "Whole bird · about 1.8 kg",
    weight: { pricePerKg: 29, min: 1800, max: 9000, step: 1800, def: 1800, avgPiece: 1800 }, variants: "whole", kashrut: poultryK, occasions: ["SHABBAT", "WEEKNIGHT"], bestSeller: true,
  },
  {
    slug: "chicken-breast", category: "chicken", nameHe: "חזה עוף", nameEn: "Chicken breast",
    shortHe: "פילה חזה נקי, ללא עור ועצם — לשניצל, לגריל ולמוקפץ.", shortEn: "Clean breast fillet, skinless and boneless — for schnitzel, grilling and stir-fries.",
    longHe: "פילה חזה שלם שנפרד מהעצם ומנוקה מקרומים ושומן. זה החלק הרזה בעוף, ולכן הוא מתייבש כשמבשלים אותו יותר מדי. לפי בקשה אנחנו פורסים דק לשניצל או משאירים פילה שלם.", longEn: "A whole breast fillet taken off the bone and cleaned of membrane and fat. It is the leanest part of the bird, so it dries out when overcooked. On request we slice it thin for schnitzel or leave the fillets whole.",
    cookingHe: "מחבת חמה עם מעט שמן, 4–5 דקות לכל צד לפילה שלם, עד 74°C במרכז. מנוחה של 3 דקות לפני הפריסה.", cookingEn: "A hot pan with a little oil, 4–5 minutes a side for a whole fillet, to 74°C at the centre. Rest 3 minutes before slicing.",
    animal: "CHICKEN", originHe: "חזה · ללא עור וללא עצם", originEn: "Breast · skinless, boneless",
    weight: partsRules(52), variants: "schnitzel", kashrut: poultryK, occasions: ["WEEKNIGHT"], bestSeller: true,
  },
  {
    slug: "pargiyot", category: "chicken", nameHe: "פרגיות", nameEn: "Pargiyot (boneless thighs)",
    shortHe: "ירך עוף ללא עור ועצם, שנשארת עסיסית גם על אש חזקה.", shortEn: "Boneless, skinless chicken thigh that stays juicy even over high heat.",
    longHe: "הפרגית היא ירך עוף מפורקת, עם יותר שומן תוך-שרירי מאשר בחזה. לכן היא סלחנית על הגריל ושומרת על מיצים גם אחרי כמה דקות נוספות. אנחנו מסירים את העור, הגידים ושאריות הסחוס, ופורשים כל ירך לעובי אחיד.", longEn: "Pargit is a boned chicken thigh, with more intramuscular fat than breast. That makes it forgiving on the grill; it holds its juices even a few minutes past done. We remove the skin, sinew and bits of cartilage and open each thigh to an even thickness.",
    cookingHe: "גריל חם, 5–6 דקות לכל צד, עד 74°C במרכז ופסי צלייה שחומים. מנוחה של 3 דקות לפני ההגשה.", cookingEn: "Hot grill, 5–6 minutes a side, to 74°C at the centre with well-browned grill marks. Rest 3 minutes before serving.",
    animal: "CHICKEN", originHe: "ירך · ללא עור וללא עצם", originEn: "Thigh · skinless, boneless",
    weight: partsRules(62), variants: "plain", kashrut: poultryK, occasions: ["GRILL", "WEEKNIGHT"], bestSeller: true,
  },
  {
    slug: "chicken-drumsticks", category: "chicken", nameHe: "שוקיים עוף", nameEn: "Chicken drumsticks",
    shortHe: "שוקיים בגודל אחיד שמוכנות יחד — לתנור, לגריל ולסיר.", shortEn: "Evenly sized drumsticks that finish together — for the oven, grill and pot.",
    longHe: "השוק היא בשר כהה עם עור ועצם, עסיסית יותר מהחזה ועמידה לבישול ארוך. אנחנו ממיינים לפי גודל, כך שכל השוקיים באריזה מוכנות באותו זמן. אפשר לבקש ללא עור.", longEn: "The drumstick is dark meat with skin and bone, juicier than breast and happy with long cooking. We sort by size so every drumstick in the pack is ready at the same time. Skinless on request.",
    cookingHe: "צולים בתנור 200°C כ-45 דקות, עם תיבול לבחירה, עד 74°C ליד העצם. בחמש הדקות האחרונות מעבירים לגריל העליון כדי להשחים את העור.", cookingEn: "Roast at 200°C for about 45 minutes with your choice of seasoning, to 74°C next to the bone. Switch to the top grill for the last five minutes to brown the skin.",
    animal: "CHICKEN", originHe: "שוק · עם עצם", originEn: "Drumstick · bone-in",
    weight: partsRules(29), variants: "chickenParts", kashrut: poultryK, occasions: ["WEEKNIGHT", "SHABBAT"], flags: ["BONE_IN"],
  },
  {
    slug: "chicken-leg-quarters", category: "chicken", nameHe: "כרעיים עוף", nameEn: "Chicken leg quarters",
    shortHe: "ירך ושוק בחתיכה אחת, עם עור — לצלייה בתנור ולחמין.", shortEn: "Thigh and drumstick in one piece, skin on — for roasting and cholent.",
    longHe: "הכרע היא הרגל המלאה של העוף: ירך ושוק מחוברות, עם עור ועצם. הבשר הכהה והשומן שמתחת לעור מחזיקים שעות של בישול בלי להתייבש. אנחנו מסירים את השומן העודף בקצה הירך וממיינים לפי גודל.", longEn: "The leg quarter is the whole leg: thigh and drumstick joined, skin and bone on. The dark meat and the fat under the skin hold up to hours of cooking without drying. We trim excess fat at the end of the thigh and sort by size.",
    cookingHe: "צולים בתנור 190°C כשעה, עם העור כלפי מעלה, עד 74°C בירך ועור שחום. לחמין מניחים את הכרעיים מעל שאר המרכיבים לפני שבת, והם מתבשלים כל הלילה.", cookingEn: "Roast skin-side up at 190°C for about an hour, to 74°C in the thigh with browned skin. For cholent, lay them on top of the other ingredients before Shabbat and let them cook overnight.",
    animal: "CHICKEN", originHe: "ירך ושוק · עם עצם ועור", originEn: "Thigh and drumstick · bone-in, skin-on",
    weight: partsRules(27, 1500), variants: "chickenParts", kashrut: poultryK, occasions: ["SHABBAT", "SLOW_COOK"], flags: ["BONE_IN"],
  },
  {
    slug: "chicken-wings", category: "chicken", nameHe: "כנפיים", nameEn: "Chicken wings",
    shortHe: "כנפיים שלמות עם הרבה עור — לתנור חם ולגריל.", shortEn: "Whole wings with plenty of skin — for a hot oven or the grill.",
    longHe: "כנף שלמה בשלושת חלקיה: הזרוע, האמה והקצה. היחס בין עור לבשר גבוה, ולכן חום חזק ממיס את השומן ומשאיר עור פריך. אנחנו מוכרים כנפיים טריות בלבד, מנוקות משאריות נוצות.", longEn: "A whole wing in all three sections: drumette, flat and tip. The ratio of skin to meat is high, so strong heat renders the fat and leaves crisp skin. We sell fresh wings only, cleaned of stray feathers.",
    cookingHe: "צולים בתנור 210°C על רשת כ-50 דקות, והופכים באמצע, עד שהעור פריך ושחום. מערבבים ברוטב רק אחרי הצלייה, כדי שהעור לא יתרכך.", cookingEn: "Roast on a rack at 210°C for about 50 minutes, turning halfway, until the skin is crisp and brown. Toss in sauce only after roasting so the skin stays crisp.",
    animal: "CHICKEN", originHe: "כנף · שלמה, עם עצם", originEn: "Wing · whole, bone-in",
    weight: partsRules(24), variants: "plain", kashrut: poultryK, occasions: ["GRILL", "WEEKNIGHT"], flags: ["BONE_IN"],
  },
  {
    slug: "chicken-schnitzel", category: "chicken", nameHe: "שניצל עוף דק", nameEn: "Thin chicken schnitzel",
    shortHe: "חזה עוף פרוס לעובי חצי ס״מ, אחיד ומוכן לציפוי.", shortEn: "Chicken breast sliced half a centimetre thick, even and ready to coat.",
    longHe: "פרוסות חזה שנחתכות אצלנו במכונה לעובי אחיד של חצי סנטימטר. בעובי הזה השניצל מוכן תוך דקות, לפני שהבשר מספיק להתייבש. מציפים בביצה ופירורי לחם, או בקמח ותבלינים.", longEn: "Breast slices machine-cut in our shop to an even half centimetre. At that thickness a schnitzel is done in minutes, before the meat has time to dry out. Coat in egg and breadcrumbs, or in seasoned flour.",
    cookingHe: "מטגנים בשמן עמוק בחום 175°C, 2 דקות לכל צד, עד שהציפוי זהוב. מעבירים לרשת ולא לנייר סופג, כדי שהתחתית תישאר פריכה.", cookingEn: "Deep-fry at 175°C for 2 minutes a side, until the coating is golden. Drain on a rack rather than paper towel so the underside stays crisp.",
    animal: "CHICKEN", originHe: "חזה · פרוס לעובי 0.5 ס״מ", originEn: "Breast · sliced 0.5 cm thick",
    weight: partsRules(62), variants: "plain", kashrut: poultryK, occasions: ["WEEKNIGHT"],
  },
  {
    slug: "soup-bones-chicken", category: "chicken", nameHe: "גבות ועצמות למרק", nameEn: "Chicken backs for soup",
    shortHe: "גבות, צוואר ועצמות — הקולגן שנותן למרק עוף גוף וצבע.", shortEn: "Backs, necks and bones — the collagen that gives chicken soup body and colour.",
    longHe: "גבות וצווארי עוף עם מעט בשר, ועצמות שמשחררות קולגן בבישול ארוך. זה מה שהופך מים לציר סמיך, שמתקרש במקרר. אנחנו שוטפים ומפרקים לחלקים שנכנסים לכל סיר.", longEn: "Chicken backs and necks with a little meat, and bones that release collagen over long cooking. That is what turns water into a rich stock that sets in the fridge. We rinse them and break them into pieces that fit any pot.",
    cookingHe: "מכסים במים קרים, מביאים לרתיחה ומסירים את הקצף, מוסיפים ירקות שורש ומבשלים 3 שעות על אש נמוכה. מסננים, מקררים ומסירים את שכבת השומן שהתקשתה למעלה.", cookingEn: "Cover with cold water, bring to the boil and skim, then add root vegetables and simmer on low heat for 3 hours. Strain, chill and lift off the fat that sets on top.",
    animal: "CHICKEN", originHe: "גב, צוואר ועצמות עוף", originEn: "Chicken backs, necks and bones",
    weight: partsRules(12, 1500), variants: "plain", kashrut: poultryK, occasions: ["SHABBAT", "SLOW_COOK"], flags: ["BONE_IN"],
  },

  // ── Turkey ───────────────────────────────────────────
  {
    slug: "turkey-breast", category: "turkey", nameHe: "חזה הודו", nameEn: "Turkey breast",
    shortHe: "נתח חזה שלם ורזה — לצלי, לשניצל ולסטייקים דקים.", shortEn: "A whole, lean breast — for roasts, schnitzel and thin steaks.",
    longHe: "חזה הודו שלם ללא עור ועצם, רזה ובעל מרקם אחיד. הוא גדול מספיק לצלי שלם לשולחן החג, ונפרס בקלות לשניצלים או לסטייקים. אנחנו מנקים את הקרום והגידים ופורסים לפי הבקשה.", longEn: "A whole turkey breast, skinless and boneless, lean with an even texture. It is large enough for a holiday roast and slices easily into schnitzels or steaks. We trim the membrane and sinew and slice to order.",
    cookingHe: "צורבים במחבת ומעבירים לתנור 180°C לכשעה, עד 72°C במרכז. עוטפים בנייר כסף ל-10 דקות מנוחה, שבהן הטמפרטורה עולה ל-74°C.", cookingEn: "Sear in a pan, then roast at 180°C for about an hour, to 72°C at the centre. Wrap in foil and rest 10 minutes, during which it climbs to 74°C.",
    animal: "TURKEY", originHe: "חזה הודו · ללא עור וללא עצם", originEn: "Turkey breast · skinless, boneless",
    weight: roastRules(64, 1500), variants: "schnitzel", kashrut: poultryK, occasions: ["WEEKNIGHT", "HOLIDAY"],
  },
  {
    slug: "turkey-shawarma", category: "turkey", nameHe: "שווארמה הודו", nameEn: "Turkey shawarma",
    shortHe: "ירך הודו פרוסה דק עם שומן טלה — שווארמה בסגנון הדוכן.", shortEn: "Thin-sliced turkey thigh with lamb fat — shawarma the way the stands make it.",
    longHe: "ירך הודו היא בשר כהה ועסיסי, שעומד בחום חזק בלי להתייבש. אנחנו פורסים לרצועות דקות ומוסיפים שומן טלה, שנמס במחבת ונותן את הטעם המוכר מהשיפוד המסתובב. לא מוסיפים תבלינים, כך שהתיבול בידיים שלכם.", longEn: "Turkey thigh is dark, juicy meat that takes high heat without drying out. We slice it into thin strips and add lamb fat, which melts in the pan and brings the familiar flavour of the rotating spit. No spices are added, so the seasoning is up to you.",
    cookingHe: "מחבת רחבה או פלנצ׳ה חמה מאוד, במנות קטנות, 6–8 דקות עד שהקצוות משחימים ומתפריכים. מתבלים בסוף בכמון, כורכום ופפריקה ומגישים מיד.", cookingEn: "A wide pan or plancha over very high heat, in small batches, for 6–8 minutes until the edges brown and crisp. Season at the end with cumin, turmeric and paprika and serve at once.",
    animal: "TURKEY", originHe: "ירך הודו · פרוסה, עם שומן טלה", originEn: "Turkey thigh · sliced, with lamb fat",
    weight: partsRules(58), variants: "shawarma", kashrut: poultryK, occasions: ["WEEKNIGHT", "GRILL"], bestSeller: true,
  },
  {
    slug: "turkey-shank", category: "turkey", nameHe: "שוק הודו", nameEn: "Turkey drumstick",
    shortHe: "שוק הודו גדולה עם בשר כהה — לבישול ארוך ולצלייה איטית.", shortEn: "A large turkey drumstick of dark meat — for long braises and slow roasting.",
    longHe: "שוק ההודו מכילה הרבה בשר כהה, גידים ועצם עבה, ולכן היא מתאימה לחום נמוך ולזמן. אחרי שעתיים וחצי הגידים מתרככים והבשר נפרד מהעצם בקלות. כל שוק שוקלת כ-700–900 גר׳.", longEn: "A turkey drumstick carries plenty of dark meat, sinew and a thick bone, so it suits low heat and time. After two and a half hours the sinews soften and the meat pulls easily off the bone. Each drumstick weighs about 700–900 g.",
    cookingHe: "צורבים, מניחים בסיר עם בצל, שום ומעט נוזלים, ומבשלים מכוסה בתנור 160°C כשעתיים וחצי. ב-20 הדקות האחרונות מסירים את המכסה כדי שהעור ישחים.", cookingEn: "Sear, place in a pot with onion, garlic and a little liquid, and braise covered at 160°C for about two and a half hours. Uncover for the last 20 minutes to brown the skin.",
    animal: "TURKEY", originHe: "שוק הודו · עם עצם ועור", originEn: "Turkey drumstick · bone-in, skin-on",
    weight: roastRules(36, 1500), variants: "plain", kashrut: poultryK, occasions: ["SLOW_COOK"], flags: ["BONE_IN"],
  },
  {
    slug: "turkey-wings", category: "turkey", nameHe: "כנפי הודו", nameEn: "Turkey wings",
    shortHe: "כנפיים בשרניות שמוסיפות ג׳לטין ועומק לחמין ולמרק.", shortEn: "Meaty wings that add gelatin and depth to cholent and soup.",
    longHe: "כנף הודו גדולה פי כמה מכנף עוף, עם בשר כהה, עור ועצמות עשירות בקולגן. בבישול ארוך היא נותנת לתבשיל גוף, והבשר נעשה רך. לפי בקשה נחתוך במפרק, כדי שהכנף תיכנס לכל סיר.", longEn: "A turkey wing is several times the size of a chicken wing, with dark meat, skin and collagen-rich bones. Long cooking gives the pot body and leaves the meat tender. On request we cut at the joint so the wing fits any pot.",
    cookingHe: "מבשלים בסיר מכוסה על אש נמוכה, או בתנור 150°C, כשעתיים, עד שהבשר נפרד מהעצם. לחמין מניחים בתחתית הקדרה ומבשלים כל הלילה.", cookingEn: "Braise covered on low heat, or in a 150°C oven, for about two hours, until the meat comes off the bone. For cholent, place them at the bottom of the pot and cook overnight.",
    animal: "TURKEY", originHe: "כנף הודו · עם עצם ועור", originEn: "Turkey wing · bone-in, skin-on",
    weight: partsRules(32, 1500), variants: "plain", kashrut: poultryK, occasions: ["SLOW_COOK", "SHABBAT"], flags: ["BONE_IN"],
  },

  // ── Lamb ─────────────────────────────────────────────
  {
    slug: "lamb-rack", category: "lamb", nameHe: "צלעות טלה", nameEn: "Rack of lamb",
    shortHe: "קרה טלה עם עצמות מנוקות — נצלה ב-20 דקות ונחתך לצלעות.", shortEn: "A French-trimmed lamb rack — roasted in 20 minutes and carved into chops.",
    longHe: "7–8 צלעות מגב הטלה, עם עין בשר רכה ושכבת שומן דקה. הקצב מנקה את העצמות עד הבשר, כך שהן נקיות ונוחות לאחיזה. צולים שלם וחותכים לצלעות בודדות בזמן ההגשה.", longEn: "Seven to eight ribs from the lamb's back, with a tender eye of meat and a thin layer of fat. Our butcher scrapes the bones clean down to the meat, so they are neat and easy to hold. Roast it whole and carve into single chops at the table.",
    cookingHe: "צורבים את צד השומן במחבת חמה 3 דקות, ומעבירים לתנור 200°C ל-15 דקות, עד 57°C במרכז. מנוחה של 8 דקות וחיתוך בין העצמות.", cookingEn: "Sear the fat side in a hot pan for 3 minutes, then roast at 200°C for 15 minutes, to 57°C at the centre. Rest 8 minutes and cut between the bones.",
    animal: "LAMB", originHe: "חלק קדמי · צלעות גב", originEn: "Forequarter · rack",
    weight: { pricePerKg: 209, min: 500, max: 3000, step: 250, def: 750, avgPiece: 750 }, variants: "plain", kashrut: lambK, occasions: ["HOLIDAY", "GRILL"], flags: ["BONE_IN"],
  },
  {
    slug: "lamb-shoulder", category: "lamb", nameHe: "כתף טלה", nameEn: "Lamb shoulder",
    shortHe: "כתף שלמה עם עצם — אחרי 7 שעות בתנור הבשר נפרד במזלג.", shortEn: "A whole bone-in shoulder — after 7 hours in the oven it pulls apart with a fork.",
    longHe: "כתף הטלה עשירה בשומן וברקמת חיבור, ולכן היא צריכה חום נמוך וזמן ארוך. אחרי שבע שעות הבשר מתפרק מהעצם ונשאר עסיסי, עם קרום שחום מלמעלה. אנחנו מנקים את השומן העודף ומשאירים את העצם, שמוסיפה טעם.", longEn: "Lamb shoulder is rich in fat and connective tissue, so it wants low heat and a long time. After seven hours the meat falls from the bone and stays juicy under a browned crust. We trim the excess fat and leave the bone in for flavour.",
    cookingHe: "משפשפים בשום, רוזמרין ושמן זית, ומבשלים 7 שעות בתבנית מכוסה בתנור 130°C עם כוס מים או יין לבן. ב-20 הדקות האחרונות מסירים את הכיסוי ומעלים ל-200°C להשחמה.", cookingEn: "Rub with garlic, rosemary and olive oil and cook covered at 130°C for 7 hours with a cup of water or white wine. For the last 20 minutes, uncover and raise the oven to 200°C to brown.",
    animal: "LAMB", originHe: "חלק קדמי · כתף עם עצם", originEn: "Forequarter · bone-in shoulder",
    weight: roastRules(149, 2000), variants: "roast", kashrut: lambK, occasions: ["HOLIDAY", "SLOW_COOK"], flags: ["BONE_IN"],
  },
  {
    slug: "lamb-neck", category: "lamb", nameHe: "צוואר טלה", nameEn: "Lamb neck",
    shortHe: "פרוסות צוואר עם עצם ומח — לתבשילים, לקוסקוס ולמרק.", shortEn: "Bone-in neck slices with marrow — for stews, couscous and soup.",
    longHe: "הצוואר הוא שריר שעובד כל הזמן, עם שכבות בשר סביב חוליות העצם. בבישול ארוך הרקמות נמסות, והמח והקולגן מעבים את הרוטב. אנחנו פורסים במסור לפרוסות אחידות.", longEn: "The neck works constantly, with layers of meat wrapped around the vertebrae. Long cooking melts the tissue, and the marrow and collagen thicken the sauce. We band-saw it into even slices.",
    cookingHe: "צורבים את הפרוסות, מוסיפים בצל, ירקות ונוזלים עד כיסוי, ומבשלים שעתיים על אש נמוכה בסיר מכוסה. לפני ההגשה מסירים את השומן שצף על פני התבשיל.", cookingEn: "Brown the slices, add onion, vegetables and liquid to cover, and simmer covered on low heat for two hours. Skim the fat from the surface before serving.",
    animal: "LAMB", originHe: "חלק קדמי · צוואר, פרוס עם עצם", originEn: "Forequarter · neck, sliced on the bone",
    weight: partsRules(109), variants: "plain", kashrut: lambK, occasions: ["SLOW_COOK"], flags: ["BONE_IN"],
  },

  // ── Ground & sausages ───────────────────────────────
  {
    slug: "ground-beef", category: "ground", nameHe: "טחון בקר", nameEn: "Ground beef",
    shortHe: "נטחן אצלנו מכתף ומחזה, 15% שומן, ביום המשלוח.", shortEn: "Ground in-house from shoulder and brisket, 15% fat, on delivery day.",
    longHe: "תערובת קבועה של כתף לטעם וחזה לשומן, כך שכל אריזה מתנהגת אותו דבר בסיר ובמחבת. אנחנו טוחנים ביום המשלוח ולא מוסיפים דבר. בחרו טחינה דקה לקציצות ולמילויים, או גסה להמבורגר ולבולונז.", longEn: "A fixed blend of shoulder for flavour and brisket for fat, so every pack behaves the same in the pot and the pan. We grind on delivery day and add nothing. Choose a fine grind for meatballs and stuffings, or coarse for burgers and bolognese.",
    cookingHe: "לקציצות ולהמבורגר מערבבים בעדינות בלי ללוש, וצולים או מטגנים עד 71°C במרכז. לבולונז משחימים במחבת רחבה בלי לערבב בדקות הראשונות, ורק אז מוסיפים ירקות ורוטב.", cookingEn: "For meatballs and burgers, mix gently without kneading and grill or fry to 71°C at the centre. For bolognese, brown in a wide pan without stirring for the first few minutes, then add vegetables and sauce.",
    animal: "BEEF", originHe: "תערובת כתף וחזה בקר · 15% שומן", originEn: "Beef shoulder and brisket blend · 15% fat",
    weight: partsRules(72), variants: "ground", kashrut: beefK, occasions: ["WEEKNIGHT"], bestSeller: true,
  },
  {
    slug: "ground-chicken", category: "ground", nameHe: "טחון עוף", nameEn: "Ground chicken",
    shortHe: "טחון מפרגיות וחזה ללא עור — קל, עם מספיק שומן לעסיסיות.", shortEn: "Ground from skinless thighs and breast — light, with enough fat to stay juicy.",
    longHe: "הפרגיות נותנות שומן וטעם, והחזה נותן מרקם קל. אנחנו טוחנים ללא עור, ביום המשלוח. מתאים לקציצות ברוטב, לפשטידות ולמילוי ירקות.", longEn: "The thighs bring fat and flavour; the breast keeps the texture light. We grind it skinless, on delivery day. Use it for meatballs in sauce, savoury pies and stuffed vegetables.",
    cookingHe: "מעצבים קציצות בידיים רטובות, משחימים קלות במחבת ומבשלים ברוטב 20 דקות, עד 74°C במרכז. מכבים את האש ומשאירים מכוסה 5 דקות לפני ההגשה.", cookingEn: "Shape meatballs with wet hands, brown lightly in a pan and simmer in sauce for 20 minutes, to 74°C at the centre. Turn off the heat and leave covered for 5 minutes before serving.",
    animal: "CHICKEN", originHe: "תערובת ירך וחזה עוף · ללא עור", originEn: "Chicken thigh and breast blend · skinless",
    weight: partsRules(49), variants: "ground", kashrut: poultryK, occasions: ["WEEKNIGHT"],
  },
  {
    slug: "ground-lamb", category: "ground", nameHe: "טחון טלה", nameEn: "Ground lamb",
    shortHe: "טלה טחון עם שומן מאוזן — לקבב, לקובה ולממולאים.", shortEn: "Ground lamb with balanced fat — for kebab, kubbeh and stuffed vegetables.",
    longHe: "נטחן אצלנו מכתף טלה, עם מספיק שומן כדי שהקבב יחזיק על השיפוד ויישאר עסיסי. הטעם של הטלה בולט ונקי. מתאים לקבב, למילוי קובה ולממולאים.", longEn: "Ground in-house from lamb shoulder, with enough fat for kebab to hold on the skewer and stay juicy. The lamb flavour is pronounced and clean. Use it for kebab, kubbeh filling and stuffed vegetables.",
    cookingHe: "מערבבים עם בצל קצוץ, פטרוזיליה וכמון, מקררים חצי שעה ומעצבים על שיפודים. גריל חם, 3–4 דקות לכל צד, עד 71°C במרכז.", cookingEn: "Mix with chopped onion, parsley and cumin, chill for half an hour and shape onto skewers. Hot grill, 3–4 minutes a side, to 71°C at the centre.",
    animal: "LAMB", originHe: "חלק קדמי · כתף טלה, טחונה", originEn: "Forequarter · lamb shoulder, ground",
    weight: partsRules(119), variants: "ground", kashrut: lambK, occasions: ["GRILL", "HOLIDAY"],
  },
  {
    slug: "kebab-spiced", category: "ground", nameHe: "קבב מתובל", nameEn: "Spiced kebab mix",
    shortHe: "בקר וטלה עם פטרוזיליה, בצל ובהרט — מוכן לעיצוב.", shortEn: "Beef and lamb with parsley, onion and baharat — ready to shape.",
    longHe: "תערובת הבית: בקר לגוף, טלה לשומן ולטעם, ופטרוזיליה, בצל ובהרט שנקצצים ביום ההכנה. היא מתובלת במלואה, כך שנשאר רק לעצב. מכילה תבלינים ולכן אינה כשרה לפסח.", longEn: "Our house blend: beef for body, lamb for fat and flavour, with parsley, onion and baharat chopped on the day. It is fully seasoned, so all that is left is shaping. Contains spices, so it is not kosher for Passover.",
    cookingHe: "מעצבים בידיים רטובות סביב שיפוד שטוח, וצולים על גריל חם 3 דקות לכל צד, עד 71°C במרכז. מנוחה של 2 דקות, ומגישים עם טחינה.", cookingEn: "Shape with wet hands around a flat skewer and grill over high heat for 3 minutes a side, to 71°C at the centre. Rest 2 minutes and serve with tahini.",
    animal: "MIXED", originHe: "תערובת בקר וטלה · מתובלת", originEn: "Beef and lamb blend · seasoned",
    weight: partsRules(79), variants: "plain", kashrut: spiced(beefK), occasions: ["GRILL"],
  },
  {
    slug: "merguez", category: "ground", nameHe: "נקניקיות מרגז", nameEn: "Merguez sausages",
    shortHe: "נקניקיות חריפות מבקר וטלה, עם הריסה ושום, במעי טבעי.", shortEn: "Spicy beef and lamb sausages with harissa and garlic, in natural casing.",
    longHe: "המרגז ממולא אצלנו בעבודת יד לתוך מעי טבעי. ההריסה והשום נותנים חריפות שמתעצמת על הגחלים, והמעי מתהדק ומשחים. מכיל תבלינים ולכן אינו כשר לפסח.", longEn: "Our merguez is stuffed by hand into natural casing. Harissa and garlic give a heat that builds over the coals, while the casing tightens and browns. Contains spices, so it is not kosher for Passover.",
    cookingHe: "גריל בינוני, כ-8 דקות, והופכים לעתים קרובות עד שהמעי שחום ו-71°C במרכז. לא דוקרים את הנקניקיות, כדי שהמיצים יישארו בפנים.", cookingEn: "Medium grill, about 8 minutes, turning often until the casing is browned and the centre reaches 71°C. Do not prick the sausages, so the juices stay inside.",
    animal: "MIXED", originHe: "תערובת בקר וטלה · במעי טבעי", originEn: "Beef and lamb blend · natural casing",
    weight: partsRules(84, 500), variants: "plain", kashrut: spiced(lambK), occasions: ["GRILL"],
  },
  {
    slug: "burgers-6", category: "ground", nameHe: "המבורגרים 220 גר׳ × 6", nameEn: "Burgers, 220 g × 6",
    shortHe: "שישה המבורגרים עבים של 220 גר׳, מבקר טחון טרי עם 20% שומן.", shortEn: "Six thick 220 g burgers of freshly ground beef with 20% fat.",
    longHe: "אנחנו טוחנים בקר עם 20% שומן ומעצבים ביד קציצות עבות של 220 גר׳. העובי מאפשר קרום שחום מבחוץ ומרכז עסיסי. כל המבורגר מופרד בנייר, כך שאפשר להקפיא ולהוציא לפי הצורך.", longEn: "We grind beef at 20% fat and hand-form thick 220 g patties. The thickness allows a dark crust outside and a juicy centre. Each burger is separated with paper, so you can freeze them and take out only what you need.",
    cookingHe: "גריל או מחבת ברזל חמים מאוד, 4–5 דקות לכל צד, עד 71°C במרכז, עם מלח רק רגע לפני הצלייה. מנוחה של 3 דקות לפני שמניחים בלחמנייה.", cookingEn: "A very hot grill or cast-iron pan, 4–5 minutes a side, to 71°C at the centre, salting just before cooking. Rest 3 minutes before placing in the bun.",
    animal: "BEEF", originHe: "בקר טחון · 20% שומן · 6 × 220 גר׳", originEn: "Ground beef · 20% fat · 6 × 220 g",
    pkg: { price: 119, contentsHe: "6 המבורגרים של 220 גר׳", contentsEn: "6 × 220 g burgers", nominalG: 1320 },
    variants: "plain", kashrut: beefK, occasions: ["GRILL", "WEEKNIGHT"],
  },

  // ── Grill-ready ─────────────────────────────────────
  {
    slug: "pargiyot-skewers", category: "grill", nameHe: "שיפודי פרגית", nameEn: "Pargit skewers",
    shortHe: "קוביות פרגית בשום, לימון ופפריקה, מושחלות על שיפודים.", shortEn: "Pargit cubes in garlic, lemon and paprika, threaded on skewers.",
    longHe: "חותכים פרגיות לקוביות אחידות ומשרים אותן בשום, לימון, פפריקה ושמן זית. הקוביות מושחלות צפוף, כדי שיישארו עסיסיות בזמן הצלייה. מכיל תבלינים ולכן אינו כשר לפסח.", longEn: "We cut pargiyot into even cubes and marinate them in garlic, lemon, paprika and olive oil. The cubes are threaded snugly so they stay juicy on the grill. Contains spices, so it is not kosher for Passover.",
    cookingHe: "גריל חם, כ-10 דקות, והופכים כל 2 דקות עד השחמה מכל הצדדים ו-74°C במרכז. מנוחה של 2 דקות לפני ההגשה.", cookingEn: "Hot grill, about 10 minutes, turning every 2 minutes until browned on all sides and 74°C at the centre. Rest 2 minutes before serving.",
    animal: "CHICKEN", originHe: "ירך עוף · קוביות מתובלות", originEn: "Chicken thigh · seasoned cubes",
    weight: partsRules(74), variants: "plain", kashrut: spiced(poultryK), occasions: ["GRILL"], bestSeller: true,
  },
  {
    slug: "entrecote-skewers", category: "grill", nameHe: "שיפודי אנטריקוט", nameEn: "Entrecôte skewers",
    shortHe: "קוביות אנטריקוט נדיבות עם בצל ופלפל, מוכנות לגחלים.", shortEn: "Generous entrecôte cubes with onion and pepper, ready for the coals.",
    longHe: "חותכים אנטריקוט לקוביות גדולות, כך שהשומן התוך-שרירי נשאר בכל ביס. הקוביות מושחלות לסירוגין עם בצל ופלפל, והירקות מתבשלים יחד עם הבשר. אין תיבול, כדי שתבחרו מלח ופלפל או מרינדה משלכם.", longEn: "We cut entrecôte into large cubes so the marbling stays in every bite. They are threaded alternately with onion and pepper, which cook alongside the meat. No seasoning is added, so you can choose salt and pepper or your own marinade.",
    cookingHe: "גריל חם מאוד, כ-6 דקות בסך הכול, והופכים כל דקה וחצי עד 54°C במרכז. מנוחה של 3 דקות, ומלח גס רגע לפני ההגשה.", cookingEn: "Very hot grill, about 6 minutes in total, turning every minute and a half to 54°C at the centre. Rest 3 minutes and add coarse salt just before serving.",
    animal: "BEEF", originHe: "חלק קדמי · גב הצלעות · קוביות", originEn: "Forequarter · rib · cubed",
    weight: partsRules(199), variants: "plain", kashrut: beefK, occasions: ["GRILL"],
  },
  {
    slug: "bbq-wings", category: "grill", nameHe: "כנפיים ברביקיו", nameEn: "BBQ wings",
    shortHe: "כנפיים שהושרו לילה שלם במרינדת ברביקיו מעושנת.", shortEn: "Wings marinated overnight in a smoky barbecue marinade.",
    longHe: "כנפיים שלמות שהושרו לילה שלם ברוטב ברביקיו מעושן. המרינדה חודרת לבשר, והסוכרים שבה מתקרמלים על האש. מכיל תבלינים ולכן אינו כשר לפסח.", longEn: "Whole wings marinated overnight in a smoky barbecue sauce. The marinade works into the meat, and its sugars caramelise over the fire. Contains spices, so it is not kosher for Passover.",
    cookingHe: "גריל בינוני, כ-20 דקות, והופכים כל כמה דקות עד 74°C ליד העצם. הרוטב נשרף מהר, ולכן מרחיקים מלהבה ישירה.", cookingEn: "Medium grill, about 20 minutes, turning every few minutes to 74°C next to the bone. The sauce burns quickly, so keep them away from direct flame.",
    animal: "CHICKEN", originHe: "כנף עוף · במרינדת ברביקיו", originEn: "Chicken wing · barbecue marinade",
    weight: partsRules(34), variants: "plain", kashrut: spiced(poultryK), occasions: ["GRILL"], flags: ["BONE_IN"],
  },
  {
    slug: "kebab-skewers", category: "grill", nameHe: "קבב על שיפוד", nameEn: "Kebab skewers",
    shortHe: "תערובת הקבב של הבית, מעוצבת ביד על שיפודים שטוחים.", shortEn: "Our house kebab blend, hand-shaped on flat skewers.",
    longHe: "אותה תערובת בקר וטלה עם פטרוזיליה, בצל ובהרט, מעוצבת אצלנו על שיפודים שטוחים ורחבים. השיפוד השטוח מחזיק את הבשר ולא נותן לו להסתובב בהיפוך. מכיל תבלינים ולכן אינו כשר לפסח.", longEn: "The same beef and lamb blend with parsley, onion and baharat, shaped in our shop on wide flat skewers. A flat skewer grips the meat so it does not spin when you turn it. Contains spices, so it is not kosher for Passover.",
    cookingHe: "גריל חם, 3 דקות לכל צד, עד 71°C במרכז. מנוחה של 2 דקות, ומגישים בפיתה עם בצל וסומק.", cookingEn: "Hot grill, 3 minutes a side, to 71°C at the centre. Rest 2 minutes and serve in pita with onion and sumac.",
    animal: "MIXED", originHe: "תערובת בקר וטלה · על שיפוד", originEn: "Beef and lamb blend · on skewers",
    weight: partsRules(89), variants: "plain", kashrut: spiced(beefK), occasions: ["GRILL"],
  },

  // ── Offal ───────────────────────────────────────────
  {
    slug: "chicken-liver", category: "offal", nameHe: "כבד עוף", nameEn: "Chicken livers",
    shortHe: "כבדי עוף טריים. חובה להכשיר בצלייה על אש לפני כל בישול.", shortEn: "Fresh chicken livers. They must be kashered by broiling over a flame before any cooking.",
    longHe: "כבד מלא בדם ואינו מוכשר במליחה כמו בשר, ולכן חובה לצלות אותו על אש גלויה לפני כל בישול. אנחנו מנקים את הכבדים מקרומים ומשאריות מרה, ואפשר לבקש אותם צלויים ומוכשרים מראש. אחרי הצלייה מטגנים עם בצל או קוצצים לכבד קצוץ.", longEn: "Liver is full of blood and cannot be kashered by salting like meat, so it must be broiled over an open flame before any cooking. We clean the livers of membrane and traces of bile, and you can ask for them already broiled and kashered. Once broiled, fry them with onion or chop them into chopped liver.",
    cookingHe: "שוטפים, מפזרים מלח גס וצולים על רשת ייעודית מעל אש גלויה, 4–5 דקות לכל צד, עד שהכבד מבושל לגמרי ואין בו סימני דם; שוטפים שוב. רק אחרי ההכשרה מטגנים עם בצל, או קוצצים עם ביצה קשה ובצל מטוגן.", cookingEn: "Rinse, sprinkle with coarse salt and broil on a dedicated rack over an open flame for 4–5 minutes a side, until fully cooked with no trace of blood; rinse again. Only after kashering, fry with onion or chop with hard-boiled egg and fried onion.",
    animal: "CHICKEN", originHe: "כבד עוף", originEn: "Chicken liver",
    weight: partsRules(35, 500), variants: "plain", kashrut: { ...poultryK, salted: "NOT_APPLICABLE" }, occasions: ["SHABBAT"], flags: ["REQUIRES_BROILING_TZLIYA"],
  },
  {
    slug: "chicken-hearts", category: "offal", nameHe: "לבבות עוף", nameEn: "Chicken hearts",
    shortHe: "לבבות מנוקים לשיפוד ולמחבת — הבסיס של מעורב ירושלמי.", shortEn: "Cleaned hearts for skewers and the pan — the base of a Jerusalem mixed grill.",
    longHe: "לב עוף הוא שריר קטן וצפוף, עם טעם עמוק יותר מבשר העוף. אנחנו מסירים את כלי הדם והשומן שבראשו, והלבבות מוכשרים במליחה. על אש חזקה ובזמן קצר הם נשארים רכים, ובבישול ממושך הם מתקשים.", longEn: "A chicken heart is a small, dense muscle with a deeper flavour than the rest of the bird. We remove the vessels and the fat at the top, and the hearts are kosher-salted. Over high heat and briefly they stay tender; cooked too long they toughen.",
    cookingHe: "מחבת רחבה וחמה מאוד עם בצל ומעט שמן, כ-8 דקות, עם כמון, כורכום ופלפל שחור. מגישים מיד בפיתה, לפני שהלבבות מתקררים ומתקשים.", cookingEn: "A wide, very hot pan with onion and a little oil for about 8 minutes, seasoned with cumin, turmeric and black pepper. Serve at once in pita, before the hearts cool and firm up.",
    animal: "CHICKEN", originHe: "לב עוף", originEn: "Chicken heart",
    weight: partsRules(39, 500), variants: "plain", kashrut: poultryK, occasions: ["GRILL"],
  },
  {
    slug: "chicken-gizzards", category: "offal", nameHe: "קורקבנים", nameEn: "Chicken gizzards",
    shortHe: "קורקבנים מנוקים מהקרום הקשה — לתבשיל ארוך ולמרק.", shortEn: "Gizzards cleaned of their tough lining — for long stews and soup.",
    longHe: "הקורקבן הוא שריר הקיבה של העוף, צפוף ועשיר בטעם. אנחנו מסירים את הקרום הפנימי הקשה ואת השומן, כך שנשאר רק הבשר. אחרי שעתיים של בישול איטי הוא נעשה רך, ברוטב עגבניות או במרק.", longEn: "The gizzard is the chicken's stomach muscle, dense and full of flavour. We remove the tough inner lining and the fat, leaving only the meat. After two hours of slow cooking it turns tender, in tomato sauce or in soup.",
    cookingHe: "מכסים במים ומבשלים 30 דקות, מסננים, ומבשלים עוד שעה וחצי על אש נמוכה עם בצל, שום ועגבניות. מתבלים בפפריקה ובכמון לקראת הסוף.", cookingEn: "Cover with water and simmer for 30 minutes, drain, then cook for another hour and a half on low heat with onion, garlic and tomatoes. Season with paprika and cumin towards the end.",
    animal: "CHICKEN", originHe: "קורקבן עוף", originEn: "Chicken gizzard",
    weight: partsRules(29, 500), variants: "plain", kashrut: poultryK, occasions: ["SLOW_COOK"],
  },
  {
    slug: "beef-tongue", category: "offal", nameHe: "לשון בקר", nameEn: "Beef tongue",
    shortHe: "לשון שלמה של כקילו וחצי — לבישול ארוך ולפרוסות ברוטב.", shortEn: "A whole tongue of about 1.5 kg — for long cooking and slicing into sauce.",
    longHe: "הלשון היא שריר צפוף עם שומן עדין, שאחרי בישול ארוך נעשה רך ונפרס לפרוסות חלקות. במטבח היהודי היא מנה של חגים ושמחות, ברוטב פטריות או חמוץ-מתוק. כל לשון שוקלת כקילו וחצי ונמכרת שלמה.", longEn: "Tongue is a dense muscle with fine fat that, after long cooking, turns tender and slices smoothly. In Jewish kitchens it is a dish for holidays and celebrations, in mushroom or sweet-and-sour sauce. Each tongue weighs about 1.5 kg and is sold whole.",
    cookingHe: "מבשלים במים עם עלי דפנה ופלפל אנגלי כ-3 שעות על אש נמוכה, ומקלפים את העור כשהלשון עדיין חמה. מקררים, פורסים ומחממים את הפרוסות ברוטב פטריות ובצל.", cookingEn: "Simmer in water with bay leaves and allspice for about 3 hours, and peel off the skin while the tongue is still hot. Chill, slice and reheat the slices in a mushroom and onion sauce.",
    animal: "BEEF", originHe: "ראש · לשון", originEn: "Head · tongue",
    weight: { pricePerKg: 109, min: 1000, max: 3000, step: 500, def: 1500, avgPiece: 1500 }, variants: "plain", kashrut: beefK, occasions: ["HOLIDAY", "SLOW_COOK"], stock: "out",
  },

  // ── Bundles ─────────────────────────────────────────
  {
    slug: "family-chicken-bundle", category: "packages", nameHe: "מארז עוף למשפחה", nameEn: "Family chicken bundle",
    shortHe: "5.3 ק״ג עוף בחמישה חלקים — ארוחות לשבוע במחיר קבוע.", shortEn: "5.3 kg of chicken in five cuts — a week of meals at a fixed price.",
    longHe: "עוף שלם, קילו חזה, קילו פרגיות, קילו שוקיים וחצי קילו כנפיים, כולם טריים מאותו בוקר. כל חלק ארוז בנפרד ומסומן, כך שקל לחלק למנות ולהקפיא. יחד הם מכסים צלי, שניצל, גריל ומרק.", longEn: "A whole chicken, 1 kg breast, 1 kg pargiyot, 1 kg drumsticks and 500 g wings, all fresh the same morning. Each cut is packed and labelled separately, so it is easy to portion and freeze. Together they cover a roast, schnitzel, the grill and soup.",
    cookingHe: "מה שלא מבשלים בתוך יומיים מקפיאים באותו יום, שטוח בשקיות סגורות. מפשירים במקרר 24 שעות לפני הבישול, ולא בטמפרטורת החדר.", cookingEn: "Whatever you won't cook within two days, freeze the same day, flat in sealed bags. Thaw in the fridge for 24 hours before cooking, never at room temperature.",
    animal: "CHICKEN", originHe: "מארז עוף · עוף שלם, חזה, פרגיות, שוקיים וכנפיים", originEn: "Chicken bundle · whole bird, breast, thighs, drumsticks and wings",
    pkg: { price: 149, contentsHe: "עוף שלם · 1 ק״ג חזה · 1 ק״ג פרגיות · 1 ק״ג שוקיים · 500 גר׳ כנפיים", contentsEn: "Whole chicken · 1 kg breast · 1 kg pargiyot · 1 kg drumsticks · 500 g wings", nominalG: 5300 },
    variants: "plain", kashrut: poultryK, occasions: ["WEEKNIGHT", "SHABBAT"], bestSeller: true,
  },
  {
    slug: "grill-bundle-8", category: "packages", nameHe: "מארז מנגל ל-8", nameEn: "Grill bundle for 8",
    shortHe: "4 ק״ג לשמונה סועדים: אנטריקוט, פרגיות, קבב ומרגז.", shortEn: "4 kg for eight guests: entrecôte, pargiyot, kebab and merguez.",
    longHe: "קילו אנטריקוט, קילו וחצי פרגיות, קילו קבב וחצי קילו מרגז — כ-500 גר׳ בשר לסועד. הכול ארוז לפי סדר ההעלאה לגריל. הקבב והמרגז מתובלים, ולכן המארז אינו כשר לפסח.", longEn: "1 kg entrecôte, 1.5 kg pargiyot, 1 kg kebab and 500 g merguez — about 500 g of meat per guest. Everything is packed in the order it goes on the grill. The kebab and merguez are spiced, so the bundle is not kosher for Passover.",
    cookingHe: "מתחילים במרגז ובקבב על חום בינוני, ממשיכים לפרגיות, ומסיימים באנטריקוט על הגחלים החמות ביותר, עד 54°C במרכז. כל נתח נח 3–5 דקות לפני הפריסה.", cookingEn: "Start with the merguez and kebab over medium heat, move on to the pargiyot, and finish with the entrecôte over the hottest coals, to 54°C at the centre. Rest each cut 3–5 minutes before slicing.",
    animal: "MIXED", originHe: "מארז מנגל · אנטריקוט, פרגיות, קבב ומרגז", originEn: "Grill bundle · entrecôte, chicken thighs, kebab and merguez",
    pkg: { price: 399, contentsHe: "1 ק״ג אנטריקוט · 1.5 ק״ג פרגיות · 1 ק״ג קבב · 500 גר׳ מרגז", contentsEn: "1 kg entrecôte · 1.5 kg pargiyot · 1 kg kebab · 500 g merguez", nominalG: 4000 },
    variants: "plain", kashrut: spiced(beefK), occasions: ["GRILL"], bestSeller: true,
  },
  {
    slug: "shabbat-bundle", category: "packages", nameHe: "מארז שבת", nameEn: "Shabbat bundle",
    shortHe: "עוף, עצמות למרק, אסאדו לחמין וטחון לקציצות — לסעודות שבת.", shortEn: "Chicken, soup bones, asado for cholent and ground beef — for the Shabbat meals.",
    longHe: "עוף שלם לצלי, קילו עצמות למרק, קילו וחצי אסאדו לחמין וקילו טחון בקר לקציצות. הכמויות מספיקות לשישה-שמונה סועדים בסעודת ליל שבת ובצהריים. כל רכיב ארוז בנפרד.", longEn: "A whole chicken to roast, 1 kg soup bones, 1.5 kg asado for cholent and 1 kg ground beef for meatballs. The quantities serve six to eight at Friday dinner and Shabbat lunch. Each item is packed separately.",
    cookingHe: "המרק מתבשל ביום חמישי ומתקרר לילה, כדי שיהיה קל להסיר את השומן. החמין עם האסאדו נכנס לפני הדלקת הנרות לתנור 95°C או לפלטה, עד הצהריים.", cookingEn: "Cook the soup on Thursday and chill it overnight so the fat lifts off easily. The cholent with the asado goes into a 95°C oven or onto the hot plate before candle lighting and cooks until lunch.",
    animal: "MIXED", originHe: "מארז שבת · עוף, עצמות, אסאדו וטחון בקר", originEn: "Shabbat bundle · chicken, bones, asado and ground beef",
    pkg: { price: 249, contentsHe: "עוף שלם · 1 ק״ג עצמות למרק · 1.5 ק״ג אסאדו · 1 ק״ג טחון בקר", contentsEn: "Whole chicken · 1 kg soup bones · 1.5 kg asado · 1 kg ground beef", nominalG: 5300 },
    variants: "plain", kashrut: beefK, occasions: ["SHABBAT"],
  },
  {
    slug: "pesach-bundle", category: "packages", nameHe: "מארז כשר לפסח", nameEn: "Kosher for Passover bundle",
    shortHe: "כתף טלה, בריסקט, שני עופות וכבד — בהשגחה לפסח, ללא קטניות.", shortEn: "Lamb shoulder, brisket, two chickens and liver — certified for Passover, no kitniyot.",
    longHe: "שני ק״ג כתף טלה, שני ק״ג בריסקט, שני עופות שלמים וחצי קילו כבד. הכול בהשגחה כשרה לפסח, ללא תבלינים וללא קטניות. הכבד מגיע לא מוכשר, ויש לצלות אותו על אש גלויה לפני הבישול.", longEn: "2 kg lamb shoulder, 2 kg brisket, two whole chickens and 500 g liver. Everything is certified kosher for Passover, unseasoned and free of kitniyot. The liver comes un-kashered and must be broiled over an open flame before cooking.",
    cookingHe: "את הבריסקט מבשלים יום לפני החג, 5 שעות בסיר מכוסה בתנור 150°C, ופורסים קר — למחרת הוא נפרס יפה יותר. את הכבד צולים על אש גלויה עד שאין בו סימני דם, לפני כל שימוש אחר.", cookingEn: "Braise the brisket the day before the holiday, 5 hours covered in a 150°C oven, and slice it cold — the next day it slices more cleanly. Broil the liver over an open flame until no blood remains, before any other use.",
    animal: "MIXED", originHe: "מארז לפסח · כתף טלה, בריסקט, עופות וכבד", originEn: "Passover bundle · lamb shoulder, brisket, chickens and liver",
    pkg: { price: 329, contentsHe: "2 ק״ג כתף טלה · 2 ק״ג בריסקט · 2 עופות שלמים · 500 גר׳ כבד", contentsEn: "2 kg lamb shoulder · 2 kg brisket · 2 whole chickens · 500 g liver", nominalG: 8100 },
    variants: "plain", kashrut: beefK, occasions: ["HOLIDAY"], flags: ["REQUIRES_BROILING_TZLIYA"],
  },
  {
    slug: "aged-steak-bundle", category: "packages", nameHe: "מארז סטייקים מיושנים", nameEn: "Dry-aged steak bundle",
    shortHe: "שני אנטריקוט 28 יום ושני דנוור 21 יום, ארוזים בוואקום.", shortEn: "Two 28-day entrecôtes and two 21-day Denvers, vacuum-packed.",
    longHe: "ארבעה סטייקים להשוואה בין שני יישונים: דנוור של 21 יום, בקרי וישיר, ואנטריקוט של 28 יום, עמוק ואגוזי יותר. כל סטייק ארוז בוואקום בנפרד, ומגיע עם מלח ים גס.", longEn: "Four steaks for comparing two ageing times: a 21-day Denver, direct and beefy, and a 28-day entrecôte, deeper and nuttier. Each steak is vacuum-packed individually and comes with coarse sea salt.",
    cookingHe: "צולים מהעדין לעמוק: קודם הדנוור, 3 דקות לכל צד, ואחריו האנטריקוט, 3–4 דקות לכל צד — שניהם עד 54°C במרכז. מנוחה של 5 דקות, פורסים ומפזרים מלח גס.", cookingEn: "Grill from lighter to deeper: the Denver first, 3 minutes a side, then the entrecôte, 3–4 minutes a side — both to 54°C at the centre. Rest 5 minutes, slice and finish with coarse salt.",
    animal: "BEEF", originHe: "מארז יישון · אנטריקוט 28 יום ודנוור 21 יום", originEn: "Dry-aged bundle · 28-day entrecôte and 21-day Denver",
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

/** Weekly delivery windows. Metro zones: Sun–Thu four windows, Friday three. Far zones: fewer, next-day. */
export const slotTemplates: Record<string, Array<{ weekday: number; start: string; end: string; capacity: number; cutoffHours: number }>> = (() => {
  const metro = [
    ...[0, 1, 2, 3, 4].flatMap((weekday) =>
      [["08:00", "11:00"], ["11:00", "14:00"], ["14:00", "17:00"], ["17:00", "20:00"]].map(([start, end]) => ({ weekday, start, end, capacity: 8, cutoffHours: 3 })),
    ),
    ...[["08:00", "10:00"], ["10:00", "12:00"], ["12:00", "14:00"]].map(([start, end]) => ({ weekday: 5, start, end, capacity: 10, cutoffHours: 3 })),
  ];
  const far = [
    ...[0, 2, 4].flatMap((weekday) => [["10:00", "14:00"], ["14:00", "18:00"]].map(([start, end]) => ({ weekday, start, end, capacity: 6, cutoffHours: 24 }))),
    { weekday: 5, start: "09:00", end: "12:00", capacity: 6, cutoffHours: 24 },
  ];
  return {
    "tel-aviv": metro,
    "ramat-gan": metro,
    sharon: metro,
    "rishon-holon": metro,
    jerusalem: metro.map((t) => ({ ...t, capacity: 6, cutoffHours: 5 })),
    modiin: metro.map((t) => ({ ...t, capacity: 6, cutoffHours: 4 })),
    haifa: far,
    "beer-sheva": far,
    eilat: [],
  };
})();

export const staff = [
  { phone: "+972501110001", nameHe: "מאיר אלמוג", nameEn: "Meir Almog", role: "OWNER" },
  { phone: "+972501110002", nameHe: "רונית בן דוד", nameEn: "Ronit Ben David", role: "MANAGER" },
  { phone: "+972501110003", nameHe: "יוסי קורן", nameEn: "Yossi Koren", role: "BUTCHER" },
  { phone: "+972501110004", nameHe: "אבי שטרן", nameEn: "Avi Stern", role: "BUTCHER" },
  { phone: "+972501110005", nameHe: "נועה לוי", nameEn: "Noa Levi", role: "PACKER" },
  { phone: "+972501110006", nameHe: "דניאל חדד", nameEn: "Daniel Hadad", role: "DRIVER" },
] as const;
