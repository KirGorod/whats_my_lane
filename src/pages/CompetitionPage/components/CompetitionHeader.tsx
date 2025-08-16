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

function statusIcon(s: ExerciseStatus) {
  switch (s) {
    case "planned":
      return <CalendarClock className="w-4 h-4" />;
    case "ongoing":
      return <PlayCircle className="w-4 h-4" />;
    case "finished":
      return <CheckCircle2 className="w-4 h-4" />;
    default:
      return null;
  }
}

export default memo(function CompetitionHeader({
  exerciseId,
  name,
  status,
  type,
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
    <div className="mb-4 flex gap-3 flex-col">
      <div className="flex items-center justify-center gap-3">
        <div className="min-w-0 flex gap-3 items-center">
          <h1 className="text-xl sm:text-2xl font-semibold truncate">
            {name ?? t("Competition")}
          </h1>

          <Badge className={`capitalize ${statusBadgeClass(status)}`}>
            {statusIcon(status)} <span className="ml-1">{t(status)}</span>
          </Badge>
        </div>
      </div>

      {/* Status selector */}
      {isAdmin && (
        <div className="flex gap-2 justify-center">
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
        </div>
      )}
    </div>
  );
});
