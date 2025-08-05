import type { Competitor } from "../../../types/competitor";
import { Button } from "../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Category } from "../../../types/category";
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase";

interface Lane {
  id: number;
  category: string | null;
  competitor: Competitor | null;
  laneDocId?: string; // Firestore lane doc ID
}

interface Props {
  lanes: Lane[];
  autoFillLanes: () => void;
  clearLane: (laneId: number) => void;
  clearAllLanes: () => void;
  competitionId: string;
}

const Lanes = ({
  lanes,
  autoFillLanes,
  clearLane,
  clearAllLanes,
  competitionId,
}: Props) => {
  // 🔹 Change lane category in Firestore
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

  // 🔹 Add a new lane with next available ID
  const addLane = async () => {
    try {
      const existingIds = lanes.map((l) => l.id).sort((a, b) => a - b);

      // Find the smallest missing positive integer
      let newId = 1;
      for (let i = 0; i < existingIds.length; i++) {
        if (existingIds[i] !== i + 1) {
          newId = i + 1;
          break;
        }
        newId = existingIds.length + 1; // no gaps found, go to next after max
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

  // 🔹 Remove a lane by its Firestore doc ID
  const removeLane = async (laneDocId: string) => {
    try {
      await deleteDoc(
        doc(db, "competitions", competitionId, "lanes", laneDocId)
      );
    } catch (err) {
      console.error("Error removing lane", err);
    }
  };

  return (
    <div className="w-1/2 bg-white rounded-lg shadow p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Lanes</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={autoFillLanes}>
            Auto Fill
          </Button>
          <Button variant="secondary" onClick={addLane}>
            + Lane
          </Button>
          <Button variant="destructive" onClick={clearAllLanes}>
            Clear All
          </Button>
        </div>
      </div>

      {/* Lanes grid */}
      <div className="grid grid-cols-2 gap-4 flex-grow">
        {lanes.map((lane) => (
          <div
            key={lane.id}
            className="border rounded-lg p-4 flex flex-col items-center justify-center"
          >
            {/* Lane title + remove button */}
            <p className="font-semibold mb-2">
              Lane {lane.id}{" "}
              <button
                className="text-xs text-red-500 hover:underline ml-2"
                onClick={() => lane.laneDocId && removeLane(lane.laneDocId)}
              >
                Remove
              </button>
            </p>

            {/* Editable category dropdown */}
            <Select
              value={lane.category || ""}
              onValueChange={(value) =>
                lane.laneDocId && handleCategoryChange(lane.laneDocId, value)
              }
            >
              <SelectTrigger className="w-[120px]">
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

            {/* Competitor in lane or Empty */}
            {lane.competitor ? (
              <>
                <p className="text-sm text-gray-500 mt-2">
                  {lane.competitor.name}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => clearLane(lane.id)}
                  className="mt-2"
                >
                  Clear
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-400 mt-2">Empty</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Lanes;
