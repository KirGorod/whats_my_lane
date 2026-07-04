import { memo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { toast } from "sonner";
import { db } from "../../../firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { ExerciseStatus, ExerciseType } from "../../../types/exercise";
import { statusOptions } from "../../../types/exercise";
import { CheckCircle2, PlayCircle, CalendarClock } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { statusBadgeClass } from "../../../utils/statusStyles";
import { useTranslation } from "react-i18next";
import SendHostNotificationDialog from "./SendHostNotificationDialog";
import { cn } from "@/lib/utils";

function statusIcon(s: ExerciseStatus) {
  switch (s) {
    case "planned":
      return <CalendarClock className="h-4 w-4" />;
    case "ongoing":
      return <PlayCircle className="h-4 w-4" />;
    case "finished":
      return <CheckCircle2 className="h-4 w-4" />;
    default:
      return null;
  }
}

export default memo(function CompetitionHeader({
  exerciseId,
  name,
  status,
}: {
  exerciseId: string;
  name?: string;
  status: ExerciseStatus;
  type?: ExerciseType;
}) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [saving, setSaving] = useState(false);

  const setStatus = async (next: ExerciseStatus) => {
    if (next === status) return;
    try {
      setSaving(true);
      await updateDoc(doc(db, "exercises", exerciseId), { status: next });
      toast.success(`Status set to ${next}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex items-center justify-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="font-heading truncate text-xl font-semibold sm:text-2xl">
            {name ?? t("Competition")}
          </h1>

          <Badge className={cn("capitalize", statusBadgeClass(status))}>
            {statusIcon(status)} <span className="ml-1">{t(status)}</span>
          </Badge>
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-border/80 bg-card p-2 shadow-sm">
          {statusOptions.map(({ value, label }) => (
            <Button
              key={value}
              size="sm"
              variant={status === value ? "default" : "outline"}
              onClick={() => setStatus(value as ExerciseStatus)}
              disabled={saving}
              className="capitalize"
              aria-pressed={status === value}
            >
              {statusIcon(value as ExerciseStatus)}
              <span className="ml-1">{t(label)}</span>
            </Button>
          ))}
          <SendHostNotificationDialog exerciseId={exerciseId} />
        </div>
      )}
    </div>
  );
});
