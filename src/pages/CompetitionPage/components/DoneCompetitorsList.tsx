import { useState } from "react";
import { CheckCircle } from "lucide-react";
import DoneCompetitorCard from "./DoneCompetitorCard";
import { useTranslation } from "react-i18next";

const DoneCompetitorsList = ({
  doneCompetitors,
  returnDoneCompetitorToLane,
}) => {
  const { t } = useTranslation();
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

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="hidden lg:flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">
            {t("Done")} ({doneCompetitors.length})
          </h2>
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
