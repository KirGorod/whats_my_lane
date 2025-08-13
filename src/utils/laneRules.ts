import type { ExerciseType } from "@/types/exercise";
import type { LaneType } from "@/types/lane";
import type { CompetitorCategory } from "@/types/competitor";
import { LANE_CATEGORY_RULES } from "@/config/laneRules";

export function isCategoryAllowedForLane(
  exerciseType: ExerciseType,
  laneType: LaneType | null | undefined,
  competitorCategory: string
): boolean {
  if (!laneType) return false;
  const allowed = LANE_CATEGORY_RULES[exerciseType]?.[laneType] ?? [];
  return (allowed as readonly string[]).includes(competitorCategory);
}

export function getAllowedCategoriesForLane(
  exerciseType: ExerciseType,
  laneType: LaneType | null | undefined
): readonly CompetitorCategory[] {
  if (!laneType) return [];
  return (LANE_CATEGORY_RULES[exerciseType]?.[laneType] ??
    []) as readonly CompetitorCategory[];
}
