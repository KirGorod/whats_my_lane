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
  writeBatch,
  runTransaction,
} from "firebase/firestore";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { CheckCircle, Flag, Users } from "lucide-react";
import {
  getAllowedCategoriesForLane,
  isCategoryAllowedForLane,
} from "../../utils/laneRules";
import { groupLanesByType, makeWaitingByCategory } from "../../utils/laneUtils";
import type {
  ActionHistory,
  CompetitorPatch,
  LanePatch,
} from "../../types/history";
import { useTranslation } from "react-i18next";
import ScrollToTopButton from "../../components/main/ScrollToTopButton";

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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"competitors" | "lanes" | "done">(
    () =>
      typeof window !== "undefined" && window.innerWidth < 1024
        ? "lanes"
        : "competitors"
  );
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
          locked: !!data.locked,
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

  function groupLanesByType(
    lanes: LaneModel[],
    predicate: (l: LaneModel) => boolean
  ): Map<LaneType, LaneModel[]> {
    const m = new Map<LaneType, LaneModel[]>();
    for (const l of lanes) {
      if (!l.laneType) continue;
      if (!predicate(l)) continue;
      const arr = m.get(l.laneType) ?? [];
      arr.push(l);
      m.set(l.laneType, arr);
    }
    for (const [k, arr] of m) arr.sort((a, b) => a.id - b.id);
    return m;
  }

  function makeWaitingByCategory(waiting: Competitor[]) {
    const m = new Map<string, Competitor[]>();
    for (const c of waiting) {
      const arr = m.get(c.category) ?? [];
      arr.push(c); // your waiting list is already ordered by orderRank asc
      m.set(c.category, arr);
    }
    return {
      pop(cat: string): Competitor | undefined {
        const arr = m.get(cat);
        if (!arr?.length) return undefined;
        const c = arr.shift()!;
        if (arr.length) m.set(cat, arr);
        else m.delete(cat);
        return c;
      },
    };
  }

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
      const batch = writeBatch(db);

      const compPatch: CompetitorPatch = {
        competitorId: competitor.id,
        beforeStatus: competitor.status,
        afterStatus: "done",
      };

      // status -> done
      batch.update(
        doc(db, "exercises", exerciseId, "competitors", competitor.id),
        {
          status: "done",
          order: Date.now(),
        }
      );

      // history
      const actionRef = doc(collection(db, "exercises", exerciseId, "actions"));
      const action: ActionHistory = {
        action: "removeCompetitor",
        createdAt: serverTimestamp(),
        createdBy: null,
        lanes: [], // no lane change
        competitors: [compPatch],
        undone: false,
      };
      batch.set(actionRef, action);

      await batch.commit();
      toast.success(`Competitor ${competitor.name} removed.`);
    } catch (err) {
      console.error(err);
      toast.error("Error updating competitor");
    }
  };

  /** Auto-fill with history (category-first per lane type) */
  const autoFillLanes = async () => {
    if (!exerciseId) return;

    const waitingAll = competitors.filter((c) => c.status === "waiting");
    if (!waitingAll.length)
      return toast.error("No available competitors to fill");

    const batch = writeBatch(db);
    const lanePatches: LanePatch[] = [];
    const compPatches: CompetitorPatch[] = [];
    const waitingByCat = makeWaitingByCategory(waitingAll);

    // ---- 1) NOW (empty lanes) ----
    const freeByType = groupLanesByType(
      lanes,
      (l) => !l.competitor && !l.locked
    );
    for (const [laneType, freeLanes] of freeByType) {
      const priority = getAllowedCategoriesForLane(exerciseType, laneType);
      if (!priority.length) continue;

      const queue = [...freeLanes];
      for (const cat of priority) {
        while (queue.length) {
          const c = waitingByCat.pop(cat);
          if (!c) break;
          const lane = queue.shift()!;

          // record patch
          lanePatches.push({
            laneDocId: lane.laneDocId!,
            laneId: lane.id,
            before: {
              competitor: lane.competitor ?? null,
              readyUp: lane.readyUp ?? null,
            },
            after: {
              competitor: { id: c.id, name: c.name, category: c.category },
              readyUp: lane.readyUp ?? null,
            },
          });
          compPatches.push({
            competitorId: c.id,
            beforeStatus: "waiting",
            afterStatus: "lane",
          });

          // writes
          batch.update(
            doc(db, "exercises", exerciseId, "lanes", lane.laneDocId!),
            {
              competitor: { id: c.id, name: c.name, category: c.category },
            }
          );
          batch.update(doc(db, "exercises", exerciseId, "competitors", c.id), {
            status: "lane",
          });
        }
        if (!queue.length) break;
      }
    }

    // ---- 2) READYUP (lanes with NOW but no READYUP) ----
    const needReadyByType = groupLanesByType(
      lanes,
      (l) => !!l.competitor && !l.readyUp && !l.locked
    );
    for (const [laneType, needReady] of needReadyByType) {
      const priority = getAllowedCategoriesForLane(exerciseType, laneType);
      if (!priority.length) continue;

      const queue = [...needReady];
      for (const cat of priority) {
        while (queue.length) {
          const c = waitingByCat.pop(cat);
          if (!c) break;
          const lane = queue.shift()!;

          lanePatches.push({
            laneDocId: lane.laneDocId!,
            laneId: lane.id,
            before: {
              competitor: lane.competitor ?? null,
              readyUp: lane.readyUp ?? null,
            },
            after: {
              competitor: lane.competitor ?? null,
              readyUp: { id: c.id, name: c.name, category: c.category },
            },
          });
          compPatches.push({
            competitorId: c.id,
            beforeStatus: "waiting",
            afterStatus: "ready",
          });

          batch.update(
            doc(db, "exercises", exerciseId, "lanes", lane.laneDocId!),
            {
              readyUp: { id: c.id, name: c.name, category: c.category },
            }
          );
          batch.update(doc(db, "exercises", exerciseId, "competitors", c.id), {
            status: "ready",
          });
        }
        if (!queue.length) break;
      }
    }

    const total = lanePatches.length;
    if (!total) return toast.error("No lanes could be filled");

    // write history in the same batch (atomic)
    const actionRef = doc(collection(db, "exercises", exerciseId, "actions"));
    batch.set(actionRef, {
      action: "autofill",
      createdAt: serverTimestamp(),
      createdBy: null,
      lanes: lanePatches,
      competitors: compPatches,
      undone: false,
    } satisfies ActionHistory);

    try {
      await batch.commit();
      toast.success(`Auto-filled: ${total} updates saved (undo available)`);
    } catch (err) {
      console.error("Auto-fill failed", err);
      toast.error("Error filling lanes");
    }
  };

  const clearLane = async (laneId: number) => {
    if (!exerciseId) return;
    const lane = lanes.find((l) => l.id === laneId);
    if (!lane || !lane.laneDocId) return toast.error("Lane not found");

    try {
      await runTransaction(db, async (tx) => {
        const lref = doc(db, "exercises", exerciseId, "lanes", lane.laneDocId!);
        const ls = await tx.get(lref);
        if (!ls.exists()) throw new Error("Lane disappeared");
        const data = ls.data() as any;

        const before = {
          competitor: data.competitor ?? null,
          readyUp: data.readyUp ?? null,
        };

        const lanePatches: LanePatch[] = [];
        const compPatches: CompetitorPatch[] = [];

        // NOW -> done
        if (data.competitor?.id) {
          compPatches.push({
            competitorId: data.competitor.id,
            beforeStatus: "lane",
            afterStatus: "done",
          });
          tx.update(
            doc(db, "exercises", exerciseId, "competitors", data.competitor.id),
            { status: "done", order: Date.now() }
          );
        }

        // READYUP -> NOW (if exists)
        let after: { competitor: any; readyUp: any } = {
          competitor: null,
          readyUp: null,
        };
        if (data.readyUp) {
          after = { competitor: { ...data.readyUp }, readyUp: null };
          compPatches.push({
            competitorId: data.readyUp.id,
            beforeStatus: "ready",
            afterStatus: "lane",
          });
          tx.update(
            doc(db, "exercises", exerciseId, "competitors", data.readyUp.id),
            { status: "lane" }
          );
        }

        tx.update(lref, after);

        lanePatches.push({
          laneDocId: lane.laneDocId!,
          laneId: lane.id,
          before,
          after,
        });

        // history doc inside the same tx
        const actionRef = doc(
          collection(db, "exercises", exerciseId, "actions")
        );
        tx.set(actionRef, {
          action: "clearLane",
          createdAt: serverTimestamp(),
          createdBy: null,
          lanes: lanePatches,
          competitors: compPatches,
          undone: false,
        } as ActionHistory);
      });

      toast.success("Lane cleared");
    } catch (err) {
      console.error("Failed to clear lane", err);
      toast.error("Error updating lane");
    }
  };

  /** Next round with history: NOW -> done, READYUP -> NOW */
  const clearAllLanes = async () => {
    if (!exerciseId) return;

    const batch = writeBatch(db);
    const lanePatches: LanePatch[] = [];
    const compPatches: CompetitorPatch[] = [];

    let affected = 0;

    for (const lane of lanes) {
      if (!lane.laneDocId) continue;

      const before = {
        competitor: lane.competitor ?? null,
        readyUp: lane.readyUp ?? null,
      };
      const after = {
        competitor: lane.readyUp ? { ...lane.readyUp } : null,
        readyUp: null,
      };

      // competitor status changes
      if (lane.competitor) {
        compPatches.push({
          competitorId: lane.competitor.id,
          beforeStatus: "lane",
          afterStatus: "done",
        });
        batch.update(
          doc(db, "exercises", exerciseId, "competitors", lane.competitor.id),
          { status: "done", order: Date.now() }
        );
      }
      if (lane.readyUp) {
        compPatches.push({
          competitorId: lane.readyUp.id,
          beforeStatus: "ready",
          afterStatus: "lane",
        });
        batch.update(
          doc(db, "exercises", exerciseId, "competitors", lane.readyUp.id),
          { status: "lane" }
        );
      }

      // lane update
      batch.update(
        doc(db, "exercises", exerciseId, "lanes", lane.laneDocId),
        after
      );
      lanePatches.push({
        laneDocId: lane.laneDocId,
        laneId: lane.id,
        before,
        after,
      });
      affected++;
    }

    if (!affected) return toast.error("No lanes to update");

    const actionRef = doc(collection(db, "exercises", exerciseId, "actions"));
    batch.set(actionRef, {
      action: "nextRound",
      createdAt: serverTimestamp(),
      createdBy: null,
      lanes: lanePatches,
      competitors: compPatches,
      undone: false,
    } satisfies ActionHistory);

    try {
      await batch.commit();
      toast.success("Next round started (undo available)");
    } catch (err) {
      console.error("Next round failed", err);
      toast.error("Error starting next round");
    }
  };
  const fillLaneWithCompetitor = async (competitor: Competitor) => {
    if (!exerciseId) return;

    // pick target lane from current snapshot
    const nowLane = lanes.find(
      (lane) =>
        lane.laneType &&
        !lane.locked &&
        !lane.competitor &&
        isCategoryAllowedForLane(
          exerciseType,
          lane.laneType,
          competitor.category
        )
    );

    const readyLane = !nowLane
      ? lanes.find(
          (lane) =>
            lane.laneType &&
            !lane.locked &&
            lane.competitor &&
            !lane.readyUp &&
            isCategoryAllowedForLane(
              exerciseType,
              lane.laneType,
              competitor.category
            )
        )
      : null;

    const target = nowLane ?? readyLane;
    const mode: "now" | "ready" | null = nowLane
      ? "now"
      : readyLane
      ? "ready"
      : null;

    if (!target || !mode) {
      toast.error(`No compatible lane available for "${competitor.category}"`);
      return;
    }

    try {
      await runTransaction(db, async (tx) => {
        const lref = doc(
          db,
          "exercises",
          exerciseId,
          "lanes",
          target.laneDocId!
        );
        const cref = doc(
          db,
          "exercises",
          exerciseId,
          "competitors",
          competitor.id
        );

        const [ls, cs] = await Promise.all([tx.get(lref), tx.get(cref)]);
        if (!ls.exists() || !cs.exists())
          throw new Error("Lane or competitor disappeared");
        const data = ls.data() as any;

        // verify slot still free
        if (mode === "now" && data.competitor)
          throw new Error("NOW slot already taken");
        if (mode === "ready" && (!data.competitor || data.readyUp))
          throw new Error("READYUP slot not available");

        const before = {
          competitor: data.competitor ?? null,
          readyUp: data.readyUp ?? null,
        };
        const after =
          mode === "now"
            ? {
                competitor: {
                  id: competitor.id,
                  name: competitor.name,
                  category: competitor.category,
                },
                readyUp: data.readyUp ?? null,
              }
            : {
                competitor: data.competitor ?? null,
                readyUp: {
                  id: competitor.id,
                  name: competitor.name,
                  category: competitor.category,
                },
              };

        // lane + competitor status
        tx.update(lref, after);
        tx.update(cref, { status: mode === "now" ? "lane" : "ready" });

        // history
        const actionRef = doc(
          collection(db, "exercises", exerciseId, "actions")
        );
        tx.set(actionRef, {
          action: "fillLane",
          createdAt: serverTimestamp(),
          createdBy: null,
          lanes: [
            {
              laneDocId: target.laneDocId!,
              laneId: target.id,
              before,
              after,
            } as LanePatch,
          ],
          competitors: [
            {
              competitorId: competitor.id,
              beforeStatus: (cs.data() as any).status,
              afterStatus: mode === "now" ? "lane" : "ready",
            } as CompetitorPatch,
          ],
          undone: false,
        } as ActionHistory);
      });

      toast.success(
        mode === "now"
          ? `${competitor.name} assigned to lane ${target.id}`
          : `${competitor.name} queued for lane ${target.id}`
      );
    } catch (err) {
      console.error(err);
      toast.error("Error assigning competitor");
    }
  };

  const returnDoneCompetitorToLane = async (competitor: Competitor) => {
    if (!exerciseId) return;

    const availableLane = lanes.find(
      (lane) =>
        lane.laneType &&
        !lane.locked &&
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
      await runTransaction(db, async (tx) => {
        const lref = doc(
          db,
          "exercises",
          exerciseId,
          "lanes",
          availableLane.laneDocId!
        );
        const cref = doc(
          db,
          "exercises",
          exerciseId,
          "competitors",
          competitor.id
        );

        const [ls, cs] = await Promise.all([tx.get(lref), tx.get(cref)]);
        if (!ls.exists() || !cs.exists())
          throw new Error("Lane or competitor disappeared");
        const data = ls.data() as any;

        if (data.competitor || data.readyUp)
          throw new Error("Lane is no longer free");

        const before = {
          competitor: data.competitor ?? null,
          readyUp: data.readyUp ?? null,
        };
        const after = {
          competitor: {
            id: competitor.id,
            name: competitor.name,
            category: competitor.category,
          },
          readyUp: null,
        };

        // writes
        tx.update(lref, after);
        tx.update(cref, { status: "lane" });

        // history
        const actionRef = doc(
          collection(db, "exercises", exerciseId, "actions")
        );
        tx.set(actionRef, {
          action: "returnDone",
          createdAt: serverTimestamp(),
          createdBy: null,
          lanes: [
            {
              laneDocId: availableLane.laneDocId!,
              laneId: availableLane.id,
              before,
              after,
            } as LanePatch,
          ],
          competitors: [
            {
              competitorId: competitor.id,
              beforeStatus: (cs.data() as any).status,
              afterStatus: "lane",
            } as CompetitorPatch,
          ],
          undone: false,
        } as ActionHistory);
      });

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
      <div className="hidden xl:flex">
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
      <div className="xl:hidden h-[calc(100vh-80px)] bg-white">
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
                <span className="hidden sm:inline">{t("competitors")}</span>
                <span>({competitors.length})</span>
              </TabsTrigger>

              <TabsTrigger
                value="lanes"
                className="flex items-center gap-1 sm:gap-2"
              >
                <Flag className="w-4 h-4" />
                <span className="hidden sm:inline">{t("Lanes")}</span>
                <span>
                  ({activeLanesCount}/{lanes.length})
                </span>
              </TabsTrigger>

              <TabsTrigger
                value="done"
                className="flex items-center gap-1 sm:gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span className="hidden sm:inline">{t("Done")}</span>
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
      <ScrollToTopButton />
    </div>
  );
}
