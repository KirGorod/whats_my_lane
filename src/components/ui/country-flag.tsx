import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Five-pointed star with outer radius 1, centered at 0,0
const STAR_POINTS = [
  [0, -1],
  [0.2245, -0.309],
  [0.9511, -0.309],
  [0.3633, 0.118],
  [0.5878, 0.809],
  [0, 0.382],
  [-0.5878, 0.809],
  [-0.3633, 0.118],
  [-0.9511, -0.309],
  [-0.2245, -0.309],
];

const starPath = (cx: number, cy: number, r: number) =>
  `M${STAR_POINTS.map(
    ([x, y]) => `${(cx + x * r).toFixed(2)} ${(cy + y * r).toFixed(2)}`
  ).join("L")}Z`;

// US flag on a 19.5 × 13 grid: 13 stripes of height 1, canton 7.8 × 7,
// 50 stars in 9 rows alternating 6 and 5
const US_STRIPES = Array.from(
  { length: 7 },
  (_, i) => `M0 ${i * 2}h19.5v1H0z`
).join("");
const US_STARS = Array.from({ length: 9 }, (_, row) =>
  Array.from({ length: row % 2 ? 5 : 6 }, (_, col) =>
    starPath(0.65 * (col * 2 + (row % 2 ? 2 : 1)), 0.7 * (row + 1), 0.4)
  ).join("")
).join("");

// Every flag is drawn in a 3:2 box so all countries take the same space
const FLAGS = {
  ua: {
    viewBox: "0 0 3 2",
    paths: (
      <>
        <path fill="#0057B7" d="M0 0h3v1H0z" />
        <path fill="#FFD700" d="M0 1h3v1H0z" />
      </>
    ),
  },
  us: {
    viewBox: "0 0 19.5 13",
    paths: (
      <>
        <path fill="#FFFFFF" d="M0 0h19.5v13H0z" />
        <path fill="#B22234" d={US_STRIPES} />
        <path fill="#3C3B6E" d="M0 0h7.8v7H0z" />
        <path fill="#FFFFFF" d={US_STARS} />
      </>
    ),
  },
  ee: {
    viewBox: "0 0 9 6",
    paths: (
      <>
        <path fill="#0072CE" d="M0 0h9v2H0z" />
        <path fill="#000000" d="M0 2h9v2H0z" />
        <path fill="#FFFFFF" d="M0 4h9v2H0z" />
      </>
    ),
  },
  bh: {
    viewBox: "0 0 900 600",
    paths: (
      <>
        <path fill="#CE1126" d="M0 0h900v600H0z" />
        <path
          fill="#FFFFFF"
          d="M0 0h216l108 60-108 60 108 60-108 60 108 60-108 60 108 60-108 60 108 60-108 60H0z"
        />
      </>
    ),
  },
  ie: {
    viewBox: "0 0 9 6",
    paths: (
      <>
        <path fill="#169B62" d="M0 0h3v6H0z" />
        <path fill="#FFFFFF" d="M3 0h3v6H3z" />
        <path fill="#FF883E" d="M6 0h3v6H6z" />
      </>
    ),
  },
} satisfies Record<string, { viewBox: string; paths: ReactNode }>;

// Country names as the API spells them, compared case-insensitively
const FLAG_BY_COUNTRY = new Map<string, keyof typeof FLAGS>([
  ["ukraine", "ua"],
  ["usa", "us"],
  ["united states", "us"],
  ["estonia", "ee"],
  ["bahrain", "bh"],
  ["ireland", "ie"],
]);

/** Flag sized to the surrounding text; renders nothing for unknown countries. */
function CountryFlag({
  country,
  className,
}: {
  country?: string | null;
  className?: string;
}) {
  const key = FLAG_BY_COUNTRY.get((country ?? "").trim().toLowerCase());
  if (!country || !key) return null;
  const { viewBox, paths } = FLAGS[key];

  return (
    <span
      role="img"
      aria-label={country}
      title={country}
      className={cn(
        "inline-block h-[0.75em] w-[1.125em] shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/15",
        className
      )}
    >
      <svg viewBox={viewBox} preserveAspectRatio="none" className="block h-full w-full">
        {paths}
      </svg>
    </span>
  );
}

export { CountryFlag };
