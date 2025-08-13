// src/config/laneRules.ts
import type { ExerciseType } from "@/types/exercise";
import type { LaneType } from "@/types/lane";
import type { CompetitorCategory } from "@/types/competitor";

export const LANE_CATEGORY_RULES: Record<
  ExerciseType,
  Partial<Record<LaneType, readonly CompetitorCategory[]>>
> = {
  bench: {
    paralympic: ["w1", "n2.2", "n2", "n1.1", "w0"],
    kettle: ["r1", "r2"],
    defaultBench: ["n1", "s1", "n0", "r0", "h2", "h1"],
  },

  kettle: {
    bench: ["w1", "n2.2", "n2", "n1.1", "w0"],
    jerk: ["n1", "r1", "r2", "s1", "n0", "r0", "h2", "h1"],
  },

  airbike: {
    chair: ["w1", "n2.2"],
    twoLegs: ["n2", "w0"],
    oneLeg: ["n1.1"],
    oneHand: ["r1", "r2"],
    defaultAirbike: ["n1", "s1", "n0", "r0", "h2", "h1"],
  },

  rowing: {
    skiErg: ["w1", "n2.2", "w0"],
    handle: ["r1", "r2"],
    chair: ["n2"],
    defaultRowing: ["n1.1", "n1", "s1", "n0", "r0", "h2", "h1"],
  },
};
