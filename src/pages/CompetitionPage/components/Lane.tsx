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

const Lane = ({ lane, competitionId, clearLane }) => {
  const { isAdmin } = useAuth();
  const categories = Object.values(Category);
  const removeLane = async (laneDocId: string) => {
    try {
      await deleteDoc(
        doc(db, "competitions", competitionId, "lanes", laneDocId)
      );
    } catch (err) {
      console.error("Error removing lane", err);
    }
  };
  const updateLaneCategory = async (laneDocId: string, newCategory: string) => {
    console.log(laneDocId, newCategory);
    try {
      await updateDoc(
        doc(db, "competitions", competitionId, "lanes", laneDocId),
        { category: newCategory }
      );
    } catch (err) {
      console.error("Error updating category", err);
    }
  };

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

  return (
    <div
      className={`mb-3 break-inside-avoid border rounded-lg p-3 lg:p-4 transition-colors ${
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
                onClick={() => clearLane(lane.id)}
                size="sm"
                className="flex-1"
              >
                <Flag className="w-4 h-4 mr-1" />
                Done
              </Button>
              {/* <Button
                onClick={() => removeCompetitorFromLane(lane.id)}
                size="sm"
                variant="outline"
              >
                <Trash2 className="w-4 h-4" />
              </Button> */}
            </div>
          )}
        </div>
      ) : (
        <div className="text-gray-500 text-center py-4">Empty lane</div>
      )}
    </div>
  );
};

export default Lane;
