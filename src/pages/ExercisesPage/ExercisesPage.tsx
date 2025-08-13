import { Dumbbell } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
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

const ExercisesPage = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const q = query(collection(db, "exercises"));
    const unsub = onSnapshot(q, (snapshot) => {
      const STATUS_ORDER = { ongoing: 0, planned: 1, finished: 2 } as const;

      const data = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Exercise, "id">),
        }))
        .sort((a, b) => {
          const byStatus =
            STATUS_ORDER[a.status as keyof typeof STATUS_ORDER] -
            STATUS_ORDER[b.status as keyof typeof STATUS_ORDER];
          if (byStatus !== 0) return byStatus;
          // tie-breaker: earlier start first
          return (
            new Date(a.timeToStart).getTime() -
            new Date(b.timeToStart).getTime()
          );
        });

      setExercises(data);
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

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* Centered container */}
      <div className="max-w-2xl mx-auto">
        {isAdmin ? (
          <div>
            {/* Header */}
            <h1 className="text-3xl font-bold text-center text-gray-900">
              Exercises
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
              Exercises
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
          // LIST (centered via max-w and mx-auto above)
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
        )}
      </div>
    </div>
  );
};

export default ExercisesPage;
