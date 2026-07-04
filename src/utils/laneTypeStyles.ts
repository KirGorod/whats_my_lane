import type { LaneType } from "@/types/lane";

export function getLaneTypeBadgeClass(
  laneType: LaneType | null,
  categoryChangedByAutofill?: boolean
): string {
  if (categoryChangedByAutofill) {
    return "bg-lane-autofill/20 text-lane-autofill border border-lane-autofill/40";
  }
  switch (laneType) {
    case "paralympic":
      return "bg-lane-paralympic/18 text-lane-paralympic border border-lane-paralympic/35";
    case "kettle":
      return "bg-lane-kettle/18 text-lane-kettle border border-lane-kettle/35";
    case "defaultBench":
    case "defaultKettle":
    case "defaultAirbike":
    case "defaultRowing":
      return "bg-lane-default/18 text-lane-default border border-lane-default/35";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

export function getLaneTypeAccentClass(laneType: LaneType | null): string {
  switch (laneType) {
    case "paralympic":
      return "border-lane-paralympic";
    case "kettle":
      return "border-lane-kettle";
    case "defaultBench":
    case "defaultKettle":
    case "defaultAirbike":
    case "defaultRowing":
      return "border-lane-default";
    case "bench":
    case "jerk":
      return "border-lane-bench";
    case "chair":
    case "twoLegs":
    case "oneLeg":
    case "oneHand":
      return "border-lane-chair";
    case "skiErg":
    case "handle":
      return "border-lane-cardio";
    default:
      return "border-border";
  }
}

export function getRoundGroupClass(roundNumber: number, isUnassigned = false): string {
  if (isUnassigned) {
    return "border-border bg-muted/50";
  }
  const palette = [
    "border-lane-paralympic bg-lane-paralympic/14",
    "border-lane-kettle bg-lane-kettle/14",
    "border-lane-default bg-lane-default/14",
    "border-lane-chair bg-lane-chair/14",
    "border-lane-bench bg-lane-bench/14",
    "border-lane-cardio bg-lane-cardio/14",
  ];
  return palette[(roundNumber - 1) % palette.length];
}
