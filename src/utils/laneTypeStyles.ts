import type { LaneType } from "@/types/lane";

export function getLaneTypeBadgeClass(
  laneType: LaneType | null,
  categoryChangedByAutofill?: boolean
): string {
  if (categoryChangedByAutofill) {
    return "bg-amber-100 text-amber-800 border border-amber-400";
  }
  switch (laneType) {
    case "paralympic":
      return "bg-purple-100 text-purple-700";
    case "kettle":
      return "bg-orange-100 text-orange-700";
    case "defaultBench":
    case "defaultKettle":
    case "defaultAirbike":
    case "defaultRowing":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function getLaneTypeAccentClass(laneType: LaneType | null): string {
  switch (laneType) {
    case "paralympic":
      return "border-purple-500";
    case "kettle":
      return "border-orange-500";
    case "defaultBench":
    case "defaultKettle":
    case "defaultAirbike":
    case "defaultRowing":
      return "border-blue-500";
    case "bench":
    case "jerk":
      return "border-indigo-500";
    case "chair":
    case "twoLegs":
    case "oneLeg":
    case "oneHand":
      return "border-teal-500";
    case "skiErg":
    case "handle":
      return "border-cyan-500";
    default:
      return "border-gray-400";
  }
}

export function getRoundGroupClass(roundNumber: number, isUnassigned = false): string {
  if (isUnassigned) {
    return "border-gray-300 bg-gray-50/80";
  }
  const palette = [
    "border-purple-500 bg-purple-50/60",
    "border-orange-500 bg-orange-50/60",
    "border-blue-500 bg-blue-50/60",
    "border-teal-500 bg-teal-50/60",
    "border-indigo-500 bg-indigo-50/60",
    "border-cyan-500 bg-cyan-50/60",
  ];
  return palette[(roundNumber - 1) % palette.length];
}
