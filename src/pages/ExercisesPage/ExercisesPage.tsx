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
import PageShell from "../../components/main/PageShell";

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
    <PageShell title={t("exercises")}>
      {isAdmin && (
        <div className="mb-6 flex justify-center">
          <AddExercise
            editingExercise={editingExercise}
            setEditingExercise={setEditingExercise}
          />
        </div>
      )}

      {exercises.length === 0 ? (
        <Card className="w-full">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/18">
              <Dumbbell className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-heading mb-2 text-lg font-medium text-foreground">
              No exercises yet
            </h3>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Add your first exercise to get started."
                : "Check back when exercises are scheduled."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {isAdmin && (
            <div className="mb-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
                onClick={handleRemoveAll}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                {t("RemoveAllExercises")}
              </Button>
            </div>
          )}
          <ul className="space-y-3 text-left">
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
      <ScrollToTopButton />
    </PageShell>
  );
};

export default ExercisesPage;
