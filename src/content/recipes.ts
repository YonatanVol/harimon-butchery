import type { Occasion } from "@/domain/catalog/occasions";

export type Difficulty = "EASY" | "MEDIUM" | "ADVANCED";

/** product = existing product slug. gramsPerServing for weight products (integer grams); quantity = whole packages for the whole recipe. */
export interface RecipeMeat {
  product: string;
  gramsPerServing?: number;
  quantity?: number;
  noteHe?: string;
  noteEn?: string;
}

/** minutes = a timer for the step when it involves waiting or cooking. */
export interface RecipeStep {
  he: string;
  en: string;
  minutes?: number;
}

export interface Recipe {
  slug: string;
  occasion: Occasion;
  titleHe: string;
  titleEn: string;
  introHe: string;
  introEn: string;
  heroProduct: string;
  prepMinutes: number;
  cookMinutes: number;
  restMinutes?: number;
  servings: number;
  difficulty: Difficulty;
  meat: RecipeMeat[];
  ingredientsHe: string[];
  ingredientsEn: string[];
  steps: RecipeStep[];
  donenessC?: { he: string; en: string; tempC: number }[];
  tipHe: string;
  tipEn: string;
}

export const recipes: Recipe[] = [
  // ── Shabbat ─────────────────────────────────────────
  {
    slug: "clear-chicken-soup",
    occasion: "SHABBAT",
    titleHe: "מרק עוף צלול",
    titleEn: "Clear chicken soup",
    introHe:
      "מרק עוף של שבת מתחיל בעוף שלם ובגבות: העוף נותן בשר, והגבות נותנות גוף וג׳לטין. הסוד הוא רתיחה עדינה בלבד ושעות על אש נמוכה — כך המרק נשאר צלול וזהוב.",
    introEn:
      "A proper Shabbat soup starts with a whole chicken and a few backs — the bird gives meat, the backs give body. Keep it at a bare simmer for hours and it stays clear and golden.",
    heroProduct: "whole-chicken",
    prepMinutes: 20,
    cookMinutes: 180,
    servings: 8,
    difficulty: "EASY",
    meat: [
      { product: "whole-chicken", gramsPerServing: 225, noteHe: "מפורק ל-8 חלקים", noteEn: "cut into 8 pieces" },
      { product: "soup-bones-chicken", gramsPerServing: 125 },
    ],
    ingredientsHe: [
      "3.5 ליטר מים קרים",
      "2 בצלים גדולים, קלופים וחצויים",
      "3 גזרים גדולים",
      "2 שורשי פטרוזיליה",
      "1 סלרי ראש קטן, קלוף ובחתיכות גדולות",
      "3 גבעולי סלרי",
      "1 קישוא",
      "1 צרור שמיר",
      "1 צרור פטרוזיליה",
      "1 כפית פלפל שחור גרגרים",
      "½ כפית כורכום",
      "1 כפית מלח",
    ],
    ingredientsEn: [
      "3.5 litres cold water",
      "2 large onions, peeled and halved",
      "3 large carrots",
      "2 parsley roots",
      "1 small celeriac, peeled and cut into large chunks",
      "3 celery stalks",
      "1 courgette",
      "1 bunch dill",
      "1 bunch parsley",
      "1 tsp black peppercorns",
      "½ tsp ground turmeric",
      "1 tsp salt",
    ],
    steps: [
      {
        he: "הניחו את חלקי העוף והגבות בסיר גדול, כסו במים קרים והביאו לרתיחה איטית על אש בינונית.",
        en: "Put the chicken pieces and backs in a large pot, cover with the cold water and bring slowly to a simmer over medium heat.",
        minutes: 20,
      },
      {
        he: "כשעולה קצף אפור, אספו אותו בכף מחוררת. חזרו על זה כמה פעמים, עד שפני המים נקיים.",
        en: "When grey foam rises, skim it off with a slotted spoon. Keep at it until the surface stays clean.",
        minutes: 10,
      },
      {
        he: "הוסיפו את כל הירקות חוץ מהקישוא והעשבים, ואת הפלפל, הכורכום והמלח. הנמיכו לאש קטנה, כך שרק בועות בודדות עולות.",
        en: "Add all the vegetables except the courgette and herbs, along with the peppercorns, turmeric and salt. Turn the heat down until only the odd bubble breaks the surface.",
      },
      {
        he: "בשלו כשהסיר חצי מכוסה כשעתיים וחצי. אל תתנו למרק לרתוח בחוזקה — רתיחה סוערת מעכירה אותו.",
        en: "Simmer with the lid ajar for about 2½ hours. Don't let it boil hard — a rolling boil clouds the broth.",
        minutes: 150,
      },
      {
        he: "הוסיפו את הקישוא, השמיר והפטרוזיליה ובשלו עוד 20 דקות. טעמו ותקנו מלח.",
        en: "Add the courgette, dill and parsley and simmer for 20 minutes more. Taste and adjust the salt.",
        minutes: 20,
      },
      {
        he: "הוציאו את העוף והירקות. סננו את הנוזל דרך מסננת דקה, פרקו את הבשר מהעצמות והחזירו אותו לסיר יחד עם הגזר.",
        en: "Lift out the chicken and vegetables. Strain the broth through a fine sieve, pull the meat off the bones and return it to the pot with the carrots.",
      },
      {
        he: "אם יש זמן, קררו לילה במקרר. השומן יתקשה למעלה, ותוכלו להסיר כמה שתרצו לפני החימום.",
        en: "If you have time, chill it overnight. The fat sets on top and you can lift off as much as you like before reheating.",
      },
    ],
    tipHe:
      "העוף שלנו כבר עבר מליחה, אז מלחו בזהירות וטעמו רק בסוף. בקשו מאיתנו לפרק את העוף ל-8 חלקים — עצם חשופה משחררת יותר טעם לנוזל.",
    tipEn:
      "Our chicken is already kosher-salted, so go easy on the salt and taste only at the end. Ask us to cut the bird into eight — exposed bone gives more flavour to the broth.",
  },
  {
    slug: "asado-cholent",
    occasion: "SHABBAT",
    titleHe: "חמין אסאדו",
    titleEn: "Asado cholent",
    introHe:
      "חמין הוא הסבלנות של שבת בסיר אחד, והאסאדו הוא הנתח שנבנה בשבילו. במהלך הלילה השומן והקולגן נמסים לתוך השעועית והגריסים, ובבוקר הכול רך, כהה ועמוק.",
    introEn:
      "Cholent is Shabbat patience in a single pot, and asado is the cut made for it. Overnight its fat and collagen melt into the beans and barley, and by morning everything is soft, dark and deep.",
    heroProduct: "asado",
    prepMinutes: 30,
    cookMinutes: 990,
    servings: 8,
    difficulty: "MEDIUM",
    meat: [{ product: "asado", gramsPerServing: 320, noteHe: "חתוך לחתיכות של 2 צלעות", noteEn: "cut into two-rib pieces" }],
    ingredientsHe: [
      "200 גר׳ שעועית לבנה יבשה, מושרית לילה",
      "150 גר׳ גריסי פנינה, שטופים",
      "8 תפוחי אדמה בינוניים, קלופים",
      "2 בטטות, בחתיכות גדולות",
      "2 בצלים גדולים, קצוצים",
      "8 שיני שום שלמות",
      "8 ביצים בקליפתן, שטופות",
      "3 כפות שמן זית",
      "2 כפות פפריקה מתוקה",
      "1 כפית פפריקה חריפה",
      "2 כפות סילאן",
      "1½ כפיות מלח",
      "½ כפית פלפל שחור",
      "כ-2 ליטר מים רותחים",
    ],
    ingredientsEn: [
      "200 g dried white beans, soaked overnight",
      "150 g pearl barley, rinsed",
      "8 medium potatoes, peeled",
      "2 sweet potatoes, in large chunks",
      "2 large onions, chopped",
      "8 whole garlic cloves",
      "8 eggs in their shells, washed",
      "3 tbsp olive oil",
      "2 tbsp sweet paprika",
      "1 tsp hot paprika",
      "2 tbsp silan (date syrup)",
      "1½ tsp salt",
      "½ tsp black pepper",
      "about 2 litres boiling water",
    ],
    steps: [
      {
        he: "סננו ושטפו את השעועית. חממו את השמן בסיר כבד ורחב וצרבו את האסאדו מכל הצדדים, עד צבע חום עמוק. הוציאו לצלחת.",
        en: "Drain and rinse the beans. Heat the oil in a heavy, wide pot and brown the asado well on all sides. Set aside on a plate.",
        minutes: 12,
      },
      {
        he: "באותו סיר בשלו את הבצל על אש בינונית עד שהוא רך ושחום. הוסיפו את השום, הפפריקות והסילאן וערבבו דקה.",
        en: "In the same pot, cook the onions over medium heat until soft and deep golden. Stir in the garlic, both paprikas and the silan for a minute.",
        minutes: 12,
      },
      {
        he: "פזרו את השעועית והגריסים על הבצל. סדרו מעליהם את תפוחי האדמה, הבטטות והביצים, ובמרכז את האסאדו.",
        en: "Scatter the beans and barley over the onions. Nestle in the potatoes, sweet potatoes and eggs, with the asado in the middle.",
      },
      {
        he: "תבלו במלח ופלפל ויצקו מים רותחים עד שהם מכסים את הכול בכ-2 ס״מ. הביאו לרתיחה על הכיריים.",
        en: "Season with salt and pepper and pour in boiling water to cover everything by about 2 cm. Bring to the boil on the stove.",
        minutes: 10,
      },
      {
        he: "כסו היטב והעבירו לתנור שחומם ל-100 מעלות, או לפלטה, לפני הדלקת נרות. ודאו שיש מספיק נוזל לפני כניסת השבת — מכאן והלאה לא נוגעים במכסה.",
        en: "Cover tightly and move to a 100°C oven or onto the plata before candle lighting. Make sure there's enough liquid before Shabbat comes in — from then on, leave the lid alone.",
        minutes: 960,
      },
      {
        he: "בבוקר קלפו את הביצים, פרקו את האסאדו מהעצמות והגישו הכול יחד עם הרוטב הסמיך מתחתית הסיר.",
        en: "In the morning, peel the eggs, pull the asado off the bones and serve everything with the thick sauce from the bottom of the pot.",
      },
    ],
    tipHe:
      "בקשו מאיתנו לחתוך את רצועת האסאדו לחתיכות של שתי צלעות. העצם נשארת בסיר ומוסיפה גוף, והחתיכות נכנסות בין השעועית במקום לשכב מעליה.",
    tipEn:
      "Ask us to cut the asado strip into two-rib pieces. The bone stays in the pot for body, and the pieces tuck in among the beans rather than sitting on top.",
  },
  {
    slug: "roast-chicken-potatoes",
    occasion: "SHABBAT",
    titleHe: "עוף צלוי עם תפוחי אדמה",
    titleEn: "Roast chicken with potatoes",
    introHe:
      "עוף שלם בתנור הוא ארוחת שבת שלא צריכה הסברים, בתנאי שהעור פריך והבשר נשאר עסיסי. תפוחי האדמה נצלים מתחת לעוף וסופגים את כל המיצים שנוטפים ממנו.",
    introEn:
      "A whole roast chicken needs no introduction — as long as the skin crackles and the meat stays juicy. The potatoes roast underneath and catch every drop that falls.",
    heroProduct: "whole-chicken",
    prepMinutes: 20,
    cookMinutes: 75,
    restMinutes: 15,
    servings: 4,
    difficulty: "EASY",
    meat: [{ product: "whole-chicken", gramsPerServing: 450 }],
    ingredientsHe: [
      "1 ק״ג תפוחי אדמה קטנים, חצויים",
      "1 בצל גדול, בטבעות עבות",
      "1 ראש שום, חצוי לרוחב",
      "1 לימון",
      "6 ענפי טימין",
      "2 ענפי רוזמרין",
      "4 כפות שמן זית",
      "1 כפית פפריקה מתוקה",
      "½ כפית מלח",
      "½ כפית פלפל שחור",
    ],
    ingredientsEn: [
      "1 kg small potatoes, halved",
      "1 large onion, in thick rings",
      "1 head garlic, halved crosswise",
      "1 lemon",
      "6 thyme sprigs",
      "2 rosemary sprigs",
      "4 tbsp olive oil",
      "1 tsp sweet paprika",
      "½ tsp salt",
      "½ tsp black pepper",
    ],
    steps: [
      {
        he: "הוציאו את העוף מהמקרר חצי שעה לפני הצלייה וייבשו אותו היטב בנייר סופג, גם מבפנים. עור יבש הוא עור פריך.",
        en: "Take the chicken out of the fridge 30 minutes ahead and pat it very dry, inside and out. Dry skin is crisp skin.",
        minutes: 30,
      },
      {
        he: "חממו תנור ל-220 מעלות. בתבנית רחבה ערבבו את תפוחי האדמה, הבצל והשום עם 2 כפות שמן, המלח והפלפל.",
        en: "Heat the oven to 220°C. In a wide roasting tin, toss the potatoes, onion and garlic with 2 tbsp oil, the salt and pepper.",
      },
      {
        he: "חצו את הלימון והכניסו אותו לחלל העוף יחד עם הטימין והרוזמרין. שפשפו את העוף בשמן הנותר ובפפריקה והניחו אותו על הירקות, חזה למעלה.",
        en: "Halve the lemon and push it into the cavity with the thyme and rosemary. Rub the bird with the remaining oil and the paprika and set it on the vegetables, breast up.",
      },
      {
        he: "צלו 15 דקות ב-220 מעלות, ואז הנמיכו ל-190 מעלות.",
        en: "Roast for 15 minutes at 220°C, then lower the oven to 190°C.",
        minutes: 15,
      },
      {
        he: "המשיכו לצלות כשעה, והפכו את תפוחי האדמה פעם אחת באמצע. העוף מוכן כשהמדחום בחלק העבה של הירך מראה 74 מעלות.",
        en: "Keep roasting for about an hour, turning the potatoes once halfway. The chicken is done when a thermometer in the thickest part of the thigh reads 74°C.",
        minutes: 60,
      },
      {
        he: "העבירו את העוף לקרש ותנו לו לנוח 15 דקות. בינתיים החזירו את תפוחי האדמה לתנור כדי שישחימו עוד.",
        en: "Move the chicken to a board and rest it for 15 minutes. Meanwhile, put the potatoes back in the oven to brown a little more.",
        minutes: 15,
      },
      {
        he: "פרקו את העוף, סחטו מעליו את הלימון הצלוי מהחלל והגישו על תפוחי האדמה.",
        en: "Carve, squeeze the roasted lemon from the cavity over the top and serve on the potatoes.",
      },
    ],
    donenessC: [{ he: "ירך, בחלק העבה", en: "Thigh, thickest part", tempC: 74 }],
    tipHe:
      "רוצים עוף שנצלה מהר ואחיד? בקשו אותו פתוח לצלייה. הוא מוכן תוך כ-45 דקות, והחזה והירכיים מסיימים יחד.",
    tipEn:
      "Want it faster and more even? Ask us to butterfly the chicken. It roasts in about 45 minutes, and the breast and thighs finish together.",
  },
  {
    slug: "beef-shoulder-red-wine",
    occasion: "SHABBAT",
    titleHe: "כתף בקר ביין אדום",
    titleEn: "Beef shoulder braised in red wine",
    introHe:
      "כתף בקר היא שריר עבודה מלא קולגן, ובישול איטי ביין הופך אותה לרכה ועשירה. זו מנה שמכינים ביום שישי ומחממים בשבת — ולמחרת היא רק משתפרת.",
    introEn:
      "Beef shoulder is a hard-working muscle full of collagen, and a slow braise in wine turns it tender and rich. Make it on Friday and warm it through on Shabbat — it only gets better overnight.",
    heroProduct: "beef-shoulder",
    prepMinutes: 25,
    cookMinutes: 220,
    restMinutes: 20,
    servings: 6,
    difficulty: "MEDIUM",
    meat: [{ product: "beef-shoulder", gramsPerServing: 250, noteHe: "חתיכה אחת, קשורה", noteEn: "one piece, tied" }],
    ingredientsHe: [
      "750 מ״ל יין אדום יבש",
      "2 בצלים גדולים, קצוצים גס",
      "3 גזרים, בחתיכות",
      "2 גבעולי סלרי, בחתיכות",
      "6 שיני שום, מעוכות",
      "2 כפות רסק עגבניות",
      "500 מ״ל ציר עוף או מים",
      "2 עלי דפנה",
      "4 ענפי טימין",
      "3 כפות שמן זית",
      "1 כפית פלפל שחור גרוס",
    ],
    ingredientsEn: [
      "750 ml dry red wine",
      "2 large onions, roughly chopped",
      "3 carrots, in chunks",
      "2 celery stalks, in chunks",
      "6 garlic cloves, crushed",
      "2 tbsp tomato paste",
      "500 ml chicken stock or water",
      "2 bay leaves",
      "4 thyme sprigs",
      "3 tbsp olive oil",
      "1 tsp coarsely ground black pepper",
    ],
    steps: [
      {
        he: "חממו תנור ל-160 מעלות. ייבשו את הבשר ופזרו עליו פלפל שחור.",
        en: "Heat the oven to 160°C. Pat the meat dry and season it with the black pepper.",
      },
      {
        he: "חממו את השמן בסיר ברזל יצוק שנכנס לתנור וצרבו את הכתף מכל הצדדים, עד קרום חום כהה. הוציאו לצלחת.",
        en: "Heat the oil in an ovenproof cast-iron pot and sear the shoulder on every side to a dark brown crust. Set aside.",
        minutes: 12,
      },
      {
        he: "הנמיכו את האש, הוסיפו בצל, גזר וסלרי ובשלו עד שהם מתרככים. הוסיפו את השום ואת רסק העגבניות וערבבו עוד 2 דקות.",
        en: "Lower the heat, add the onion, carrot and celery and cook until softened. Add the garlic and tomato paste and stir for 2 minutes more.",
        minutes: 10,
      },
      {
        he: "יצקו את היין, גרדו את התחתית בכף עץ ובשלו עד שהנוזל מצטמצם בשליש.",
        en: "Pour in the wine, scrape up the browned bits and let it bubble until reduced by a third.",
        minutes: 10,
      },
      {
        he: "החזירו את הבשר והוסיפו את הציר, הדפנה והטימין — הנוזל צריך להגיע לחצי גובה הנתח. כסו ובשלו בתנור שלוש שעות, והפכו את הנתח באמצע.",
        en: "Return the meat and add the stock, bay and thyme — the liquid should come halfway up the piece. Cover and braise in the oven for 3 hours, turning it halfway.",
        minutes: 180,
      },
      {
        he: "הבשר מוכן כשמזלג נכנס בלי התנגדות. תנו לו לנוח 20 דקות בתוך הנוזל.",
        en: "It's ready when a fork slides in with no resistance. Let it rest for 20 minutes in the liquid.",
        minutes: 20,
      },
      {
        he: "הוציאו את הבשר, סננו את הרוטב וצמצמו אותו על אש גבוהה עד שהוא מצפה כף. פרסו נגד הסיבים והגישו עם הרוטב.",
        en: "Lift out the meat, strain the sauce and boil it down until it coats a spoon. Slice against the grain and serve with the sauce.",
        minutes: 10,
      },
    ],
    tipHe:
      "פרסו את הבשר כשהוא קר — הפרוסות יוצאות נקיות ולא מתפוררות. לשבת, סדרו את הפרוסות בתבנית עם הרוטב וחממו מכוסה על הפלטה.",
    tipEn:
      "Slice the meat cold and the slices come out clean instead of shredding. For Shabbat, lay them in a dish with the sauce and warm through, covered, on the plata.",
  },
  {
    slug: "stuffed-chicken-rice-dried-fruit",
    occasion: "SHABBAT",
    titleHe: "עוף ממולא באורז ופירות יבשים",
    titleEn: "Chicken stuffed with rice and dried fruit",
    introHe:
      "עוף ממולא הוא מנה של שולחן מלא — מתוק, מתובל וריחני. האורז מתבשל רק למחצה לפני המילוי ומסיים בתוך העוף, כך שהוא סופג את המיצים ולא הופך לדייסה.",
    introEn:
      "A stuffed chicken belongs on a full table — sweet, warmly spiced and fragrant. The rice is only half-cooked before it goes in, so it finishes inside the bird, soaking up the juices without turning to mush.",
    heroProduct: "whole-chicken",
    prepMinutes: 40,
    cookMinutes: 120,
    restMinutes: 15,
    servings: 4,
    difficulty: "MEDIUM",
    meat: [{ product: "whole-chicken", gramsPerServing: 450 }],
    ingredientsHe: [
      "200 גר׳ אורז בסמטי",
      "1 בצל גדול, קצוץ דק",
      "80 גר׳ משמשים מיובשים, קצוצים",
      "60 גר׳ צימוקים",
      "50 גר׳ שקדים מולבנים",
      "1 כפית בהרט",
      "½ כפית קינמון",
      "½ כפית כורכום",
      "400 מ״ל מים רותחים",
      "4 כפות שמן זית",
      "2 כפות סילאן",
      "1 כפית מלח",
      "½ כפית פלפל שחור",
    ],
    ingredientsEn: [
      "200 g basmati rice",
      "1 large onion, finely chopped",
      "80 g dried apricots, chopped",
      "60 g raisins",
      "50 g blanched almonds",
      "1 tsp baharat",
      "½ tsp ground cinnamon",
      "½ tsp ground turmeric",
      "400 ml boiling water",
      "4 tbsp olive oil",
      "2 tbsp silan (date syrup)",
      "1 tsp salt",
      "½ tsp black pepper",
    ],
    steps: [
      {
        he: "שטפו את האורז עד שהמים צלולים והשרו אותו 15 דקות. סננו היטב.",
        en: "Rinse the rice until the water runs clear, soak it for 15 minutes, then drain well.",
        minutes: 15,
      },
      {
        he: "בסיר חממו 2 כפות שמן ובשלו את הבצל עד שהוא רך ושקוף. הוסיפו את השקדים והתבלינים וערבבו דקה.",
        en: "Heat 2 tbsp oil in a pan and cook the onion until soft and translucent. Add the almonds and spices and stir for a minute.",
        minutes: 8,
      },
      {
        he: "הוסיפו את האורז, הפירות היבשים, חצי כפית מלח ו-300 מ״ל מהמים הרותחים. כסו ובשלו על אש קטנה 8 דקות — האורז צריך להישאר קשה במרכז. קררו 10 דקות.",
        en: "Add the rice, dried fruit, ½ tsp salt and 300 ml of the boiling water. Cover and cook on low for 8 minutes — the rice should still be firm at the centre. Cool for 10 minutes.",
        minutes: 8,
      },
      {
        he: "חממו תנור ל-180 מעלות. מלאו את חלל העוף בחופשיות ובלי לדחוס — האורז עוד יתפח. סגרו את הפתח בקיסמים, ואת שארית המילוי פזרו בתבנית סביב העוף.",
        en: "Heat the oven to 180°C. Fill the cavity loosely without packing it — the rice will swell. Close the opening with toothpicks and spread any leftover stuffing in the tin around the bird.",
      },
      {
        he: "ערבבו את הסילאן עם השמן הנותר, חצי כפית מלח והפלפל, ומרחו על כל העוף. יצקו לתבנית את 100 מ״ל המים הנותרים.",
        en: "Mix the silan with the remaining oil, ½ tsp salt and the pepper and brush it all over the chicken. Pour the remaining 100 ml water into the tin.",
      },
      {
        he: "כסו בנייר כסף וצלו שעה.",
        en: "Cover with foil and roast for an hour.",
        minutes: 60,
      },
      {
        he: "הסירו את נייר הכסף, העלו ל-200 מעלות וצלו עוד 40–50 דקות, עד שהעור שחום ומבריק.",
        en: "Uncover, raise the oven to 200°C and roast for another 40–50 minutes, until the skin is glossy and deep brown.",
        minutes: 45,
      },
      {
        he: "העוף מוכן כשהמדחום מראה 74 מעלות בירך וגם במרכז המילוי. תנו לו לנוח 15 דקות לפני הפירוק.",
        en: "It's done when a thermometer reads 74°C in the thigh and in the centre of the stuffing. Rest for 15 minutes before carving.",
        minutes: 15,
      },
    ],
    donenessC: [
      { he: "ירך, בחלק העבה", en: "Thigh, thickest part", tempC: 74 },
      { he: "מרכז המילוי", en: "Centre of the stuffing", tempC: 74 },
    ],
    tipHe:
      "הסילאן משחים מהר, אז אם העור מכהה לפני שהמדחום מגיע ל-74 מעלות, כסו שוב ברפיון. ומלאו את העוף רק רגע לפני שהוא נכנס לתנור, אף פעם לא ערב קודם.",
    tipEn:
      "Silan browns fast — if the skin darkens before the thermometer reaches 74°C, tent it loosely with foil. And stuff the bird just before it goes in the oven, never the night before.",
  },
  {
    slug: "beef-meatballs-tomato-sauce",
    occasion: "SHABBAT",
    titleHe: "קציצות בקר ברוטב עגבניות",
    titleEn: "Beef meatballs in tomato sauce",
    introHe:
      "קציצות ברוטב הן מנה שכולם מכירים מהבית, ובגלל זה קל לטעות בהן. אנחנו מבשלים אותן ישר ברוטב בלי טיגון מקדים, וכך הן יוצאות רכות, אווריריות וספוגות עגבנייה.",
    introEn:
      "Everyone grew up with meatballs in sauce, which is exactly why they're easy to get wrong. We poach them straight in the sauce without frying first, so they come out soft, light and full of tomato.",
    heroProduct: "ground-beef",
    prepMinutes: 25,
    cookMinutes: 55,
    servings: 6,
    difficulty: "EASY",
    meat: [{ product: "ground-beef", gramsPerServing: 170 }],
    ingredientsHe: [
      "2 בצלים (אחד מגורר לקציצות, אחד קצוץ לרוטב)",
      "6 שיני שום, כתושות",
      "1 ביצה",
      "4 כפות פירורי לחם",
      "½ צרור פטרוזיליה, קצוצה",
      "1 כפית כמון",
      "2 כפיות פפריקה מתוקה",
      "3 כפות שמן זית",
      "2 כפות רסק עגבניות",
      "800 גר׳ עגבניות מרוסקות (קופסה)",
      "300 מ״ל מים",
      "1 כפית סוכר",
      "1 כפית מלח",
      "½ כפית פלפל שחור",
    ],
    ingredientsEn: [
      "2 onions (one grated for the meatballs, one chopped for the sauce)",
      "6 garlic cloves, crushed",
      "1 egg",
      "4 tbsp breadcrumbs",
      "½ bunch parsley, chopped",
      "1 tsp ground cumin",
      "2 tsp sweet paprika",
      "3 tbsp olive oil",
      "2 tbsp tomato paste",
      "800 g tinned crushed tomatoes",
      "300 ml water",
      "1 tsp sugar",
      "1 tsp salt",
      "½ tsp black pepper",
    ],
    steps: [
      {
        he: "בקערה ערבבו את הבשר עם הבצל המגורר, חצי מהשום, הביצה, פירורי הלחם, רוב הפטרוזיליה, הכמון, כפית פפריקה, חצי כפית מלח והפלפל. ערבבו בידיים רק עד שהתערובת אחידה — לישה ארוכה מקשה את הקציצות.",
        en: "In a bowl, combine the beef with the grated onion, half the garlic, the egg, breadcrumbs, most of the parsley, the cumin, 1 tsp paprika, ½ tsp salt and the pepper. Mix by hand only until even — overworking makes tough meatballs.",
      },
      {
        he: "קררו את התערובת במקרר 15 דקות. קרה, קל יותר לעצב אותה.",
        en: "Chill the mixture for 15 minutes; it shapes more easily when cold.",
        minutes: 15,
      },
      {
        he: "בינתיים, בסיר רחב, חממו את השמן ובשלו את הבצל הקצוץ עד שהוא רך וזהוב. הוסיפו את שארית השום והפפריקה ואת רסק העגבניות וערבבו 2 דקות.",
        en: "Meanwhile, heat the oil in a wide pot and cook the chopped onion until soft and golden. Add the remaining garlic and paprika and the tomato paste and stir for 2 minutes.",
        minutes: 10,
      },
      {
        he: "הוסיפו את העגבניות, המים, הסוכר ושארית המלח. הביאו לרתיחה ובשלו על אש נמוכה 10 דקות.",
        en: "Add the tomatoes, water, sugar and remaining salt. Bring to the boil, then simmer gently for 10 minutes.",
        minutes: 10,
      },
      {
        he: "בידיים רטובות עצבו קציצות בגודל כדור פינג-פונג גדול, והכניסו אותן ישר לרוטב המבעבע בשכבה אחת.",
        en: "With wet hands, roll meatballs the size of a large ping-pong ball and lower them straight into the simmering sauce in a single layer.",
      },
      {
        he: "כסו ובשלו על אש נמוכה 35 דקות. אל תערבבו בכף — נערו את הסיר בעדינות, כדי שהקציצות לא יתפרקו.",
        en: "Cover and simmer on low for 35 minutes. Don't stir with a spoon — give the pot a gentle shake so the meatballs stay whole.",
        minutes: 35,
      },
      {
        he: "פזרו את שארית הפטרוזיליה והגישו עם אורז לבן, פתיתים או חלה.",
        en: "Scatter over the remaining parsley and serve with white rice, ptitim or challah.",
      },
    ],
    donenessC: [{ he: "מרכז הקציצה", en: "Centre of a meatball", tempC: 71 }],
    tipHe:
      "הטחון שלנו נטחן ביום המשלוח מכתף ומחזה, עם 15% שומן — בדיוק מה שקציצה צריכה כדי להישאר עסיסית. בקשו טחינה דקה, והקציצות יצאו חלקות ועדינות יותר.",
    tipEn:
      "Our ground beef is minced on delivery day from shoulder and brisket at 15% fat — just what a meatball needs to stay juicy. Ask for a fine grind and they'll come out smoother and more delicate.",
  },

  // ── Grill ───────────────────────────────────────────
  {
    slug: "grilled-entrecote",
    occasion: "GRILL",
    titleHe: "אנטריקוט על הגריל",
    titleEn: "Grilled entrecôte",
    introHe:
      "לאנטריקוט טוב לא צריך הרבה: גחלים לוהטות, פלפל, מלח וסבלנות לתת לו לנוח. עין השומן שבמרכז הנתח נמסה על האש ושומרת על הסטייק עסיסי מבפנים.",
    introEn:
      "Good entrecôte asks for very little: blazing coals, pepper, salt and the patience to let it rest. The eye of fat at its centre melts over the fire and keeps the steak juicy inside.",
    heroProduct: "entrecote",
    prepMinutes: 10,
    cookMinutes: 12,
    restMinutes: 5,
    servings: 4,
    difficulty: "EASY",
    meat: [{ product: "entrecote", gramsPerServing: 350, noteHe: "סטייקים בעובי 3 ס״מ", noteEn: "steaks cut 3 cm thick" }],
    ingredientsHe: [
      "1 כף שמן זית",
      "2 כפיות פלפל שחור גרוס גס",
      "1 כף מלח ים בפתיתים",
      "2 ענפי רוזמרין (לא חובה)",
    ],
    ingredientsEn: [
      "1 tbsp olive oil",
      "2 tsp coarsely cracked black pepper",
      "1 tbsp flaky sea salt",
      "2 rosemary sprigs (optional)",
    ],
    steps: [
      {
        he: "הוציאו את הסטייקים מהמקרר 40 דקות לפני הצלייה וייבשו אותם היטב בנייר סופג.",
        en: "Take the steaks out of the fridge 40 minutes before grilling and pat them thoroughly dry.",
        minutes: 40,
      },
      {
        he: "הכינו גריל בשני אזורים: בצד אחד שכבת גחלים עבה ולוהטת, ובצד השני כמעט בלי גחלים. הגחלים מוכנות כשהן מכוסות אפר לבן.",
        en: "Set up two zones: a thick bed of blazing coals on one side, almost none on the other. The coals are ready when they're covered in white ash.",
        minutes: 25,
      },
      {
        he: "מרחו שכבה דקה של שמן על הבשר — לא על הרשת — ופזרו פלפל. אם בחרתם ברוזמרין, הניחו אותו על הגחלים רגע לפני הסטייקים.",
        en: "Brush a thin film of oil on the meat, not the grate, and season with pepper. If you're using rosemary, drop it onto the coals just before the steaks go on.",
      },
      {
        he: "הניחו את הסטייקים מעל הצד הלוהט ואל תזיזו אותם 3–4 דקות, עד שהם משתחררים מהרשת בקלות. הפכו וצלו עוד 3–4 דקות.",
        en: "Lay the steaks over the hot side and leave them alone for 3–4 minutes, until they release from the grate on their own. Turn and grill for another 3–4 minutes.",
        minutes: 8,
      },
      {
        he: "העמידו כל סטייק על צד השומן לדקה כדי להשחים אותו. בדקו במדחום בחלק העבה, והוציאו מהאש 3 מעלות לפני המידה שאתם אוהבים.",
        en: "Stand each steak on its fat edge for a minute to render it. Check the thickest part with a thermometer and take them off 3°C short of your target.",
        minutes: 1,
      },
      {
        he: "אם הקרום מוכן והמרכז עוד לא, העבירו לצד הקריר וסגרו מכסה לכמה דקות.",
        en: "If the crust is there but the centre isn't, move them to the cool side and close the lid for a few minutes.",
      },
      {
        he: "הניחו את הסטייקים על קרש ל-5 דקות מנוחה, פרסו נגד הסיבים ופזרו מלח ים רגע לפני ההגשה.",
        en: "Rest the steaks on a board for 5 minutes, slice against the grain and scatter with flaky salt just before serving.",
        minutes: 5,
      },
    ],
    donenessC: [
      { he: "רייר", en: "Rare", tempC: 52 },
      { he: "מדיום-רייר", en: "Medium-rare", tempC: 55 },
      { he: "מדיום", en: "Medium", tempC: 60 },
    ],
    tipHe:
      "בקשו מאיתנו לחתוך בעובי 3 ס״מ לפחות. סטייק דק מתבשל עד הסוף לפני שהוא מספיק לפתח קרום, והעובי הוא מה שנותן לכם שליטה.",
    tipEn:
      "Ask us to cut your steaks at least 3 cm thick. A thin steak cooks through before it can build a crust; thickness is what gives you control.",
  },
  {
    slug: "pargiyot-skewers-lemon-garlic",
    occasion: "GRILL",
    titleHe: "שיפודי פרגיות בלימון ושום",
    titleEn: "Pargiyot skewers with lemon and garlic",
    introHe:
      "פרגית היא הנתח הכי סלחני על הגריל: יש בה מספיק שומן כדי להישאר עסיסית גם כשהאש מתלהבת. מרינדה קצרה של לימון, שום ופפריקה, גחלים חמות — וזה כל הסיפור.",
    introEn:
      "The pargit is the most forgiving cut on the grill, with enough fat to stay juicy even when the fire gets carried away. A short marinade of lemon, garlic and paprika, hot coals, and that's the whole story.",
    heroProduct: "pargiyot",
    prepMinutes: 20,
    cookMinutes: 12,
    restMinutes: 3,
    servings: 6,
    difficulty: "EASY",
    meat: [{ product: "pargiyot", gramsPerServing: 250 }],
    ingredientsHe: [
      "4 שיני שום, מגוררות",
      "1 לימון (גרידה ומיץ)",
      "4 כפות שמן זית",
      "2 כפיות פפריקה מתוקה",
      "1 כפית כמון",
      "½ כפית כורכום",
      "½ כפית מלח",
      "½ כפית פלפל שחור",
      "2 בצלים סגולים, ברבעים",
      "12 שיפודי עץ או מתכת",
    ],
    ingredientsEn: [
      "4 garlic cloves, grated",
      "1 lemon, zest and juice",
      "4 tbsp olive oil",
      "2 tsp sweet paprika",
      "1 tsp ground cumin",
      "½ tsp ground turmeric",
      "½ tsp salt",
      "½ tsp black pepper",
      "2 red onions, quartered",
      "12 wooden or metal skewers",
    ],
    steps: [
      {
        he: "חתכו את הפרגיות לחתיכות של כ-4 ס״מ. אל תסירו את השומן — הוא מה ששומר עליהן עסיסיות.",
        en: "Cut the pargiyot into pieces of about 4 cm. Leave the fat on — it's what keeps them juicy.",
      },
      {
        he: "ערבבו בקערה את השום, הלימון, השמן והתבלינים, הוסיפו את הבשר ועסו היטב. כסו והשרו במקרר שעה, ולא יותר מ-4 שעות.",
        en: "Mix the garlic, lemon, oil and spices in a bowl, add the chicken and massage well. Cover and marinate in the fridge for an hour, and no more than 4.",
        minutes: 60,
      },
      {
        he: "אם אתם משתמשים בשיפודי עץ, השרו אותם במים חצי שעה כדי שלא יישרפו.",
        en: "If you're using wooden skewers, soak them in water for 30 minutes so they don't burn.",
        minutes: 30,
      },
      {
        he: "השחילו את הפרגיות על השיפודים — מקופלות וצמודות, אבל לא דחוסות — עם שכבות בצל ביניהן.",
        en: "Thread the chicken onto the skewers, folded and snug but not crammed, with layers of onion in between.",
      },
      {
        he: "צלו על גחלים חמות 10–12 דקות והפכו כל 2–3 דקות, עד שכל הצדדים שחומים ומעט חרוכים.",
        en: "Grill over hot coals for 10–12 minutes, turning every 2–3 minutes, until browned and lightly charred all over.",
        minutes: 12,
      },
      {
        he: "בדקו במדחום את החתיכה העבה ביותר — 74 מעלות לפחות. תנו לשיפודים לנוח 3 דקות והגישו עם פיתות, טחינה וסלט קצוץ.",
        en: "Check the thickest piece with a thermometer — at least 74°C. Rest the skewers for 3 minutes and serve with pitta, tahini and chopped salad.",
        minutes: 3,
      },
    ],
    donenessC: [{ he: "החתיכה העבה ביותר", en: "Thickest piece", tempC: 74 }],
    tipHe:
      "אין זמן למרינדה? שיפודי הפרגית שלנו מגיעים מושחלים ומתובלים בשום, לימון ופפריקה — ישר לגחלים. ובשר ירך לא נפגע אם הוא עובר קצת את ה-74 מעלות, אז אין סיבה למהר להוריד.",
    tipEn:
      "No time to marinate? Our pargit skewers arrive threaded and seasoned with garlic, lemon and paprika, ready for the coals. And thigh meat doesn't suffer if it goes a little past 74°C, so there's no need to rush it off.",
  },
  {
    slug: "grilled-kebab-tahini",
    occasion: "GRILL",
    titleHe: "קבב על האש עם טחינה וסלט בצל",
    titleEn: "Grilled kebab with tahini and onion salad",
    introHe:
      "תערובת הקבב שלנו כבר מתובלת בפטרוזיליה, בצל ובהרט, כך שנשאר לכם רק לעצב ולצלות. הטריק הוא בשר קר מאוד, ידיים רטובות וגחלים לוהטות.",
    introEn:
      "Our kebab mix is already seasoned with parsley, onion and baharat, so all that's left is to shape and grill. The trick is very cold meat, wet hands and blazing coals.",
    heroProduct: "kebab-spiced",
    prepMinutes: 25,
    cookMinutes: 8,
    servings: 6,
    difficulty: "EASY",
    meat: [{ product: "kebab-spiced", gramsPerServing: 170 }],
    ingredientsHe: [
      "12 שיפודים שטוחים",
      "150 גר׳ טחינה גולמית",
      "1 לימון",
      "1 שן שום, כתושה",
      "½ כפית מלח",
      "100 מ״ל מים קרים",
      "1 בצל סגול, פרוס דק",
      "1 כפית סומק",
      "½ צרור פטרוזיליה, קצוצה",
      "2 כפות שמן זית",
      "3 עגבניות, חצויות",
      "6 פיתות",
    ],
    ingredientsEn: [
      "12 flat skewers",
      "150 g raw tahini paste",
      "1 lemon",
      "1 garlic clove, crushed",
      "½ tsp salt",
      "100 ml cold water",
      "1 red onion, thinly sliced",
      "1 tsp sumac",
      "½ bunch parsley, chopped",
      "2 tbsp olive oil",
      "3 tomatoes, halved",
      "6 pittas",
    ],
    steps: [
      {
        he: "חלקו את הבשר ל-12 כדורים של כ-85 גר׳. בידיים רטובות עטפו כל כדור סביב שיפוד שטוח, ומתחו אותו לאצבע עבה ואחידה.",
        en: "Divide the meat into 12 balls of about 85 g. With wet hands, wrap each one around a flat skewer and stretch it into an even, thick finger.",
      },
      {
        he: "העבירו את השיפודים למקרר ל-20 דקות, כדי שהבשר יתייצב ולא ייפול לגחלים.",
        en: "Chill the skewers for 20 minutes so the meat firms up and stays on.",
        minutes: 20,
      },
      {
        he: "בינתיים הכינו טחינה: ערבבו את הטחינה הגולמית עם מיץ מחצי לימון, השום והמלח, והוסיפו מים קרים בהדרגה עד שהיא חלקה ובהירה.",
        en: "Meanwhile, make the tahini: stir the paste with the juice of half the lemon, the garlic and the salt, then add the cold water gradually until smooth and pale.",
      },
      {
        he: "ערבבו את הבצל הסגול עם הסומק, הפטרוזיליה, השמן ומיץ חצי הלימון הנותר. תנו לו לעמוד עד ההגשה.",
        en: "Toss the red onion with the sumac, parsley, olive oil and the rest of the lemon juice. Let it sit until serving.",
      },
      {
        he: "צלו את הקבבים על גחלים לוהטות 3 דקות לכל צד. הפכו רק כשהבשר משתחרר מהרשת — הפיכה מוקדמת מפרקת אותו.",
        en: "Grill the kebabs over blazing coals for 3 minutes a side. Turn only once the meat releases from the grate — turning too soon breaks it apart.",
        minutes: 6,
      },
      {
        he: "צלו לצידם את חצאי העגבניות, וחממו את הפיתות על הרשת לחצי דקה. הגישו את הקבב על פיתה עם טחינה, סלט בצל ועגבנייה צלויה.",
        en: "Char the tomato halves alongside and warm the pittas on the grate for 30 seconds. Serve the kebabs on pitta with tahini, onion salad and grilled tomato.",
        minutes: 2,
      },
    ],
    donenessC: [{ he: "מרכז הקבב", en: "Centre of the kebab", tempC: 71 }],
    tipHe:
      "השאירו את הבשר במקרר עד שהגחלים מוכנות: שומן קר מחזיק את הקבב, שומן חם מטפטף לאש. אין שיפודים שטוחים? עצבו קציצות ארוכות וצלו אותן ברשת כפולה.",
    tipEn:
      "Keep the meat in the fridge until the coals are ready: cold fat holds a kebab together, warm fat drips into the fire. No flat skewers? Shape long patties and grill them in a hinged grill basket.",
  },
  {
    slug: "low-and-slow-grilled-asado",
    occasion: "GRILL",
    titleHe: "אסאדו בצלייה איטית על הגריל",
    titleEn: "Low-and-slow grilled asado",
    introHe:
      "אסאדו על הגריל הוא עניין של שעות, לא של דקות: חום עקיף ונמוך מפרק את הקולגן בין הצלעות, עד שהבשר נפרד מהעצם. צריבה קצרה מעל הגחלים בסוף נותנת לו את הקרום.",
    introEn:
      "Asado on the grill takes hours, not minutes: low, indirect heat breaks down the collagen between the ribs until the meat slips off the bone. A quick sear over the coals at the end gives it its crust.",
    heroProduct: "asado",
    prepMinutes: 20,
    cookMinutes: 240,
    restMinutes: 20,
    servings: 6,
    difficulty: "ADVANCED",
    meat: [{ product: "asado", gramsPerServing: 400, noteHe: "רצועה שלמה", noteEn: "whole strip" }],
    ingredientsHe: [
      "2 כפות פלפל שחור גרוס גס",
      "1 כף פפריקה מתוקה",
      "1 כף סוכר חום",
      "1 כפית אבקת שום",
      "1 כפית מלח גס",
      "1 צרור פטרוזיליה, קצוצה דק",
      "4 שיני שום, קצוצות דק",
      "1 כפית אורגנו מיובש",
      "½ כפית פתיתי צ׳ילי",
      "120 מ״ל שמן זית",
      "3 כפות חומץ יין אדום",
      "כ-3 ק״ג פחמים",
    ],
    ingredientsEn: [
      "2 tbsp coarsely cracked black pepper",
      "1 tbsp sweet paprika",
      "1 tbsp brown sugar",
      "1 tsp garlic powder",
      "1 tsp coarse salt",
      "1 bunch parsley, finely chopped",
      "4 garlic cloves, finely chopped",
      "1 tsp dried oregano",
      "½ tsp chilli flakes",
      "120 ml olive oil",
      "3 tbsp red wine vinegar",
      "about 3 kg charcoal",
    ],
    steps: [
      {
        he: "ערבבו את הפלפל, הפפריקה, הסוכר, אבקת השום והמלח, ושפשפו את התערובת על כל האסאדו. השאירו בטמפרטורת החדר בזמן שהגריל מתחמם.",
        en: "Mix the pepper, paprika, sugar, garlic powder and salt and rub it all over the asado. Leave it at room temperature while the grill heats.",
      },
      {
        he: "הכינו גריל עם מכסה לצלייה עקיפה: גחלים בצד אחד בלבד, ומגש אלומיניום עם מעט מים בצד השני. כוונו את פתחי האוורור עד שהחום מתייצב על 130–150 מעלות.",
        en: "Set up a lidded grill for indirect cooking: coals on one side only and a foil tray with a little water on the other. Adjust the vents until the heat holds steady at 130–150°C.",
        minutes: 30,
      },
      {
        he: "הניחו את האסאדו בצד הרחוק מהגחלים, עצמות למטה, וסגרו את המכסה. צלו שעתיים וחצי, והוסיפו חופן פחמים כל 45–60 דקות כדי לשמור על החום.",
        en: "Place the asado on the side away from the coals, bones down, and close the lid. Cook for 2½ hours, adding a handful of charcoal every 45–60 minutes to hold the temperature.",
        minutes: 150,
      },
      {
        he: "כשנוצר קרום כהה, עטפו את האסאדו היטב בנייר כסף והחזירו לצד העקיף לעוד שעה עד שעה וחצי, עד שמדחום נכנס בין הצלעות בלי שום התנגדות (כ-94 מעלות).",
        en: "Once a dark bark has formed, wrap the asado tightly in foil and return it to the indirect side for another 1–1½ hours, until a probe slides between the ribs with no resistance (around 94°C).",
        minutes: 75,
      },
      {
        he: "בינתיים הכינו צ׳ימיצ׳ורי: ערבבו את הפטרוזיליה, השום, האורגנו, הצ׳ילי, השמן והחומץ.",
        en: "Meanwhile, make the chimichurri: stir together the parsley, garlic, oregano, chilli, oil and vinegar.",
      },
      {
        he: "פתחו את העטיפה והעבירו את האסאדו מעל הגחלים ל-2–3 דקות לכל צד, עד שהקרום מתהדק.",
        en: "Unwrap and move the asado over the coals for 2–3 minutes a side, until the crust tightens.",
        minutes: 5,
      },
      {
        he: "תנו לבשר לנוח 20 דקות מכוסה ברפיון, ואז חתכו בין הצלעות והגישו עם הצ׳ימיצ׳ורי.",
        en: "Rest the meat, loosely covered, for 20 minutes, then cut between the bones and serve with the chimichurri.",
        minutes: 20,
      },
    ],
    donenessC: [{ he: "רך לגמרי, בין הצלעות", en: "Probe-tender, between the ribs", tempC: 94 }],
    tipHe:
      "המדחום שבמכסה הגריל מודד את האוויר למעלה, לא את מה שקורה ליד הרשת. אם יש לכם מדחום עם שני חיישנים, הניחו אחד ליד הבשר — ההפרש יכול להגיע ל-30 מעלות.",
    tipEn:
      "The thermometer in the lid reads the air at the top, not what's happening at the grate. If you have a dual-probe thermometer, clip one probe next to the meat — the difference can be as much as 30°C.",
  },
  {
    slug: "whole-grilled-shayetel",
    occasion: "GRILL",
    titleHe: "שייטל שלם על הגריל",
    titleEn: "Whole grilled shayetel",
    introHe:
      "במקום לפרוס לסטייקים, צלו את השייטל בחתיכה אחת, כמו שעושים לפיקניה בברזיל. הקרום נבנה מבחוץ, המרכז נשאר ורוד מקצה לקצה, ואת הפרוסות הדקות מגישים ישר מהקרש.",
    introEn:
      "Instead of cutting it into steaks, grill the shayetel whole, the way Brazilians treat picanha. The crust builds on the outside, the centre stays pink edge to edge, and thin slices go straight from the board to the table.",
    heroProduct: "shayetel",
    prepMinutes: 15,
    cookMinutes: 45,
    restMinutes: 10,
    servings: 6,
    difficulty: "MEDIUM",
    meat: [{ product: "shayetel", gramsPerServing: 250, noteHe: "נתח שלם של כ-1.5 ק״ג", noteEn: "one piece of about 1.5 kg" }],
    ingredientsHe: [
      "2 כפות שמן זית",
      "1 כף פלפל שחור גרוס גס",
      "3 שיני שום, מגוררות",
      "2 ענפי רוזמרין, עלים קצוצים",
      "1 כף מלח ים גס",
      "1 בצל סגול, קצוץ דק",
      "2 עגבניות, קצוצות דק",
      "1 פלפל ירוק, קצוץ דק",
      "3 כפות חומץ יין אדום",
      "4 כפות שמן זית לסלסה",
    ],
    ingredientsEn: [
      "2 tbsp olive oil",
      "1 tbsp coarsely cracked black pepper",
      "3 garlic cloves, grated",
      "2 rosemary sprigs, leaves chopped",
      "1 tbsp coarse sea salt",
      "1 red onion, finely chopped",
      "2 tomatoes, finely chopped",
      "1 green pepper, finely chopped",
      "3 tbsp red wine vinegar",
      "4 tbsp olive oil, for the salsa",
    ],
    steps: [
      {
        he: "הוציאו את הנתח מהמקרר 45 דקות לפני הצלייה. אם יש עליו שכבת שומן, חרצו אותה ברשת אלכסונית בלי לחתוך לתוך הבשר.",
        en: "Take the meat out 45 minutes before grilling. If there's a layer of fat, score it in a diamond pattern without cutting into the meat.",
        minutes: 45,
      },
      {
        he: "ערבבו את השמן, הפלפל, השום והרוזמרין ומרחו על כל הנתח.",
        en: "Mix the oil, pepper, garlic and rosemary and rub it over the whole piece.",
      },
      {
        he: "הכינו גריל בשני אזורים. צרבו את הנתח מעל הגחלים מכל הצדדים, כ-2 דקות לכל צד, עד קרום חום.",
        en: "Set up a two-zone grill. Sear the meat over the coals on every side, about 2 minutes each, to a brown crust.",
        minutes: 10,
      },
      {
        he: "העבירו לצד העקיף, סגרו מכסה וצלו בכ-180 מעלות 25–35 דקות, עד שהמדחום במרכז מראה 52 מעלות.",
        en: "Move it to the indirect side, close the lid and roast at about 180°C for 25–35 minutes, until the centre reads 52°C.",
        minutes: 30,
      },
      {
        he: "בזמן הצלייה ערבבו את הבצל, העגבניות, הפלפל הירוק, החומץ והשמן לסלסה קריאויה.",
        en: "While it roasts, stir together the onion, tomatoes, green pepper, vinegar and oil for a salsa criolla.",
      },
      {
        he: "העבירו לקרש ותנו לנוח 10 דקות — הטמפרטורה תעלה בעוד 2–3 מעלות.",
        en: "Move to a board and rest for 10 minutes — it will climb another 2–3°C.",
        minutes: 10,
      },
      {
        he: "פרסו פרוסות דקות נגד הסיבים, פזרו מלח גס והגישו עם הסלסה.",
        en: "Slice thinly against the grain, scatter with coarse salt and serve with the salsa.",
      },
    ],
    donenessC: [
      { he: "מדיום-רייר", en: "Medium-rare", tempC: 55 },
      { he: "מדיום", en: "Medium", tempC: 60 },
    ],
    tipHe:
      "שייטל הוא נתח רזה, ולכן כל מעלה מעבר למדיום מורגשת. הוציאו מהאש מוקדם, תנו למנוחה לסיים את העבודה, ופרסו דק ככל שאפשר.",
    tipEn:
      "Shayetel is lean, so every degree past medium shows. Pull it early, let the rest finish the job, and slice as thin as you can.",
  },
  {
    slug: "sticky-grilled-chicken-wings",
    occasion: "GRILL",
    titleHe: "כנפיים דביקות על הגריל",
    titleEn: "Sticky grilled chicken wings",
    introHe:
      "כנפיים צריכות שני שלבים: חום עקיף שממיס את השומן ומייבש את העור, ורק אחר כך זיגוג וגחלים. הסילאן והסויה מתקרמלים בסוף לציפוי מבריק ודביק.",
    introEn:
      "Wings need two stages: gentle indirect heat to render the fat and dry the skin, and only then the glaze and the coals. Silan and soy caramelise at the end into a sticky, glossy coat.",
    heroProduct: "chicken-wings",
    prepMinutes: 15,
    cookMinutes: 40,
    servings: 4,
    difficulty: "EASY",
    meat: [{ product: "chicken-wings", gramsPerServing: 350 }],
    ingredientsHe: [
      "5 כפות סילאן",
      "4 כפות רוטב סויה",
      "2 כפות שמן זית",
      "4 שיני שום, מגוררות",
      "1 כף ג׳ינג׳ר טרי מגורר",
      "1 כפית פפריקה מתוקה",
      "½ כפית פתיתי צ׳ילי",
      "מיץ מלימון אחד",
      "2 בצלים ירוקים, פרוסים דק",
      "1 כף שומשום קלוי",
    ],
    ingredientsEn: [
      "5 tbsp silan (date syrup)",
      "4 tbsp soy sauce",
      "2 tbsp olive oil",
      "4 garlic cloves, grated",
      "1 tbsp grated fresh ginger",
      "1 tsp sweet paprika",
      "½ tsp chilli flakes",
      "juice of 1 lemon",
      "2 spring onions, thinly sliced",
      "1 tbsp toasted sesame seeds",
    ],
    steps: [
      {
        he: "חתכו כל כנף במפרקים לשני חלקים — אמה וכנף שטוחה. את הקצוות שמרו בהקפאה לציר.",
        en: "Cut each wing at the joints into a drumette and a flat. Freeze the tips for stock.",
      },
      {
        he: "ערבבו את כל חומרי המרינדה חוץ מהבצל הירוק והשומשום, והפרידו שליש לקערה נפרדת. זה הזיגוג, והוא לא נוגע בעוף הנא.",
        en: "Whisk together everything except the spring onions and sesame, and set a third aside in a separate bowl. That's the glaze, and it never touches raw chicken.",
      },
      {
        he: "ערבבו את הכנפיים עם שאר הרוטב והשרו במקרר שעה לפחות, ועד לילה שלם.",
        en: "Toss the wings with the rest of the sauce and marinate in the fridge for at least an hour, or overnight.",
        minutes: 60,
      },
      {
        he: "הכינו גריל בשני אזורים. סדרו את הכנפיים בצד העקיף, סגרו מכסה וצלו 25 דקות, והפכו פעם אחת.",
        en: "Set up a two-zone grill. Arrange the wings on the indirect side, close the lid and cook for 25 minutes, turning once.",
        minutes: 25,
      },
      {
        he: "העבירו מעל הגחלים, הברישו בזיגוג והפכו כל דקה-שתיים במשך 8–10 דקות, עד שהן שחומות ודביקות. הסוכר נשרף מהר, אז אל תתרחקו.",
        en: "Move them over the coals, brush with the glaze and turn every minute or two for 8–10 minutes, until dark and sticky. The sugar burns quickly, so stay close.",
        minutes: 9,
      },
      {
        he: "ודאו שהמדחום בחלק העבה מראה 74 מעלות לפחות, פזרו בצל ירוק ושומשום והגישו מיד.",
        en: "Make sure the thickest part reads at least 74°C, scatter with spring onions and sesame and serve straight away.",
      },
    ],
    donenessC: [{ he: "החלק העבה של הכנף", en: "Thickest part of the wing", tempC: 74 }],
    tipHe:
      "74 מעלות הן המינימום הבטוח, אבל כנפיים הכי טובות ב-80–85 מעלות: הקולגן נמס והבשר נפרד מהעצם. אל תחששו להשאיר אותן עוד כמה דקות בצד העקיף.",
    tipEn:
      "74°C is the safe minimum, but wings are at their best around 80–85°C, when the collagen melts and the meat pulls from the bone. Don't be afraid to leave them a few extra minutes on the indirect side.",
  },

  // ── Holiday ─────────────────────────────────────────
  {
    slug: "passover-brisket-wine-prunes",
    occasion: "HOLIDAY",
    titleHe: "בריסקט לפסח ביין ושזיפים",
    titleEn: "Passover brisket with wine and prunes",
    introHe:
      "בריסקט הוא מנת הדגל של ליל הסדר: חמש שעות בתנור מכוסה הופכות נתח עקשן לפרוסות רכות ברוטב כהה ומתקתק. המתכון כשר לפסח, בלי חמץ ובלי קטניות, ומתאים גם לשולחן אשכנזי.",
    introEn:
      "Brisket is the Seder showpiece: five hours covered in the oven turn a stubborn cut into tender slices in a dark, gently sweet sauce. The recipe is kosher for Passover with no chametz and no kitniyot, so it suits an Ashkenazi table too.",
    heroProduct: "brisket",
    prepMinutes: 30,
    cookMinutes: 390,
    servings: 8,
    difficulty: "MEDIUM",
    meat: [{ product: "brisket", gramsPerServing: 300 }],
    ingredientsHe: [
      "3 בצלים גדולים, פרוסים",
      "4 גזרים, בחתיכות גדולות",
      "8 שיני שום, קלופות",
      "3 כפות שמן זית",
      "2 כפיות פפריקה מתוקה",
      "1 כפית פלפל שחור",
      "500 מ״ל יין אדום יבש",
      "3 כפות רסק עגבניות",
      "2 כפות דבש",
      "250 מ״ל מים",
      "1 כפית מלח",
      "3 עלי דפנה",
      "200 גר׳ שזיפים מיובשים ללא חרצנים",
    ],
    ingredientsEn: [
      "3 large onions, sliced",
      "4 carrots, in large chunks",
      "8 garlic cloves, peeled",
      "3 tbsp olive oil",
      "2 tsp sweet paprika",
      "1 tsp black pepper",
      "500 ml dry red wine",
      "3 tbsp tomato paste",
      "2 tbsp honey",
      "250 ml water",
      "1 tsp salt",
      "3 bay leaves",
      "200 g pitted prunes",
    ],
    steps: [
      {
        he: "חממו תנור ל-150 מעלות. ייבשו את הבריסקט ושפשפו אותו בפפריקה ובפלפל.",
        en: "Heat the oven to 150°C. Pat the brisket dry and rub it with the paprika and pepper.",
      },
      {
        he: "במחבת רחבה וכבדה צרבו את הבריסקט בשמן, קודם בצד השומן, עד שהוא שחום משני הצדדים. הוציאו.",
        en: "In a wide, heavy pan, sear the brisket in the oil, fat side first, until browned on both sides. Lift out.",
        minutes: 12,
      },
      {
        he: "באותו שומן בשלו את הבצלים על אש בינונית-נמוכה 20 דקות, עד שהם רכים וזהובים-כהים.",
        en: "In the same fat, cook the onions over medium-low heat for 20 minutes, until soft and deep golden.",
        minutes: 20,
      },
      {
        he: "פזרו את הבצל, הגזר והשום בתחתית תבנית עמוקה והניחו עליהם את הבריסקט, צד השומן למעלה. ערבבו את היין, הרסק, הדבש, המים והמלח ויצקו מסביב. הוסיפו את עלי הדפנה.",
        en: "Spread the onions, carrots and garlic in a deep roasting tin and set the brisket on top, fat side up. Whisk the wine, tomato paste, honey, water and salt and pour it around the meat. Tuck in the bay leaves.",
      },
      {
        he: "כסו בשתי שכבות נייר כסף, אטום היטב, ובשלו בתנור 4 שעות.",
        en: "Cover tightly with two layers of foil and braise in the oven for 4 hours.",
        minutes: 240,
      },
      {
        he: "הוסיפו את השזיפים לנוזל, כסו שוב והמשיכו עוד שעה עד שעה וחצי, עד שמזלג נכנס לבשר בלי מאמץ.",
        en: "Add the prunes to the liquid, cover again and cook for another 1–1½ hours, until a fork slides in easily.",
        minutes: 75,
      },
      {
        he: "קררו את הבריסקט בתוך הרוטב והכניסו למקרר ללילה. למחרת הסירו את השומן שהתקשה למעלה.",
        en: "Let the brisket cool in its sauce, then refrigerate overnight. Next day, lift off the fat that has set on top.",
      },
      {
        he: "פרסו את הבשר הקר נגד הסיבים לפרוסות של 1 ס״מ, החזירו לרוטב, כסו וחממו בתנור 160 מעלות 40 דקות.",
        en: "Slice the cold meat against the grain about 1 cm thick, return the slices to the sauce, cover and reheat at 160°C for 40 minutes.",
        minutes: 40,
      },
    ],
    donenessC: [{ he: "רך למזלג", en: "Fork-tender", tempC: 95 }],
    tipHe:
      "ודאו שהיין, רסק העגבניות, הדבש והפפריקה נושאים הכשר לפסח. בכוונה לא השתמשנו בקמח ולא בחרדל, שנחשב קטניות אצל אשכנזים — הרוטב מסמיך מהצמצום. רוצים אותו סמיך יותר? כף קמח תפוחי אדמה עושה את העבודה.",
    tipEn:
      "Check that the wine, tomato paste, honey and paprika carry Passover certification. We left out flour, and mustard too, since Ashkenazim count it as kitniyot — the sauce thickens by reduction. Want it thicker? A spoonful of potato starch does the job.",
  },
  {
    slug: "rosh-hashana-lamb-shoulder-pomegranate",
    occasion: "HOLIDAY",
    titleHe: "כתף טלה ברימונים לראש השנה",
    titleEn: "Lamb shoulder with pomegranate for Rosh Hashana",
    introHe:
      "רימון על שולחן ראש השנה הוא ברכה, וכתף טלה בצלייה איטית היא הדרך הנכונה להגיש אותו. שש שעות בחום נמוך מפרקות את הבשר, וזיגוג של רכז רימונים בסוף נותן לו קרום חמוץ-מתוק.",
    introEn:
      "A pomegranate on the Rosh Hashana table is a blessing, and a slow-roasted lamb shoulder is the right way to carry it. Six hours at low heat make the meat pull apart, and a pomegranate-molasses glaze at the end gives it a sweet-sour crust.",
    heroProduct: "lamb-shoulder",
    prepMinutes: 25,
    cookMinutes: 380,
    restMinutes: 20,
    servings: 6,
    difficulty: "MEDIUM",
    meat: [{ product: "lamb-shoulder", gramsPerServing: 350, noteHe: "עם עצם", noteEn: "bone-in" }],
    ingredientsHe: [
      "1 ראש שום, שיניים קלופות",
      "4 ענפי רוזמרין",
      "6 כפות רכז רימונים",
      "3 כפות שמן זית",
      "1 כף דבש",
      "2 כפיות כמון טחון",
      "1 כפית פלפל שחור",
      "1 כפית מלח",
      "2 בצלים גדולים, פרוסים עבה",
      "250 מ״ל מים",
      "גרעינים מרימון אחד",
      "½ צרור נענע, עלים",
    ],
    ingredientsEn: [
      "1 head garlic, cloves peeled",
      "4 rosemary sprigs",
      "6 tbsp pomegranate molasses",
      "3 tbsp olive oil",
      "1 tbsp honey",
      "2 tsp ground cumin",
      "1 tsp black pepper",
      "1 tsp salt",
      "2 large onions, thickly sliced",
      "250 ml water",
      "seeds of 1 pomegranate",
      "½ bunch mint, leaves picked",
    ],
    steps: [
      {
        he: "בסכין קטנה עשו חריצים של 2 ס״מ על פני הכתף, והכניסו לכל חריץ פרוסת שום ומעט עלי רוזמרין.",
        en: "With a small knife, make 2 cm slits all over the shoulder and push a sliver of garlic and a few rosemary needles into each one.",
      },
      {
        he: "ערבבו 4 כפות רכז רימונים עם השמן, הדבש, הכמון, הפלפל והמלח, ומרחו על כל הבשר. השאירו שעה בטמפרטורת החדר, או לילה במקרר.",
        en: "Mix 4 tbsp pomegranate molasses with the oil, honey, cumin, pepper and salt and rub it all over the meat. Leave for an hour at room temperature, or overnight in the fridge.",
        minutes: 60,
      },
      {
        he: "חממו תנור ל-140 מעלות. פזרו את הבצל בתבנית, הניחו עליו את הכתף ויצקו את המים לתחתית.",
        en: "Heat the oven to 140°C. Spread the onions in a roasting tin, sit the shoulder on top and pour the water into the tin.",
      },
      {
        he: "כסו היטב בנייר כסף וצלו 6 שעות, עד שהבשר נפרד מהעצם בנגיעת מזלג.",
        en: "Cover tightly with foil and roast for 6 hours, until the meat comes away from the bone at the touch of a fork.",
        minutes: 360,
      },
      {
        he: "הסירו את נייר הכסף, העלו את החום ל-200 מעלות והברישו את הכתף ביתרת רכז הרימונים ובמעט מהנוזלים. צלו 20 דקות, עד שהקרום כהה ומבריק.",
        en: "Remove the foil, raise the oven to 200°C and brush the shoulder with the remaining molasses and a little of the juices. Roast for 20 minutes, until dark and glossy.",
        minutes: 20,
      },
      {
        he: "הוציאו ותנו לנוח 20 דקות. בינתיים אספו את השומן מפני הנוזלים שבתבנית.",
        en: "Rest for 20 minutes. Meanwhile, skim the fat from the juices in the tin.",
        minutes: 20,
      },
      {
        he: "פרקו את הבשר בשני מזלגות, יצקו מעליו את הנוזלים והבצלים, ופזרו גרעיני רימון ונענע.",
        en: "Pull the meat apart with two forks, spoon over the juices and onions, and scatter with pomegranate seeds and mint.",
      },
    ],
    tipHe:
      "כתף עם עצם שומרת על לחות טובה יותר מכתף מפורקת, והעצם יוצאת נקייה בסוף הצלייה. לשולחן גדול הזמינו 2.5 ק״ג — הזמן בתנור כמעט לא משתנה.",
    tipEn:
      "A bone-in shoulder stays moister than a boned one, and the bone slides out clean at the end. For a big table, order 2.5 kg — the oven time barely changes.",
  },
  {
    slug: "osso-buco-root-vegetables",
    occasion: "HOLIDAY",
    titleHe: "אוסובוקו עם ירקות שורש",
    titleEn: "Osso buco with root vegetables",
    introHe:
      "פרוסות השוק עם מח העצם הן נתח של חג: מעט עבודה, הרבה זמן בתנור, ורוטב שמקבל את כל הג׳לטין מהעצם. ירקות השורש נכנסים באמצע הדרך, כך שהם מתרככים בלי להתפרק.",
    introEn:
      "Shank slices with their marrow bones are a holiday cut: little work, plenty of oven time and a sauce that draws all the gelatin from the bone. The root vegetables go in halfway, so they turn tender without falling apart.",
    heroProduct: "osso-buco",
    prepMinutes: 25,
    cookMinutes: 220,
    servings: 6,
    difficulty: "MEDIUM",
    meat: [{ product: "osso-buco", gramsPerServing: 350, noteHe: "פרוסות בעובי 4 ס״מ", noteEn: "4 cm slices" }],
    ingredientsHe: [
      "3 כפות שמן זית",
      "2 בצלים, קצוצים",
      "6 שיני שום, פרוסות",
      "2 כפות רסק עגבניות",
      "250 מ״ל יין לבן יבש",
      "1 ליטר מים או ציר עוף",
      "2 עלי דפנה",
      "4 ענפי טימין",
      "4 גזרים, בחתיכות גדולות",
      "2 שורשי פטרוזיליה, בחתיכות גדולות",
      "1 סלרי ראש קטן, בקוביות גדולות",
      "1 כפית פלפל שחור",
      "½ צרור פטרוזיליה, קצוצה דק",
      "גרידה מלימון אחד",
    ],
    ingredientsEn: [
      "3 tbsp olive oil",
      "2 onions, chopped",
      "6 garlic cloves, sliced",
      "2 tbsp tomato paste",
      "250 ml dry white wine",
      "1 litre water or chicken stock",
      "2 bay leaves",
      "4 thyme sprigs",
      "4 carrots, in large chunks",
      "2 parsley roots, in large chunks",
      "1 small celeriac, in large cubes",
      "1 tsp black pepper",
      "½ bunch parsley, finely chopped",
      "zest of 1 lemon",
    ],
    steps: [
      {
        he: "חממו תנור ל-160 מעלות. קשרו כל פרוסה בחוט מטבח סביב ההיקף, כדי שתשמור על צורתה, ופזרו פלפל.",
        en: "Heat the oven to 160°C. Tie each slice around its edge with kitchen string so it keeps its shape, and season with the pepper.",
      },
      {
        he: "בסיר רחב שנכנס לתנור צרבו את הפרוסות בשמן, 4–5 דקות לכל צד, בכמה סבבים. הוציאו.",
        en: "In a wide ovenproof pot, brown the slices in the oil for 4–5 minutes a side, in batches. Lift out.",
        minutes: 15,
      },
      {
        he: "בשלו את הבצל עד שהוא רך, הוסיפו את השום ואת רסק העגבניות לדקה, ויצקו את היין. גרדו את התחתית ובשלו 3 דקות.",
        en: "Cook the onion until soft, add the garlic and tomato paste for a minute, then pour in the wine. Scrape the bottom and let it bubble for 3 minutes.",
        minutes: 10,
      },
      {
        he: "החזירו את הבשר, הוסיפו מים או ציר עד כשלושה רבעים מגובה הפרוסות, ואת הדפנה והטימין. כסו ובשלו בתנור שעתיים.",
        en: "Return the meat and add water or stock to about three-quarters of the way up the slices, plus the bay and thyme. Cover and braise in the oven for 2 hours.",
        minutes: 120,
      },
      {
        he: "סדרו את ירקות השורש סביב הבשר, בתוך הנוזל. המשיכו לבשל שעה נוספת, ובחצי השעה האחרונה בלי מכסה.",
        en: "Arrange the root vegetables around the meat, down in the liquid. Cook for another hour, uncovered for the last 30 minutes.",
        minutes: 60,
      },
      {
        he: "הבשר מוכן כשהוא נפרד מהעצם בקלות. בינתיים ערבבו את הפטרוזיליה הקצוצה עם גרידת הלימון.",
        en: "The meat is ready when it pulls easily from the bone. Meanwhile, mix the chopped parsley with the lemon zest.",
      },
      {
        he: "הסירו את החוטים, הגישו כל פרוסה עם ירקות ורוטב, ופזרו מעל את תערובת הפטרוזיליה. את המח אוכלים בכפית.",
        en: "Snip off the strings, serve each slice with vegetables and sauce, and scatter with the parsley mix. The marrow is eaten with a teaspoon.",
      },
    ],
    tipHe:
      "בקשו מאיתנו פרוסות מאמצע השוק — שם עצם המח רחבה והבשר אחיד. אם אתם מכינים יום מראש, הסירו את השומן מהרוטב הקר לפני החימום.",
    tipEn:
      "Ask us for slices from the middle of the shank, where the marrow bone is widest and the meat is most even. Making it a day ahead? Lift the fat off the cold sauce before reheating.",
  },
  {
    slug: "beef-cheeks-red-wine",
    occasion: "HOLIDAY",
    titleHe: "לחיי בקר ביין אדום",
    titleEn: "Beef cheeks braised in red wine",
    introHe:
      "לחי בקר היא שריר שעובד כל היום, ולכן יש בה יותר ג׳לטין מבכל נתח אחר. ארבע שעות ביין אדום מרככות אותה עד שאפשר לחתוך בכף, והרוטב מצטמצם לזיגוג כהה ומבריק.",
    introEn:
      "The cheek is a muscle that works all day, which makes it richer in gelatin than any other cut. Four hours in red wine leave it soft enough to cut with a spoon, and the sauce reduces to a dark, glossy glaze.",
    heroProduct: "beef-cheeks",
    prepMinutes: 30,
    cookMinutes: 290,
    servings: 6,
    difficulty: "ADVANCED",
    meat: [{ product: "beef-cheeks", gramsPerServing: 300 }],
    ingredientsHe: [
      "750 מ״ל יין אדום יבש",
      "3 כפות שמן זית",
      "2 בצלים, קצוצים",
      "2 גזרים, קצוצים",
      "2 גבעולי סלרי, קצוצים",
      "6 שיני שום, מעוכות",
      "2 כפות רסק עגבניות",
      "500 מ״ל ציר עוף",
      "2 עלי דפנה",
      "4 ענפי טימין",
      "1 כף סילאן",
      "1 ק״ג תפוחי אדמה לפירה",
      "100 מ״ל שמן זית לפירה",
      "1 כפית מלח",
    ],
    ingredientsEn: [
      "750 ml dry red wine",
      "3 tbsp olive oil",
      "2 onions, chopped",
      "2 carrots, chopped",
      "2 celery stalks, chopped",
      "6 garlic cloves, crushed",
      "2 tbsp tomato paste",
      "500 ml chicken stock",
      "2 bay leaves",
      "4 thyme sprigs",
      "1 tbsp silan (date syrup)",
      "1 kg floury potatoes, for the mash",
      "100 ml olive oil, for the mash",
      "1 tsp salt",
    ],
    steps: [
      {
        he: "חממו תנור ל-150 מעלות. ייבשו את הלחיים, ואם נשאר עליהן קרום כסוף, הסירו אותו בסכין חדה.",
        en: "Heat the oven to 150°C. Pat the cheeks dry and trim off any silverskin that remains with a sharp knife.",
      },
      {
        he: "בסיר ברזל יצוק צרבו את הלחיים בשמן, 4 דקות לכל צד, עד קרום כהה. הוציאו.",
        en: "In a cast-iron pot, sear the cheeks in the oil for 4 minutes a side, to a dark crust. Lift out.",
        minutes: 8,
      },
      {
        he: "בשלו את הבצל, הגזר והסלרי עד שהם מתרככים. הוסיפו את השום ואת רסק העגבניות ובשלו עוד 2 דקות.",
        en: "Cook the onion, carrot and celery until softened. Add the garlic and tomato paste and cook for 2 minutes more.",
        minutes: 12,
      },
      {
        he: "יצקו את היין, גרדו את התחתית והרתיחו עד שהנוזל מצטמצם בשליש.",
        en: "Pour in the wine, scrape the bottom and boil until reduced by a third.",
        minutes: 15,
      },
      {
        he: "החזירו את הלחיים והוסיפו את הציר, הדפנה, הטימין והסילאן. כסו ובשלו בתנור 4 שעות, עד שכף חותכת את הבשר בלי התנגדות.",
        en: "Return the cheeks and add the stock, bay, thyme and silan. Cover and braise in the oven for 4 hours, until a spoon cuts through with no resistance.",
        minutes: 240,
      },
      {
        he: "בשעה האחרונה בשלו את תפוחי האדמה במים עם המלח עד שהם רכים. סננו ומעכו עם שמן הזית ומעט ממי הבישול.",
        en: "During the last hour, boil the potatoes in water with the salt until tender. Drain and mash with the olive oil and a splash of the cooking water.",
        minutes: 25,
      },
      {
        he: "הוציאו בזהירות את הלחיים. סננו את הרוטב וצמצמו אותו על אש גבוהה עד שהוא סמיך ומבריק.",
        en: "Carefully lift out the cheeks. Strain the sauce and boil it down until thick and glossy.",
        minutes: 15,
      },
      {
        he: "החזירו את הלחיים לרוטב לדקה כדי לזגג אותן, והגישו על הפירה.",
        en: "Return the cheeks to the sauce for a minute to glaze them, and serve on the mash.",
      },
    ],
    tipHe:
      "לחיים מאבדות בבישול כשליש ממשקלן, ולכן חשבו 300 גר׳ נא לכל סועד. למחרת הן טובות עוד יותר, אז אפשר בהחלט לבשל אותן יום לפני החג.",
    tipEn:
      "Cheeks lose about a third of their weight as they cook, so allow 300 g raw per person. They're even better the next day, so there's every reason to cook them the day before the holiday.",
  },

  // ── Weeknight ───────────────────────────────────────
  {
    slug: "crisp-thin-chicken-schnitzel",
    occasion: "WEEKNIGHT",
    titleHe: "שניצל עוף דק ופריך",
    titleEn: "Crisp thin chicken schnitzel",
    introHe:
      "שניצל טוב מוכן בארבע דקות במחבת, ולכן כל העבודה היא בהכנה. פרוסות דקות ואחידות, ציפוי שמקבל רגע להתייבש ושמן בחום הנכון — ויוצא פריך מבחוץ ורך מבפנים.",
    introEn:
      "A good schnitzel is done in four minutes in the pan, so all the work is in the setup. Thin, even slices, a coating given a moment to set and oil at the right heat — crisp outside, tender inside.",
    heroProduct: "chicken-schnitzel",
    prepMinutes: 25,
    cookMinutes: 15,
    servings: 4,
    difficulty: "EASY",
    meat: [{ product: "chicken-schnitzel", gramsPerServing: 180 }],
    ingredientsHe: [
      "100 גר׳ קמח",
      "3 ביצים",
      "1 כף מים",
      "200 גר׳ פירורי לחם או פנקו",
      "3 כפות שומשום",
      "1 כפית פפריקה מתוקה",
      "½ כפית מלח",
      "½ כפית פלפל שחור",
      "500 מ״ל שמן קנולה לטיגון",
      "1 לימון, בפלחים",
    ],
    ingredientsEn: [
      "100 g plain flour",
      "3 eggs",
      "1 tbsp water",
      "200 g breadcrumbs or panko",
      "3 tbsp sesame seeds",
      "1 tsp sweet paprika",
      "½ tsp salt",
      "½ tsp black pepper",
      "500 ml canola oil, for frying",
      "1 lemon, in wedges",
    ],
    steps: [
      {
        he: "ייבשו את פרוסות העוף בנייר סופג ופזרו עליהן מלח ופלפל.",
        en: "Pat the chicken slices dry and season with the salt and pepper.",
      },
      {
        he: "הכינו שלוש צלחות: קמח; ביצים טרופות עם המים; ופירורי לחם מעורבבים עם השומשום והפפריקה.",
        en: "Set out three plates: flour; eggs beaten with the water; and breadcrumbs mixed with the sesame and paprika.",
      },
      {
        he: "העבירו כל פרוסה בקמח ונערו את העודף, אחר כך בביצה, ולבסוף בפירורים. לחצו קלות כדי שהציפוי ייצמד.",
        en: "Dip each slice in flour and shake off the excess, then in egg, then in crumbs. Press lightly so the coating sticks.",
      },
      {
        he: "הניחו את השניצלים על רשת ל-10 דקות. הציפוי מתייבש מעט ולא ינשור במחבת.",
        en: "Lay the schnitzels on a rack for 10 minutes. The coating dries a little and won't fall off in the pan.",
        minutes: 10,
      },
      {
        he: "חממו שמן בגובה 1 ס״מ במחבת רחבה ל-175 מעלות. אין מדחום? פירור שנזרק לשמן צריך לבעבע מיד.",
        en: "Heat 1 cm of oil in a wide pan to 175°C. No thermometer? A crumb dropped in should sizzle straight away.",
        minutes: 5,
      },
      {
        he: "טגנו 2 דקות לכל צד עד שהם זהובים, כמה בכל פעם ובלי להעמיס — מחבת צפופה מקררת את השמן.",
        en: "Fry for 2 minutes a side until golden, a few at a time — a crowded pan drops the oil temperature.",
        minutes: 4,
      },
      {
        he: "העבירו לרשת ולא לנייר סופג, כך שגם התחתית נשארת פריכה. הגישו עם פלחי לימון.",
        en: "Drain on a rack rather than on paper, so the underside stays crisp too. Serve with lemon wedges.",
      },
    ],
    tipHe:
      "הפרוסות שלנו נחתכות בעובי חצי סנטימטר, כך שאין צורך לדפוק אותן. מטגנים לכמות גדולה? שמרו את המוכנים על רשת בתנור של 100 מעלות.",
    tipEn:
      "Our slices are cut half a centimetre thick, so there's no need to pound them. Frying for a crowd? Keep finished schnitzels on a rack in a 100°C oven.",
  },
  {
    slug: "pan-turkey-shawarma",
    occasion: "WEEKNIGHT",
    titleHe: "שווארמה הודו במחבת",
    titleEn: "Pan-fried turkey shawarma",
    introHe:
      "שווארמה ביתית לא צריכה שיפוד מסתובב — רק מחבת רחבה ולוהטת ומספיק איפוק כדי לא להעמיס אותה. שומן הטלה שבתערובת שלנו נותן את העסיסיות ואת הריח של הדוכן.",
    introEn:
      "Home shawarma doesn't need a rotating spit — just a wide, very hot pan and the discipline not to crowd it. The lamb fat in our mix brings the juiciness and the smell of the street stand.",
    heroProduct: "turkey-shawarma",
    prepMinutes: 15,
    cookMinutes: 20,
    servings: 4,
    difficulty: "EASY",
    meat: [{ product: "turkey-shawarma", gramsPerServing: 200 }],
    ingredientsHe: [
      "2 בצלים גדולים, פרוסים לרצועות",
      "3 כפות שמן זית",
      "2 כפות תבלין שווארמה",
      "1 כפית כמון",
      "½ כפית כורכום",
      "½ כפית מלח",
      "1 לימון",
      "120 גר׳ טחינה גולמית",
      "1 שן שום, כתושה",
      "2 עגבניות ו-2 מלפפונים, קצוצים דק",
      "4 פיתות",
    ],
    ingredientsEn: [
      "2 large onions, sliced into strips",
      "3 tbsp olive oil",
      "2 tbsp shawarma spice",
      "1 tsp ground cumin",
      "½ tsp ground turmeric",
      "½ tsp salt",
      "1 lemon",
      "120 g raw tahini paste",
      "1 garlic clove, crushed",
      "2 tomatoes and 2 cucumbers, finely diced",
      "4 pittas",
    ],
    steps: [
      {
        he: "ערבבו את הבשר עם כף שמן, תבלין השווארמה, הכמון, הכורכום והמלח, והשאירו 10 דקות.",
        en: "Toss the meat with 1 tbsp oil, the shawarma spice, cumin, turmeric and salt, and leave it for 10 minutes.",
        minutes: 10,
      },
      {
        he: "הכינו טחינה: ערבבו את הטחינה הגולמית עם השום ומיץ מחצי לימון, והוסיפו מים בהדרגה עד מרקם חלק.",
        en: "Make the tahini: stir the paste with the garlic and the juice of half the lemon, adding water gradually until smooth.",
      },
      {
        he: "חממו מחבת ברזל רחבה על אש גבוהה עם כף שמן. טגנו את הבצל 6–8 דקות, עד שהקצוות מושחמים, והוציאו.",
        en: "Heat a wide cast-iron pan over high heat with 1 tbsp oil. Fry the onions for 6–8 minutes until the edges char, then lift out.",
        minutes: 7,
      },
      {
        he: "הוסיפו את שארית השמן ואת חצי מהבשר בשכבה אחת. אל תערבבו 2 דקות, ואז הקפיצו עוד 3–4 דקות עד שהקצוות פריכים. חזרו על זה עם החצי השני.",
        en: "Add the remaining oil and half the meat in a single layer. Leave it untouched for 2 minutes, then toss for another 3–4 minutes until the edges crisp. Repeat with the rest.",
        minutes: 6,
      },
      {
        he: "החזירו למחבת את הבצל ואת כל הבשר, סחטו מעל את חצי הלימון הנותר וערבבו דקה.",
        en: "Return the onions and all the meat to the pan, squeeze over the remaining half lemon and toss for a minute.",
        minutes: 1,
      },
      {
        he: "חממו את הפיתות ומלאו אותן בשווארמה, סלט קצוץ וטחינה. הגישו מיד.",
        en: "Warm the pittas and fill them with shawarma, chopped salad and tahini. Serve at once.",
      },
    ],
    tipHe:
      "הסוד הוא לא להעמיס. אם הבשר משחרר נוזלים ומתחיל להתבשל במקום להשחים, המחבת קטנה מדי או לא חמה מספיק — עבדו בסבבים קטנים יותר.",
    tipEn:
      "The secret is not crowding the pan. If the meat starts releasing liquid and stewing instead of browning, the pan is too small or not hot enough — work in smaller batches.",
  },
  {
    slug: "lemon-garlic-chicken-breast",
    occasion: "WEEKNIGHT",
    titleHe: "חזה עוף בלימון ושום",
    titleEn: "Lemon and garlic chicken breast",
    introHe:
      "חזה עוף יבש הוא כמעט תמיד חזה שנשאר על האש דקה יותר מדי. שטחו אותו לעובי אחיד, הוציאו בדיוק ב-74 מעלות, והוא יישאר עסיסי. רוטב לימון מהיר מהמחבת סוגר את הארוחה.",
    introEn:
      "A dry chicken breast is almost always one that stayed on the heat a minute too long. Flatten it to an even thickness, take it off at exactly 74°C and it stays juicy — a quick lemon pan sauce finishes the dish.",
    heroProduct: "chicken-breast",
    prepMinutes: 15,
    cookMinutes: 15,
    restMinutes: 5,
    servings: 4,
    difficulty: "EASY",
    meat: [{ product: "chicken-breast", gramsPerServing: 200 }],
    ingredientsHe: [
      "2 לימונים",
      "4 כפות שמן זית",
      "1 כפית עלי טימין או אורגנו מיובש",
      "½ כפית פתיתי צ׳ילי",
      "½ כפית מלח",
      "½ כפית פלפל שחור",
      "4 שיני שום, פרוסות דק",
      "150 מ״ל ציר עוף או מים",
      "1 כפית דבש",
      "2 כפות פטרוזיליה קצוצה",
    ],
    ingredientsEn: [
      "2 lemons",
      "4 tbsp olive oil",
      "1 tsp thyme leaves or dried oregano",
      "½ tsp chilli flakes",
      "½ tsp salt",
      "½ tsp black pepper",
      "4 garlic cloves, thinly sliced",
      "150 ml chicken stock or water",
      "1 tsp honey",
      "2 tbsp chopped parsley",
    ],
    steps: [
      {
        he: "הניחו כל חזה בין שני ניירות אפייה ושטחו בעדינות בתחתית של מחבת, עד עובי אחיד של כ-2 ס״מ.",
        en: "Place each breast between two sheets of baking paper and gently flatten it with the base of a pan to an even 2 cm.",
      },
      {
        he: "גררו את קליפת הלימונים וערבבו עם כף שמן, הטימין, הצ׳ילי, המלח והפלפל. מרחו על העוף והשאירו 30 דקות. את המיץ שמרו לרוטב — חומצה במרינדה הופכת את החזה לגרגרי.",
        en: "Zest the lemons and mix the zest with 1 tbsp oil, the thyme, chilli, salt and pepper. Rub it over the chicken and leave for 30 minutes. Save the juice for the sauce — acid in the marinade turns breast meat mealy.",
        minutes: 30,
      },
      {
        he: "חממו כף שמן במחבת רחבה על אש בינונית-גבוהה. הניחו את החזה ואל תזיזו 5 דקות, עד שהוא שחום.",
        en: "Heat 1 tbsp oil in a wide pan over medium-high heat. Lay in the chicken and leave it untouched for 5 minutes, until browned.",
        minutes: 5,
      },
      {
        he: "הפכו וצלו עוד 3–4 דקות, עד שהמדחום בחלק העבה מראה 74 מעלות. העבירו לצלחת ל-5 דקות מנוחה.",
        en: "Turn and cook for 3–4 minutes more, until the thickest part reads 74°C. Move to a plate to rest for 5 minutes.",
        minutes: 4,
      },
      {
        he: "הנמיכו את האש, הוסיפו את שארית השמן ואת השום ובשלו חצי דקה. הוסיפו את מיץ הלימון, הציר והדבש, גרדו את התחתית וצמצמו 3 דקות.",
        en: "Lower the heat, add the remaining oil and the garlic and cook for 30 seconds. Add the lemon juice, stock and honey, scrape the pan and reduce for 3 minutes.",
        minutes: 3,
      },
      {
        he: "החזירו את העוף ואת המיצים שהצטברו בצלחת, פרסו, יצקו מעל את הרוטב ופזרו פטרוזיליה.",
        en: "Return the chicken and any resting juices to the pan, slice, spoon over the sauce and scatter with parsley.",
      },
    ],
    donenessC: [{ he: "החלק העבה של החזה", en: "Thickest part of the breast", tempC: 74 }],
    tipHe:
      "עובי אחיד חשוב יותר מכל מתכון. בקשו מאיתנו לפתוח את החזה לפרפר, והוא יגיע אליכם שטוח ומוכן למחבת.",
    tipEn:
      "Even thickness matters more than any recipe. Ask us to butterfly the breasts and they'll arrive flat and ready for the pan.",
  },
  {
    slug: "grilled-burgers",
    occasion: "WEEKNIGHT",
    titleHe: "המבורגר על הגריל",
    titleEn: "Grilled burgers",
    introHe:
      "ההמבורגרים שלנו שוקלים 220 גר׳ ויש בהם 20% שומן, כך שכל מה שנשאר לכם הוא לא לקלקל. גריל לוהט, הפיכה אחת, ובלי ללחוץ עם המרית.",
    introEn:
      "Our burgers weigh 220 g with 20% fat, so your only job is not to ruin them. A blazing grill, one flip, and no pressing with the spatula.",
    heroProduct: "burgers-6",
    prepMinutes: 15,
    cookMinutes: 10,
    restMinutes: 3,
    servings: 6,
    difficulty: "EASY",
    meat: [{ product: "burgers-6", quantity: 1 }],
    ingredientsHe: [
      "6 לחמניות המבורגר פרווה",
      "6 כפות מיונז",
      "2 כפות קטשופ",
      "2 מלפפונים חמוצים, קצוצים דק",
      "1 כפית פפריקה מעושנת",
      "2 עגבניות, פרוסות",
      "1 בצל סגול, בטבעות",
      "6 עלי חסה",
      "1 כפית פלפל שחור גרוס",
      "½ כפית מלח",
    ],
    ingredientsEn: [
      "6 pareve burger buns",
      "6 tbsp mayonnaise",
      "2 tbsp ketchup",
      "2 pickled cucumbers, finely chopped",
      "1 tsp smoked paprika",
      "2 tomatoes, sliced",
      "1 red onion, in rings",
      "6 lettuce leaves",
      "1 tsp cracked black pepper",
      "½ tsp salt",
    ],
    steps: [
      {
        he: "הכינו רוטב: ערבבו את המיונז, הקטשופ, החמוצים והפפריקה המעושנת. שמרו במקרר.",
        en: "Make the sauce: stir together the mayonnaise, ketchup, pickles and smoked paprika. Keep it chilled.",
      },
      {
        he: "חממו את הגריל עד שהוא לוהט. השאירו את ההמבורגרים במקרר עד הרגע האחרון — שומן קר מחזיק את הקציצה.",
        en: "Get the grill blazing hot. Keep the burgers in the fridge until the last moment — cold fat holds the patty together.",
        minutes: 20,
      },
      {
        he: "לחצו באגודל גומה קטנה במרכז כל המבורגר, כדי שלא יתנפח לכדור על האש. פזרו מלח ופלפל משני הצדדים.",
        en: "Press a shallow dimple into the centre of each burger with your thumb so it doesn't puff up into a ball. Season both sides with salt and pepper.",
      },
      {
        he: "צלו 4 דקות בלי לגעת, הפכו פעם אחת וצלו עוד 4 דקות. אל תלחצו עם המרית — ככה בורחים המיצים.",
        en: "Grill for 4 minutes without touching, flip once and grill for another 4. Don't press with the spatula — that's how the juices escape.",
        minutes: 8,
      },
      {
        he: "בדקו במדחום במרכז: 71 מעלות. בדקה האחרונה קלו את הלחמניות על הרשת, הצד החתוך למטה.",
        en: "Check the centre with a thermometer: 71°C. In the last minute, toast the buns cut side down on the grate.",
        minutes: 1,
      },
      {
        he: "תנו להמבורגרים לנוח 3 דקות, ואז הרכיבו: רוטב, חסה, המבורגר, עגבנייה ובצל.",
        en: "Rest the burgers for 3 minutes, then build: sauce, lettuce, burger, tomato and onion.",
        minutes: 3,
      },
    ],
    donenessC: [{ he: "מרכז ההמבורגר", en: "Centre of the burger", tempC: 71 }],
    tipHe:
      "הרבה לחמניות בריוש נאפות עם חמאה או חלב. בדקו שהאריזה מסומנת ״פרווה״ לפני שהלחמניות מגיעות לארוחה בשרית.",
    tipEn:
      "Many brioche buns are made with butter or milk. Check the bag is marked pareve before they meet a meat meal.",
  },
  {
    slug: "ground-beef-ragu",
    occasion: "WEEKNIGHT",
    titleHe: "ראגו בקר טחון",
    titleEn: "Ground beef ragù",
    introHe:
      "ראגו אמיתי נבנה בשכבות: ירקות שמתבשלים לאט, בשר שמקבל השחמה עמוקה, ויין שמצטמצם לפני שהעגבניות נכנסות. שעה וחצי על אש נמוכה, והרוטב נצמד לכל פסטה.",
    introEn:
      "A real ragù is built in layers: vegetables cooked slowly, meat browned properly and wine reduced before the tomatoes go in. An hour and a half on low heat and the sauce clings to any pasta.",
    heroProduct: "ground-beef",
    prepMinutes: 20,
    cookMinutes: 130,
    servings: 6,
    difficulty: "EASY",
    meat: [{ product: "ground-beef", gramsPerServing: 150, noteHe: "טחינה גסה", noteEn: "coarse grind" }],
    ingredientsHe: [
      "3 כפות שמן זית",
      "1 בצל, קצוץ דק מאוד",
      "2 גזרים, קצוצים דק מאוד",
      "2 גבעולי סלרי, קצוצים דק מאוד",
      "4 שיני שום, קצוצות",
      "2 כפות רסק עגבניות",
      "250 מ״ל יין אדום יבש",
      "800 גר׳ עגבניות מרוסקות (קופסה)",
      "250 מ״ל מים",
      "2 עלי דפנה",
      "1 כפית מלח",
      "½ כפית פלפל שחור",
      "500 גר׳ פסטה (פפרדלה או ריגטוני)",
      "½ צרור בזיליקום",
    ],
    ingredientsEn: [
      "3 tbsp olive oil",
      "1 onion, very finely chopped",
      "2 carrots, very finely chopped",
      "2 celery stalks, very finely chopped",
      "4 garlic cloves, chopped",
      "2 tbsp tomato paste",
      "250 ml dry red wine",
      "800 g tinned crushed tomatoes",
      "250 ml water",
      "2 bay leaves",
      "1 tsp salt",
      "½ tsp black pepper",
      "500 g pasta (pappardelle or rigatoni)",
      "½ bunch basil",
    ],
    steps: [
      {
        he: "בסיר רחב וכבד חממו את השמן ובשלו את הבצל, הגזר והסלרי על אש בינונית-נמוכה, עד שהם רכים ומתוקים. הוסיפו את השום לדקה.",
        en: "Heat the oil in a wide, heavy pot and cook the onion, carrot and celery over medium-low heat until soft and sweet. Add the garlic for a minute.",
        minutes: 12,
      },
      {
        he: "העלו את האש, הוסיפו את הבשר ופוררו אותו בכף עץ. תנו לו להשחים וערבבו רק מדי פעם, עד שנוצרת שכבה חומה בתחתית הסיר.",
        en: "Turn up the heat, add the beef and break it up with a wooden spoon. Let it brown, stirring only now and then, until a brown crust forms on the bottom of the pot.",
        minutes: 12,
      },
      {
        he: "הוסיפו את רסק העגבניות ובשלו 2 דקות. יצקו את היין, גרדו את התחתית וצמצמו עד שכמעט לא נשאר נוזל.",
        en: "Stir in the tomato paste for 2 minutes. Pour in the wine, scrape the bottom and reduce until almost no liquid is left.",
        minutes: 6,
      },
      {
        he: "הוסיפו את העגבניות, המים, הדפנה, המלח והפלפל. בשלו בלי מכסה על אש נמוכה מאוד שעה וחצי, וערבבו מדי פעם. אם הרוטב מסמיך מדי, הוסיפו מעט מים.",
        en: "Add the tomatoes, water, bay, salt and pepper. Simmer uncovered on very low heat for 1½ hours, stirring now and then; add a splash of water if it gets too thick.",
        minutes: 90,
      },
      {
        he: "בשלו את הפסטה במים רותחים עם מלח דקה פחות מהכתוב על האריזה. שמרו כוס ממי הבישול.",
        en: "Cook the pasta in boiling salted water for a minute less than the packet says. Save a cup of the cooking water.",
        minutes: 10,
      },
      {
        he: "העבירו את הפסטה לרוטב עם מעט ממי הבישול וערבבו על האש דקה, עד שהרוטב מבריק ונצמד. הגישו עם עלי בזיליקום.",
        en: "Tip the pasta into the sauce with a splash of the cooking water and toss over the heat for a minute, until glossy and clinging. Serve with basil leaves.",
      },
    ],
    tipHe:
      "במקום פרמזן, פזרו מעל פירורי לחם שנקלו בשמן זית עם שום. ראגו נשמר בהקפאה שלושה חודשים, אז כדאי לבשל כמות כפולה.",
    tipEn:
      "Instead of parmesan, scatter over breadcrumbs toasted in olive oil with garlic. Ragù keeps for three months in the freezer, so it's worth making a double batch.",
  },
  {
    slug: "chicken-livers-with-onions",
    occasion: "WEEKNIGHT",
    titleHe: "כבדי עוף עם בצל",
    titleEn: "Chicken livers with onions",
    introHe:
      "כבדים עם בצל מטוגן הם ארוחת ערב מהירה עם הרבה אופי, בתנאי שהבצל מקבל את הזמן שלו. כבד חייב לעבור הכשרה בצלייה על אש גלויה לפני כל בישול, ולכן מתחילים באש ורק אחר כך עוברים למחבת.",
    introEn:
      "Livers with fried onions make a quick supper with plenty of character, as long as the onions get their time. Liver must be kashered by broiling over an open flame before any cooking, so you start at the fire and only then move to the pan.",
    heroProduct: "chicken-liver",
    prepMinutes: 15,
    cookMinutes: 35,
    servings: 4,
    difficulty: "MEDIUM",
    meat: [{ product: "chicken-liver", gramsPerServing: 150 }],
    ingredientsHe: [
      "3 בצלים גדולים, פרוסים דק",
      "4 כפות שמן זית",
      "1 כפית סוכר",
      "60 מ״ל יין אדום יבש",
      "½ כפית פפריקה מתוקה",
      "½ כפית מלח",
      "½ כפית פלפל שחור",
      "2 כפות פטרוזיליה קצוצה",
    ],
    ingredientsEn: [
      "3 large onions, thinly sliced",
      "4 tbsp olive oil",
      "1 tsp sugar",
      "60 ml dry red wine",
      "½ tsp sweet paprika",
      "½ tsp salt",
      "½ tsp black pepper",
      "2 tbsp chopped parsley",
    ],
    steps: [
      {
        he: "הכשרה קודם לכול, ובלי לדלג: כבד אינו מוכשר במליחה, ולכן חובה לצלות אותו על אש גלויה לפני כל בישול. שטפו את הכבדים, פזרו עליהם מעט מלח גס, סדרו אותם על רשת ייעודית מעל להבה או גחלים, וצלו תוך הפיכה עד שהם צלויים לגמרי ואין בהם סימני דם. שטפו במים קרים. רק עכשיו הכבדים מוכנים לבישול.",
        en: "Kasher first, and don't skip it: liver can't be kashered by salting, so it must be broiled over an open flame before any cooking. Rinse the livers, sprinkle them lightly with coarse salt, lay them on a grate kept for this purpose over a flame or hot coals, and broil, turning, until cooked right through with no trace of blood. Rinse under cold water. Only now are the livers ready to cook.",
        minutes: 8,
      },
      {
        he: "חממו 3 כפות שמן במחבת רחבה, הוסיפו את הבצל ובשלו על אש בינונית 20 דקות, תוך ערבוב מדי פעם, עד שהוא רך וחום-זהוב. בחמש הדקות האחרונות פזרו את הסוכר.",
        en: "Heat 3 tbsp oil in a wide pan, add the onions and cook over medium heat for 20 minutes, stirring now and then, until soft and golden brown. Sprinkle in the sugar for the last five minutes.",
        minutes: 20,
      },
      {
        he: "הזיזו את הבצל לצדדים, הוסיפו את שארית השמן והגבירו את האש. הניחו את הכבדים הצלויים, חצויים, והשחימו 2 דקות.",
        en: "Push the onions to the sides, add the remaining oil and turn up the heat. Add the broiled livers, halved, and brown them for 2 minutes.",
        minutes: 2,
      },
      {
        he: "יצקו את היין ובשלו דקה, עד שהוא מצטמצם לזיגוג.",
        en: "Pour in the wine and let it bubble for a minute, until it reduces to a glaze.",
        minutes: 1,
      },
      {
        he: "תבלו בפפריקה, מלח ופלפל, ערבבו עם הבצל ופזרו פטרוזיליה. הגישו עם פירה או חלה טרייה.",
        en: "Season with the paprika, salt and pepper, fold through the onions and scatter with parsley. Serve with mash or fresh challah.",
      },
    ],
    tipHe:
      "אחרי הצלייה הכבדים כבר מבושלים, ולכן במחבת הם צריכים רק השחמה קצרה — כל דקה מיותרת מייבשת אותם. את הרשת שעליה צולים כבד נא שמרו לשימוש הזה בלבד.",
    tipEn:
      "After broiling, the livers are already cooked through, so the pan only needs to brown them — every extra minute dries them out. Keep the grate you broil raw liver on for that job alone.",
  },

  // ── Showpieces ──────────────────────────────────────
  {
    slug: "dry-aged-tomahawk-reverse-sear",
    occasion: "SLOW_COOK",
    titleHe: "טומהוק מיושן בצריבה הפוכה",
    titleEn: "Reverse-seared dry-aged tomahawk",
    introHe:
      "טומהוק בעובי כזה לא מסתדר עם צלייה רגילה: עד שהמרכז מוכן, החוץ כבר נשרף. בצריבה הפוכה מחממים אותו לאט בתנור נמוך עד 50 מעלות וצורבים רק בסוף — ורוד מקצה לקצה, עם קרום עמוק וארומה של יישון.",
    introEn:
      "A tomahawk this thick doesn't take kindly to ordinary grilling: by the time the centre is ready, the outside has burnt. A reverse sear brings it up slowly in a low oven to 50°C and sears it only at the end — pink edge to edge, with a deep crust and the aroma of ageing.",
    heroProduct: "aged-tomahawk-35",
    prepMinutes: 15,
    cookMinutes: 100,
    restMinutes: 10,
    servings: 5,
    difficulty: "ADVANCED",
    meat: [
      { product: "aged-tomahawk-35", gramsPerServing: 600, noteHe: "שני סטייקים של כ-1.5 ק״ג", noteEn: "two steaks of about 1.5 kg each" },
    ],
    ingredientsHe: [
      "2 כפיות פלפל שחור גרוס גס",
      "2 כפות שמן קנולה או שמן ענבים",
      "3 כפות שמן זית",
      "1 ראש שום, חצוי לרוחב",
      "4 ענפי רוזמרין",
      "4 ענפי טימין",
      "1 כף מלח ים בפתיתים",
    ],
    ingredientsEn: [
      "2 tsp coarsely cracked black pepper",
      "2 tbsp canola or grapeseed oil",
      "3 tbsp olive oil",
      "1 head garlic, halved crosswise",
      "4 rosemary sprigs",
      "4 thyme sprigs",
      "1 tbsp flaky sea salt",
    ],
    steps: [
      {
        he: "הוציאו את הסטייקים מהמקרר 45 דקות מראש, ייבשו אותם היטב ופזרו פלפל שחור.",
        en: "Take the steaks out of the fridge 45 minutes ahead, dry them thoroughly and season with the black pepper.",
        minutes: 45,
      },
      {
        he: "חממו תנור ל-115 מעלות. הניחו את הסטייקים על רשת מעל תבנית, ותקעו מדחום בחלק העבה ביותר, בלי לגעת בעצם.",
        en: "Heat the oven to 115°C. Set the steaks on a rack over a tray and insert a probe into the thickest part, clear of the bone.",
      },
      {
        he: "צלו עד שהמרכז מגיע ל-50 מעלות — בדרך כלל 70–90 דקות, תלוי בעובי. המדחום קובע, לא השעון.",
        en: "Roast until the centre reaches 50°C — usually 70–90 minutes, depending on thickness. Go by the thermometer, not the clock.",
        minutes: 80,
      },
      {
        he: "בינתיים חממו מחבת ברזל יצוק או גריל פחמים, עד שהם לוהטים ממש.",
        en: "Meanwhile, get a cast-iron pan or a charcoal grill ferociously hot.",
        minutes: 10,
      },
      {
        he: "הוציאו את הסטייקים מהתנור, מרחו בשמן הקנולה וצרבו דקה וחצי לכל צד. אחר כך העמידו אותם על השוליים כדי להשחים את השומן.",
        en: "Take the steaks out of the oven, brush with the canola oil and sear for 1½ minutes a side. Then stand them on their edges to render the fat.",
        minutes: 4,
      },
      {
        he: "אם אתם צורבים במחבת, בדקה האחרונה הוסיפו את שמן הזית, השום והעשבים, והזליפו בכף את השמן החם על הבשר.",
        en: "If you're searing in a pan, add the olive oil, garlic and herbs for the last minute and spoon the hot oil over the meat.",
        minutes: 1,
      },
      {
        he: "תנו לנוח 10 דקות, חתכו את הבשר מהעצם, פרסו פרוסות עבות ופזרו מלח ים בפתיתים.",
        en: "Rest for 10 minutes, cut the meat away from the bone, slice thickly and finish with flaky salt.",
        minutes: 10,
      },
    ],
    donenessC: [
      { he: "הוצאה מהתנור", en: "Out of the oven", tempC: 50 },
      { he: "מדיום-רייר, אחרי צריבה ומנוחה", en: "Medium-rare, after searing and resting", tempC: 55 },
    ],
    tipHe:
      "הטומהוק שלנו מתיישן 35 יום, והקרום היבש מוסר לפני האריזה. אל תמלחו לפני התנור — הבשר כבר עבר מליחה, ומלח בפתיתים בסוף מבליט את טעם היישון.",
    tipEn:
      "Our tomahawks are aged for 35 days and trimmed of their dry crust before packing. Don't salt before the oven — the meat is already kosher-salted, and flaky salt at the end brings out the aged flavour.",
  },
  {
    slug: "herb-crusted-rack-of-lamb",
    occasion: "GRILL",
    titleHe: "קרה טלה בקרום עשבים",
    titleEn: "Herb-crusted rack of lamb",
    introHe:
      "קרה טלה נראה כמו מנת מסעדה, אבל על הגריל הוא מוכן בתוך חצי שעה. צריבה מעל הגחלים, שכבת חרדל, קרום ירוק של עשבים ופיסטוקים, וכמה דקות תחת מכסה סגור עד 57 מעלות.",
    introEn:
      "A rack of lamb looks like restaurant food, but on the grill it's ready within half an hour. A sear over the coals, a layer of mustard, a green crust of herbs and pistachios, and a few minutes under a closed lid to 57°C.",
    heroProduct: "lamb-rack",
    prepMinutes: 20,
    cookMinutes: 25,
    restMinutes: 10,
    servings: 4,
    difficulty: "MEDIUM",
    meat: [{ product: "lamb-rack", gramsPerServing: 350, noteHe: "שני קרה, עצמות מנוקות", noteEn: "two racks, French-trimmed" }],
    ingredientsHe: [
      "1 צרור פטרוזיליה, עלים",
      "½ צרור נענע, עלים",
      "3 שיני שום",
      "50 גר׳ פיסטוקים קלופים",
      "40 גר׳ פנקו",
      "גרידה מלימון אחד",
      "½ כפית מלח",
      "4 כפות שמן זית",
      "2 כפות חרדל דיז׳ון",
      "1 כפית פלפל שחור גרוס",
    ],
    ingredientsEn: [
      "1 bunch parsley, leaves only",
      "½ bunch mint, leaves only",
      "3 garlic cloves",
      "50 g shelled pistachios",
      "40 g panko",
      "zest of 1 lemon",
      "½ tsp salt",
      "4 tbsp olive oil",
      "2 tbsp Dijon mustard",
      "1 tsp cracked black pepper",
    ],
    steps: [
      {
        he: "הוציאו את הקרה מהמקרר 30 דקות מראש. חרצו את שכבת השומן ברשת עדינה ופזרו פלפל.",
        en: "Take the racks out of the fridge 30 minutes ahead. Lightly score the fat in a crosshatch and season with the pepper.",
        minutes: 30,
      },
      {
        he: "טחנו במעבד מזון, בפולסים, את הפטרוזיליה, הנענע, השום, הפיסטוקים, הפנקו, גרידת הלימון, המלח ו-3 כפות שמן, עד פירורים ירוקים ולחים — לא למחית.",
        en: "Pulse the parsley, mint, garlic, pistachios, panko, lemon zest, salt and 3 tbsp oil in a food processor to damp green crumbs — not a paste.",
      },
      {
        he: "הכינו גריל עם מכסה בשני אזורים. עטפו את קצות העצמות בנייר כסף, כדי שלא יישרפו.",
        en: "Set up a lidded grill with two zones. Wrap the bone tips in foil so they don't burn.",
        minutes: 20,
      },
      {
        he: "מרחו את הקרה בשארית השמן וצרבו מעל הגחלים, 3 דקות על צד השומן ו-2 דקות על הצד התחתון. השומן מטפטף ומלהיב את האש, אז היו מוכנים להזיז.",
        en: "Brush the racks with the remaining oil and sear over the coals, 3 minutes fat side down and 2 minutes on the underside. Dripping fat will cause flare-ups, so be ready to move them.",
        minutes: 5,
      },
      {
        he: "העבירו לצד העקיף, צד השומן למעלה. מרחו את החרדל ולחצו עליו את קרום העשבים.",
        en: "Move to the indirect side, fat side up. Brush with the mustard and press on the herb crust.",
      },
      {
        he: "סגרו את המכסה וצלו בכ-200 מעלות 12–18 דקות, עד שהמדחום במרכז מראה 55 מעלות.",
        en: "Close the lid and roast at about 200°C for 12–18 minutes, until the centre reads 55°C.",
        minutes: 15,
      },
      {
        he: "העבירו לקרש ותנו לנוח 10 דקות, מכוסה ברפיון — הטמפרטורה תעלה ל-57 מעלות. חתכו בין העצמות לצלעות בודדות.",
        en: "Move to a board and rest, loosely tented, for 10 minutes — it will rise to 57°C. Cut between the bones into single chops.",
        minutes: 10,
      },
    ],
    donenessC: [
      { he: "מדיום-רייר", en: "Medium-rare", tempC: 57 },
      { he: "מדיום", en: "Medium", tempC: 62 },
    ],
    tipHe:
      "אין גריל עם מכסה? צרבו במחבת והעבירו לתנור שחומם ל-200 מעלות, לאותו זמן בדיוק. וזכרו שקרה טלה ממשיך להתחמם במנוחה יותר ממה שנדמה — הוציאו תמיד שתי מעלות מוקדם.",
    tipEn:
      "No lidded grill? Sear in a pan and finish in a 200°C oven for exactly the same time. And remember that a lamb rack climbs more while resting than you'd expect — always pull it a couple of degrees early.",
  },
];

export const recipeBySlug = (slug: string) => recipes.find((r) => r.slug === slug);

export const recipesForProduct = (productSlug: string) =>
  recipes.filter((r) => r.meat.some((m) => m.product === productSlug) || r.heroProduct === productSlug);
