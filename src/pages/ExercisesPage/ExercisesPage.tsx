import { Dumbbell, Trash2 } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useEffect, useState } from "react";
import AddExercise from "./components/AddExercise";
import { type Exercise } from "../../types/exercise";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  deleteDoc,
  doc,
  query,
} from "firebase/firestore";
import { toast } from "sonner";
import ExerciseCard from "./components/ExerciseCard";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import ScrollToTopButton from "../../components/main/ScrollToTopButton";

const ExercisesPage = () => {
  const { t } = useTranslation();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const STATUS_ORDER = { ongoing: 0, planned: 1, finished: 2 } as const;

    const activeQ = query(
      collection(db, "exercises"),
      orderBy("status"),
      orderBy("timeToStart")
    );

    const unsub = onSnapshot(activeQ, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Exercise, "id">),
      }));
      // stable sort if you kept client sort
      const sorted = data.sort((a, b) => {
        const byStatus =
          STATUS_ORDER[a.status as keyof typeof STATUS_ORDER] -
          STATUS_ORDER[b.status as keyof typeof STATUS_ORDER];
        if (byStatus) return byStatus;
        return (
          new Date(a.timeToStart).getTime() - new Date(b.timeToStart).getTime()
        );
      });
      setExercises(sorted);
    });

    return () => unsub();
  }, []);

  const handleDelete = async (exercise: Exercise) => {
    try {
      await deleteDoc(doc(db, "exercises", exercise.id));
      toast.success(`Exercise "${exercise.name}" deleted`);
    } catch (err) {
      console.error(err);
      toast.error("Error deleting exercise");
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
  };

  const handleRemoveAll = async () => {
    if (exercises.length === 0) return;

    const confirm = window.prompt(
      "Введіть 'remove' або 'видалити' щоб підтвердити видалення ВСІХ вправ"
    );
    if (!confirm) return;

    const ok =
      confirm.trim().toLowerCase() === "remove" ||
      confirm.trim().toLowerCase() === "видалити";
    if (!ok) {
      toast.error("Потрібно ввести 'remove' або 'видалити'");
      return;
    }

    try {
      await Promise.all(
        exercises.map((exercise) => deleteDoc(doc(db, "exercises", exercise.id)))
      );
      toast.success(t("RemoveAllExercisesSuccess"));
    } catch (err) {
      console.error(err);
      toast.error(t("RemoveAllExercisesError"));
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* Centered container */}
      <div className="max-w-2xl mx-auto">
        {isAdmin ? (
          <div>
            {/* Header */}
            <h1 className="text-3xl font-bold text-center text-gray-900">
              {t("exercises")}
            </h1>

            {/* Add button centered under header */}
            <div className="mt-4 mb-6 flex justify-center">
              <AddExercise
                editingExercise={editingExercise}
                setEditingExercise={setEditingExercise}
              />
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <h1 className="text-3xl font-bold text-center text-gray-900 mb-5">
              {t("exercises")}
            </h1>
          </div>
        )}

        {/* Content */}
        {exercises.length === 0 ? (
          <Card className="w-full">
            <CardContent className="text-center py-12">
              <Dumbbell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No exercises yet
              </h3>
            </CardContent>
          </Card>
        ) : (
          <>
            {isAdmin && (
              <div className="flex justify-end mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={handleRemoveAll}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {t("RemoveAllExercises")}
                </Button>
              </div>
            )}
            <ul className="space-y-3">
            {exercises.map((exercise) => (
              <li key={exercise.id}>
                <ExerciseCard
                  exercise={exercise}
                  handleEdit={handleEdit}
                  handleDelete={handleDelete}
                />
              </li>
            ))}
            </ul>
          </>
        )}
      </div>
      <ScrollToTopButton />
    </div>
  );
};

export default ExercisesPage;
