export const COMPETITOR_CATEGORIES = [
  "w1",
  "n2.2",
  "n2",
  "n1.1",
  "w0",
  "r1",
  "r2",
  "n1",
  "s1",
  "n0",
  "r0",
  "h2",
  "h1",
] as const;

export type CompetitorCategory = (typeof COMPETITOR_CATEGORIES)[number];

export interface Competitor {
  id: string;
  name: string;
  category: CompetitorCategory | string; // keep string if legacy data exists
  status?: "waiting" | "lane" | "ready" | "done";
  orderRank?: number;
  order?: number;
  lane?: number | null;
  isFemale?: boolean;
}
