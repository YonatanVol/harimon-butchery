/**
 * CLDR's Hebrew dual forms append the number in brackets: "בעוד שעתיים (2)", "לפני שבועיים (2)".
 * Inside a sentence that already has brackets that reads as a glitch, and the dual word already says "two".
 */
export function tidyRelative(text: string): string {
  return text.replace(/\s*\(\d+\)/g, "");
}
