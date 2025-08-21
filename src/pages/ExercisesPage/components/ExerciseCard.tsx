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
import { useTranslation } from "react-i18next";

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

// Robust formatter for "HH:mm" | null | ISO | Date | Firestore Timestamp
function formatTimeAny(value: any, t: (k: string) => string): string {
  if (!value) return t("NotSet") || "—";

  // String cases
  if (typeof value === "string") {
    // Already "HH:mm"
    const hhmm = value.match(/^(\d{2}):(\d{2})$/);
    if (hhmm) return value;

    // ISO-like with "T"
    const iso = value.match(/T(\d{2}):(\d{2})/);
    if (iso) return `${iso[1]}:${iso[2]}`;

    // Try Date parse fallback
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("uk-UA", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    return t("NotSet") || "—";
  }

  // Firestore Timestamp
  if (value && typeof value.toDate === "function") {
    const d = value.toDate();
    return d.toLocaleTimeString("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  // Date or other coercible types
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return t("NotSet") || "—";
}

type Props = {
  exercise: any; // keep as any to avoid refactors here
  handleEdit: (e: any) => void;
  handleDelete: (e: any) => void;
};

const ExerciseCard = ({ exercise, handleEdit, handleDelete }: Props) => {
  const { total, waiting } = useCompetitorCounts(exercise.id);
  const { isAdmin } = useAuth();
  const { t } = useTranslation();

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
            {t(
              statusOptions.find((s) => s.value === exercise.status)?.label ??
                ""
            )}
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            {exercise.numberOfLanes} {t("LanesCount")}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">
              {t("timeToStart")}
            </span>
            <span className="text-gray-600">
              {formatTimeAny(exercise.timeToStart, t)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">
              {t("competitors")}
            </span>
            <span className="text-gray-600">
              {total} {total === 1 ? t("competitor") : t("competitorsCount")}
              {typeof waiting === "number"
                ? ` (${waiting} ${t("Waiting")})`
                : ""}
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
