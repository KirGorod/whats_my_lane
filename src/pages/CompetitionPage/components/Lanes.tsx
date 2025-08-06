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
  competitionId: string;
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
  competitionId,
  updateLaneCategory,
  moveToDone,
  removeCompetitorFromLane,
}: Props) => {
  const { isAdmin } = useAuth();
  const categories = Object.values(Category);

  const occupiedLanes = lanes.filter((l) => l.competitor).length;

  const getBadgeVariant = (category: string | null) => {
    if (!category) return "outline";
    switch (category) {
      case "H":
        return "default";
      case "R":
        return "secondary";
      case "N":
        return "outline";
      default:
        return "default";
    }
  };

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

      await addDoc(collection(db, "competitions", competitionId, "lanes"), {
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {lanes.map((lane) => (
          <div
            key={lane.id}
            className={`border rounded-lg p-3 lg:p-4 transition-colors ${
              lane.competitor
                ? "border-blue-200 bg-blue-50"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">Lane {lane.id}</span>
                <Badge variant={getBadgeVariant(lane.category)}>
                  {lane.category || "—"}
                </Badge>
              </div>

              {isAdmin && (
                <Select
                  value={lane.category || ""}
                  onValueChange={(value) => updateLaneCategory(lane.id, value)}
                >
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue placeholder="Cat" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {lane.competitor ? (
              <div className="space-y-3">
                <div className="font-medium text-gray-900">
                  {lane.competitor.name}
                </div>

                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => moveToDone(lane.id)}
                      size="sm"
                      className="flex-1"
                    >
                      <Flag className="w-4 h-4 mr-1" />
                      Done
                    </Button>
                    <Button
                      onClick={() => removeCompetitorFromLane(lane.id)}
                      size="sm"
                      variant="outline"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">Empty lane</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Lanes;
