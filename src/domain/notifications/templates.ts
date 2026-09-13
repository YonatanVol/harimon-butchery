/**
 * Every message a customer can receive, in Hebrew and English. The rendered text is stored with
 * each notification, so the message timeline shows exactly what would have arrived on WhatsApp/SMS.
 */

export type TemplateKey =
  | "order.authorized"
  | "order.picking"
  | "order.over_tolerance"
  | "order.extra_approved"
  | "order.trimmed"
  | "order.repriced"
  | "order.captured"
  | "order.capture_issue"
  | "order.packed"
  | "order.out_for_delivery"
  | "order.delivered"
  | "order.not_home"
  | "order.rescheduled"
  | "order.returned"
  | "order.refunded"
  | "order.cancelled"
  | "order.cancelled_by_shop"
  | "order.cancelled_by_shop_refunded"
  | "order.reauth_required"
  | "auth.otp";

export type TemplateVars = Partial<{
  firstName: string;
  orderNumber: string;
  trackingUrl: string;
  holdAmount: string;
  estimateAmount: string;
  finalAmount: string;
  extraAmount: string;
  slotWindow: string;
  productName: string;
  requestedWeight: string;
  actualWeight: string;
  trimmedWeight: string;
  deadline: string;
  refundAmount: string;
  reason: string;
  code: string;
}>;

export interface TemplateAction {
  labelHe: string;
  labelEn: string;
  /** Relative path on the tracking page; the notifier turns it into a full link. */
  path: string;
}

type Body = (v: TemplateVars) => string;

const he: Record<TemplateKey, Body> = {
  "order.authorized": (v) =>
    `שלום ${v.firstName}, ההזמנה ${v.orderNumber} התקבלה ✔\nמשלוח: ${v.slotWindow}\nהוקפא בכרטיס ${v.holdAmount} — זה לא חיוב. נשקול כל נתח ונחייב רק לפי המשקל האמיתי.\nמעקב: ${v.trackingUrl}`,
  "order.picking": (v) => `${v.firstName}, הקצב התחיל להכין את ההזמנה ${v.orderNumber}. נעדכן כשנשקול.\n${v.trackingUrl}`,
  "order.over_tolerance": (v) =>
    `${v.firstName}, ה${v.productName} יצא ${v.actualWeight} במקום ${v.requestedWeight} — תוספת של ${v.extraAmount}.\nלאשר את התוספת או שנחתוך ל-${v.trimmedWeight}? אם לא נשמע מכם עד ${v.deadline} — נחתוך.\n${v.trackingUrl}`,
  "order.extra_approved": (v) => `תודה ${v.firstName}, אישרתם תוספת של ${v.extraAmount} ל${v.productName}. היא תופיע כחיוב נפרד.`,
  "order.trimmed": (v) => `${v.firstName}, חתכנו את ה${v.productName} ל-${v.trimmedWeight} כדי לא לחרוג מהסכום שהוקפא.`,
  "order.repriced": (v) =>
    `${v.firstName}, שקלנו את ההזמנה ${v.orderNumber}.\nמשוער: ${v.estimateAmount} · סופי: ${v.finalAmount} (מתוך ${v.holdAmount} שהוקפא).\nפירוט לפי משקל: ${v.trackingUrl}`,
  "order.captured": (v) =>
    `${v.firstName}, חויבת ב-${v.finalAmount} במקום ${v.holdAmount} שהוקפא. ההפרש ישוחרר לכרטיס בתוך מספר ימי עסקים.\nחשבונית: ${v.trackingUrl}`,
  "order.capture_issue": (v) =>
    `${v.firstName}, יש בעיה בחיוב הכרטיס להזמנה ${v.orderNumber}. ההזמנה שמורה ונציג יחזור אליך היום.\n${v.trackingUrl}`,
  "order.packed": (v) => `ההזמנה ${v.orderNumber} ארוזה ומוכנה ליציאה. משלוח: ${v.slotWindow}.`,
  "order.out_for_delivery": (v) => `${v.firstName}, השליח בדרך עם ההזמנה ${v.orderNumber} (${v.slotWindow}). הבשר בקירור עד הדלת.\n${v.trackingUrl}`,
  "order.delivered": (v) => `ההזמנה ${v.orderNumber} נמסרה. בתיאבון, ${v.firstName}! חשבונית ופירוט: ${v.trackingUrl}`,
  "order.not_home": (v) =>
    `${v.firstName}, הגענו ולא הצלחנו למסור את ההזמנה ${v.orderNumber}. בחרו מועד חדש כדי שנשמור על שרשרת הקירור:\n${v.trackingUrl}`,
  "order.rescheduled": (v) => `מועד המשלוח החדש של ההזמנה ${v.orderNumber}: ${v.slotWindow}.`,
  "order.returned": (v) => `ההזמנה ${v.orderNumber} חזרה לחנות. נציג יחזור אליך לגבי זיכוי.`,
  "order.refunded": (v) => `${v.firstName}, זיכינו ${v.refundAmount} על ההזמנה ${v.orderNumber}. הזיכוי יופיע בכרטיס בתוך מספר ימי עסקים.`,
  "order.cancelled": (v) => `ההזמנה ${v.orderNumber} בוטלה. לא בוצע חיוב, וההקפאה תשוחרר.`,
  "order.cancelled_by_shop": (v) => `${v.firstName}, מצטערים — נאלצנו לבטל את ההזמנה ${v.orderNumber}: ${v.reason}. לא בוצע חיוב.`,
  "order.cancelled_by_shop_refunded": (v) =>
    `${v.firstName}, מצטערים — נאלצנו לבטל את ההזמנה ${v.orderNumber}: ${v.reason}. ההקפאה בכרטיס שוחררה, והתוספת שחויבה (${v.refundAmount}) הוחזרה לכרטיס.`,
  "order.reauth_required": (v) =>
    `${v.firstName}, תוקף ההקפאה בכרטיס להזמנה ${v.orderNumber} פג לפני שהספקנו לשקול. כדי שנמשיך — אשרו תשלום מחדש:\n${v.trackingUrl}`,
  "auth.otp": (v) => `קוד הכניסה שלך לקצביית הרימון: ${v.code}\nהקוד בתוקף ל-5 דקות. לא לשתף עם אף אחד.`,
};

const en: Record<TemplateKey, Body> = {
  "order.authorized": (v) =>
    `Hi ${v.firstName}, order ${v.orderNumber} is confirmed ✔\nDelivery: ${v.slotWindow}\nWe've held ${v.holdAmount} on your card — this is not a charge. We weigh every piece and charge only the real weight.\nTrack: ${v.trackingUrl}`,
  "order.picking": (v) => `${v.firstName}, the butcher has started preparing order ${v.orderNumber}. We'll update you after weighing.\n${v.trackingUrl}`,
  "order.over_tolerance": (v) =>
    `${v.firstName}, your ${v.productName} came to ${v.actualWeight} instead of ${v.requestedWeight} — ${v.extraAmount} extra.\nApprove the extra, or shall we trim to ${v.trimmedWeight}? If we don't hear from you by ${v.deadline}, we'll trim.\n${v.trackingUrl}`,
  "order.extra_approved": (v) => `Thanks ${v.firstName}, you approved ${v.extraAmount} extra for ${v.productName}. It will appear as a separate charge.`,
  "order.trimmed": (v) => `${v.firstName}, we trimmed your ${v.productName} to ${v.trimmedWeight} so it stays within the amount held.`,
  "order.repriced": (v) =>
    `${v.firstName}, we've weighed order ${v.orderNumber}.\nEstimated: ${v.estimateAmount} · Final: ${v.finalAmount} (of ${v.holdAmount} held).\nWeight breakdown: ${v.trackingUrl}`,
  "order.captured": (v) =>
    `${v.firstName}, you were charged ${v.finalAmount} instead of the ${v.holdAmount} held. The difference is released to your card within a few business days.\nInvoice: ${v.trackingUrl}`,
  "order.capture_issue": (v) =>
    `${v.firstName}, there's a problem charging your card for order ${v.orderNumber}. Your order is safe and someone will call you today.\n${v.trackingUrl}`,
  "order.packed": (v) => `Order ${v.orderNumber} is packed and ready to go. Delivery: ${v.slotWindow}.`,
  "order.out_for_delivery": (v) => `${v.firstName}, the driver is on the way with order ${v.orderNumber} (${v.slotWindow}). Chilled all the way to your door.\n${v.trackingUrl}`,
  "order.delivered": (v) => `Order ${v.orderNumber} has been delivered. Enjoy, ${v.firstName}! Invoice and details: ${v.trackingUrl}`,
  "order.not_home": (v) =>
    `${v.firstName}, we came by but couldn't deliver order ${v.orderNumber}. Please pick a new time so we can keep the cold chain:\n${v.trackingUrl}`,
  "order.rescheduled": (v) => `New delivery time for order ${v.orderNumber}: ${v.slotWindow}.`,
  "order.returned": (v) => `Order ${v.orderNumber} has returned to the shop. We'll be in touch about a refund.`,
  "order.refunded": (v) => `${v.firstName}, we've refunded ${v.refundAmount} for order ${v.orderNumber}. It will appear on your card within a few business days.`,
  "order.cancelled": (v) => `Order ${v.orderNumber} has been cancelled. Nothing was charged and the hold will be released.`,
  "order.cancelled_by_shop": (v) => `${v.firstName}, we're sorry — we had to cancel order ${v.orderNumber}: ${v.reason}. Nothing was charged.`,
  "order.cancelled_by_shop_refunded": (v) =>
    `${v.firstName}, we're sorry — we had to cancel order ${v.orderNumber}: ${v.reason}. The card hold was released and the extra you approved (${v.refundAmount}) was refunded.`,
  "order.reauth_required": (v) =>
    `${v.firstName}, the hold on your card for order ${v.orderNumber} expired before we could weigh it. To continue, please approve payment again:\n${v.trackingUrl}`,
  "auth.otp": (v) => `Your Harimon Butchery login code: ${v.code}\nValid for 5 minutes. Don't share it with anyone.`,
};

export const TEMPLATE_KEYS = Object.keys(he) as TemplateKey[];

const actions: Partial<Record<TemplateKey, TemplateAction[]>> = {
  "order.over_tolerance": [
    { labelHe: "אשר תוספת", labelEn: "Approve extra", path: "#approve-extra" },
    { labelHe: "לחתוך", labelEn: "Trim it", path: "#trim" },
  ],
  "order.not_home": [{ labelHe: "בחירת מועד חדש", labelEn: "Pick a new time", path: "#reschedule" }],
  "order.reauth_required": [{ labelHe: "אישור תשלום", labelEn: "Approve payment", path: "#reauth" }],
};

/** The order of variables in each Meta-approved WhatsApp template body ({{1}}, {{2}}, …). */
export const TEMPLATE_PARAM_ORDER: Record<TemplateKey, Array<keyof TemplateVars>> = {
  "order.authorized": ["firstName", "orderNumber", "slotWindow", "holdAmount", "trackingUrl"],
  "order.picking": ["firstName", "orderNumber", "trackingUrl"],
  "order.over_tolerance": ["firstName", "productName", "actualWeight", "requestedWeight", "extraAmount", "trimmedWeight", "deadline", "trackingUrl"],
  "order.extra_approved": ["firstName", "extraAmount", "productName"],
  "order.trimmed": ["firstName", "productName", "trimmedWeight"],
  "order.repriced": ["firstName", "orderNumber", "estimateAmount", "finalAmount", "holdAmount", "trackingUrl"],
  "order.captured": ["firstName", "finalAmount", "holdAmount", "trackingUrl"],
  "order.capture_issue": ["firstName", "orderNumber", "trackingUrl"],
  "order.packed": ["orderNumber", "slotWindow"],
  "order.out_for_delivery": ["firstName", "orderNumber", "slotWindow", "trackingUrl"],
  "order.delivered": ["orderNumber", "firstName", "trackingUrl"],
  "order.not_home": ["firstName", "orderNumber", "trackingUrl"],
  "order.rescheduled": ["orderNumber", "slotWindow"],
  "order.returned": ["orderNumber"],
  "order.refunded": ["firstName", "refundAmount", "orderNumber"],
  "order.cancelled": ["orderNumber"],
  "order.cancelled_by_shop": ["firstName", "orderNumber", "reason"],
  "order.cancelled_by_shop_refunded": ["firstName", "orderNumber", "reason", "refundAmount"],
  "order.reauth_required": ["firstName", "orderNumber", "trackingUrl"],
  "auth.otp": ["code"],
};

export function templateParams(key: TemplateKey, vars: TemplateVars): string[] {
  return TEMPLATE_PARAM_ORDER[key].map((k) => vars[k] ?? "");
}

export function renderTemplate(key: TemplateKey, locale: "he" | "en", vars: TemplateVars) {
  return { body: (locale === "he" ? he : en)[key](vars), actions: actions[key] ?? [] };
}
