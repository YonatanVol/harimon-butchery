import Image from "next/image";
import { cx } from "../cx";
import { AnimalGlyph } from "./AnimalGlyph";

type Animal = "BEEF" | "VEAL" | "LAMB" | "CHICKEN" | "TURKEY" | "MIXED";

const grounds: Record<Animal, string> = {
  BEEF: "bg-bone-200",
  VEAL: "bg-bone-200",
  LAMB: "bg-bone-200",
  CHICKEN: "bg-bone-200",
  TURKEY: "bg-bone-200",
  MIXED: "bg-bone-200",
};

/**
 * The product photo, or — where no licensed photo exists yet — a quiet marble tile with the animal's line mark
 * and the name in the display face (never a broken-image icon).
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
        "text-char-700 relative flex flex-col items-center justify-center gap-3 overflow-hidden",
        grounds[animal],
        className,
      )}
    >
      <div
        aria-hidden
        className="border-bone-300 absolute inset-3 border"
      />
      <AnimalGlyph animal={animal} className="text-brass-700 relative size-[24%] max-h-20 min-h-10 opacity-70" />
      <span className="font-display relative max-w-[80%] text-center text-lg leading-snug">
        {label}
      </span>
    </div>
  );
}
