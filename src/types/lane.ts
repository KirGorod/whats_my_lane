// src/types/lane.ts
import type { Competitor } from "./competitor";

// Add all lane types you use across exercises
export const LANE_TYPES = [
  // Bench lanes
  "paralympic",
  "kettle",
  "defaultBench",

  // Kettlebell Jerk lanes
  "bench", // if you really mean a bench-supported jerk lane
  "jerk",
  "defaultKettle",

  // AirBike lanes
  "chair",
  "twoLegs",
  "oneLeg",
  "oneHand",
  "defaultAirbike",

  // Rowing/SkiErg lanes
  "skiErg",
  "handle",
  "defaultRowing",
] as const;

export type LaneType = (typeof LANE_TYPES)[number];

export interface LaneModel {
  id: number;
  laneDocId: string;
  laneType: LaneType | null;
  nextLaneType?: LaneType | null;
  category: LaneType | null;
  competitor: { id: string; name: string; category: string } | null;
  readyUp: { id: string; name: string; category: string } | null;
  locked: boolean;
}
