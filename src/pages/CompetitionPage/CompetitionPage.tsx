import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Competitor } from "../../types/competitor";
import { Category } from "../../types/category";
import CompetitorsList from "./components/CompetitorsList";
import Lanes from "./components/Lanes";
import DoneCompetitorsList from "./components/DoneCompetitorsList";
import { toast } from "sonner";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import LanesConfig from "./components/LanesConfig";

interface Lane {
  id: number;
  category: Category;
  competitor: Competitor | null;
}

export default function CompetitionPage() {
  const { competitionId } = useParams<{ competitionId: string }>();

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [doneCompetitors, setDoneCompetitors] = useState<Competitor[]>([]);
  const [lanes, setLanes] = useState<Lane[]>([]);

  // 🔹 Don't do anything until we have a competitionId
  useEffect(() => {
    if (!competitionId) return;

    const waitingQuery = query(
      collection(db, "competitions", competitionId, "competitors"),
      where("status", "==", "waiting"),
      orderBy("order", "asc")
    );
    const unsubWaiting = onSnapshot(waitingQuery, (snap) => {
      setCompetitors(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Competitor))
      );
    });

    const doneQuery = query(
      collection(db, "competitions", competitionId, "competitors"),
      where("status", "==", "done"),
      orderBy("order", "desc")
    );
    const unsubDone = onSnapshot(doneQuery, (snap) => {
      setDoneCompetitors(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Competitor))
      );
    });

    const lanesRef = collection(db, "competitions", competitionId, "lanes");
    const lanesQuery = query(
      collection(db, "competitions", competitionId, "lanes"),
      orderBy("id", "asc")
    );

    const unsubLanesConfig = onSnapshot(lanesQuery, (lanesSnap) => {
      const lanesFromDb = lanesSnap.docs.map((docSnap) => ({
        id: docSnap.data().id,
        category: docSnap.data().category,
        competitor: null,
        laneDocId: docSnap.id,
      }));

      // 🔹 Listen to competitors in lanes
      const laneQueryRef = query(
        collection(db, "competitions", competitionId, "competitors"),
        where("status", "==", "lane")
      );
      const unsubLaneAssignments = onSnapshot(laneQueryRef, (compSnap) => {
        const laneAssignments = compSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Competitor)
        );

        // Merge lane config with lane assignments
        setLanes(
          lanesFromDb.map((lane) => {
            const match = laneAssignments.find(
              (c) => c.lane === lane.id && c.category === lane.category
            );
            return { ...lane, competitor: match || null };
          })
        );
      });

      return () => unsubLaneAssignments();
    });

    return () => {
      unsubWaiting();
      unsubDone();
      unsubLanesConfig();
    };
  }, [competitionId]);

  const addCompetitor = async (competitor: Omit<Competitor, "id">) => {
    if (!competitionId) return;
    try {
      await addDoc(
        collection(db, "competitions", competitionId, "competitors"),
        {
          ...competitor,
          lane: null,
          status: "waiting",
          order: Date.now(),
          createdAt: serverTimestamp(),
        }
      );
      toast.success("Competitor added");
    } catch (err) {
      console.error(err);
      toast.error("Error adding competitor");
    }
  };

  const removeCompetitor = async (index: number) => {
    if (!competitionId) return;
    const competitorToMove = competitors[index];
    if (!competitorToMove) return;
    try {
      await updateDoc(
        doc(
          db,
          "competitions",
          competitionId,
          "competitors",
          competitorToMove.id
        ),
        {
          lane: null,
          status: "done",
          order: Date.now(),
        }
      );
      toast.success("Marked as done");
    } catch (err) {
      console.error(err);
      toast.error("Error updating competitor");
    }
  };

  const autoFillLanes = async () => {
    if (!competitionId) return;
    const emptyLanes = lanes.filter((lane) => !lane.competitor);
    if (emptyLanes.length === 0) {
      toast.error("All lanes are already occupied");
      return;
    }

    let availableCompetitors = [...competitors];
    let unfilledCount = 0;

    for (const lane of emptyLanes) {
      const matchIndex = availableCompetitors.findIndex(
        (c) => c.category === lane.category
      );
      if (matchIndex !== -1) {
        const matched = availableCompetitors[matchIndex];
        availableCompetitors.splice(matchIndex, 1);
        await updateDoc(
          doc(db, "competitions", competitionId, "competitors", matched.id),
          {
            lane: lane.id,
            status: "lane",
          }
        );
      } else {
        unfilledCount++;
      }
    }

    if (unfilledCount > 0) {
      toast.warning(`${unfilledCount} lane(s) were not filled`);
    } else {
      toast.success("All empty lanes filled successfully");
    }
  };

  const clearLane = async (laneId: number) => {
    if (!competitionId) return;
    const lane = lanes.find((l) => l.id === laneId);
    if (!lane?.competitor) return;

    try {
      await updateDoc(
        doc(
          db,
          "competitions",
          competitionId,
          "competitors",
          lane.competitor.id
        ),
        {
          lane: null,
          status: "done",
          order: Date.now(),
        }
      );
      toast.success(`Lane ${laneId} cleared`);
    } catch (err) {
      console.error(err);
      toast.error("Error clearing lane");
    }
  };

  const clearAllLanes = async () => {
    if (!competitionId) return;
    const laneCompetitors = lanes.filter((l) => l.competitor);
    if (laneCompetitors.length === 0) {
      toast.error("No lanes to clear");
      return;
    }

    try {
      for (const lane of laneCompetitors) {
        if (lane.competitor) {
          await updateDoc(
            doc(
              db,
              "competitions",
              competitionId,
              "competitors",
              lane.competitor.id
            ),
            {
              lane: null,
              status: "done",
              order: Date.now(),
            }
          );
        }
      }
      toast.success(`Cleared ${laneCompetitors.length} lane(s)`);
    } catch (err) {
      console.error(err);
      toast.error("Error clearing lanes");
    }
  };

  const fillLaneWithCompetitor = async (competitor: Competitor) => {
    if (!competitionId) return;
    const laneIndex = lanes.findIndex(
      (lane) =>
        lane.category === competitor.category && lane.competitor === null
    );
    if (laneIndex === -1) {
      toast.error(`No empty lane for category ${competitor.category}`);
      return;
    }
    try {
      await updateDoc(
        doc(db, "competitions", competitionId, "competitors", competitor.id),
        {
          lane: lanes[laneIndex].id,
          status: "lane",
        }
      );
    } catch (err) {
      console.error(err);
      toast.error("Error filling lane");
    }
  };

  const returnDoneCompetitorToLane = async (competitor: Competitor) => {
    if (!competitionId) return;
    const laneIndex = lanes.findIndex(
      (lane) =>
        lane.category === competitor.category && lane.competitor === null
    );
    if (laneIndex === -1) {
      toast.error(`No empty lane for category ${competitor.category}`);
      return;
    }
    try {
      await updateDoc(
        doc(db, "competitions", competitionId, "competitors", competitor.id),
        {
          lane: lanes[laneIndex].id,
          status: "lane",
        }
      );
      toast.success(
        `${competitor.name} returned to lane ${lanes[laneIndex].id}`
      );
    } catch (err) {
      console.error(err);
      toast.error("Error returning competitor");
    }
  };

  if (!competitionId) {
    return <p className="p-6 text-gray-500">Invalid competition</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Link to="/">Home</Link>
      <div className="flex gap-4 h-full">
        <CompetitorsList
          competitionId={competitionId}
          competitors={competitors}
          removeCompetitor={removeCompetitor}
          addCompetitor={addCompetitor}
          fillLaneWithCompetitor={fillLaneWithCompetitor}
        />

        <Lanes
          competitionId={competitionId}
          lanes={lanes}
          autoFillLanes={autoFillLanes}
          clearLane={clearLane}
          clearAllLanes={clearAllLanes}
        />

        <DoneCompetitorsList
          doneCompetitors={doneCompetitors}
          returnDoneCompetitorToLane={returnDoneCompetitorToLane}
        />
      </div>
    </div>
  );
}
