import type { Competitor } from "@/types/competitor";
import type { ExerciseType } from "@/types/exercise";
import type { LaneModel, LaneType } from "@/types/lane";
import type { AutofillMode } from "@/hooks/useAutofillMode";
import { getGeneralLaneType } from "@/config/laneTypesByExercise";
import { getAllowedCategoriesForLane, isCategoryAllowedForLane } from "@/utils/laneRules";

/** Competitor queue order always uses Full-Auto (general lane fallback). */
export const QUEUE_ORDER_AUTOFILL_MODE: AutofillMode = "fallbackGeneral";

/** Lane type that controls READY UP (next round takes precedence) */
export function readyUpLaneType(lane: LaneModel): LaneType | null {
  return lane.nextLaneType ?? lane.laneType ?? null;
}

/** Check if category can go to READY UP (uses nextLaneType if set) */
export function isCategoryAllowedForReady(
  exerciseType: ExerciseType,
  lane: LaneModel,
  category: string
): boolean {
  const lt = readyUpLaneType(lane);
  return !!lt && isCategoryAllowedForLane(exerciseType, lt, category);
}

/** Group lanes by READY UP controlling lane type (nextLaneType first) */
export function groupLanesByReadyType(
  lanes: LaneModel[],
  predicate: (l: LaneModel) => boolean
): Map<LaneType, LaneModel[]> {
  const m = new Map<LaneType, LaneModel[]>();
  for (const l of lanes) {
    if (!predicate(l)) continue;
    const key = readyUpLaneType(l);
    if (!key) continue;
    const arr = m.get(key) ?? [];
    arr.push(l);
    m.set(key, arr);
  }
  for (const [, arr] of m) arr.sort((a, b) => a.id - b.id);
  return m;
}

type WaitingByCategory = {
  pop(cat: string): Competitor | undefined;
  remaining(): Competitor[];
};

/**
 * Keep waiting competitors by category; pop in FIFO (orderRank asc).
 * Within a category: primary → female fallback → low-priority fallback.
 */
export function makeWaitingByCategory(waiting: Competitor[]): WaitingByCategory {
  const m = new Map<
    string,
    {
      primary: Competitor[];
      femaleFallback: Competitor[];
      lowPriorityFallback: Competitor[];
    }
  >();

  for (const c of waiting) {
    const bucket = m.get(c.category) ?? {
      primary: [],
      femaleFallback: [],
      lowPriorityFallback: [],
    };
    if (c.lowPriority) bucket.lowPriorityFallback.push(c);
    else if (c.isFemale) bucket.femaleFallback.push(c);
    else bucket.primary.push(c);
    m.set(c.category, bucket);
  }

  return {
    pop(cat: string): Competitor | undefined {
      const bucket = m.get(cat);
      if (!bucket) return undefined;

      const c =
        bucket.primary.shift() ??
        bucket.femaleFallback.shift() ??
        bucket.lowPriorityFallback.shift();
      if (
        !bucket.primary.length &&
        !bucket.femaleFallback.length &&
        !bucket.lowPriorityFallback.length
      ) {
        m.delete(cat);
      } else {
        m.set(cat, bucket);
      }
      return c;
    },
    remaining(): Competitor[] {
      const all: Competitor[] = [];
      for (const bucket of m.values()) {
        all.push(
          ...bucket.primary,
          ...bucket.femaleFallback,
          ...bucket.lowPriorityFallback
        );
      }
      return all.sort(
        (a, b) => (a.orderRank ?? 0) - (b.orderRank ?? 0)
      );
    },
  };
}

export type AssignmentSlot = "now" | "readyUp";

export type QueuedCompetitor = {
  competitor: Competitor;
  targetLaneType: LaneType | null;
  targetLaneId: number | null;
  slot: AssignmentSlot | null;
  roundNumber: number;
};

type VirtualLane = {
  id: number;
  laneType: LaneType | null;
  nextLaneType: LaneType | null;
  competitor: { id: string } | null;
  readyUp: { id: string } | null;
  locked: boolean;
  restrictCategoryChange: boolean;
};

type PassAssignment = {
  competitor: Competitor;
  targetLaneType: LaneType;
  targetLaneId: number;
  slot: AssignmentSlot;
};

function cloneVirtualLanes(lanes: LaneModel[]): VirtualLane[] {
  return lanes.map((l) => ({
    id: l.id,
    laneType: l.laneType,
    nextLaneType: l.nextLaneType ?? null,
    competitor: l.competitor ? { id: l.competitor.id } : null,
    readyUp: l.readyUp ? { id: l.readyUp.id } : null,
    locked: l.locked,
    restrictCategoryChange: !!l.restrictCategoryChange,
  }));
}


function groupVirtualLanesByType(
  lanes: VirtualLane[],
  predicate: (l: VirtualLane) => boolean
): Map<LaneType, VirtualLane[]> {
  const m = new Map<LaneType, VirtualLane[]>();
  for (const l of lanes) {
    if (!l.laneType || !predicate(l)) continue;
    const arr = m.get(l.laneType) ?? [];
    arr.push(l);
    m.set(l.laneType, arr);
  }
  for (const [, arr] of m) arr.sort((a, b) => a.id - b.id);
  return m;
}

/** One exit = fill empty NOW slots only (at most one athlete per lane). */
function runExitPass(
  virtualLanes: VirtualLane[],
  waitingByCat: WaitingByCategory,
  exerciseType: ExerciseType,
  mode: AutofillMode
): PassAssignment[] {
  const assignments: PassAssignment[] = [];
  const unfilledNow: VirtualLane[] = [];

  const tryPopForCategories = (categories: readonly string[]) => {
    for (const cat of categories) {
      const c = waitingByCat.pop(cat);
      if (c) return c;
    }
    return undefined;
  };

  const record = (
    c: Competitor,
    lane: VirtualLane,
    laneType: LaneType
  ) => {
    assignments.push({
      competitor: c,
      targetLaneType: laneType,
      targetLaneId: lane.id,
      slot: "now",
    });
    lane.competitor = { id: c.id };
  };

  // ---- NOW (empty lanes) ----
  const freeByType = groupVirtualLanesByType(
    virtualLanes,
    (l) => !l.competitor && !l.locked
  );
  for (const [laneType, queue] of freeByType) {
    const priority = getAllowedCategoriesForLane(exerciseType, laneType);
    if (!priority.length) continue;

    const laneQueue = [...queue];
    for (const cat of priority) {
      while (laneQueue.length) {
        const c = waitingByCat.pop(cat);
        if (!c) break;
        const lane = laneQueue.shift()!;
        record(c, lane, laneType);
      }
      if (!laneQueue.length) break;
    }
    unfilledNow.push(...laneQueue);
  }

  // ---- Fallback to general lane type (NOW only) ----
  if (mode === "fallbackGeneral") {
    const generalType = getGeneralLaneType(exerciseType);
    const generalPriority = getAllowedCategoriesForLane(
      exerciseType,
      generalType
    );

    for (const lane of unfilledNow) {
      const typeWouldChange = lane.laneType !== generalType;
      if (lane.restrictCategoryChange && typeWouldChange) continue;

      const c = tryPopForCategories(generalPriority);
      if (!c) continue;

      if (typeWouldChange) {
        lane.laneType = generalType;
        lane.nextLaneType = generalType;
      }
      record(c, lane, generalType);
    }
  }

  return assignments;
}

/** Whether any unlocked lane still blocks the next NOW assignment pass. */
function hasOccupiedLanes(virtualLanes: VirtualLane[]): boolean {
  return virtualLanes.some(
    (l) => !l.locked && (l.competitor !== null || l.readyUp !== null)
  );
}

/** Simulate all lanes finishing an exit: NOW -> done, READY UP -> NOW, apply pending lane type. */
function simulateExitComplete(virtualLanes: VirtualLane[]) {
  for (const lane of virtualLanes) {
    if (lane.locked) continue;

    lane.competitor = lane.readyUp ? { id: lane.readyUp.id } : null;
    lane.readyUp = null;

    if (lane.nextLaneType && lane.nextLaneType !== lane.laneType) {
      lane.laneType = lane.nextLaneType;
      lane.nextLaneType = null;
    }
  }
}

/** Iteratively simulate autofill rounds until all athletes are placed or none can be assigned. */
export function computeAutofillQueueOrder(
  waiting: Competitor[],
  lanes: LaneModel[],
  exerciseType: ExerciseType,
  mode: AutofillMode
): QueuedCompetitor[] {
  const result: QueuedCompetitor[] = [];
  let remaining = [...waiting].sort(
    (a, b) => (a.orderRank ?? 0) - (b.orderRank ?? 0)
  );
  const virtualLanes = cloneVirtualLanes(lanes);
  let roundNumber = 1;

  while (remaining.length > 0) {
    const waitingByCat = makeWaitingByCategory(remaining);
    const assignments = runExitPass(
      virtualLanes,
      waitingByCat,
      exerciseType,
      mode
    );

    if (!assignments.length) {
      if (hasOccupiedLanes(virtualLanes)) {
        simulateExitComplete(virtualLanes);
        roundNumber++;
        if (roundNumber > 500) {
          for (const competitor of remaining) {
            result.push({
              competitor,
              targetLaneType: null,
              targetLaneId: null,
              slot: null,
              roundNumber,
            });
          }
          break;
        }
        continue;
      }

      for (const competitor of remaining) {
        result.push({
          competitor,
          targetLaneType: null,
          targetLaneId: null,
          slot: null,
          roundNumber,
        });
      }
      break;
    }

    for (const a of assignments) {
      result.push({ ...a, roundNumber });
    }

    remaining = waitingByCat.remaining();
    if (!remaining.length) break;

    simulateExitComplete(virtualLanes);
    roundNumber++;

    if (roundNumber > 500) {
      for (const competitor of remaining) {
        result.push({
          competitor,
          targetLaneType: null,
          targetLaneId: null,
          slot: null,
          roundNumber,
        });
      }
      break;
    }
  }

  return result;
}

export function queueOrderDiffersFromOrderRank(
  queue: QueuedCompetitor[],
  waiting: Competitor[]
): boolean {
  const computedIds = queue.map((q) => q.competitor.id);
  const currentIds = [...waiting]
    .sort((a, b) => (a.orderRank ?? 0) - (b.orderRank ?? 0))
    .map((c) => c.id);

  if (computedIds.length !== currentIds.length) return false;
  return computedIds.some((id, i) => id !== currentIds[i]);
}
