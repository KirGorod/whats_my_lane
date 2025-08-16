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
} from "firebase/firestore";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const AddExercise = ({ editingExercise, setEditingExercise }) => {
  const { t } = useTranslation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState<Omit<Exercise, "id">>({
    name: "",
    status: "planned",
    timeToStart: "",
    numberOfLanes: 1,
    type: "strength",
  });

  useEffect(() => {
    if (editingExercise) {
      const { id, ...rest } = editingExercise;
      setFormData(rest);
      setIsDialogOpen(true);
    }
  }, [editingExercise]);

  const resetForm = () => {
    setFormData({
      name: "",
      status: "planned",
      timeToStart: "",
      numberOfLanes: 1,
      type: "strength",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingExercise) {
        // Update existing exercise
        await updateDoc(doc(db, "exercises", editingExercise.id), {
          ...formData,
        });
        toast.success("Exercise updated");
        setEditingExercise(null);
      } else {
        // Create exercise
        const exerciseRef = await addDoc(collection(db, "exercises"), {
          ...formData,
          createdAt: serverTimestamp(),
        });

        // Create lanes subcollection
        for (let i = 1; i <= formData.numberOfLanes; i++) {
          await addDoc(collection(db, "exercises", exerciseRef.id, "lanes"), {
            id: i,
            category: null,
            createdAt: serverTimestamp(),
          });
        }

        toast.success("Exercise added");
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Error saving exercise");
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          onClick={() => {
            resetForm();
            setEditingExercise(null);
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

          {/* Time */}
          <div>
            <Label htmlFor="timeToStart">{t("TimeToStart")}</Label>
            <Input
              id="timeToStart"
              type="datetime-local"
              value={formData.timeToStart}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  timeToStart: e.target.value,
                }))
              }
              required
            />
          </div>

          {/* Lanes */}
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

          {/* Type */}
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
