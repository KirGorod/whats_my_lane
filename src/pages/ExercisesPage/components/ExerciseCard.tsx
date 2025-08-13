import { Dumbbell, Edit, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
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
import { statusOptions } from "../../../types/exercise";
import { Link } from "react-router-dom";
import { statusBadgeClass } from "../../../utils/statusStyles";

import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "../../../context/AuthContext";

function useCompetitorCounts(exerciseId: string) {
  const [total, setTotal] = useState(0);
  const [waiting, setWaiting] = useState(0);

  useEffect(() => {
    if (!exerciseId) return;
    const baseCol = collection(db, "exercises", exerciseId, "competitors");
    const unsubTotal = onSnapshot(baseCol, (snap) => setTotal(snap.size));
    const unsubWaiting = onSnapshot(
      query(baseCol, where("status", "==", "waiting")),
      (snap) => setWaiting(snap.size)
    );
    return () => {
      unsubTotal();
      unsubWaiting();
    };
  }, [exerciseId]);

  return { total, waiting };
}

type Props = {
  exercise: any;
  handleEdit: (e: any) => void;
  handleDelete: (e: any) => void;
};

const ExerciseCard = ({ exercise, handleEdit, handleDelete }: Props) => {
  const { total, waiting } = useCompetitorCounts(exercise.id);
  const { isAdmin } = useAuth();

  const Title = (
    <CardTitle className="text-base sm:text-lg flex items-center gap-2 truncate group-hover:underline">
      <Dumbbell className="w-5 h-5 shrink-0" />
      <span className="truncate">{exercise.name}</span>
    </CardTitle>
  );

  const Inner = (
    <Card
      className={`w-full transition-shadow transition-colors duration-150
    ${
      isAdmin
        ? "hover:shadow-sm hover:bg-accent/40"
        : "hover:shadow-md hover:bg-accent cursor-pointer group"
    }`}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          {/* Title: link only for admin; for non-admin, whole card is link */}
          {isAdmin ? (
            <Link
              to={`/competitions/${exercise.id}`}
              className="flex-1 min-w-0 group"
            >
              {Title}
            </Link>
          ) : (
            <div className="flex-1 min-w-0">{Title}</div>
          )}

          {isAdmin && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(exercise)}
              >
                <Edit className="w-4 h-4" />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Exercise</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{exercise.name}"?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(exercise)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap mt-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass(
              exercise.status
            )}`}
          >
            {statusOptions.find((s) => s.value === exercise.status)?.label}
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            {exercise.numberOfLanes} Lanes
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Time to Start</span>
            <span className="text-gray-600">
              {new Date(exercise.timeToStart).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Competitors</span>
            <span className="text-gray-600">
              {total} {total === 1 ? "competitor" : "competitors"}
              {typeof waiting === "number" ? ` (${waiting} waiting)` : ""}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // For non-admins, wrap the whole card with Link (no nested links inside)
  if (!isAdmin) {
    return (
      <Link to={`/competitions/${exercise.id}`} className="block">
        {Inner}
      </Link>
    );
  }

  // Admin sees original behavior
  return Inner;
};

export default ExerciseCard;
