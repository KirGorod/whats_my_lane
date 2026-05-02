import { Plus } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { useEffect, useState } from "react";
import {
  exerciseTypes,
  statusOptions,
  type Exercise,
  type CompetitionKind,
  type ExerciseStatus,
  type ExerciseType,
} from "../../../types/exercise";
import { db } from "../../../firebase";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";

// --- helpers ---
function normalizeToHHmm(value: unknown): string {
  // Accepts "", null, "HH:mm", "YYYY-MM-DDTHH:mm", ISO, Date, etc.
  if (!value) return "";
  if (typeof value === "string") {
    // If already HH:mm
    const hhmm = value.match(/^(\d{2}):(\d{2})$/);
    if (hhmm) return value;

    // Try to pull HH:mm from an ISO-like string
    const iso = value.match(/T(\d{2}):(\d{2})/);
    if (iso) return `${iso[1]}:${iso[2]}`;

    // Fallback: try Date parse
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      return `${h}:${m}`;
    }
    return "";
  }
  if (value instanceof Date) {
    const h = String(value.getHours()).padStart(2, "0");
    const m = String(value.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  const maybeTimestamp = value as { toDate?: () => Date };
  if (typeof maybeTimestamp.toDate === "function") {
    const d = maybeTimestamp.toDate();
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  return "";
}

const AddExercise = ({ editingExercise, setEditingExercise }) => {
  const { t } = useTranslation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeKind, setActiveKind] = useState<CompetitionKind>("veteran");

  const [formData, setFormData] = useState<Omit<Exercise, "id">>({
    name: "",
    status: "planned",
    // store time as "HH:mm" or "" (empty means optional)
    timeToStart: "",
    numberOfLanes: 1,
    type: "bench",
    competitionKind: "veteran",
    teamNamesOnly: false,
  });

  useEffect(() => {
    if (editingExercise) {
      const rest = { ...editingExercise };
      delete rest.id;
      setFormData({
        ...rest,
        competitionKind: rest.competitionKind ?? "veteran",
        // normalize any previous datetime to HH:mm for the input
        timeToStart: normalizeToHHmm(rest.timeToStart),
      });
      setActiveKind(rest.competitionKind ?? "veteran");
      setIsDialogOpen(true);
    }
  }, [editingExercise]);

  const resetForm = () => {
    setFormData({
      name: "",
      status: "planned",
      timeToStart: "",
      numberOfLanes: 1,
      type: "bench",
      competitionKind: activeKind,
      teamNamesOnly: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const competitionKind = editingExercise
      ? formData.competitionKind ?? "veteran"
      : activeKind;

    const payload = {
      ...formData,
      competitionKind,
      numberOfLanes: competitionKind === "team" ? 2 : formData.numberOfLanes,
      type: competitionKind === "team" ? "bench" : formData.type,
      teamNamesOnly:
        competitionKind === "team" ? !!formData.teamNamesOnly : false,
      // persist null if empty to make the field truly optional in Firestore
      timeToStart: formData.timeToStart ? formData.timeToStart : null,
    };

    try {
      if (editingExercise) {
        await updateDoc(doc(db, "exercises", editingExercise.id), payload);
        toast.success(t("ExerciseUpdated") ?? "Exercise updated");
        setEditingExercise(null);
      } else {
        const exerciseRef = await addDoc(collection(db, "exercises"), {
          ...payload,
          createdAt: serverTimestamp(),
        });

        const batch = writeBatch(db);
        const lanesCount =
          competitionKind === "team" ? 2 : formData.numberOfLanes;
        for (let i = 1; i <= lanesCount; i++) {
          const laneRef = doc(
            collection(db, "exercises", exerciseRef.id, "lanes")
          );
          batch.set(laneRef, {
            id: i,
            category: null,
            laneType: null,
            nextLaneType: null,
            competitor: null,
            readyUp: null,
            team: null,
            readyUpTeam: null,
            locked: false,
            createdAt: serverTimestamp(),
          });
        }
        await batch.commit();

        toast.success(t("ExerciseAdded") ?? "Exercise added");
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error(t("ErrorSavingExercise") ?? "Error saving exercise");
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={() => {
            setEditingExercise(null);
            setActiveKind("veteran");
            setFormData({
              name: "",
              status: "planned",
              timeToStart: "",
              numberOfLanes: 1,
              type: "bench",
              competitionKind: "veteran",
              teamNamesOnly: false,
            });
            setIsDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("AddExercise")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingExercise ? t("EditExercise") : t("AddNewExercise")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingExercise && (
            <Tabs
              value={activeKind}
              onValueChange={(value) => {
                const kind = value as CompetitionKind;
                setActiveKind(kind);
                setFormData((prev) => ({
                  ...prev,
                  competitionKind: kind,
                  numberOfLanes: kind === "team" ? 2 : prev.numberOfLanes,
                  type: kind === "team" ? "bench" : prev.type,
                  teamNamesOnly: kind === "team" ? prev.teamNamesOnly : false,
                }));
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="veteran">Veteran</TabsTrigger>
                <TabsTrigger value="team">Команди</TabsTrigger>
              </TabsList>
              <TabsContent value="veteran" />
              <TabsContent value="team" />
            </Tabs>
          )}

          {/* Name */}
          <div>
            <Label htmlFor="name">{t("ExerciseName")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">{t("ExerciseStatus")}</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  status: e.target.value as ExerciseStatus,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.label)}
                </option>
              ))}
            </select>
          </div>

          {/* Time (optional, HH:mm only) */}
          <div>
            <Label htmlFor="timeToStart">
              {t("TimeToStart")}{" "}
              <span className="text-gray-400">
                ({t("Optional") ?? "optional"})
              </span>
            </Label>
            <Input
              id="timeToStart"
              type="time"
              value={formData.timeToStart ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  timeToStart: e.target.value, // expect "HH:mm" or ""
                }))
              }
              // no required → optional
            />
          </div>

          {/* Lanes */}
          {activeKind === "veteran" && (
            <div>
              <Label htmlFor="numberOfLanes">{t("NumberOfLanes")}</Label>
              <Input
                id="numberOfLanes"
                type="number"
                min={1}
                value={formData.numberOfLanes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    numberOfLanes: Number(e.target.value),
                  }))
                }
                required
                disabled={!!editingExercise}
              />
            </div>
          )}

          {/* Type */}
          {activeKind === "veteran" && (
            <div>
              <Label htmlFor="type">{t("ExerciseType")}</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: e.target.value as ExerciseType,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                {exerciseTypes.map((tOption) => (
                  <option key={tOption.value} value={tOption.value}>
                    {t(tOption.value)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeKind === "team" && (
            <label className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={!!formData.teamNamesOnly}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    teamNamesOnly: e.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
              Показувати лише назви команд
            </label>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setEditingExercise(null);
              }}
            >
              {t("Cancel")}
            </Button>
            <Button type="submit">
              {editingExercise ? t("UpdateExercise") : t("AddExercise")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddExercise;
