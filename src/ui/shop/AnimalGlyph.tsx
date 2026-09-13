type Animal = "BEEF" | "VEAL" | "LAMB" | "CHICKEN" | "TURKEY" | "MIXED";

/** Simple line marks per animal, used by the product image placeholder. Decorative only. */
export function AnimalGlyph({ animal, className }: { animal: Animal; className?: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      {(animal === "BEEF" || animal === "VEAL") && (
        <g {...common}>
          <path d="M14 18c-4 0-7 3-8 7 4 1 8 0 10-2" />
          <path d="M50 18c4 0 7 3 8 7-4 1-8 0-10-2" />
          <path d="M16 20c2-4 8-6 16-6s14 2 16 6l-2 18c-1 8-6 14-14 14s-13-6-14-14z" />
          <ellipse cx="32" cy="42" rx="9" ry="6" />
          <circle cx="29" cy="42" r="1" />
          <circle cx="35" cy="42" r="1" />
          <circle cx="24" cy="29" r="1.4" />
          <circle cx="40" cy="29" r="1.4" />
        </g>
      )}
      {animal === "LAMB" && (
        <g {...common}>
          <path d="M20 22c-3-6 3-11 8-8 2-5 10-5 12 0 5-3 11 2 8 8 5 2 5 10 0 12" />
          <path d="M20 22c-5 2-5 10 0 12" />
          <path d="M22 30c0 12 4 20 10 20s10-8 10-20" />
          <circle cx="28" cy="36" r="1.3" />
          <circle cx="36" cy="36" r="1.3" />
          <path d="M30 44h4" />
        </g>
      )}
      {animal === "CHICKEN" && (
        <g {...common}>
          <path d="M26 16c0-4 3-6 6-6 1 2 0 4-1 5 3-1 6 0 6 3" />
          <path d="M24 22c0-4 3-7 8-7 6 0 9 4 9 9l-1 4 8-6c4 6 5 14 1 20-4 5-10 8-17 8-9 0-15-6-15-14 0-6 3-10 7-14z" />
          <path d="M20 24l-6 2 5 3" />
          <circle cx="30" cy="22" r="1.3" />
          <path d="M26 56l-2 4M34 56l2 4" />
        </g>
      )}
      {animal === "TURKEY" && (
        <g {...common}>
          <path d="M38 40c8 0 14-5 14-12S46 14 38 14c-3 0-6 1-8 3" />
          <path d="M12 38c0-8 6-14 14-14h6c7 0 12 5 12 12 0 8-6 14-14 14h-4c-8 0-14-5-14-12z" />
          <path d="M26 24c-1-4 0-8 3-10 3-2 6 0 6 3" />
          <circle cx="31" cy="18" r="1.2" />
          <path d="M35 17l4 1-4 2" />
          <path d="M34 20c1 3 0 5-2 6" />
          <path d="M24 50l-2 8M32 50l2 8" />
        </g>
      )}
      {animal === "MIXED" && (
        <g {...common}>
          <path d="M20 10v18c0 3 2 5 5 5v21" />
          <path d="M15 10v14M25 10v14" />
          <path d="M42 54V10c6 4 8 12 8 20h-8" />
        </g>
      )}
    </svg>
  );
}
