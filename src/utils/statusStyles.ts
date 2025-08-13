import type { ExerciseStatus } from "@/types/exercise";

// Default tailwind classes per status
export const STATUS_BADGE_CLASSES: Record<ExerciseStatus, string> = {
  planned: "bg-sky-100 text-sky-700 border border-sky-200",
  ongoing: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  finished: "bg-violet-100 text-violet-700 border border-violet-200",
};

/**
 * Returns the Tailwind classes for a status badge.
 * You can optionally pass overrides for specific statuses.
 */
export function statusBadgeClass(
  status: ExerciseStatus,
  overrides?: Partial<Record<ExerciseStatus, string>>
): string {
  if (overrides?.[status]) return overrides[status]!;
  return (
    STATUS_BADGE_CLASSES[status] ??
    "bg-gray-100 text-gray-700 border border-gray-200"
  );
}
