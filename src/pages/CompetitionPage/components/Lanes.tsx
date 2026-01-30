import { useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  orderBy,
  limit,
  query,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { where as whereFilter } from "firebase/firestore";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Flag, Zap, RotateCcw, ArrowBigRightDash } from "lucide-react";
import Lane from "./Lane";
import type { LaneModel, LaneType } from "../../../types/lane";
import type { ExerciseType } from "../../../types/exercise";
import { LANE_TYPES_BY_EXERCISE } from "../../../config/laneTypesByExercise";
import { LANE_TYPES } from "../../../types/lane";
import type { ActionHistory } from "../../../types/history";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../components/ui/alert-dialog";
import { useTranslation } from "react-i18next";

interface Props {
  lanes: LaneModel[];
  autoFillLanes: () => void;
  clearLane: (laneId: number) => void;
  clearAllLanes: () => void;
  exerciseId: string;

  /** Move NOW competitor back to waiting (top). */
  returnFromNow: (laneId: number) => Promise<void>;
  /** Move READY UP competitor back to waiting (top). */
  returnFromReadyUp: (laneId: number) => Promise<void>;
}

// Normalize legacy exercise types to the new ones
const normalizeExerciseType = (raw: any): ExerciseType => {
  const v = String(raw ?? "").toLowerCase();
  if (v === "bench" || v === "kettle" || v === "airbike" || v === "rowing")
    return v as ExerciseType;
  if (v === "strength") return "bench";
  if (v === "cardio") return "airbike";
  if (v === "flexibility") return "rowing";
  return "bench";
};

export default function Lanes({
  lanes,
  autoFillLanes,
  clearLane,
  clearAllLanes,
  exerciseId,
  returnFromNow,
  returnFromReadyUp,
}: Props) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [exerciseType, setExerciseType] = useState<ExerciseType>("bench");
  const [undoBusy, setUndoBusy] = useState(false);

  // Tracks in-flight operations per-lane to lock/grey-out those lanes.
  const [pendingLaneIds, setPendingLaneIds] = useState<Set<number>>(new Set());

  const setLanePending = (laneId: number, pending: boolean) => {
    setPendingLaneIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(laneId);
      else next.delete(laneId);
      return next;
    });
  };

  const handleDone = async (laneId: number) => {
    setLanePending(laneId, true);
    try {
      await Promise.resolve(clearLane(laneId));
    } finally {
      setLanePending(laneId, false);
    }
  };

  // NEW: wrap return actions with the same pending/lock behavior
  const handleReturnFromNow = async (laneId: number) => {
    setLanePending(laneId, true);
    try {
      await returnFromNow(laneId);
    } finally {
      setLanePending(laneId, false);
    }
  };

  const handleReturnFromReadyUp = async (laneId: number) => {
    setLanePending(laneId, true);
    try {
      await returnFromReadyUp(laneId);
    } finally {
      setLanePending(laneId, false);
    }
  };

  // Live exercise type (normalized)
  useEffect(() => {
    if (!exerciseId) return;
    const unsub = onSnapshot(doc(db, "exercises", exerciseId), (snap) => {
      const data = snap.data() as any;
      setExerciseType(normalizeExerciseType(data?.type));
    });
    return () => unsub();
  }, [exerciseId]);

  const undoLastAction = async () => {
    if (!exerciseId) return;

    try {
      // last non-undone action
      const q = query(
        collection(db, "exercises", exerciseId, "actions"),
        whereFilter("undone", "==", false),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.message("Nothing to undo");
        return;
      }
      const docSnap = snap.docs[0];
      const action = docSnap.data() as ActionHistory;

      const batch = writeBatch(db);

      for (const lp of action.lanes) {
        batch.update(doc(db, "exercises", exerciseId, "lanes", lp.laneDocId), {
          competitor: lp.before.competitor ?? null,
          readyUp: lp.before.readyUp ?? null,
        });
      }

      for (const cp of action.competitors) {
        batch.update(
          doc(db, "exercises", exerciseId, "competitors", cp.competitorId),
          { status: cp.beforeStatus }
        );
      }

      batch.update(docSnap.ref, { undone: true, undoneAt: serverTimestamp() });

      await batch.commit();
      toast.success("Undone");
    } catch (err) {
      console.error("Undo failed", err);
      toast.error("Failed to undo last action (state changed?)");
    }
  };

  // Options for the Select: mapping or fallback to all lane types (never empty)
  const laneTypeOptions = useMemo<LaneType[]>(() => {
    const opts = LANE_TYPES_BY_EXERCISE[exerciseType] ?? [];
    return opts.length ? opts : (LANE_TYPES as unknown as LaneType[]);
  }, [exerciseType]);

  const occupiedLanes = lanes.filter((l) => l.competitor).length;

  const addLane = async () => {
    try {
      const existingIds = lanes.map((l) => l.id).sort((a, b) => a - b);
      let newId = 1;
      for (let i = 0; i < existingIds.length; i++) {
        if (existingIds[i] !== i + 1) {
          newId = i + 1;
          break;
        }
        newId = existingIds.length + 1;
      }

      const laneTypeToAssign =
        laneTypeOptions.length > 0
          ? (laneTypeOptions[lanes.length % laneTypeOptions.length] as LaneType)
          : null;

      await addDoc(collection(db, "exercises", exerciseId, "lanes"), {
        id: newId,
        laneType: laneTypeToAssign,
        category: laneTypeToAssign, // mirror for back-compat
        nextLaneType: null,
        competitor: null,
        readyUp: null,
        locked: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error adding lane", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="hidden lg:flex items-center gap-2 mb-4">
          <Flag className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">
            {t("Lanes")} ({occupiedLanes}/{lanes.length})
          </h2>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <Button
              onClick={autoFillLanes}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <Zap className="w-4 h-4 mr-1" />
              {t("AutoFill")}
            </Button>

            <Button
              onClick={clearAllLanes}
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={occupiedLanes === 0}
            >
              <ArrowBigRightDash />
              {t("NextRound")}
            </Button>

            <Button
              onClick={addLane}
              size="sm"
              variant="secondary"
              className="flex-1"
            >
              <span className="font-bold">+</span> {t("Lane")}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1">
                  <RotateCcw className="mr-1 h-4 w-4" />
                  {t("Undo")}
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("UndoLastActionQuestion")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("UndoDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={undoBusy}>
                    {t("Cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={undoBusy}
                    onClick={async () => {
                      try {
                        setUndoBusy(true);
                        await undoLastAction();
                      } finally {
                        setUndoBusy(false);
                      }
                    }}
                  >
                    {undoBusy ? t("Undoing") : t("YesUndo")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Lanes grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 m-3">
        {lanes.map((lane) => (
          <Lane
            key={lane.id}
            lane={lane}
            exerciseId={exerciseId}
            isPending={pendingLaneIds.has(lane.id)}
            onDone={() => handleDone(lane.id)}
            clearLane={clearLane}
            laneTypeOptions={laneTypeOptions}
            exerciseType={exerciseType}
            // Arrow actions wrapped to lock lane while processing
            onReturnFromNow={() => handleReturnFromNow(lane.id)}
            onReturnFromReadyUp={() => handleReturnFromReadyUp(lane.id)}
            onAddBot={async (laneModel, data) => {
              setPendingLaneIds((prev) => new Set(prev).add(laneModel.id));
              try {
                const bot = {
                  id: `bot-${Date.now()}`,
                  name: "Пропуск",
                  category: data.category,
                  isBot: true,
                };
                const updates: any = {};
                if (data.target === "competitor") updates.competitor = bot;
                else updates.readyUp = bot;
                await updateDoc(
                  doc(db, "exercises", exerciseId, "lanes", laneModel.laneDocId!),
                  updates
                );
              } finally {
                setPendingLaneIds((prev) => {
                  const next = new Set(prev);
                  next.delete(laneModel.id);
                  return next;
                });
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
