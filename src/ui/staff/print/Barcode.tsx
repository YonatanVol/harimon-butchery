import { code128Widths } from "@/domain/print/code128";

/** A Code 128 barcode as SVG, with the text underneath for when a scanner isn't at hand. */
export function Barcode({ value, height = 56, module = 2, className }: { value: string; height?: number; module?: number; className?: string }) {
  const widths = code128Widths(value);
  const quiet = 10 * module;
  let x = quiet;
  const bars: Array<{ x: number; w: number }> = [];
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w: w * module });
    x += w * module;
  });
  const width = x + quiet;
  return (
    <figure className={className} dir="ltr">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={value} shapeRendering="crispEdges">
        <rect width={width} height={height} fill="#fff" />
        {bars.map((b, i) => (
          <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#000" />
        ))}
      </svg>
      <figcaption className="text-center font-mono text-sm tracking-widest">{value}</figcaption>
    </figure>
  );
}
