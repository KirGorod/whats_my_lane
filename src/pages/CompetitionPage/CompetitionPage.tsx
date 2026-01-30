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
  getDocs,
  limit,
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

/** Lane type that controls READY UP (next round takes precedence) */
const readyUpLaneType = (lane: LaneModel): LaneType | null =>
  lane.nextLaneType ?? lane.laneType ?? null;

/** Allowed categories for READY UP (uses nextLaneType if set) */
const getAllowedForReadyUp = (
  exerciseType: ExerciseType,
  lane: LaneModel
): string[] => {
  const lt = readyUpLaneType(lane);
  return lt ? getAllowedCategoriesForLane(exerciseType, lt) : [];
};

/** Check if category can go to READY UP (uses nextLaneType if set) */
const isCategoryAllowedForReady = (
  exerciseType: ExerciseType,
  lane: LaneModel,
  category: string
): boolean => {
  const lt = readyUpLaneType(lane);
  return !!lt && isCategoryAllowedForLane(exerciseType, lt, category);
};

/** Group lanes by READY UP controlling lane type (nextLaneType first) */
function groupLanesByReadyType(
  lanes: LaneModel[],
  predicate: (l: LaneModel) => boolean
): Map<LaneType, LaneModel[]> {
  const m = new Map<LaneType, LaneModel[]>();
  for (const l of lanes) {
    if (!predicate(l)) continue;
    const key = readyUpLaneType(l);
    if (!key) continue;
    const arr = m.get(key) ?? [];
    arr.push(l);
    m.set(key, arr);
  }
  for (const [k, arr] of m) arr.sort((a, b) => a.id - b.id);
  return m;
}

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
          nextLaneType: (LANE_TYPES as readonly string[]).includes(
            data.nextLaneType
          )
            ? (data.nextLaneType as LaneType)
            : null, // ✅ NEW
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

  const addCompetitorsBulk = async (
    list: Array<Omit<Competitor, "id">>
  ): Promise<void> => {
    if (!exerciseId) return;
    if (!list.length) return;
    try {
      const baseRank = Math.max(...competitors.map((c) => c.orderRank ?? 0), 0);
      const batch = writeBatch(db);
      list.forEach((competitor, idx) => {
        const ref = doc(collection(db, "exercises", exerciseId, "competitors"));
        batch.set(ref, {
          ...competitor,
          status: "waiting",
          orderRank: baseRank + idx + 1,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
      toast.success(`Додано ${list.length} атлетів`);
    } catch (err) {
      console.error(err);
      toast.error("Error adding athletes");
    }
  };

  const removeAllByStatus = async (status: "waiting" | "done") => {
    if (!exerciseId) return;
    try {
      const q = query(
        collection(db, "exercises", exerciseId, "competitors"),
        where("status", "==", status)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.info(status === "waiting" ? "Список порожній" : "Завершених немає");
        return;
      }

      // save snapshot for undo
      const snapshot = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      await addDoc(collection(db, "exercises", exerciseId, "removalLogs"), {
        status,
        competitors: snapshot,
        createdAt: serverTimestamp(),
      });

      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      toast.success(
        status === "waiting"
          ? "Усі учасники видалені"
          : "Усі завершені учасники видалені"
      );
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося очистити список");
    }
  };

  const isBot = (c: any) =>
    !!c?.id && (String(c.id).startsWith("bot-") || c.isBot);

  const placeWaitingBotIfAllowed = async (
    laneId: number,
    laneDocId: string,
    laneType: LaneType | null
  ) => {
    if (!exerciseId || !laneDocId || !laneType) return;
    const allowed = getAllowedCategoriesForLane(exerciseType, laneType);
    if (!allowed.length) return;

    try {
      const snap = await getDocs(
        query(
          collection(db, "exercises", exerciseId, "competitors"),
          where("status", "==", "waiting"),
          orderBy("orderRank", "asc"),
          limit(20)
        )
      );
      if (snap.empty) return;

      const candidates = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter(
          (b) =>
            allowed.includes(String(b.category)) &&
            (b.isBot === true || String(b.name).toLowerCase() === "пропуск")
        );
      const picked = candidates[0];
      if (!picked) return;

      const batch = writeBatch(db);
      batch.update(doc(db, "exercises", exerciseId, "competitors", picked.id), {
        status: "lane",
      });
      batch.update(doc(db, "exercises", exerciseId, "lanes", laneDocId), {
        competitor: {
          id: picked.id,
          name: picked.name,
          category: picked.category,
          isBot: true,
        },
      });
      await batch.commit();
      toast.success(`Бот "${picked.name}" додано на доріжку ${laneId}`);
    } catch (err) {
      console.error("Failed to place waiting bot", err);
    }
  };

  const undoLastRemoval = async (status: "waiting" | "done") => {
    if (!exerciseId) return;
    try {
      const logQuery = query(
        collection(db, "exercises", exerciseId, "removalLogs"),
        where("status", "==", status),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const logSnap = await getDocs(logQuery);
      if (logSnap.empty) {
        toast.info("Немає що відновити");
        return;
      }
      const logDoc = logSnap.docs[0];
      const data = logDoc.data() as any;
      const competitorsToRestore: Competitor[] = data.competitors ?? [];
      if (!competitorsToRestore.length) {
        toast.info("Лог порожній");
        return;
      }

      const batch = writeBatch(db);
      let baseRank = 0;
      if (status === "waiting") {
        baseRank = Math.max(...competitors.map((c) => c.orderRank ?? 0), 0);
      }

      competitorsToRestore.forEach((c, idx) => {
        const ref = c.id
          ? doc(db, "exercises", exerciseId, "competitors", c.id)
          : doc(collection(db, "exercises", exerciseId, "competitors"));

        const payload: Record<string, unknown> = {
          ...c,
          status: c.status ?? status,
          createdAt: serverTimestamp(),
        };

        // order/orderRank handling
        if (status === "waiting") {
          payload.orderRank = baseRank + idx + 1;
        } else if (status === "done") {
          payload.order = c.order ?? Date.now() - idx;
        }

        // Firestore can't accept undefined
        Object.keys(payload).forEach((k) => {
          if (payload[k] === undefined) delete payload[k];
        });

        batch.set(ref, payload);
      });

      batch.delete(logDoc.ref); // prevent repeated undo
      await batch.commit();
      toast.success(
        status === "waiting"
          ? "Повернули видалених учасників"
          : "Повернули завершених"
      );
    } catch (err) {
      console.error(err);
      toast.error("Не вдалося відновити");
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
    // Use nextLaneType if present to decide which categories should queue.
    const needReadyByType = groupLanesByReadyType(
      lanes,
      (l) => !!l.competitor && !l.readyUp && !l.locked
    );
    for (const [effectiveType, needReady] of needReadyByType) {
      const priority = getAllowedCategoriesForLane(exerciseType, effectiveType);
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
      let applyType = false;
      let afterCompetitor: any = null;
      let afterReadyUp: any = null;

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
        if (data.competitor?.id && !isBot(data.competitor)) {
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
          if (isBot(data.readyUp)) {
            // promote bot to competitor without touching competitors collection
            after = { competitor: { ...data.readyUp }, readyUp: null };
          } else {
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
        }

        // ✅ Apply pending lane type, if any
        applyType = !!data.nextLaneType && data.nextLaneType !== data.laneType;
        tx.update(lref, {
          ...after,
          ...(applyType
            ? {
                laneType: data.nextLaneType,
                category: data.nextLaneType,
                nextLaneType: null,
              }
            : {}),
        });

        lanePatches.push({
          laneDocId: lane.laneDocId!,
          laneId: lane.id,
          before,
          after: {
            ...after,
            ...(applyType
              ? {
                  // reflect type change in the history AFTER snapshot
                  // (no need to include category mirror in the patch payload if you don’t use it later)
                  laneType: data.nextLaneType,
                }
              : {}),
          } as any,
        });

        // history doc
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

        afterCompetitor = after.competitor;
        afterReadyUp = after.readyUp;
      });

      toast.success(t("LaneCleared", { defaultValue: "Lane cleared" }));

      const laneTypeAfter = applyType ? lane.nextLaneType : lane.laneType;
      const shouldFillBot = !afterCompetitor && !afterReadyUp;
      if (shouldFillBot) {
        await placeWaitingBotIfAllowed(lane.id, lane.laneDocId!, laneTypeAfter);
      }
    } catch (err) {
      console.error("Failed to clear lane", err);
      toast.error(
        t("ErrorUpdatingLane", { defaultValue: "Error updating lane" })
      );
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

      // 🔒 NEW: Skip locked lanes entirely
      if (lane.locked) continue;

      const isBot = (c: any) =>
        !!c?.id && (String(c.id).startsWith("bot-") || c.isBot);

      const before = {
        competitor: lane.competitor ?? null,
        readyUp: lane.readyUp ?? null,
      };

      const afterCore = {
        competitor: lane.readyUp ? { ...lane.readyUp } : null,
        readyUp: null,
      };

      // competitor status changes (only for unlocked lanes)
      if (lane.competitor && !isBot(lane.competitor)) {
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
      if (lane.readyUp && !isBot(lane.readyUp)) {
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

      // ✅ apply nextLaneType if present (only for unlocked lanes)
      const applyType =
        !!lane.nextLaneType && lane.nextLaneType !== lane.laneType;

      const lref = doc(db, "exercises", exerciseId, "lanes", lane.laneDocId);
      batch.update(lref, {
        ...afterCore,
        ...(applyType
          ? {
              laneType: lane.nextLaneType,
              category: lane.nextLaneType,
              nextLaneType: null,
            }
          : {}),
      });

      lanePatches.push({
        laneDocId: lane.laneDocId,
        laneId: lane.id,
        before,
        after: {
          ...afterCore,
          ...(applyType ? { laneType: lane.nextLaneType } : {}),
        } as any,
      });

      affected++;
    }

    if (!affected) {
      return toast.error(
        t("NoLanesToUpdate", { defaultValue: "No lanes to update" })
      );
    }

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
      toast.success(
        t("NextRoundStartedUndoAvailable", {
          defaultValue: "Next round started (undo available)",
        })
      );
    } catch (err) {
      console.error("Next round failed", err);
      toast.error(
        t("ErrorStartingNextRound", {
          defaultValue: "Error starting next round",
        })
      );
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
            !lane.locked &&
            lane.competitor &&
            !lane.readyUp &&
            isCategoryAllowedForReady(exerciseType, lane, competitor.category)
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

    // Helper: which lane type governs READY UP (next round takes precedence)
    const readyUpLaneType = (lane: LaneModel): LaneType | null =>
      lane.nextLaneType ?? lane.laneType ?? null;

    // Compatibility checks
    const compatibleForNow = (lane: LaneModel) =>
      lane.laneType &&
      !lane.locked &&
      isCategoryAllowedForLane(
        exerciseType,
        lane.laneType,
        competitor.category
      );

    const compatibleForReady = (lane: LaneModel) => {
      const lt = readyUpLaneType(lane);
      return (
        !lane.locked &&
        !!lt &&
        isCategoryAllowedForLane(exerciseType, lt, competitor.category)
      );
    };

    // Prefer NOW (empty competitor slot), then READY UP (occupied lane with empty readyUp)
    const nowCandidates = lanes
      .filter((l) => compatibleForNow(l) && l.competitor === null)
      .sort((a, b) => a.id - b.id);

    const readyUpCandidates = lanes
      .filter(
        (l) =>
          compatibleForReady(l) && l.competitor !== null && l.readyUp === null
      )
      .sort((a, b) => a.id - b.id);

    // Try a single placement atomically
    const tryAssign = async (
      targetLane: LaneModel,
      slot: "now" | "readyUp"
    ): Promise<boolean> => {
      try {
        await runTransaction(db, async (tx) => {
          const lref = doc(
            db,
            "exercises",
            exerciseId,
            "lanes",
            targetLane.laneDocId!
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

          // Re‑validate slot availability atomically
          if (slot === "now") {
            if (data.competitor)
              throw new Error("Lane competitor slot is no longer free");
            // Validate AGAINST CURRENT laneType
            const currentLt: LaneType | null =
              data.laneType &&
              (LANE_TYPES as readonly string[]).includes(data.laneType)
                ? (data.laneType as LaneType)
                : null;
            if (
              !currentLt ||
              !isCategoryAllowedForLane(
                exerciseType,
                currentLt,
                competitor.category
              )
            ) {
              throw new Error(
                "Category not allowed for current lane type (NOW)"
              );
            }
          } else {
            if (data.readyUp)
              throw new Error("Lane readyUp slot is no longer free");
            if (!data.competitor)
              throw new Error("Cannot place readyUp on an empty lane");

            // Validate AGAINST nextLaneType ?? laneType
            const effectiveLt: LaneType | null = (() => {
              const nx = data.nextLaneType;
              const cur = data.laneType;
              if (nx && (LANE_TYPES as readonly string[]).includes(nx))
                return nx as LaneType;
              if (cur && (LANE_TYPES as readonly string[]).includes(cur))
                return cur as LaneType;
              return null;
            })();

            if (
              !effectiveLt ||
              !isCategoryAllowedForLane(
                exerciseType,
                effectiveLt,
                competitor.category
              )
            ) {
              throw new Error(
                "Category not allowed for next/current lane type (READY UP)"
              );
            }
          }

          const before = {
            competitor: data.competitor ?? null,
            readyUp: data.readyUp ?? null,
          };

          const competitorPayload = {
            id: competitor.id,
            name: competitor.name,
            category: competitor.category,
          };

          const after =
            slot === "now"
              ? {
                  competitor: competitorPayload,
                  ...(data.readyUp !== undefined
                    ? { readyUp: data.readyUp }
                    : {}),
                }
              : {
                  ...(data.competitor !== undefined
                    ? { competitor: data.competitor }
                    : {}),
                  readyUp: competitorPayload,
                };

          // Writes
          tx.update(lref, after);
          tx.update(cref, { status: slot === "now" ? "lane" : "ready" }); // ✅ keep "ready" consistent with the rest

          // History
          const actionRef = doc(
            collection(db, "exercises", exerciseId, "actions")
          );
          tx.set(actionRef, {
            action: "returnDone",
            slot, // "now" | "readyUp"
            createdAt: serverTimestamp(),
            createdBy: null,
            lanes: [
              {
                laneDocId: targetLane.laneDocId!,
                laneId: targetLane.id,
                before,
                after,
              } as LanePatch,
            ],
            competitors: [
              {
                competitorId: competitor.id,
                beforeStatus: (cs.data() as any).status,
                afterStatus: slot === "now" ? "lane" : "ready", // ✅ consistent
              } as CompetitorPatch,
            ],
            undone: false,
          } as ActionHistory);
        });

        toast.success(
          slot === "now"
            ? `${competitor.name} assigned to lane ${targetLane.id}`
            : `${competitor.name} queued in ready up on lane ${targetLane.id}`
        );
        return true;
      } catch (err) {
        // Silent for retry; log for debug
        console.warn(
          `[returnDoneCompetitorToLane] retryable failure on slot=${slot}`,
          err
        );
        return false;
      }
    };

    // Try NOW first, then READY UP
    for (const ln of nowCandidates) {
      const ok = await tryAssign(ln, "now");
      if (ok) return;
    }
    for (const ln of readyUpCandidates) {
      const ok = await tryAssign(ln, "readyUp");
      if (ok) return;
    }

    toast.error(
      `No compatible lane or ready up slot for ${competitor.category}`
    );
  };

  // --- UPDATED: move competitor(s) back to waiting AT THE TOP ---
  const returnCompetitorToWaiting = async (
    laneId: number,
    slot: "now" | "readyUp"
  ) => {
    if (!exerciseId) return;
    const lane = lanes.find((l) => l.id === laneId);
    if (!lane || !lane.laneDocId) return toast.error("Lane not found");
    if (lane.locked) return toast.error("Lane is locked");

    try {
      await runTransaction(db, async (tx) => {
        const lref = doc(db, "exercises", exerciseId, "lanes", lane.laneDocId!);
        const mref = doc(db, "exercises", exerciseId, "meta", "ordering"); // counter holder

        const ls = await tx.get(lref);
        if (!ls.exists()) throw new Error("Lane disappeared");
        const data = ls.data() as any;

        // Ensure meta doc exists and read current counter
        const ms = await tx.get(mref);
        let topCounter = 0;
        if (ms.exists()) {
          const md = ms.data() as any;
          topCounter = Number(md.topCounter ?? 0);
        }

        const before = {
          competitor: data.competitor ?? null,
          readyUp: data.readyUp ?? null,
        };

        const lanePatches: LanePatch[] = [];
        const compPatches: CompetitorPatch[] = [];

        if (slot === "now") {
          if (!data.competitor) throw new Error("No competitor in NOW");

          // Decrement counter for NOW-returned competitor
          topCounter -= 1;
          const compNowId = data.competitor.id;
          tx.update(
            doc(db, "exercises", exerciseId, "competitors", compNowId),
            { status: "waiting", orderRank: topCounter }
          );
          compPatches.push({
            competitorId: compNowId,
            beforeStatus: "lane",
            afterStatus: "waiting",
          });

          // Promote READYUP to NOW if exists
          let after: { competitor: any; readyUp: any } = {
            competitor: null,
            readyUp: null,
          };

          if (data.readyUp) {
            const readyId = data.readyUp.id;
            after = { competitor: { ...data.readyUp }, readyUp: null };

            tx.update(
              doc(db, "exercises", exerciseId, "competitors", readyId),
              { status: "lane" }
            );
            compPatches.push({
              competitorId: readyId,
              beforeStatus: "ready",
              afterStatus: "lane",
            });
          }

          // Persist lane change
          tx.update(lref, after);

          // Save the updated counter
          tx.set(mref, { topCounter }, { merge: true });

          lanePatches.push({
            laneDocId: lane.laneDocId!,
            laneId: lane.id,
            before,
            after,
          });
        } else {
          // slot === "readyUp"
          if (!data.readyUp) throw new Error("No competitor in READY UP");

          // Decrement counter for READYUP-returned competitor
          topCounter -= 1;
          const readyId = data.readyUp.id;
          tx.update(doc(db, "exercises", exerciseId, "competitors", readyId), {
            status: "waiting",
            orderRank: topCounter,
          });
          compPatches.push({
            competitorId: readyId,
            beforeStatus: "ready",
            afterStatus: "waiting",
          });

          const after = {
            competitor: data.competitor ?? null,
            readyUp: null,
          };

          tx.update(lref, after);

          // Save the updated counter
          tx.set(mref, { topCounter }, { merge: true });

          lanePatches.push({
            laneDocId: lane.laneDocId!,
            laneId: lane.id,
            before,
            after,
          });
        }

        // History
        const actionRef = doc(
          collection(db, "exercises", exerciseId, "actions")
        );
        const action: ActionHistory = {
          action: "returnToWaiting",
          createdAt: serverTimestamp(),
          createdBy: null,
          lanes: lanePatches,
          competitors: compPatches,
          undone: false,
        };
        tx.set(actionRef, action);
      });

      toast.success(
        slot === "now"
          ? "Moved NOW competitor to top of waiting"
          : "Moved READY UP competitor to top of waiting"
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to return competitor to waiting");
    }
  };

  const returnFromNow = (laneId: number) =>
    returnCompetitorToWaiting(laneId, "now");
  const returnFromReadyUp = (laneId: number) =>
    returnCompetitorToWaiting(laneId, "readyUp");

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
            addCompetitorsBulk={addCompetitorsBulk}
            removeAllCompetitors={() => removeAllByStatus("waiting")}
            undoRemoveAllCompetitors={() => undoLastRemoval("waiting")}
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
            returnFromNow={returnFromNow}
            returnFromReadyUp={returnFromReadyUp}
          />
        </div>

        <div className="w-1/5 bg-white">
          <DoneCompetitorsList
            doneCompetitors={doneCompetitors}
            returnDoneCompetitorToLane={returnDoneCompetitorToLane}
            removeAllDone={() => removeAllByStatus("done")}
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
              addCompetitorsBulk={addCompetitorsBulk}
              removeAllCompetitors={() => removeAllByStatus("waiting")}
              undoRemoveAllCompetitors={() => undoLastRemoval("waiting")}
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
              returnFromNow={returnFromNow}
              returnFromReadyUp={returnFromReadyUp}
            />
          </TabsContent>

          <TabsContent value="done" className="flex-1 m-0">
            <DoneCompetitorsList
              doneCompetitors={doneCompetitors}
              returnDoneCompetitorToLane={returnDoneCompetitorToLane}
              removeAllDone={() => removeAllByStatus("done")}
              undoRemoveAllDone={() => undoLastRemoval("done")}
            />
          </TabsContent>
        </Tabs>
      </div>
      <ScrollToTopButton />
    </div>
  );
}
