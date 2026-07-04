import { Dumbbell, Edit, Trash2, UsersRound } from "lucide-react";
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
import type { Exercise } from "../../../types/exercise";
import { Link } from "react-router-dom";
import {
  statusAccentClass,
  statusBadgeClass,
} from "../../../utils/statusStyles";

import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "../../../context/AuthContext";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

function useCompetitorCounts(exerciseId: string, enabled: boolean) {
  const [total, setTotal] = useState(0);
  const [waiting, setWaiting] = useState(0);

  useEffect(() => {
    if (!exerciseId || !enabled) {
      setTotal(0);
      setWaiting(0);
      return;
    }
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
  }, [exerciseId, enabled]);

  return { total, waiting };
}

function useTeamCounts(exerciseId: string, enabled: boolean) {
  const [total, setTotal] = useState(0);
  const [waiting, setWaiting] = useState(0);

  useEffect(() => {
    if (!exerciseId || !enabled) {
      setTotal(0);
      setWaiting(0);
      return;
    }
    const baseCol = collection(db, "exercises", exerciseId, "teams");
    const unsubTotal = onSnapshot(baseCol, (snap) => setTotal(snap.size));
    const unsubWaiting = onSnapshot(
      query(baseCol, where("status", "==", "waiting")),
      (snap) => setWaiting(snap.size)
    );
    return () => {
      unsubTotal();
      unsubWaiting();
    };
  }, [exerciseId, enabled]);

  return { total, waiting };
}

type TimestampLike = { toDate: () => Date };

function formatTimeAny(value: unknown, t: (k: string) => string): string {
  if (!value) return t("NotSet") || "—";

  if (typeof value === "string") {
    const hhmm = value.match(/^(\d{2}):(\d{2})$/);
    if (hhmm) return value;

    const iso = value.match(/T(\d{2}):(\d{2})/);
    if (iso) return `${iso[1]}:${iso[2]}`;

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

  const maybeTimestamp = value as Partial<TimestampLike>;
  if (typeof maybeTimestamp.toDate === "function") {
    const d = maybeTimestamp.toDate();
    return d.toLocaleTimeString("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  const d = new Date(value as string | number | Date);
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
  exercise: Exercise;
  handleEdit: (e: Exercise) => void;
  handleDelete: (e: Exercise) => void;
};

const ExerciseCard = ({ exercise, handleEdit, handleDelete }: Props) => {
  const competitionKind = exercise.competitionKind ?? "veteran";
  const { total, waiting } = useCompetitorCounts(
    exercise.id,
    competitionKind === "veteran"
  );
  const { total: totalTeams, waiting: waitingTeams } = useTeamCounts(
    exercise.id,
    competitionKind === "team"
  );
  const { isAdmin } = useAuth();
  const { t } = useTranslation();

  const Title = (
    <CardTitle className="flex items-center gap-2 truncate text-base group-hover:underline sm:text-lg">
      {competitionKind === "team" ? (
        <UsersRound className="h-5 w-5 shrink-0 text-primary" />
      ) : (
        <Dumbbell className="h-5 w-5 shrink-0 text-primary" />
      )}
      <span className="truncate">{exercise.name}</span>
    </CardTitle>
  );

  const Inner = (
    <Card
      className={cn(
        "w-full border-l-4 transition-all duration-200",
        statusAccentClass(exercise.status),
        isAdmin
          ? "hover:bg-accent/30 hover:shadow-md"
          : "cursor-pointer group hover:bg-accent/40 hover:shadow-md"
      )}
    >
      <CardHeader className="gap-0 p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          {isAdmin ? (
            <Link
              to={`/competitions/${exercise.id}`}
              className="group min-w-0 flex-1"
            >
              {Title}
            </Link>
          ) : (
            <div className="min-w-0 flex-1">{Title}</div>
          )}

          {isAdmin && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(exercise)}
              >
                <Edit className="h-4 w-4" />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4 text-destructive" />
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
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-1 text-xs font-medium",
              statusBadgeClass(exercise.status)
            )}
          >
            {t(
              statusOptions.find((s) => s.value === exercise.status)?.label ??
                ""
            )}
          </span>
          <span className="rounded-full border border-primary/35 bg-primary/18 px-2 py-1 text-xs font-medium text-primary">
            {exercise.numberOfLanes} {t("LanesCount")}
          </span>
          <span className="rounded-full border border-brand-olive/35 bg-brand-olive/18 px-2 py-1 text-xs font-medium text-brand-olive">
            {competitionKind === "team" ? "Команди" : "Veteran"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">{t("timeToStart")}</span>
            <span className="text-muted-foreground">
              {formatTimeAny(exercise.timeToStart, t)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            {competitionKind === "team" ? (
              <>
                <span className="font-medium text-foreground">Команди</span>
                <span className="text-muted-foreground">
                  {totalTeams} команд
                  {typeof waitingTeams === "number"
                    ? ` (${waitingTeams} ${t("Waiting")})`
                    : ""}
                </span>
              </>
            ) : (
              <>
                <span className="font-medium text-foreground">
                  {t("competitors")}
                </span>
                <span className="text-muted-foreground">
                  {total}{" "}
                  {total === 1 ? t("competitor") : t("competitorsCount")}
                  {typeof waiting === "number"
                    ? ` (${waiting} ${t("Waiting")})`
                    : ""}
                </span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!isAdmin) {
    return (
      <Link to={`/competitions/${exercise.id}`} className="block">
        {Inner}
      </Link>
    );
  }

  return Inner;
};

export default ExerciseCard;
