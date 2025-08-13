import { useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Flag, Zap, RotateCcw } from "lucide-react";
import Lane from "./Lane";
import type { LaneModel, LaneType } from "../../../types/lane";
import type { ExerciseType } from "../../../types/exercise";
import { LANE_TYPES_BY_EXERCISE } from "../../../config/laneTypesByExercise";
import { LANE_TYPES } from "../../../types/lane";

interface Props {
  lanes: LaneModel[];
  autoFillLanes: () => void;
  clearLane: (laneId: number) => void;
  clearAllLanes: () => void;
  exerciseId: string;
}

// Normalize legacy exercise types to the new ones
const normalizeExerciseType = (raw: any): ExerciseType => {
  const v = String(raw ?? "").toLowerCase();
  if (v === "bench" || v === "kettle" || v === "airbike" || v === "rowing")
    return v as ExerciseType;
  if (v === "strength") return "bench";
  if (v === "cardio") return "airbike";
  if (v === "flexibility") return "rowing";
  return "bench";
};

export default function Lanes({
  lanes,
  autoFillLanes,
  clearLane,
  clearAllLanes,
  exerciseId,
}: Props) {
  const { isAdmin } = useAuth();
  const [exerciseType, setExerciseType] = useState<ExerciseType>("bench");

  // Live exercise type (normalized)
  useEffect(() => {
    if (!exerciseId) return;
    const unsub = onSnapshot(doc(db, "exercises", exerciseId), (snap) => {
      const data = snap.data() as any;
      setExerciseType(normalizeExerciseType(data?.type));
    });
    return () => unsub();
  }, [exerciseId]);

  // Options for the Select: mapping or fallback to all lane types (so it's never empty)
  const laneTypeOptions = useMemo<LaneType[]>(() => {
    const opts = LANE_TYPES_BY_EXERCISE[exerciseType] ?? [];
    return opts.length ? opts : (LANE_TYPES as unknown as LaneType[]);
  }, [exerciseType]);

  const occupiedLanes = lanes.filter((l) => l.competitor).length;

  const addLane = async () => {
    try {
      const existingIds = lanes.map((l) => l.id).sort((a, b) => a - b);
      let newId = 1;
      for (let i = 0; i < existingIds.length; i++) {
        if (existingIds[i] !== i + 1) {
          newId = i + 1;
          break;
        }
        newId = existingIds.length + 1;
      }

      // Cycle lane types for the exercise
      const laneTypeToAssign =
        laneTypeOptions.length > 0
          ? (laneTypeOptions[lanes.length % laneTypeOptions.length] as LaneType)
          : null;

      await addDoc(collection(db, "exercises", exerciseId, "lanes"), {
        id: newId,
        laneType: laneTypeToAssign,
        category: laneTypeToAssign, // mirror for back-compat
        competitor: null,
        readyUp: null,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error adding lane", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="hidden lg:flex items-center gap-2 mb-4">
          <Flag className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">
            Lanes ({occupiedLanes}/{lanes.length})
          </h2>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <Button
              onClick={autoFillLanes}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <Zap className="w-4 h-4 mr-1" />
              Auto Fill
            </Button>
            <Button
              onClick={clearAllLanes}
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={occupiedLanes === 0}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Next Round
            </Button>
            <Button
              onClick={addLane}
              size="sm"
              variant="secondary"
              className="flex-1"
            >
              + Lane
            </Button>
          </div>
        )}
      </div>

      {/* Lanes grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 m-3">
        {lanes.map((lane) => (
          <Lane
            key={lane.id}
            lane={lane}
            exerciseId={exerciseId}
            clearLane={clearLane}
            laneTypeOptions={laneTypeOptions} // never empty now
            exerciseType={exerciseType}
          />
        ))}
      </div>
    </div>
  );
}
