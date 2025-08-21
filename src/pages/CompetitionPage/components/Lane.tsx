import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Button } from "../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { db } from "../../../firebase";
import {
  Lock,
  Clock,
  Play,
  Trash2,
  Flag,
  Unlock,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import type { ExerciseType } from "../../../types/exercise";
import type { LaneModel, LaneType } from "../../../types/lane";
import { getAllowedCategoriesForLane } from "../../../utils/laneRules";
import { useTranslation } from "react-i18next";

function badgeClass(laneType: LaneType | null) {
  switch (laneType) {
    case "paralympic":
      return "bg-purple-100 text-purple-700";
    case "kettle":
      return "bg-orange-100 text-orange-700";
    case "defaultBench":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function Lane({
  lane,
  exerciseId,
  clearLane,
  laneTypeOptions,
  exerciseType,
  isPending = false, // NEW
  onDone, // NEW (wrapped clearLane from parent)
}: {
  lane: LaneModel;
  exerciseId: string;
  clearLane: (laneId: number) => void;
  laneTypeOptions: LaneType[];
  exerciseType: ExerciseType;
  isPending?: boolean; // NEW
  onDone?: () => void; // NEW
}) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  const removeLane = async (laneDocId: string) => {
    if (lane.competitor) {
      toast.warning("Cannot remove lane while it has a competitor");
      return;
    }
    try {
      await deleteDoc(doc(db, "exercises", exerciseId, "lanes", laneDocId));
    } catch (err) {
      console.error("Error removing lane", err);
    }
  };

  const updateLaneType = async (laneDocId: string, newLaneType: LaneType) => {
    if (lane.competitor) {
      toast.warning("Cannot change lane type when lane has a competitor");
      return;
    }
    try {
      await updateDoc(doc(db, "exercises", exerciseId, "lanes", laneDocId), {
        laneType: newLaneType,
        category: newLaneType,
      });
    } catch (err) {
      console.error("Error updating lane type", err);
    }
  };

  const toggleLock = async () => {
    try {
      await updateDoc(
        doc(db, "exercises", exerciseId, "lanes", lane.laneDocId as string),
        { locked: !lane.locked }
      );
      toast.success(!lane.locked ? t("LaneLocked") : t("LaneUnlocked"));
    } catch (e) {
      console.error("Toggle lock failed", e);
      toast.error(t("Error"));
    }
  };

  const allowedCats = getAllowedCategoriesForLane(exerciseType, lane.laneType);

  return (
    <Card
      key={lane.id}
      className={[
        "relative border border-gray-200 flex flex-col rounded-lg overflow-hidden",
        isPending ? "opacity-60 saturate-0" : "",
      ].join(" ")}
      aria-busy={isPending}
      aria-disabled={isPending}
    >
      {/* 🔴 Locked overlay (existing) */}
      {lane.locked && (
        <div className="pointer-events-none absolute inset-0 bg-red-500/40 backdrop-brightness-95 flex flex-col items-center justify-center text-black z-10">
          <Lock className="w-16 h-16 mb-2" />
          <span className="text-3xl font-bold">{t("LaneLocked")}</span>
        </div>
      )}

      {/* 🟡 Pending overlay to block interactions */}
      {isPending && (
        <div className="absolute inset-0 z-10 pointer-events-auto flex items-center justify-center">
          {/* transparent blocker; optional spinner */}
          <div className="absolute inset-0 bg-white/20" />
          <div className="relative text-xs font-medium px-2 py-1 rounded bg-white/80 border">
            {t("Processing")}…
          </div>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {t("Lane")} {lane.id}
          </CardTitle>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                size="icon"
                variant={lane.locked ? "destructive" : "outline"}
                className="h-8 w-8"
                onClick={toggleLock}
                disabled={isPending}
                title={
                  lane.locked
                    ? t("UnlockLane", { defaultValue: "Unlock lane" })
                    : t("LockLane", { defaultValue: "Lock lane" })
                }
              >
                {lane.locked ? (
                  <Unlock className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
              </Button>
            )}

            {isAdmin ? (
              <Select
                disabled={
                  !laneTypeOptions.length || !!lane.competitor || isPending
                }
                value={lane.laneType ?? ""}
                onValueChange={(value) =>
                  updateLaneType(lane.laneDocId as string, value as LaneType)
                }
              >
                <SelectTrigger className="w-36 h-8">
                  <SelectValue placeholder={t("LaneType")} />
                </SelectTrigger>
                <SelectContent>
                  {laneTypeOptions.map((lt) => (
                    <SelectItem key={lt} value={lt}>
                      {t(`laneTypeSelect.${lt}`, { defaultValue: t(lt) })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge className={badgeClass(lane.laneType)}>
                {lane.laneType
                  ? t(`laneTypeSelect.${lane.laneType}`, {
                      defaultValue: t(lane.laneType),
                    })
                  : "—"}
              </Badge>
            )}
          </div>
        </div>

        {!!allowedCats.length && (
          <div className="mt-2 text-xs text-gray-500">
            {t("Allowed")}: {allowedCats.map((cat) => t(cat)).join(", ")}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3 flex-grow">
        {/* Now */}
        <div className="bg-green-200 border border-green-400 rounded-lg p-3 flex flex-col gap-2 items-center text-center">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              {t("Now")}
            </span>
          </div>
          {lane.competitor ? (
            <div className="flex flex-col leading-tight">
              <div className="text-2xl md:text-3xl lg:text-4xl text-green-900 whitespace-pre-line">
                {lane.competitor.name}
              </div>
              <div className="text-xs text-green-700">
                {t(lane.competitor.category)}
              </div>
            </div>
          ) : (
            <div className="text-sm text-green-600 italic">
              {t("NoCompetitor")}
            </div>
          )}
        </div>

        {/* Ready Up */}
        <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-3 flex flex-col gap-2 items-center text-center">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              {t("ReadyUp")}
            </span>
          </div>
          {lane.readyUp ? (
            <div className="flex flex-col leading-tight">
              <div className="text-xl md:text-2xl lg:text-3xl text-yellow-900 whitespace-pre-line">
                {lane.readyUp.name}
              </div>
              <div className="text-xs text-yellow-700">
                {t(lane.readyUp.category)}
              </div>
            </div>
          ) : (
            <div className="text-sm text-yellow-600 italic">
              {t("NoReadyCompetitor")}
            </div>
          )}
        </div>
      </CardContent>

      {isAdmin && (
        <div className="flex items-center justify-between gap-2 px-4 pb-3">
          <Button
            onClick={onDone ? onDone : () => clearLane(lane.id)}
            size="sm"
            className="flex items-center justify-center gap-1 flex-1 disabled:opacity-50 disabled:pointer-events-none"
            disabled={isPending}
          >
            <Flag className="w-4 h-4" />
            {t("Done")}
          </Button>

          {!lane.competitor && !lane.readyUp && !lane.locked && (
            <Button
              onClick={() => removeLane(lane.laneDocId as string)}
              size="icon"
              variant="outline"
              className="h-8 w-8 disabled:opacity-50 disabled:pointer-events-none"
              disabled={isPending}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
