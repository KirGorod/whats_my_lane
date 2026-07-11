import type { CompetitorCategory } from "./competitor";

export interface CompetitorListAthlete {
  name: string;
  category: CompetitorCategory | string;
}

export interface CompetitorList {
  id: string;
  name: string;
  athletes: CompetitorListAthlete[];
  /** Milliseconds since epoch; used for display order (oldest first). */
  createdAtMs: number;
}

export type CompetitorListInput = Omit<CompetitorList, "id" | "createdAtMs">;
