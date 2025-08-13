import type { ExerciseType } from "@/types/exercise";
import type { LaneType } from "@/types/lane";
import { LANE_TYPES_BY_EXERCISE } from "@/config/laneTypesByExercise";

export function defaultLaneTypesForExercise(
  count: number,
  exerciseType: ExerciseType
): LaneType[] {
  const options = LANE_TYPES_BY_EXERCISE[exerciseType] ?? [];
  if (!options.length) return Array(count).fill("defaultBench") as LaneType[];
  return Array.from({ length: count }, (_, i) => options[i % options.length]);
}
