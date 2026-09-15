/**
 * Butcher's facts per product slug — powers the product page stat row and cooking guides.
 * Values mirror the cooking text in scripts/seed-data/catalog.ts; keep the two in step.
 * fat and tenderness describe the cut itself (1 lean / firm … 5 very rich / very tender),
 * not the result after a long braise. Ground meat uses 71°C, poultry 74°C.
 */

export type Method = "GRILL" | "PAN" | "OVEN" | "BRAISE" | "SMOKE" | "SOUP" | "FRY";

export interface ProductFacts {
  /** Grams per person, for products sold by weight. */
  servingG?: number;
  /** 1–3 methods, best first. */
  methods: Method[];
  /** Recommended core temperature in °C; omitted for braises and soups. */
  donenessC?: number;
  /** Offered steak thicknesses in cm; only for steak cuts. */
  thicknessCm?: number[];
  fat: 1 | 2 | 3 | 4 | 5;
  tenderness: 1 | 2 | 3 | 4 | 5;
  cookTimeHe: string;
  cookTimeEn: string;
  tipHe: string;
  tipEn: string;
}

export const productFacts: Record<string, ProductFacts> = {
  // ── Beef ─────────────────────────────────────────────
  entrecote: {
    servingG: 300, methods: ["GRILL", "PAN"], donenessC: 54, thicknessCm: [2, 3], fat: 4, tenderness: 4,
    cookTimeHe: "6–8 דקות", cookTimeEn: "6–8 min",
    tipHe: "הוציאו את הסטייק מהמקרר 30 דקות לפני הצלייה, כדי שיתבשל באחידות.",
    tipEn: "Take the steak out of the fridge 30 minutes before cooking so it cooks evenly.",
  },
  "beef-fillet": {
    servingG: 220, methods: ["PAN", "OVEN", "GRILL"], donenessC: 54, thicknessCm: [2, 3], fat: 1, tenderness: 5,
    cookTimeHe: "15–20 דקות", cookTimeEn: "15–20 min",
    tipHe: "קשרו פילה שלם בחוט כל 3 ס״מ, כדי שהקצה הדק לא יתבשל לפני המרכז.",
    tipEn: "Tie a whole fillet with string every 3 cm so the thin end doesn't cook before the middle.",
  },
  shayetel: {
    servingG: 250, methods: ["PAN", "GRILL", "OVEN"], donenessC: 54, thicknessCm: [2, 3], fat: 2, tenderness: 3,
    cookTimeHe: "6–25 דקות", cookTimeEn: "6–25 min",
    tipHe: "לקרפצ׳יו, הכניסו את הנתח למקפיא ל-40 דקות — כך קל לפרוס אותו דק מאוד.",
    tipEn: "For carpaccio, put the piece in the freezer for 40 minutes — it becomes easy to slice paper-thin.",
  },
  asado: {
    servingG: 450, methods: ["BRAISE", "SMOKE", "OVEN"], fat: 5, tenderness: 2,
    cookTimeHe: "5–6 שעות", cookTimeEn: "5–6 h",
    tipHe: "בשלו יום מראש וקררו — השומן מתקשה למעלה ומוסר בקלות.",
    tipEn: "Cook a day ahead and chill — the fat sets on top and lifts off easily.",
  },
  denver: {
    servingG: 280, methods: ["GRILL", "PAN"], donenessC: 54, thicknessCm: [2, 3], fat: 4, tenderness: 3,
    cookTimeHe: "6–8 דקות", cookTimeEn: "6–8 min",
    tipHe: "אל תעברו מדיום — מעבר לזה השריר מתהדק ומאבד את הרכות שלו.",
    tipEn: "Don't go past medium — beyond that the muscle tightens and loses its tenderness.",
  },
  "mock-fillet": {
    servingG: 250, methods: ["BRAISE", "OVEN"], fat: 2, tenderness: 2,
    cookTimeHe: "3 שעות", cookTimeEn: "3 h",
    tipHe: "פרסו את הצלי כשהוא קר מהמקרר — הפרוסות יוצאות דקות ושלמות.",
    tipEn: "Slice the roast cold from the fridge — the slices come out thin and whole.",
  },
  "beef-shoulder": {
    servingG: 250, methods: ["BRAISE", "SOUP"], fat: 3, tenderness: 2,
    cookTimeHe: "2.5–3 שעות", cookTimeEn: "2.5–3 h",
    tipHe: "אל תעמיסו את הסיר בזמן הצריבה — קוביות צפופות מאדות במקום להשחים.",
    tipEn: "Don't crowd the pot when searing — packed cubes steam instead of browning.",
  },
  brisket: {
    servingG: 350, methods: ["SMOKE", "BRAISE", "OVEN"], fat: 4, tenderness: 2,
    cookTimeHe: "5–12 שעות", cookTimeEn: "5–12 h",
    tipHe: "פרסו רק לפני ההגשה — פרוסות שנחתכו מראש מתייבשות מהר.",
    tipEn: "Slice just before serving — pre-cut slices dry out quickly.",
  },
  "osso-buco": {
    servingG: 400, methods: ["SOUP", "BRAISE"], fat: 3, tenderness: 2,
    cookTimeHe: "3 שעות", cookTimeEn: "3 h",
    tipHe: "צרבו את הפרוסות לפני שמוסיפים מים — המרק ייצא כהה ועמוק יותר.",
    tipEn: "Sear the slices before adding water — the broth comes out darker and deeper.",
  },
  flank: {
    servingG: 300, methods: ["GRILL", "OVEN"], donenessC: 57, fat: 3, tenderness: 3,
    cookTimeHe: "15–20 דקות", cookTimeEn: "15–20 min",
    tipHe: "סמנו את כיוון הסיבים לפני הצלייה — אחרי ההשחמה קשה לראות אותו.",
    tipEn: "Note the direction of the grain before cooking — it's hard to see once browned.",
  },
  "beef-cheeks": {
    servingG: 300, methods: ["BRAISE"], fat: 3, tenderness: 2,
    cookTimeHe: "4 שעות", cookTimeEn: "4 h",
    tipHe: "בשלו יום מראש — אחרי לילה במקרר הרוטב מתעבה והטעם מעמיק.",
    tipEn: "Braise a day ahead — after a night in the fridge the sauce thickens and the flavour deepens.",
  },

  // ── Dry-aged ─────────────────────────────────────────
  "aged-entrecote-28": {
    servingG: 280, methods: ["GRILL", "PAN"], donenessC: 54, thicknessCm: [2, 3], fat: 4, tenderness: 5,
    cookTimeHe: "6–8 דקות", cookTimeEn: "6–8 min",
    tipHe: "בשר מיושן משחים מהר — אם הקרום מתכהה לפני שהמרכז מוכן, העבירו לאזור מתון בגריל.",
    tipEn: "Aged beef browns fast — if the crust darkens before the centre is ready, move it to a cooler part of the grill.",
  },
  "aged-tomahawk-35": {
    servingG: 400, methods: ["GRILL", "OVEN"], donenessC: 54, thicknessCm: [5], fat: 4, tenderness: 4,
    cookTimeHe: "60–75 דקות", cookTimeEn: "60–75 min",
    tipHe: "השתמשו במדחום — בעובי כזה אי אפשר לדעת מבחוץ מה קורה במרכז.",
    tipEn: "Use a probe thermometer — at this thickness you can't judge the centre from outside.",
  },
  "aged-denver-21": {
    servingG: 280, methods: ["GRILL", "PAN"], donenessC: 54, thicknessCm: [2, 3], fat: 4, tenderness: 4,
    cookTimeHe: "6–8 דקות", cookTimeEn: "6–8 min",
    tipHe: "יבשו את הסטייק בנייר סופג לפני הצלייה — משטח יבש יוצר קרום מהר יותר.",
    tipEn: "Pat the steak dry before cooking — a dry surface forms a crust faster.",
  },

  // ── Chicken ──────────────────────────────────────────
  "whole-chicken": {
    servingG: 450, methods: ["OVEN", "GRILL", "SOUP"], donenessC: 74, fat: 3, tenderness: 3,
    cookTimeHe: "75 דקות", cookTimeEn: "75 min",
    tipHe: "השאירו את העוף לא מכוסה במקרר לילה לפני הצלייה — העור מתייבש ויוצא פריך.",
    tipEn: "Leave the bird uncovered in the fridge overnight before roasting — the skin dries and crisps.",
  },
  "chicken-breast": {
    servingG: 200, methods: ["PAN", "GRILL", "FRY"], donenessC: 74, fat: 1, tenderness: 3,
    cookTimeHe: "8–10 דקות", cookTimeEn: "8–10 min",
    tipHe: "שטחו את הפילה לעובי אחיד בין שני ניילונים, כדי שהקצה הדק לא יתייבש.",
    tipEn: "Flatten the fillet to an even thickness between two sheets of plastic so the thin end doesn't dry out.",
  },
  pargiyot: {
    servingG: 250, methods: ["GRILL", "PAN"], donenessC: 74, fat: 3, tenderness: 4,
    cookTimeHe: "10–12 דקות", cookTimeEn: "10–12 min",
    tipHe: "השרו במרינדה שעה עד ארבע שעות; מעבר לזה החומצה משנה את המרקם.",
    tipEn: "Marinate for one to four hours; any longer and the acid changes the texture.",
  },
  "chicken-drumsticks": {
    servingG: 300, methods: ["OVEN", "GRILL", "BRAISE"], donenessC: 74, fat: 3, tenderness: 3,
    cookTimeHe: "45 דקות", cookTimeEn: "45 min",
    tipHe: "חרצו שני חתכים עמוקים בכל שוק — התיבול נכנס והבשר ליד העצם מתבשל באחידות.",
    tipEn: "Score each drumstick twice, deeply — the seasoning gets in and the meat by the bone cooks evenly.",
  },
  "chicken-leg-quarters": {
    servingG: 350, methods: ["OVEN", "BRAISE"], donenessC: 74, fat: 4, tenderness: 3,
    cookTimeHe: "60 דקות", cookTimeEn: "60 min",
    tipHe: "צלו על רשת מעל תבנית — השומן נוטף למטה והעור מתפריך מכל הצדדים.",
    tipEn: "Roast on a rack over a tray — the fat drips away and the skin crisps all round.",
  },
  "chicken-wings": {
    servingG: 350, methods: ["OVEN", "GRILL"], donenessC: 74, fat: 4, tenderness: 3,
    cookTimeHe: "50 דקות", cookTimeEn: "50 min",
    tipHe: "ייבשו את הכנפיים היטב בנייר סופג לפני התנור — לחות מונעת עור פריך.",
    tipEn: "Dry the wings thoroughly with paper towel before roasting — moisture stops the skin crisping.",
  },
  "chicken-schnitzel": {
    servingG: 180, methods: ["FRY", "PAN"], donenessC: 74, fat: 1, tenderness: 4,
    cookTimeHe: "4 דקות", cookTimeEn: "4 min",
    tipHe: "טגנו במנות קטנות — יותר מדי שניצלים בבת אחת מקררים את השמן והציפוי סופג שמן.",
    tipEn: "Fry in small batches — too many at once cools the oil and the coating turns greasy.",
  },
  "soup-bones-chicken": {
    servingG: 250, methods: ["SOUP"], fat: 3, tenderness: 1,
    cookTimeHe: "3 שעות", cookTimeEn: "3 h",
    tipHe: "שמרו על בעבוע עדין ולא על רתיחה חזקה — כך הציר נשאר צלול.",
    tipEn: "Keep it at a gentle simmer, not a rolling boil — that keeps the stock clear.",
  },

  // ── Turkey ───────────────────────────────────────────
  "turkey-breast": {
    servingG: 220, methods: ["OVEN", "PAN", "GRILL"], donenessC: 74, fat: 1, tenderness: 3,
    cookTimeHe: "60 דקות", cookTimeEn: "60 min",
    tipHe: "קשרו את החזה בחוט לפני הצלייה — הוא שומר על צורה ומתבשל באחידות.",
    tipEn: "Tie the breast with string before roasting — it holds its shape and cooks evenly.",
  },
  "turkey-shawarma": {
    servingG: 250, methods: ["PAN", "GRILL"], donenessC: 74, fat: 4, tenderness: 4,
    cookTimeHe: "6–8 דקות", cookTimeEn: "6–8 min",
    tipHe: "אל תערבבו כל הזמן — תנו לבשר לשבת על המחבת דקה-שתיים כדי שייווצרו קצוות שחומים.",
    tipEn: "Don't stir constantly — let the meat sit in the pan a minute or two so the edges brown.",
  },
  "turkey-shank": {
    servingG: 450, methods: ["BRAISE", "OVEN"], fat: 3, tenderness: 2,
    cookTimeHe: "2.5 שעות", cookTimeEn: "2.5 h",
    tipHe: "אחרי הבישול שלפו את הגידים הדקים והקשים שלאורך השוק לפני ההגשה.",
    tipEn: "After cooking, pull out the thin, hard tendons that run along the drumstick before serving.",
  },
  "turkey-wings": {
    servingG: 450, methods: ["BRAISE", "SOUP"], fat: 3, tenderness: 2,
    cookTimeHe: "2 שעות", cookTimeEn: "2 h",
    tipHe: "צלו את הכנפיים 20 דקות בתנור חם לפני הבישול — הרוטב יקבל צבע וטעם עמוקים.",
    tipEn: "Roast the wings in a hot oven for 20 minutes first — the sauce gains colour and depth.",
  },

  // ── Lamb ─────────────────────────────────────────────
  "lamb-rack": {
    servingG: 300, methods: ["OVEN", "PAN", "GRILL"], donenessC: 57, fat: 3, tenderness: 5,
    cookTimeHe: "20 דקות", cookTimeEn: "20 min",
    tipHe: "חרצו את שכבת השומן ברשת עדינה לפני הצריבה — היא נמסה באחידות ומתפריכה.",
    tipEn: "Lightly score the fat in a crosshatch before searing — it renders evenly and crisps.",
  },
  "lamb-shoulder": {
    servingG: 450, methods: ["OVEN", "BRAISE"], fat: 4, tenderness: 2,
    cookTimeHe: "7 שעות", cookTimeEn: "7 h",
    tipHe: "משכו בעדינות את עצם השכמה — כשהיא יוצאת בקלות, הכתף מוכנה.",
    tipEn: "Give the blade bone a gentle pull — when it slides out easily, the shoulder is done.",
  },
  "lamb-neck": {
    servingG: 400, methods: ["BRAISE", "SOUP"], fat: 4, tenderness: 2,
    cookTimeHe: "2 שעות", cookTimeEn: "2 h",
    tipHe: "כמון, כורכום וקינמון מאזנים את הטעם העז של הטלה.",
    tipEn: "Cumin, turmeric and cinnamon balance lamb's strong flavour.",
  },

  // ── Ground & sausages ───────────────────────────────
  "ground-beef": {
    servingG: 150, methods: ["PAN", "BRAISE", "GRILL"], donenessC: 71, fat: 3, tenderness: 4,
    cookTimeHe: "10–15 דקות", cookTimeEn: "10–15 min",
    tipHe: "הרטיבו ידיים במים קרים לפני שמעצבים — הבשר לא נדבק והקציצות לא נדחסות.",
    tipEn: "Wet your hands with cold water before shaping — the meat won't stick and the patties stay loose.",
  },
  "ground-chicken": {
    servingG: 150, methods: ["BRAISE", "PAN"], donenessC: 74, fat: 2, tenderness: 4,
    cookTimeHe: "20–25 דקות", cookTimeEn: "20–25 min",
    tipHe: "הוסיפו פרוסת לחם שהושרתה במים — הקציצות נשארות רכות גם אחרי חימום.",
    tipEn: "Add a slice of bread soaked in water — the meatballs stay soft even when reheated.",
  },
  "ground-lamb": {
    servingG: 150, methods: ["GRILL", "PAN"], donenessC: 71, fat: 4, tenderness: 4,
    cookTimeHe: "8 דקות", cookTimeEn: "8 min",
    tipHe: "סחטו את הבצל הקצוץ מהנוזלים לפני שמוסיפים — אחרת הקבב נופל מהשיפוד.",
    tipEn: "Squeeze the liquid out of the chopped onion first — otherwise the kebab slides off the skewer.",
  },
  "kebab-spiced": {
    servingG: 180, methods: ["GRILL", "PAN"], donenessC: 71, fat: 4, tenderness: 4,
    cookTimeHe: "6–8 דקות", cookTimeEn: "6–8 min",
    tipHe: "חממו ונקו את רשת הגריל לפני שמניחים — על רשת קרה הקבב נדבק.",
    tipEn: "Heat and clean the grate before the kebabs go on — on a cold grate they stick.",
  },
  merguez: {
    servingG: 150, methods: ["GRILL", "PAN"], donenessC: 71, fat: 5, tenderness: 4,
    cookTimeHe: "8 דקות", cookTimeEn: "8 min",
    tipHe: "הרחיקו מהלהבה — השומן שנוטף מתלקח ומשחיר את המעי לפני שהמרכז מוכן.",
    tipEn: "Keep them off the flames — dripping fat flares and blackens the casing before the centre is done.",
  },
  "burgers-6": {
    methods: ["GRILL", "PAN"], donenessC: 71, fat: 4, tenderness: 4,
    cookTimeHe: "8–10 דקות", cookTimeEn: "8–10 min",
    tipHe: "לחצו גומה קטנה במרכז כל קציצה לפני הצלייה — כך היא לא מתנפחת לכדור.",
    tipEn: "Press a small dimple into the centre of each patty before cooking — it won't puff into a ball.",
  },

  // ── Grill-ready ─────────────────────────────────────
  "pargiyot-skewers": {
    servingG: 250, methods: ["GRILL", "PAN"], donenessC: 74, fat: 3, tenderness: 4,
    cookTimeHe: "10 דקות", cookTimeEn: "10 min",
    tipHe: "הוציאו את השיפודים מהמקרר 20 דקות לפני הצלייה — הם יתבשלו מהר ובאחידות.",
    tipEn: "Take the skewers out of the fridge 20 minutes before grilling — they cook faster and more evenly.",
  },
  "entrecote-skewers": {
    servingG: 250, methods: ["GRILL"], donenessC: 54, fat: 4, tenderness: 4,
    cookTimeHe: "6 דקות", cookTimeEn: "6 min",
    tipHe: "השאירו מרווח קטן בין הקוביות — כך החום מגיע לכל הצדדים.",
    tipEn: "Leave a little space between the cubes — that lets the heat reach every side.",
  },
  "bbq-wings": {
    servingG: 350, methods: ["GRILL", "OVEN"], donenessC: 74, fat: 4, tenderness: 3,
    cookTimeHe: "20 דקות", cookTimeEn: "20 min",
    tipHe: "צלו רוב הזמן בחום עקיף, ועברו לחום ישיר רק ל-3 הדקות האחרונות.",
    tipEn: "Cook over indirect heat most of the way and move to direct heat only for the last 3 minutes.",
  },
  "kebab-skewers": {
    servingG: 180, methods: ["GRILL"], donenessC: 71, fat: 4, tenderness: 4,
    cookTimeHe: "6 דקות", cookTimeEn: "6 min",
    tipHe: "הפכו פעם אחת בלבד — היפוכים חוזרים מפרקים את הקבב.",
    tipEn: "Turn only once — repeated turning breaks the kebab apart.",
  },

  // ── Offal ───────────────────────────────────────────
  "chicken-liver": {
    servingG: 150, methods: ["GRILL", "PAN"], fat: 2, tenderness: 4,
    cookTimeHe: "10 דקות", cookTimeEn: "10 min",
    tipHe: "צלו כבד על רשת ששמורה לכבד בלבד, ואל תשתמשו בה לבשר אחר.",
    tipEn: "Broil liver on a rack kept for liver only, and don't use it for other meat.",
  },
  "chicken-hearts": {
    servingG: 200, methods: ["PAN", "GRILL"], donenessC: 74, fat: 2, tenderness: 3,
    cookTimeHe: "8 דקות", cookTimeEn: "8 min",
    tipHe: "חצו את הלבבות לאורך לפני הבישול — הם מתבשלים מהר יותר ונשארים רכים.",
    tipEn: "Halve the hearts lengthways before cooking — they cook faster and stay tender.",
  },
  "chicken-gizzards": {
    servingG: 200, methods: ["BRAISE", "SOUP"], fat: 1, tenderness: 1,
    cookTimeHe: "2 שעות", cookTimeEn: "2 h",
    tipHe: "בשלו יום מראש — הקורקבנים ממשיכים להתרכך בזמן שהם נחים ברוטב.",
    tipEn: "Cook a day ahead — the gizzards keep softening as they rest in the sauce.",
  },
  "beef-tongue": {
    servingG: 250, methods: ["BRAISE"], fat: 3, tenderness: 3,
    cookTimeHe: "3 שעות", cookTimeEn: "3 h",
    tipHe: "קלפו מיד כשהלשון יוצאת מהסיר — כשהיא מתקררת העור נצמד ונקרע.",
    tipEn: "Peel as soon as the tongue leaves the pot — once it cools the skin clings and tears.",
  },

  // ── Bundles ─────────────────────────────────────────
  "family-chicken-bundle": {
    methods: ["OVEN", "GRILL", "PAN"], donenessC: 74, fat: 3, tenderness: 3,
    cookTimeHe: "10–75 דקות", cookTimeEn: "10–75 min",
    tipHe: "כתבו תאריך על כל שקית — עוף קפוא שומר על איכותו כשלושה חודשים.",
    tipEn: "Date every bag — frozen chicken keeps its quality for about three months.",
  },
  "grill-bundle-8": {
    methods: ["GRILL"], fat: 4, tenderness: 4,
    cookTimeHe: "45–60 דקות", cookTimeEn: "45–60 min",
    tipHe: "הדליקו את הגחלים 40 דקות מראש — כשהן מכוסות באפר לבן, החום יציב.",
    tipEn: "Light the coals 40 minutes ahead — once they're covered in white ash, the heat is steady.",
  },
  "shabbat-bundle": {
    methods: ["BRAISE", "SOUP", "OVEN"], fat: 4, tenderness: 3,
    cookTimeHe: "לילה שלם", cookTimeEn: "Overnight",
    tipHe: "הניחו ביצים בקליפתן בחמין — אחרי לילה הן משחימות וסופגות את טעם הבשר.",
    tipEn: "Tuck eggs in their shells into the cholent — overnight they brown and take on the meat's flavour.",
  },
  "pesach-bundle": {
    methods: ["BRAISE", "OVEN"], fat: 4, tenderness: 3,
    cookTimeHe: "5–7 שעות", cookTimeEn: "5–7 h",
    tipHe: "צלו את הכבד ראשון, על רשת נפרדת, לפני שמתחילים את שאר הבישולים לחג.",
    tipEn: "Broil the liver first, on its own rack, before starting the rest of the holiday cooking.",
  },
  "aged-steak-bundle": {
    methods: ["GRILL", "PAN"], donenessC: 54, fat: 4, tenderness: 5,
    cookTimeHe: "6–8 דקות", cookTimeEn: "6–8 min",
    tipHe: "פתחו את הוואקום שעה לפני, ייבשו והשאירו חשוף — הריח של האריזה מתפוגג תוך דקות.",
    tipEn: "Open the vacuum pack an hour ahead, pat dry and leave uncovered — the packaging smell fades within minutes.",
  },
};

export const factsFor = (slug: string): ProductFacts | undefined => productFacts[slug];
