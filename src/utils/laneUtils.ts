import type { Competitor } from "../types/competitor";
import type { LaneModel, LaneType } from "../types/lane";

// Group lanes of the same type, preserving visual order (id asc)
export function groupLanesByType(
  lanes: LaneModel[],
  predicate: (l: LaneModel) => boolean
): Map<LaneType, LaneModel[]> {
  const m = new Map<LaneType, LaneModel[]>();
  for (const l of lanes) {
    if (!l.laneType) continue;
    if (!predicate(l)) continue;
    const arr = m.get(l.laneType) ?? [];
    arr.push(l);
    m.set(l.laneType, arr);
  }
  for (const [k, arr] of m) arr.sort((a, b) => a.id - b.id);
  return m;
}

// Keep waiting competitors by category; pop in FIFO (orderRank asc from your query)
export function makeWaitingByCategory(waiting: Competitor[]) {
  const m = new Map<string, Competitor[]>();
  for (const c of waiting) {
    const arr = m.get(c.category) ?? [];
    arr.push(c);
    m.set(c.category, arr);
  }
  return {
    pop(cat: string): Competitor | undefined {
      const arr = m.get(cat);
      if (!arr?.length) return undefined;
      const c = arr.shift()!;
      if (arr.length) m.set(cat, arr);
      else m.delete(cat);
      return c;
    },
  };
}
