// src/config/laneTypesByExercise.ts
import type { ExerciseType } from "@/types/exercise";
import type { LaneType } from "@/types/lane";

export const LANE_TYPES_BY_EXERCISE: Record<ExerciseType, LaneType[]> = {
  bench: ["paralympic", "kettle", "defaultBench"],
  kettle: ["bench", "jerk"],
  airbike: ["chair", "twoLegs", "oneLeg", "oneHand", "defaultAirbike"],
  rowing: ["skiErg", "handle", "chair", "defaultRowing"],
};

export const GENERAL_LANE_TYPE_BY_EXERCISE: Record<ExerciseType, LaneType> = {
  bench: "defaultBench",
  kettle: "jerk",
  airbike: "defaultAirbike",
  rowing: "defaultRowing",
};

export function getGeneralLaneType(exerciseType: ExerciseType): LaneType {
  return GENERAL_LANE_TYPE_BY_EXERCISE[exerciseType];
}

/** SkiErg lanes should block autofill from switching them to general rowing. */
export function shouldAutoRestrictCategoryChange(
  exerciseType: ExerciseType,
  laneType: LaneType | null | undefined
): boolean {
  return exerciseType === "rowing" && laneType === "skiErg";
}
