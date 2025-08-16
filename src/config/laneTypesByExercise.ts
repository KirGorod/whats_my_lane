// src/config/laneTypesByExercise.ts
import type { ExerciseType } from "@/types/exercise";
import type { LaneType } from "@/types/lane";

export const LANE_TYPES_BY_EXERCISE: Record<ExerciseType, LaneType[]> = {
  bench: ["paralympic", "kettle", "defaultBench"],
  kettle: ["bench", "jerk"],
  airbike: ["chair", "twoLegs", "oneLeg", "oneHand", "defaultAirbike"],
  rowing: ["skiErg", "handle", "chair", "defaultRowing"],
};
