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

const ExercisesPage = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    const q = query(collection(db, "exercises"), orderBy("timeToStart", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Exercise, "id">),
      }));
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
    <div className="p-4 sm:p-6 h-full overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Exercises</h1>
            <p className="text-gray-600 mt-1">Manage your workout exercises</p>
          </div>

          <AddExercise
            editingExercise={editingExercise}
            setEditingExercise={setEditingExercise}
          />
        </div>

        {exercises.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Dumbbell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No exercises yet
              </h3>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExercisesPage;
