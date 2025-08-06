import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Flag, Zap, RotateCcw, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Category } from "../../../types/category";
import Lane from "./Lane";

interface Competitor {
  id: string;
  name: string;
  category: string;
}

interface Lane {
  id: number;
  category: string | null;
  competitor: Competitor | null;
  laneDocId?: string;
}

interface Props {
  lanes: Lane[];
  autoFillLanes: () => void;
  clearLane: (laneId: number) => void;
  clearAllLanes: () => void;
  exerciseId: string;
  updateLaneCategory: (laneId: number, category: string) => void;
  moveToDone: (laneId: number) => void;
  removeCompetitorFromLane: (laneId: number) => void;
  categories: string[];
}

const Lanes = ({
  lanes,
  autoFillLanes,
  clearLane,
  clearAllLanes,
  exerciseId,
  updateLaneCategory,
  moveToDone,
  removeCompetitorFromLane,
}: Props) => {
  const { isAdmin } = useAuth();

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

      await addDoc(collection(db, "exercises", exerciseId, "lanes"), {
        id: newId,
        category: null,
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
              Clear All
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

      {/* Lanes */}
      {/* <div
        className="flex-1 overflow-y-auto p-4 
  grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      > */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 m-3">
        {lanes.map((lane) => (
          <Lane
            key={lane.id}
            lane={lane}
            exerciseId={exerciseId}
            clearLane={clearLane}
          />
        ))}
      </div>
    </div>
  );
};

export default Lanes;
