import type { ReactElement } from "react";

/**
 * The shop's mark — a pomegranate, for הרימון — drawn as plain elements so the same shape can be turned
 * into the PNG icons a phone needs for its home screen. `pad` leaves the safe margin a round (maskable)
 * Android icon is cropped to.
 */
export function brandMark({ size, pad = 0 }: { size: number; pad?: number }): ReactElement {
  const inner = size - pad * 2;
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        background: "#1b1916",
      }}
    >
      {/* Framed snugly around the fruit — a title element here would be drawn as visible text. */}
      <svg width={inner} height={inner} viewBox="11 13 42 44">
        <path d="M26 14h12l-2 5 4-3 1 5c7 3 11 9 11 17 0 10-9 18-20 18S12 48 12 38c0-8 4-14 11-17l1-5 4 3z" fill="#6e1c1a" />
        <circle cx="27" cy="36" r="2.4" fill="#d9c4a0" />
        <circle cx="35" cy="33" r="2.4" fill="#d9c4a0" />
        <circle cx="34" cy="42" r="2.4" fill="#d9c4a0" />
      </svg>
    </div>
  );
}
