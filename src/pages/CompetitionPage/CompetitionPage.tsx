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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { CheckCircle, Flag, Users } from "lucide-react";

interface Lane {
  id: number;
  category: string | null;
  competitor: Competitor | null; // Now
  readyUp: Competitor | null; // Next
  laneDocId?: string;
}

export default function CompetitionPage() {
  const [activeTab, setActiveTab] = useState("competitors");
  const { exerciseId } = useParams<{ exerciseId: string }>();

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [doneCompetitors, setDoneCompetitors] = useState<Competitor[]>([]);
  const [lanes, setLanes] = useState<Lane[]>([]);

  useEffect(() => {
    if (!exerciseId) return;

    const waitingQuery = query(
      collection(db, "exercises", exerciseId, "competitors"),
      where("status", "==", "waiting"),
      orderBy("orderRank", "asc")
    );

    const unsubWaiting = onSnapshot(waitingQuery, (snap) => {
      setCompetitors(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Competitor))
      );
    });

    const doneQuery = query(
      collection(db, "exercises", exerciseId, "competitors"),
      where("status", "==", "done"),
      orderBy("order", "desc")
    );
    const unsubDone = onSnapshot(doneQuery, (snap) => {
      setDoneCompetitors(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Competitor))
      );
    });

    const lanesQuery = query(
      collection(db, "exercises", exerciseId, "lanes"),
      orderBy("id", "asc")
    );

    const unsubLanes = onSnapshot(lanesQuery, (snap) => {
      const lanesData: Lane[] = snap.docs.map((doc) => ({
        laneDocId: doc.id,
        ...doc.data(),
      })) as Lane[];
      setLanes(lanesData);
    });

    return () => {
      unsubWaiting();
      unsubDone();
      unsubLanes();
    };
  }, [exerciseId]);

  const addCompetitor = async (competitor: Omit<Competitor, "id">) => {
    if (!exerciseId) return;
    try {
      const maxRank = Math.max(...competitors.map((c) => c.orderRank ?? 0), 0);

      await addDoc(collection(db, "exercises", exerciseId, "competitors"), {
        ...competitor,
        status: "waiting",
        orderRank: maxRank + 1,
        createdAt: serverTimestamp(),
      });
      toast.success("Competitor added");
    } catch (err) {
      toast.error("Error adding competitor");
    }
  };

  const removeCompetitor = async (index: number) => {
    if (!exerciseId) return;
    const competitorToMove = competitors[index];
    if (!competitorToMove) return;
    try {
      await updateDoc(
        doc(db, "exercises", exerciseId, "competitors", competitorToMove.id),
        {
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
    if (!exerciseId) return;

    let remainingCompetitors = [...competitors].filter(
      (c) => c.status === "waiting"
    );

    if (remainingCompetitors.length === 0) {
      toast.error("No available competitors to fill");
      return;
    }

    const batchPromises: Promise<void>[] = [];

    // 🔹 Step 1: Fill "competitor" (Now)
    for (const lane of lanes) {
      if (!lane.category || lane.competitor) continue;

      const match = remainingCompetitors.find(
        (c) => c.category === lane.category
      );

      if (match) {
        batchPromises.push(
          updateDoc(
            doc(db, "exercises", exerciseId, "lanes", lane.laneDocId!),
            {
              competitor: {
                id: match.id,
                name: match.name,
                category: match.category,
              },
            }
          )
        );

        batchPromises.push(
          updateDoc(doc(db, "exercises", exerciseId, "competitors", match.id), {
            status: "lane",
          })
        );

        remainingCompetitors = remainingCompetitors.filter(
          (c) => c.id !== match.id
        );
      }
    }

    // 🔹 Step 2: Fill "readyUp" (Next) only for lanes where competitor is set
    for (const lane of lanes) {
      if (!lane.category || !lane.competitor || lane.readyUp) continue;

      const match = remainingCompetitors.find(
        (c) => c.category === lane.category
      );

      if (match) {
        batchPromises.push(
          updateDoc(
            doc(db, "exercises", exerciseId, "lanes", lane.laneDocId!),
            {
              readyUp: {
                id: match.id,
                name: match.name,
                category: match.category,
              },
            }
          )
        );

        batchPromises.push(
          updateDoc(doc(db, "exercises", exerciseId, "competitors", match.id), {
            status: "ready",
          })
        );

        remainingCompetitors = remainingCompetitors.filter(
          (c) => c.id !== match.id
        );
      }
    }

    if (batchPromises.length === 0) {
      toast.error("No lanes could be filled");
      return;
    }

    try {
      await Promise.all(batchPromises);
      toast.success("Lanes filled successfully");
    } catch (err) {
      console.error("Auto-fill failed", err);
      toast.error("Error filling lanes");
    }
  };

  const clearLane = async (laneId: number) => {
    if (!exerciseId) return;

    const lane = lanes.find((l) => l.id === laneId);
    if (!lane || !lane.laneDocId) {
      toast.error("Lane not found");
      return;
    }

    const updates: any = {};

    // Step 1: Move current competitor to done
    if (lane.competitor) {
      try {
        await updateDoc(
          doc(db, "exercises", exerciseId, "competitors", lane.competitor.id),
          {
            status: "done",
            order: Date.now(),
          }
        );
      } catch (err) {
        console.error("Failed to mark competitor as done", err);
        toast.error("Failed to mark current competitor as done");
        return;
      }
    }

    // Step 2: Move readyUp to competitor slot
    if (lane.readyUp) {
      updates.competitor = { ...lane.readyUp };
      updates.readyUp = null;

      try {
        await updateDoc(
          doc(db, "exercises", exerciseId, "competitors", lane.readyUp.id),
          {
            status: "lane",
          }
        );
      } catch (err) {
        console.error("Failed to update ready competitor", err);
        toast.error("Failed to move next competitor into lane");
        return;
      }
    } else {
      updates.competitor = null;
      updates.readyUp = null;
    }

    // Step 3: Update lane in Firestore
    try {
      await updateDoc(
        doc(db, "exercises", exerciseId, "lanes", lane.laneDocId),
        updates
      );
      toast.success("Lane cleared");
    } catch (err) {
      console.error("Failed to update lane", err);
      toast.error("Error updating lane");
    }
  };

  const clearAllLanes = async () => {
    if (!exerciseId) return;

    const batchPromises: Promise<void>[] = [];

    for (const lane of lanes) {
      if (!lane.laneDocId) continue;

      const laneUpdates: any = {
        competitor: null,
        readyUp: null,
      };

      // 1. Mark current competitor as done
      if (lane.competitor) {
        batchPromises.push(
          updateDoc(
            doc(db, "exercises", exerciseId, "competitors", lane.competitor.id),
            {
              status: "done",
              order: Date.now(),
            }
          )
        );
      }

      // 2. Move readyUp → competitor
      if (lane.readyUp) {
        laneUpdates.competitor = { ...lane.readyUp };

        batchPromises.push(
          updateDoc(
            doc(db, "exercises", exerciseId, "competitors", lane.readyUp.id),
            {
              status: "lane",
            }
          )
        );
      }

      // 3. Update lane with new competitor and cleared readyUp
      batchPromises.push(
        updateDoc(
          doc(db, "exercises", exerciseId, "lanes", lane.laneDocId),
          laneUpdates
        )
      );
    }

    if (batchPromises.length === 0) {
      toast.error("No lanes to update");
      return;
    }

    try {
      await Promise.all(batchPromises);
      toast.success("Next round started");
    } catch (err) {
      console.error("Next round failed", err);
      toast.error("Error starting next round");
    }
  };

  const fillLaneWithCompetitor = async (competitor: Competitor) => {
    if (!exerciseId) return;

    // Step 1: Find all lanes matching competitor's category
    const matchingLanes = lanes.filter(
      (lane) => lane.category === competitor.category
    );

    if (matchingLanes.length === 0) {
      toast.error(`No lanes configured for category "${competitor.category}"`);
      return;
    }

    // Step 2: Try to assign to empty 'competitor' slot (Now)
    const emptyNowLane = matchingLanes.find((lane) => !lane.competitor);
    if (emptyNowLane) {
      try {
        await updateDoc(
          doc(db, "exercises", exerciseId, "lanes", emptyNowLane.laneDocId!),
          {
            competitor: {
              id: competitor.id,
              name: competitor.name,
              category: competitor.category,
            },
          }
        );

        await updateDoc(
          doc(db, "exercises", exerciseId, "competitors", competitor.id),
          {
            status: "lane",
          }
        );

        toast.success(`${competitor.name} assigned to lane ${emptyNowLane.id}`);
        return;
      } catch (err) {
        console.error(err);
        toast.error("Error assigning to lane");
        return;
      }
    }

    // Step 3: Try to assign to empty 'readyUp' slot (Next)
    const emptyReadyLane = matchingLanes.find(
      (lane) => lane.competitor && !lane.readyUp
    );
    if (emptyReadyLane) {
      try {
        await updateDoc(
          doc(db, "exercises", exerciseId, "lanes", emptyReadyLane.laneDocId!),
          {
            readyUp: {
              id: competitor.id,
              name: competitor.name,
              category: competitor.category,
            },
          }
        );

        await updateDoc(
          doc(db, "exercises", exerciseId, "competitors", competitor.id),
          {
            status: "ready",
          }
        );

        toast.success(
          `${competitor.name} queued for lane ${emptyReadyLane.id}`
        );
        return;
      } catch (err) {
        console.error(err);
        toast.error("Error assigning to ready slot");
        return;
      }
    }

    // Step 4: No slots available
    toast.error(
      `All lanes for "${competitor.category}" are full. Try again later.`
    );
  };

  const returnDoneCompetitorToLane = async () => {};

  if (!exerciseId) {
    return <p className="p-6 text-gray-500">Invalid competition</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Desktop Layout - 3 Columns */}
      <div className="hidden lg:flex">
        <div className="w-1/5 border-r border-gray-200 bg-white">
          <CompetitorsList
            exerciseId={exerciseId}
            competitors={competitors}
            removeCompetitor={removeCompetitor}
            addCompetitor={addCompetitor}
            fillLaneWithCompetitor={fillLaneWithCompetitor}
          />
        </div>

        <div className="w-3/5 border-r border-gray-200 bg-white">
          <Lanes
            exerciseId={exerciseId}
            lanes={lanes}
            autoFillLanes={autoFillLanes}
            clearLane={clearLane}
            clearAllLanes={clearAllLanes}
          />
        </div>

        <div className="w-1/5 bg-white">
          <DoneCompetitorsList
            doneCompetitors={doneCompetitors}
            returnDoneCompetitorToLane={returnDoneCompetitorToLane}
          />
        </div>
      </div>

      {/* Mobile/Tablet Layout - Tabs */}
      <div className="lg:hidden h-[calc(100vh-80px)] bg-white">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          <div className="border-b border-gray-200 px-4">
            <TabsList className="grid w-full grid-cols-3 bg-gray-50">
              <TabsTrigger
                value="competitors"
                className="flex items-center gap-1 sm:gap-2"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Competitors</span>
                <span>({competitors.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="lanes"
                className="flex items-center gap-1 sm:gap-2"
              >
                <Flag className="w-4 h-4" />
                <span className="hidden sm:inline">Lanes</span>
                <span>
                  ({99}/{lanes.length})
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="done"
                className="flex items-center gap-1 sm:gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Done</span>
                <span>({99})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="competitors" className="flex-1 m-0">
            <CompetitorsList
              exerciseId={exerciseId}
              competitors={competitors}
              removeCompetitor={removeCompetitor}
              addCompetitor={addCompetitor}
              fillLaneWithCompetitor={fillLaneWithCompetitor}
            />
          </TabsContent>

          <TabsContent value="lanes" className="flex-1 m-0">
            <Lanes
              exerciseId={exerciseId}
              lanes={lanes}
              autoFillLanes={autoFillLanes}
              clearLane={clearLane}
              clearAllLanes={clearAllLanes}
            />
          </TabsContent>

          <TabsContent value="done" className="flex-1 m-0">
            <DoneCompetitorsList
              doneCompetitors={doneCompetitors}
              returnDoneCompetitorToLane={returnDoneCompetitorToLane}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
