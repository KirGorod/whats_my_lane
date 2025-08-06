import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Button } from "../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Category } from "../../../types/category";
import { db } from "../../../firebase";
import { Badge, Flag, Trash2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "sonner";

const Lane = ({ lane, exerciseId, clearLane }) => {
  const { isAdmin } = useAuth();
  const categories = Object.values(Category);
  const removeLane = async (laneDocId: string) => {
    if (lane.competitor) {
      toast.warning("Cannot remove lane while it has a competitor");
      return;
    }

    try {
      await deleteDoc(doc(db, "exercises", exerciseId, "lanes", laneDocId));
    } catch (err) {
      console.error("Error removing lane", err);
    }
  };
  const updateLaneCategory = async (laneDocId: string, newCategory: string) => {
    if (lane.competitor) {
      toast.warning("Cannot change category when lane has a competitor");
      return;
    }
    try {
      await updateDoc(doc(db, "exercises", exerciseId, "lanes", laneDocId), {
        category: newCategory,
      });
    } catch (err) {
      console.error("Error updating category", err);
    }
  };

  return (
    <div
      className={`flex flex-col justify-between mb-3 break-inside-avoid border rounded-lg p-3 lg:p-4 transition-colors max-h-50 min-h-50
  ${
    lane.competitor
      ? "border-blue-200 bg-blue-50"
      : "border-gray-200 bg-white hover:bg-gray-50"
  }
  ${
    !lane.category && isAdmin
      ? "border-red-500 bg-red-200 hover:bg-red-250"
      : ""
  }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">Lane {lane.id}</span>
        </div>

        {isAdmin ? (
          <Select
            value={lane.category ?? ""}
            onValueChange={(value) =>
              updateLaneCategory(lane.laneDocId as string, value)
            }
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
        ) : (
          <div>{lane.category}</div>
        )}
      </div>
      {lane.competitor ? (
        <div className="font-medium text-center text-gray-900">
          {lane.competitor.name}
        </div>
      ) : (
        <div className="text-gray-500 text-center">Empty lane</div>
      )}

      <div className="space-y-3">
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              onClick={() => clearLane(lane.id)}
              size="sm"
              className="flex-1"
            >
              <Flag className="w-4 h-4 mr-1" />
              Done
            </Button>

            {/* Only allow lane deletion if empty */}
            {!lane.competitor && (
              <Button
                onClick={() => removeLane(lane.laneDocId as string)}
                size="sm"
                variant="outline"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Lane;
