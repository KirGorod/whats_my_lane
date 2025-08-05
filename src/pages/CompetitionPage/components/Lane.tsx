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
import { Trash2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

const Lane = ({ lane, competitionId, clearLane }) => {
  const { isAdmin } = useAuth();
  const removeLane = async (laneDocId: string) => {
    try {
      await deleteDoc(
        doc(db, "competitions", competitionId, "lanes", laneDocId)
      );
    } catch (err) {
      console.error("Error removing lane", err);
    }
  };
  const handleCategoryChange = async (
    laneDocId: string,
    newCategory: string
  ) => {
    try {
      await updateDoc(
        doc(db, "competitions", competitionId, "lanes", laneDocId),
        { category: newCategory }
      );
    } catch (err) {
      console.error("Error updating category", err);
    }
  };

  return (
    <div
      key={lane.id}
      className="relative border rounded-lg p-4 flex flex-col justify-between items-center min-h-[200px] max-h-2"
    >
      {/* Bin icon in top-right */}
      {isAdmin && (
        <button
          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
          onClick={() => lane.laneDocId && removeLane(lane.laneDocId)}
        >
          <Trash2 size={18} />
        </button>
      )}

      {/* Lane title */}
      <p className="font-semibold mb-2 text-2xl">Lane {lane.id}</p>

      {/* Competitor info */}
      {lane.competitor ? (
        <p className="text-2xl text-teal-500 mt-2 text-center">
          {lane.competitor.name}
        </p>
      ) : (
        <p className="text-sm text-gray-400 mt-2">Empty</p>
      )}

      {/* Bottom row: Category + Clear */}
      {isAdmin && (
        <div className="flex items-center justify-between w-full mt-4">
          <Select
            value={lane.category || ""}
            onValueChange={(value) =>
              lane.laneDocId && handleCategoryChange(lane.laneDocId, value)
            }
          >
            <SelectTrigger className="">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(Category).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {lane.competitor && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => clearLane(lane.id)}
            >
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Lane;
