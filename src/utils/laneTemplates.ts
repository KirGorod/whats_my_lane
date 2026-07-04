import type { ExerciseType } from "@/types/exercise";
import type { LaneModel, LaneType } from "@/types/lane";
import {
  getGeneralLaneType,
  LANE_TYPES_BY_EXERCISE,
  shouldAutoRestrictCategoryChange,
} from "@/config/laneTypesByExercise";

export function defaultLaneTypesForExercise(
  count: number,
  exerciseType: ExerciseType
): LaneType[] {
  const options = LANE_TYPES_BY_EXERCISE[exerciseType] ?? [];
  if (!options.length) return Array(count).fill("defaultBench") as LaneType[];
  return Array.from({ length: count }, (_, i) => options[i % options.length]);
}

export function initialLaneFields(
  exerciseType: ExerciseType
): Pick<LaneModel, "laneType" | "category" | "restrictCategoryChange"> {
  const laneType = getGeneralLaneType(exerciseType);
  return {
    laneType,
    category: laneType,
    restrictCategoryChange: shouldAutoRestrictCategoryChange(
      exerciseType,
      laneType
    ),
  };
}
