import type { ExerciseStatus } from "@/types/exercise";

export const STATUS_BADGE_CLASSES: Record<ExerciseStatus, string> = {
  planned:
    "bg-status-planned/18 text-status-planned border border-status-planned/35",
  ongoing:
    "bg-status-ongoing/20 text-status-ongoing border border-status-ongoing/40",
  finished:
    "bg-status-finished/18 text-status-finished border border-status-finished/35",
};

export const STATUS_ACCENT_CLASSES: Record<ExerciseStatus, string> = {
  planned: "border-l-status-planned",
  ongoing: "border-l-status-ongoing",
  finished: "border-l-status-finished",
};

export function statusBadgeClass(
  status: ExerciseStatus,
  overrides?: Partial<Record<ExerciseStatus, string>>
): string {
  if (overrides?.[status]) return overrides[status]!;
  return (
    STATUS_BADGE_CLASSES[status] ??
    "bg-muted text-muted-foreground border border-border"
  );
}

export function statusAccentClass(status: ExerciseStatus): string {
  return STATUS_ACCENT_CLASSES[status] ?? "border-l-border";
}
