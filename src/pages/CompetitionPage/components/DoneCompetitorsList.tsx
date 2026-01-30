import { useState } from "react";
import { CheckCircle, Trash2, RotateCcw } from "lucide-react";
import { Button } from "../../../components/ui/button";
import DoneCompetitorCard from "./DoneCompetitorCard";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../context/AuthContext";

const DoneCompetitorsList = ({
  doneCompetitors,
  returnDoneCompetitorToLane,
  removeAllDone,
  undoRemoveAllDone,
}) => {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const handleReturn = async (competitor) => {
    // mark as pending
    setPendingIds((prev) => new Set(prev).add(competitor.id));
    try {
      await returnDoneCompetitorToLane(competitor);
    } finally {
      // always clear pending
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(competitor.id);
        return next;
      });
    }
  };

  const handleRemoveAllDone = async () => {
    if (!removeAllDone) return;
    const confirm = window.prompt(
      "Введіть 'remove' або 'видалити' щоб підтвердити видалення усіх завершених"
    );
    if (!confirm) return;
    const ok =
      confirm.trim().toLowerCase() === "remove" ||
      confirm.trim().toLowerCase() === "видалити";
    if (!ok) return;
    await removeAllDone();
  };

  const handleUndoRemoveAllDone = async () => {
    if (!undoRemoveAllDone) return;
    const ok = window.confirm("Відновити останніх видалених завершених?");
    if (!ok) return;
    await undoRemoveAllDone();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">
              {t("Done")} ({doneCompetitors.length})
            </h2>
          </div>
          {isAdmin && removeAllDone && (
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-800"
              title="Видалити всіх завершених"
              onClick={handleRemoveAllDone}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          )}
          {isAdmin && undoRemoveAllDone && (
            <Button
              variant="ghost"
              size="icon"
              className="text-blue-600 hover:text-blue-800"
              title="Відмінити останнє видалення"
              onClick={handleUndoRemoveAllDone}
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {doneCompetitors.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {t("NoCompletedCompetitorsYet")}
          </div>
        ) : (
          [...doneCompetitors].map((competitor, index) => (
            <DoneCompetitorCard
              key={competitor.id}
              index={index}
              competitor={competitor}
              doneCompetitors={doneCompetitors}
              onReturn={handleReturn}
              isPending={pendingIds.has(competitor.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default DoneCompetitorsList;
