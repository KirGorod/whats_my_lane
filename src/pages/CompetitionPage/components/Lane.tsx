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
import { Clock, Play, Trash2, Flag } from "lucide-react";
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
}: {
  lane: LaneModel;
  exerciseId: string;
  clearLane: (laneId: number) => void;
  laneTypeOptions: LaneType[];
  exerciseType: ExerciseType;
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
        laneType: newLaneType, // canonical
        category: newLaneType, // mirror for back-compat
      });
    } catch (err) {
      console.error("Error updating lane type", err);
    }
  };

  const allowedCats = getAllowedCategoriesForLane(exerciseType, lane.laneType);

  return (
    <Card key={lane.id} className="border border-gray-200 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {t("Lane")} {lane.id}
          </CardTitle>

          <div className="flex items-center gap-2">
            {isAdmin ? (
              <Select
                disabled={!laneTypeOptions.length}
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

        {/* Allowed categories helper */}
        {!!allowedCats.length && (
          <div className="mt-2 text-xs text-gray-500">
            {t("Allowed")}: {allowedCats.map((cat) => t(cat)).join(", ")}
          </div>
        )}
      </CardHeader>

      {/* Content */}
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
              <div className="text-4xl text-green-900 whitespace-pre-line">
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
              <div className="text-3xl text-yellow-900 whitespace-pre-line">
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

      {/* Footer */}
      {isAdmin && (
        <div className="flex items-center justify-between gap-2 px-4 pb-3">
          <Button
            onClick={() => clearLane(lane.id)}
            size="sm"
            className="flex items-center justify-center gap-1 flex-1"
          >
            <Flag className="w-4 h-4" />
            {t("Done")}
          </Button>

          {!lane.competitor && !lane.readyUp && (
            <Button
              onClick={() => removeLane(lane.laneDocId as string)}
              size="icon"
              variant="outline"
              className="h-8 w-8"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
