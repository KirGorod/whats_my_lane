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
import { Lock, Trash2, Unlock, ArrowLeft, Shield, ShieldOff, TriangleAlert } from "lucide-react";
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
import { getLaneTypeBadgeClass } from "../../../utils/laneTypeStyles";
import { shouldAutoRestrictCategoryChange } from "../../../config/laneTypesByExercise";
import { getAllowedCategoriesForLane } from "../../../utils/laneRules";
import { useTranslation } from "react-i18next";
import { Bot } from "lucide-react";

function badgeClass(
  laneType: LaneType | null,
  categoryChangedByAutofill?: boolean
) {
  return getLaneTypeBadgeClass(laneType, categoryChangedByAutofill);
}

function laneTypeSelectClass(categoryChangedByAutofill?: boolean) {
  return categoryChangedByAutofill
    ? "h-8 border-amber-400 bg-amber-50"
    : "h-8";
}

export default function Lane({
  lane,
  exerciseId,
  clearLane,
  laneTypeOptions,
  exerciseType,
  isPending = false,
  onDone,
  // NEW callbacks
  onReturnFromNow,
  onReturnFromReadyUp,
  onAddBot,
}: {
  lane: LaneModel;
  exerciseId: string;
  clearLane: (laneId: number) => void;
  laneTypeOptions: LaneType[];
  exerciseType: ExerciseType;
  isPending?: boolean;
  onDone?: () => void;
  onReturnFromNow: () => void;
  onReturnFromReadyUp: () => void;
  onAddBot: (
    lane: LaneModel,
    data: { category: string; target: "competitor" | "readyUp" }
  ) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  const removeLane = async (laneDocId: string) => {
    if (lane.competitor) {
      toast.warning(
        t("CannotRemoveLaneWithCompetitor", {
          defaultValue: "Cannot remove lane while it has a competitor",
        })
      );
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
      toast.warning(
        t("CannotChangeTypeWhenOccupied", {
          defaultValue: "Cannot change lane type when lane has a competitor",
        })
      );
      return;
    }
    try {
      await updateDoc(doc(db, "exercises", exerciseId, "lanes", laneDocId), {
        laneType: newLaneType,
        category: newLaneType,
        categoryChangedByAutofill: false,
        restrictCategoryChange: shouldAutoRestrictCategoryChange(
          exerciseType,
          newLaneType
        ),
      });
    } catch (err) {
      console.error("Error updating lane type", err);
    }
  };

  const updateNextLaneType = async (
    laneDocId: string,
    newLaneType: LaneType
  ) => {
    try {
      await updateDoc(doc(db, "exercises", exerciseId, "lanes", laneDocId), {
        nextLaneType: newLaneType,
        categoryChangedByAutofill: false,
      });
      // keep it quiet or toast?
    } catch (err) {
      console.error("Error updating nextLaneType", err);
    }
  };

  const clearNextLaneType = async () => {
    try {
      await updateDoc(
        doc(db, "exercises", exerciseId, "lanes", lane.laneDocId as string),
        {
          nextLaneType: null,
          categoryChangedByAutofill: false,
        }
      );
    } catch (e) {
      console.error(e);
    }
  };

  const toggleLock = async () => {
    try {
      await updateDoc(
        doc(db, "exercises", exerciseId, "lanes", lane.laneDocId as string),
        { locked: !lane.locked }
      );
      // toasts are elsewhere already
    } catch (e) {
      console.error("Toggle lock failed", e);
    }
  };

  const toggleRestrictCategoryChange = async () => {
    try {
      await updateDoc(
        doc(db, "exercises", exerciseId, "lanes", lane.laneDocId as string),
        { restrictCategoryChange: !lane.restrictCategoryChange }
      );
    } catch (e) {
      console.error("Toggle category restriction failed", e);
    }
  };

  const toggleCategoryChangeAlert = async () => {
    try {
      await updateDoc(
        doc(db, "exercises", exerciseId, "lanes", lane.laneDocId as string),
        { categoryChangedByAutofill: !lane.categoryChangedByAutofill }
      );
    } catch (e) {
      console.error("Toggle category change alert failed", e);
    }
  };

  const showCategoryChangeAlert = !!lane.categoryChangedByAutofill;

  const allowedCats = getAllowedCategoriesForLane(exerciseType, lane.laneType);
  const nextAllowedCats = lane.nextLaneType
    ? getAllowedCategoriesForLane(exerciseType, lane.nextLaneType)
    : [];

  const handleAddBot = async () => {
    const hasCompetitor = !!lane.competitor;
    const pickFromNext = hasCompetitor && !!nextAllowedCats.length;
    const candidates = pickFromNext
      ? nextAllowedCats
      : allowedCats.length
      ? allowedCats
      : [];

    const cat = candidates[0];
    if (!cat) {
      toast.error("Немає доступних категорій для бота");
      return;
    }
    if (hasCompetitor && !lane.nextLaneType) {
      toast.error("Оберіть тип наступного раунду, щоб додати бота");
      return;
    }
    const target: "competitor" | "readyUp" = hasCompetitor ? "readyUp" : "competitor";
    await onAddBot(lane, { category: cat, target });
    toast.success(`Додано бота у категорії ${cat.toUpperCase()}`);
  };

  const categoryWarningTitle = t("LaneCategoryChangedByAutofill", {
    defaultValue: "Lane category changed by autofill",
  });

  return (
    <Card
      key={lane.id}
      className={[
        "relative border border-gray-200 flex flex-col rounded-lg overflow-hidden",
        isPending ? "opacity-60 saturate-0" : "",
        lane.categoryChangedByAutofill ? "ring-2 ring-amber-400" : "",
      ].join(" ")}
      aria-busy={isPending}
      aria-disabled={isPending}
    >
      {lane.locked && (
        <div className="pointer-events-none absolute inset-0 bg-red-500/40 backdrop-brightness-95 flex flex-col items-center justify-center text-black z-10">
          <Lock className="w-16 h-16 mb-2" />
          <span className="text-3xl font-bold">{t("LaneLocked")}</span>
        </div>
      )}

      {isPending && (
        <div className="absolute inset-0 z-10 pointer-events-auto flex items-center justify-center">
          <div className="absolute inset-0 bg-white/20" />
          <div className="relative text-xs font-medium px-2 py-1 rounded bg-white/80 border">
            {t("Processing")}…
          </div>
        </div>
      )}

      <CardHeader className="pb-3">
        {isAdmin ? (
          <>
            <CardTitle className="text-base whitespace-nowrap">
              {t("Lane")} {lane.id}
            </CardTitle>

            <div className="mt-2 w-full">
              <Select
                disabled={
                  !laneTypeOptions.length || !!lane.competitor || isPending
                }
                value={lane.laneType ?? ""}
                onValueChange={(value) =>
                  updateLaneType(lane.laneDocId as string, value as LaneType)
                }
              >
                <SelectTrigger
                  className={`${laneTypeSelectClass(showCategoryChangeAlert)} w-full`}
                  title={
                    showCategoryChangeAlert ? categoryWarningTitle : undefined
                  }
                >
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
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {t("Lane")} {lane.id}
            </CardTitle>
            <Badge
              className={badgeClass(lane.laneType, showCategoryChangeAlert)}
              title={
                showCategoryChangeAlert ? categoryWarningTitle : undefined
              }
            >
              {lane.laneType
                ? t(`laneTypeSelect.${lane.laneType}`, {
                    defaultValue: t(lane.laneType),
                  })
                : "—"}
            </Badge>
          </div>
        )}

        {/* NEXT ROUND type row (admin only) */}
        {isAdmin && (
          <div className="mt-2 flex items-center gap-2">
            <Select
              disabled={!laneTypeOptions.length || isPending}
              value={lane.nextLaneType ?? ""}
              onValueChange={(value) =>
                updateNextLaneType(
                  lane.laneDocId as string,
                  value as LaneType
                )
              }
            >
              <SelectTrigger
                className={
                  showCategoryChangeAlert
                    ? "h-8 w-full border-amber-400 bg-amber-50"
                    : "h-8 w-full"
                }
                title={
                  showCategoryChangeAlert ? categoryWarningTitle : undefined
                }
              >
                <SelectValue
                  placeholder={t("SelectNextRoundType", {
                    defaultValue: "Select next round type",
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {laneTypeOptions.map((lt) => (
                  <SelectItem key={lt} value={lt}>
                    {t(`laneTypeSelect.${lt}`, { defaultValue: t(lt) })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {lane.nextLaneType && (
              <Button
                size="sm"
                variant="outline"
                onClick={clearNextLaneType}
                disabled={isPending}
              >
                {t("Reset", { defaultValue: "Reset" })}
              </Button>
            )}
          </div>
        )}

        {showCategoryChangeAlert ? (
          <div className="mt-2 text-xl md:text-2xl text-amber-700 font-bold text-center">
            {t("CategoryChange")}
          </div>
        ) : (
          !!allowedCats.length && (
            <div className="mt-2 text-xs text-gray-500">
              {t("Allowed")}: {allowedCats.map((cat) => t(cat)).join(", ")}
            </div>
          )
        )}
      </CardHeader>

      <CardContent className="space-y-3 flex-grow">
        {/* Now */}
        <div className="bg-green-200 border border-green-400 rounded-lg p-3 flex flex-col gap-2 items-center text-center">
          <div className="flex items-center gap-2">
            {isAdmin && lane.competitor && !isPending && !lane.locked && (
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                title={t("ReturnToWaiting", {
                  defaultValue: "Return to waiting",
                })}
                onClick={onReturnFromNow}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
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
            {isAdmin && lane.readyUp && !isPending && !lane.locked && (
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7"
                title={t("ReturnToWaiting", {
                  defaultValue: "Return to waiting",
                })}
                onClick={onReturnFromReadyUp}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
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
        <>
          <div className="flex items-center justify-center gap-2 px-4 pb-2">
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
            <Button
              size="icon"
              variant={lane.restrictCategoryChange ? "secondary" : "outline"}
              className={
                lane.restrictCategoryChange
                  ? "h-8 w-8 bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                  : "h-8 w-8"
              }
              onClick={toggleRestrictCategoryChange}
              disabled={isPending}
              title={
                lane.restrictCategoryChange
                  ? t("AllowCategoryChange", {
                      defaultValue: "Allow autofill category change",
                    })
                  : t("RestrictCategoryChange", {
                      defaultValue: "Restrict autofill category change",
                    })
              }
            >
              {lane.restrictCategoryChange ? (
                <Shield className="w-4 h-4" />
              ) : (
                <ShieldOff className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant={showCategoryChangeAlert ? "secondary" : "outline"}
              className={
                showCategoryChangeAlert
                  ? "h-8 w-8 bg-amber-100 text-amber-800 hover:bg-amber-200"
                  : "h-8 w-8"
              }
              onClick={toggleCategoryChangeAlert}
              disabled={isPending}
              title={
                showCategoryChangeAlert
                  ? t("ClearCategoryChangeAlert", {
                      defaultValue: "Clear category change alert",
                    })
                  : t("ShowCategoryChangeAlert", {
                      defaultValue: "Show category change alert",
                    })
              }
            >
              <TriangleAlert className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 px-4 pb-3">
          <Button
            onClick={handleAddBot}
            size="icon"
            variant="outline"
            className="h-8 w-8 disabled:opacity-50 disabled:pointer-events-none"
            disabled={isPending || lane.locked}
            title="Додати бота (Пропуск)"
          >
            <Bot className="w-4 h-4" />
          </Button>
          <Button
            onClick={onDone ? onDone : () => clearLane(lane.id)}
            size="sm"
            className="flex items-center justify-center gap-1 flex-1 disabled:opacity-50 disabled:pointer-events-none"
            disabled={isPending}
          >
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
        </>
      )}
    </Card>
  );
}
