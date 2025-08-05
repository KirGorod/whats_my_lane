import type { Competitor } from "../../../types/competitor";
import { Button } from "../../../components/ui/button";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import Lane from "./Lane";
import { useAuth } from "../../../context/AuthContext";

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
  const { isAdmin } = useAuth();

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

  return (
    <div className="w-1/2 bg-white rounded-lg shadow p-4 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Lanes</h2>
        {isAdmin && (
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
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 flex-grow">
        {lanes.map((lane) => (
          <Lane
            lane={lane}
            competitionId={competitionId}
            clearLane={clearLane}
          />
        ))}
      </div>
    </div>
  );
};

export default Lanes;
