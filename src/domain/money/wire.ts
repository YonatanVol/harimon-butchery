import { type Agorot, agorot, MoneyError } from "./agorot";

/**
 * Card processors speak decimal shekels ("465.50"). The conversion happens only here, through strings,
 * so no floating-point arithmetic ever touches an amount.
 */
export function toDecimalShekels(value: Agorot): string {
  if (value < 0) throw new MoneyError(`Negative amount on the wire: ${value}`);
  return `${Math.trunc(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}

/** "465.5", 465.5, "465.50" → 46550. More than two decimals is refused, never rounded. */
export function fromDecimalShekels(input: string | number): Agorot {
  const text = typeof input === "number" ? String(input) : input.trim();
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!m) throw new MoneyError(`Not a shekel amount: ${JSON.stringify(input)}`);
  return agorot(Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0")));
}
