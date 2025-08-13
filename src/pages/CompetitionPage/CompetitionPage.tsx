import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { Competitor } from "../../types/competitor";
import type { ExerciseType, ExerciseStatus } from "../../types/exercise";
import type { LaneModel, LaneType } from "../../types/lane";
import { LANE_TYPES } from "../../types/lane";
import CompetitorsList from "./components/CompetitorsList";
import Lanes from "./components/Lanes";
import DoneCompetitorsList from "./components/DoneCompetitorsList";
import CompetitionHeader from "./components/CompetitionHeader";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { CheckCircle, Flag, Users } from "lucide-react";
import { isCategoryAllowedForLane } from "../../utils/laneRules";

const normalizeExerciseType = (raw: any): ExerciseType => {
  const v = String(raw ?? "").toLowerCase();
  if (v === "bench" || v === "kettle" || v === "airbike" || v === "rowing")
    return v as ExerciseType;
  if (v === "strength") return "bench";
  if (v === "cardio") return "airbike";
  if (v === "flexibility") return "rowing";
  return "bench";
};

export default function CompetitionPage() {
  const [activeTab, setActiveTab] = useState("competitors");
  const { exerciseId } = useParams<{ exerciseId: string }>();

  const [exerciseType, setExerciseType] = useState<ExerciseType>("bench");
  const [exerciseName, setExerciseName] = useState<string | undefined>(
    undefined
  );
  const [exerciseStatus, setExerciseStatus] =
    useState<ExerciseStatus>("planned");

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [doneCompetitors, setDoneCompetitors] = useState<Competitor[]>([]);
  const [lanes, setLanes] = useState<LaneModel[]>([]);

  // Load exercise meta (name, status, type)
  useEffect(() => {
    if (!exerciseId) return;
    const unsub = onSnapshot(doc(db, "exercises", exerciseId), (snap) => {
      const data = snap.data() as any;
      if (!data) return;
      setExerciseType(normalizeExerciseType(data?.type));
      setExerciseName(data?.name);
      if (
        data?.status === "planned" ||
        data?.status === "ongoing" ||
        data?.status === "finished"
      ) {
        setExerciseStatus(data.status);
      }
    });
    return () => unsub();
  }, [exerciseId]);

  // Live collections
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
      const lanesData: LaneModel[] = snap.docs.map((d) => {
        const data = d.data() as any;
        const laneType: LaneType | null = (
          LANE_TYPES as readonly string[]
        ).includes(data.laneType)
          ? (data.laneType as LaneType)
          : (LANE_TYPES as readonly string[]).includes(data.category)
          ? (data.category as LaneType)
          : null;

        return {
          laneDocId: d.id,
          id: data.id,
          laneType,
          category: laneType, // mirror for back-compat
          competitor: data.competitor ?? null,
          readyUp: data.readyUp ?? null,
        } as LaneModel;
      });
      setLanes(lanesData);
    });

    return () => {
      unsubWaiting();
      unsubDone();
      unsubLanes();
    };
  }, [exerciseId]);

  const waitingCompetitors = useMemo(
    () => competitors.filter((c) => c.status === "waiting"),
    [competitors]
  );

  // CRUD helpers
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
    } catch {
      toast.error("Error adding competitor");
    }
  };

  const removeCompetitor = async (competitor: Competitor) => {
    if (!exerciseId) return;
    try {
      await updateDoc(
        doc(db, "exercises", exerciseId, "competitors", competitor.id),
        { status: "done", order: Date.now() }
      );
      toast.success(`Competitor ${competitor.name} removed.`);
    } catch (err) {
      console.error(err);
      toast.error("Error updating competitor");
    }
  };

  /** Auto-fill: fill NOW first, then READYUP; both respect laneType rules */
  const autoFillLanes = async () => {
    if (!exerciseId) return;

    let remaining = [...waitingCompetitors];
    if (!remaining.length) {
      toast.error("No available competitors to fill");
      return;
    }

    const batch: Promise<void>[] = [];

    // Step 1: Fill NOW
    for (const lane of lanes) {
      if (!lane.laneType || lane.competitor) continue;
      const match = remaining.find((c) =>
        isCategoryAllowedForLane(exerciseType, lane.laneType, c.category)
      );
      if (match) {
        batch.push(
          updateDoc(
            doc(db, "exercises", exerciseId, "lanes", lane.laneDocId!),
            {
              competitor: {
                id: match.id,
                name: match.name,
                category: match.category,
              },
            }
          ) as unknown as Promise<void>
        );
        batch.push(
          updateDoc(doc(db, "exercises", exerciseId, "competitors", match.id), {
            status: "lane",
          }) as unknown as Promise<void>
        );
        remaining = remaining.filter((c) => c.id !== match.id);
      }
    }

    // Step 2: Fill READYUP
    for (const lane of lanes) {
      if (!lane.laneType || !lane.competitor || lane.readyUp) continue;
      const match = remaining.find((c) =>
        isCategoryAllowedForLane(exerciseType, lane.laneType, c.category)
      );
      if (match) {
        batch.push(
          updateDoc(
            doc(db, "exercises", exerciseId, "lanes", lane.laneDocId!),
            {
              readyUp: {
                id: match.id,
                name: match.name,
                category: match.category,
              },
            }
          ) as unknown as Promise<void>
        );
        batch.push(
          updateDoc(doc(db, "exercises", exerciseId, "competitors", match.id), {
            status: "ready",
          }) as unknown as Promise<void>
        );
        remaining = remaining.filter((c) => c.id !== match.id);
      }
    }

    if (!batch.length) {
      toast.error("No lanes could be filled");
      return;
    }

    try {
      await Promise.all(batch);
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

    // NOW -> done
    if (lane.competitor) {
      try {
        await updateDoc(
          doc(db, "exercises", exerciseId, "competitors", lane.competitor.id),
          { status: "done", order: Date.now() }
        );
      } catch (err) {
        console.error("Failed to mark competitor as done", err);
        toast.error("Failed to mark current competitor as done");
        return;
      }
    }

    // READYUP -> NOW or clear
    if (lane.readyUp) {
      updates.competitor = { ...lane.readyUp };
      updates.readyUp = null;
      try {
        await updateDoc(
          doc(db, "exercises", exerciseId, "competitors", lane.readyUp.id),
          { status: "lane" }
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
    const batch: Promise<void>[] = [];

    for (const lane of lanes) {
      if (!lane.laneDocId) continue;

      const laneUpdates: any = { competitor: null, readyUp: null };

      if (lane.competitor) {
        batch.push(
          updateDoc(
            doc(db, "exercises", exerciseId, "competitors", lane.competitor.id),
            { status: "done", order: Date.now() }
          ) as unknown as Promise<void>
        );
      }

      if (lane.readyUp) {
        laneUpdates.competitor = { ...lane.readyUp };
        batch.push(
          updateDoc(
            doc(db, "exercises", exerciseId, "competitors", lane.readyUp.id),
            { status: "lane" }
          ) as unknown as Promise<void>
        );
      }

      batch.push(
        updateDoc(
          doc(db, "exercises", exerciseId, "lanes", lane.laneDocId),
          laneUpdates
        ) as unknown as Promise<void>
      );
    }

    if (!batch.length) {
      toast.error("No lanes to update");
      return;
    }

    try {
      await Promise.all(batch);
      toast.success("Next round started");
    } catch (err) {
      console.error("Next round failed", err);
      toast.error("Error starting next round");
    }
  };

  const fillLaneWithCompetitor = async (competitor: Competitor) => {
    if (!exerciseId) return;

    // Try NOW
    const nowLane = lanes.find(
      (lane) =>
        lane.laneType &&
        !lane.competitor &&
        isCategoryAllowedForLane(
          exerciseType,
          lane.laneType,
          competitor.category
        )
    );
    if (nowLane) {
      try {
        await updateDoc(
          doc(db, "exercises", exerciseId, "lanes", nowLane.laneDocId!),
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
          { status: "lane" }
        );
        toast.success(`${competitor.name} assigned to lane ${nowLane.id}`);
        return;
      } catch (err) {
        console.error(err);
        toast.error("Error assigning to lane");
        return;
      }
    }

    // Try READYUP
    const readyLane = lanes.find(
      (lane) =>
        lane.laneType &&
        lane.competitor &&
        !lane.readyUp &&
        isCategoryAllowedForLane(
          exerciseType,
          lane.laneType,
          competitor.category
        )
    );
    if (readyLane) {
      try {
        await updateDoc(
          doc(db, "exercises", exerciseId, "lanes", readyLane.laneDocId!),
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
          { status: "ready" }
        );
        toast.success(`${competitor.name} queued for lane ${readyLane.id}`);
        return;
      } catch (err) {
        console.error(err);
        toast.error("Error assigning to ready slot");
        return;
      }
    }

    toast.error(`No compatible lane available for "${competitor.category}"`);
  };

  const returnDoneCompetitorToLane = async (competitor: Competitor) => {
    if (!exerciseId) return;

    const availableLane = lanes.find(
      (lane) =>
        lane.laneType &&
        lane.competitor === null &&
        lane.readyUp === null &&
        isCategoryAllowedForLane(
          exerciseType,
          lane.laneType,
          competitor.category
        )
    );

    if (!availableLane) {
      toast.error(`No free compatible lane for ${competitor.category}`);
      return;
    }

    try {
      await Promise.all([
        updateDoc(
          doc(db, "exercises", exerciseId, "lanes", availableLane.laneDocId!),
          {
            competitor: {
              id: competitor.id,
              name: competitor.name,
              category: competitor.category,
            },
          }
        ) as unknown as Promise<void>,
        updateDoc(
          doc(db, "exercises", exerciseId, "competitors", competitor.id),
          { status: "lane" }
        ) as unknown as Promise<void>,
      ]);
      toast.success(`${competitor.name} assigned to lane ${availableLane.id}`);
    } catch (err) {
      console.error("Failed to return competitor", err);
      toast.error("Failed to return competitor to lane");
    }
  };

  if (!exerciseId) {
    return <p className="p-6 text-gray-500">Invalid competition</p>;
  }

  const activeLanesCount = lanes.filter((l) => !!l.competitor).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header with name and status */}
      <CompetitionHeader
        exerciseId={exerciseId}
        name={exerciseName}
        status={exerciseStatus}
        type={exerciseType}
      />

      {/* Desktop */}
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

      {/* Mobile/Tablet */}
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
                  ({activeLanesCount}/{lanes.length})
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="done"
                className="flex items-center gap-1 sm:gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Done</span>
                <span>({doneCompetitors.length})</span>
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
