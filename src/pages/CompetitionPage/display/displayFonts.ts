/** Container-query font sizes — scale with lane/cell size (works at any browser zoom) */
export function cqFont(minRem: number, cqh: number, maxRem: number): string {
  return `clamp(${minRem}rem, ${cqh}cqh, ${maxRem}rem)`;
}

export const displayLaneFonts = {
  header: cqFont(0.85, 14, 1.35),
  badge: cqFont(0.75, 12, 1.15),
  label: cqFont(0.8, 16, 1.3),
  nameNow: cqFont(1, 42, 2.6),
  nameReady: cqFont(0.92, 38, 2.35),
  meta: cqFont(0.75, 14, 1.15),
} as const;

export const displayQueueFonts = {
  title: "clamp(1.05rem, 1.3rem, 1.4rem)",
  round: "clamp(0.85rem, 1rem, 1.1rem)",
  count: "clamp(0.78rem, 0.92rem, 1rem)",
  name: "clamp(0.95rem, 1.1rem, 1.25rem)",
  hint: "clamp(0.78rem, 0.92rem, 1rem)",
  summaryValue: "clamp(1.35rem, 1.7rem, 1.9rem)",
  summaryLabel: "clamp(0.7rem, 0.82rem, 0.9rem)",
} as const;

export const displayPageTitleFont = "clamp(1.35rem, 2rem, 2.5rem)";

/** Sidebar width — clamp to content, not a fixed % of the screen */
export const DISPLAY_QUEUE_WIDTH = "clamp(260px, 22vw, 320px)";
