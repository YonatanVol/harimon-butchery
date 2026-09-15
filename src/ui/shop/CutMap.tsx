import NextLink from "next/link";
import type { CutAnimal } from "@/domain/catalog/cutRegions";
import { cx } from "../cx";

type Pt = [number, number];
interface Region {
  id: string;
  shapes: Pt[][];
  label: Pt;
}
interface Drawing {
  outline: string;
  details?: string[];
  regions: Region[];
}

const poly = (pts: Pt[]) => `M${pts.map(([x, y]) => `${x} ${y}`).join(" L")}Z`;

/*
 * Line drawings in a 480×260 box, animal facing the start of the page. Regions are simplified butcher's
 * charts — close enough to point at, not an anatomy atlas.
 */
const drawings: Record<CutAnimal, Drawing> = {
  BEEF: {
    outline:
      "M28 118 Q34 96 46 86 L70 70 Q92 70 110 78 L150 66 L250 64 L330 66 L400 72 Q428 74 440 82 Q456 98 452 120 L446 160 L430 190 L428 240 L412 244 L404 240 L400 196 L370 176 L250 182 L170 178 L150 190 L148 240 L132 244 L124 240 L122 196 L110 170 Q98 158 88 150 L66 140 L44 138 Q30 134 28 118Z",
    details: ["M70 70 L62 56 L80 66", "M440 82 Q470 110 462 160"],
    regions: [
      { id: "head", shapes: [[[28, 118], [46, 86], [70, 70], [78, 110], [66, 140], [44, 138], [30, 130]]], label: [50, 113] },
      { id: "neck", shapes: [[[70, 70], [110, 78], [116, 130], [88, 150], [66, 140], [78, 110]]], label: [93, 112] },
      { id: "chuck", shapes: [[[110, 78], [150, 66], [196, 65], [198, 128], [116, 130]]], label: [156, 101] },
      { id: "rib", shapes: [[[196, 65], [262, 64], [262, 124], [198, 128]]], label: [229, 97] },
      { id: "loin", shapes: [[[262, 64], [330, 66], [330, 122], [262, 124]]], label: [296, 95] },
      { id: "rump", shapes: [[[330, 66], [400, 72], [440, 82], [452, 120], [410, 128], [330, 122]]], label: [392, 98] },
      { id: "round", shapes: [[[330, 122], [410, 128], [452, 120], [446, 160], [430, 190], [400, 196], [370, 176]]], label: [408, 156] },
      { id: "brisket", shapes: [[[116, 130], [198, 128], [196, 176], [170, 178], [150, 190], [122, 196], [110, 170], [88, 150]]], label: [150, 158] },
      { id: "plate", shapes: [[[198, 128], [262, 124], [262, 180], [196, 176]]], label: [229, 153] },
      { id: "flank", shapes: [[[262, 124], [330, 122], [370, 176], [262, 180]]], label: [305, 152] },
      {
        id: "shank",
        shapes: [
          [[150, 190], [148, 240], [132, 244], [124, 240], [122, 196]],
          [[400, 196], [404, 240], [412, 244], [428, 240], [430, 190]],
        ],
        label: [137, 222],
      },
    ],
  },
  LAMB: {
    outline:
      "M40 112 Q46 92 58 84 L78 70 Q100 76 120 84 L180 78 L300 76 L380 84 Q406 88 418 96 Q432 110 428 128 L420 170 L400 196 L398 244 L384 246 L378 200 L340 180 L220 184 L170 182 L150 196 L148 244 L134 246 L128 200 L116 176 Q100 158 86 146 L60 138 Q44 132 40 112Z",
    details: ["M78 70 Q70 58 86 62", "M418 96 Q436 100 440 116"],
    regions: [
      { id: "neck", shapes: [[[40, 112], [58, 84], [78, 70], [120, 84], [126, 140], [86, 146], [60, 138], [42, 128]]], label: [82, 112] },
      { id: "shoulder", shapes: [[[120, 84], [180, 78], [186, 136], [126, 140]]], label: [153, 110] },
      { id: "rack", shapes: [[[180, 78], [250, 77], [250, 134], [186, 136]]], label: [216, 106] },
      { id: "loin", shapes: [[[250, 77], [318, 78], [320, 132], [250, 134]]], label: [285, 105] },
      { id: "leg", shapes: [[[318, 78], [380, 84], [418, 96], [428, 128], [420, 170], [400, 196], [378, 200], [340, 180], [320, 132]]], label: [376, 132] },
      { id: "breast", shapes: [[[126, 140], [186, 136], [250, 134], [320, 132], [340, 180], [220, 184], [170, 182], [150, 196], [128, 200], [116, 176], [86, 146]]], label: [230, 160] },
      {
        id: "shank",
        shapes: [
          [[150, 196], [148, 244], [134, 246], [128, 200]],
          [[400, 196], [398, 244], [384, 246], [378, 200]],
        ],
        label: [140, 226],
      },
    ],
  },
  CHICKEN: {
    outline:
      "M52 86 L68 80 Q70 62 90 58 Q108 60 110 78 L118 110 L170 104 L260 98 L330 100 Q360 64 392 70 Q412 84 396 118 L378 140 L340 178 L260 192 L190 184 L140 160 Q120 140 118 128 L106 112 Q96 104 86 104 L66 96Z",
    details: ["M84 60 Q88 48 96 58 Q100 46 106 60", "M86 104 Q84 118 94 120", "M282 190 L290 236 M290 236 L278 250 M290 236 L292 252 M290 236 L304 248"],
    regions: [
      { id: "back", shapes: [[[118, 110], [170, 104], [260, 98], [330, 100], [378, 140], [340, 150], [250, 140], [170, 138], [130, 132]]], label: [338, 122] },
      { id: "breast", shapes: [[[106, 112], [130, 132], [200, 146], [240, 170], [260, 192], [190, 184], [140, 160], [118, 128]]], label: [168, 168] },
      { id: "thigh", shapes: [[[250, 140], [340, 150], [340, 178], [300, 188], [260, 192], [240, 170]]], label: [292, 168] },
      { id: "drumstick", shapes: [[[266, 190], [300, 188], [296, 232], [284, 234]]], label: [318, 222] },
      { id: "wing", shapes: [[[170, 118], [250, 112], [304, 128], [272, 150], [200, 148]]], label: [236, 134] },
    ],
  },
  TURKEY: {
    outline:
      "M52 92 L68 86 Q70 66 88 62 Q104 64 108 80 L120 116 L170 110 L260 104 L330 106 Q340 30 420 28 Q470 50 456 110 Q440 140 396 142 L378 146 L340 184 L260 196 L190 188 L140 164 Q120 146 118 134 L106 118 Q96 110 86 110 L66 102Z",
    details: ["M68 86 Q60 100 66 118 Q72 126 74 110", "M350 62 Q400 40 440 60 M340 84 Q400 64 450 88", "M282 194 L290 238 M290 238 L278 252 M290 238 L292 254 M290 238 L304 250"],
    regions: [
      { id: "back", shapes: [[[120, 116], [170, 110], [260, 104], [330, 106], [378, 146], [340, 156], [250, 146], [170, 144], [130, 138]]], label: [338, 128] },
      { id: "breast", shapes: [[[106, 118], [130, 138], [200, 152], [240, 176], [260, 196], [190, 188], [140, 164], [118, 134]]], label: [168, 172] },
      { id: "thigh", shapes: [[[250, 146], [340, 156], [340, 184], [300, 192], [260, 196], [240, 176]]], label: [292, 172] },
      { id: "drumstick", shapes: [[[266, 194], [300, 192], [296, 234], [284, 236]]], label: [318, 224] },
      { id: "wing", shapes: [[[170, 124], [250, 118], [304, 134], [272, 156], [200, 154]]], label: [236, 140] },
    ],
  },
};

/**
 * A butcher's line drawing of the animal with the cut's regions filled in brass.
 * Static server-rendered SVG; the outline draws itself and the active region breathes (both off with reduced motion).
 */
export function CutMap({
  animal,
  active,
  labels,
  title,
  hrefFor,
  available = [],
  className,
}: {
  animal: CutAnimal;
  /** Regions this cut comes from — filled brass and gently breathing. */
  active: string[];
  /** Regions that have cuts on the counter (the guide) — a light fill, no motion. */
  available?: string[];
  /** Region names by id. Shown on every region when `showAll`, otherwise only on active regions. */
  labels: Record<string, string>;
  title: string;
  /** When given, regions with a destination link to it (the cut guide); regions returning null stay plain. */
  hrefFor?: (region: string) => string | null;
  className?: string;
}) {
  const d = drawings[animal];
  const guide = Boolean(hrefFor);
  return (
    <svg viewBox="0 0 480 270" role={guide ? "group" : "img"} aria-label={title} className={cx("text-char-900 w-full overflow-visible", className)}>
      <title>{title}</title>
      <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeLinecap="round">
        {d.regions.map((r) => {
          const on = active.includes(r.id);
          const shapes = r.shapes.map((s, i) => (
            <path
              key={i}
              d={poly(s)}
              strokeWidth={0.6}
              className={cx(
                "transition-[fill,fill-opacity] duration-300",
                on
                  ? "fill-brass-500 stroke-brass-700 motion-safe:animate-[region-breathe_2.8s_1.6s_ease-in-out_infinite]"
                  : available.includes(r.id)
                    ? "fill-brass-300/45 stroke-brass-500"
                    : "fill-transparent stroke-bone-400",
                guide && !on && "group-hover/region:fill-brass-500/60 group-focus-visible/region:fill-brass-500/60",
              )}
              style={on ? { fillOpacity: 0.55 } : undefined}
            />
          ));
          const href = hrefFor?.(r.id);
          return href ? (
            <NextLink key={r.id} href={href} className="group/region cursor-pointer" aria-label={labels[r.id]}>
              {shapes}
            </NextLink>
          ) : (
            <g key={r.id}>{shapes}</g>
          );
        })}
        <path
          d={d.outline}
          strokeWidth={1.4}
          pathLength={1200}
          strokeDasharray={1200}
          className="motion-safe:animate-[draw-line_2.2s_0.2s_cubic-bezier(.6,0,.2,1)_both]"
        />
        {d.details?.map((p, i) => <path key={i} d={p} strokeWidth={1.2} />)}
      </g>
      <g className="font-sans" fontSize={guide ? 15 : 17} textAnchor="middle">
        {d.regions
          .filter((r) => guide || active.includes(r.id))
          .map((r) => (
            <text
              key={r.id}
              x={r.label[0]}
              y={r.label[1]}
              className={active.includes(r.id) || available.includes(r.id) ? "fill-char-900 font-semibold" : "fill-char-500"}
              style={{ paintOrder: "stroke", stroke: "var(--color-bone-100)", strokeWidth: 3 }}
              pointerEvents="none"
            >
              {labels[r.id]}
            </text>
          ))}
      </g>
    </svg>
  );
}
