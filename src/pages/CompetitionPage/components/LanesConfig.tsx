import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { Category } from "../../../types/category";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";

export default function LanesConfig({ competitionId }) {
  const [lanes, setLanes] = useState([]);

  useEffect(() => {
    if (!competitionId) return;

    const lanesRef = collection(db, "competitions", competitionId, "lanes");
    const unsub = onSnapshot(lanesRef, (snap) => {
      setLanes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [competitionId]);

  const changeCategory = async (laneDocId, newCategory) => {
    try {
      await updateDoc(
        doc(db, "competitions", competitionId, "lanes", laneDocId),
        { category: newCategory }
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-bold mb-4">Lanes Configuration</h2>
      <ul className="space-y-3">
        {lanes.map((lane) => (
          <li key={lane.id} className="flex items-center gap-4">
            <span className="w-20">Lane {lane.id}</span>
            <Select
              value={lane.category || ""}
              onValueChange={(value) => changeCategory(lane.id, value)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(Category).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </li>
        ))}
      </ul>
    </div>
  );
}
