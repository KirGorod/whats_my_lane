export type ExerciseStatus = "planned" | "ongoing" | "finished";
export type ExerciseType = "bench" | "kettle" | "airbike" | "rowing";

export interface Exercise {
  id: string;
  name: string;
  status: ExerciseStatus;
  timeToStart: string; // ISO string
  numberOfLanes: number;
  type: ExerciseType;
}

export const statusOptions = [
  { value: "planned", label: "Planned" },
  { value: "ongoing", label: "Ongoing" },
  { value: "finished", label: "Finished" },
] as const;

export const exerciseTypes = [
  { value: "bench", label: "Bench Press" },
  { value: "kettle", label: "Kettlebell Jerk" },
  { value: "airbike", label: "Air Bike" },
  { value: "rowing", label: "Concept Rowing" },
] as const;
