import Image from "next/image";
import { cx } from "../cx";
import { AnimalGlyph } from "./AnimalGlyph";

type Animal = "BEEF" | "VEAL" | "LAMB" | "CHICKEN" | "TURKEY" | "MIXED";

const grounds: Record<Animal, string> = {
  BEEF: "from-wine-700 to-char-900",
  VEAL: "from-wine-600 to-char-900",
  LAMB: "from-char-700 to-char-900",
  CHICKEN: "from-[#8a5a2b] to-char-900",
  TURKEY: "from-[#6b4a2e] to-char-900",
  MIXED: "from-char-800 to-wine-700",
};

/**
 * The product photo, or — until photography exists — a deliberate typographic tile
 * (never a broken-image icon).
 */
export function ProductImage({
  src,
  alt,
  animal,
  label,
  sizes,
  priority,
  className,
}: {
  src: string | null;
  alt: string;
  animal: Animal;
  label: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (src) {
    return (
      <div className={cx("bg-bone-200 relative overflow-hidden", className)}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={alt}
      className={cx(
        "relative flex flex-col items-center justify-center gap-3 overflow-hidden bg-gradient-to-br text-bone-100",
        grounds[animal],
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px]"
      />
      <AnimalGlyph animal={animal} className="relative size-[28%] max-h-24 min-h-10 opacity-80" />
      <span className="relative max-w-[80%] text-center text-sm leading-snug font-medium tracking-wide opacity-90">
        {label}
      </span>
    </div>
  );
}
