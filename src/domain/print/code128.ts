/**
 * Code 128 (set B) for order numbers on pick sheets and labels. Pure: returns bar/space widths in modules;
 * the page draws them as SVG. Set B covers printable ASCII, which is all an order number needs.
 */

// Widths of bar, space, bar, space, bar, space for values 0–105 (ISO/IEC 15417).
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232",
] as const;
const STOP = "2331112";
const START_B = 104;

export const CODE128_PATTERNS = PATTERNS;

export class BarcodeError extends Error {
  override name = "BarcodeError";
}

/** Symbol values for `text`: start B, data, checksum. */
export function code128Values(text: string): number[] {
  if (text.length === 0 || text.length > 40) throw new BarcodeError("Barcode text must be 1–40 characters");
  const data = [...text].map((ch) => {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 126) throw new BarcodeError(`Character not in Code 128 set B: ${JSON.stringify(ch)}`);
    return code - 32;
  });
  const checksum = data.reduce((sum, v, i) => sum + v * (i + 1), START_B) % 103;
  return [START_B, ...data, checksum];
}

/** Module widths, alternating bar and space, starting with a bar; includes the stop pattern. */
export function code128Widths(text: string): number[] {
  return [...code128Values(text).map((v) => PATTERNS[v]).join(""), ...STOP].map(Number);
}
