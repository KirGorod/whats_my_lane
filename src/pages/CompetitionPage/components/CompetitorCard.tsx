import { ArrowBigRight, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { useAuth } from "../../../context/AuthContext";
import { getBadgeColor } from "../../../utils/getBadgeColor";
import { Badge } from "../../../components/ui/badge";
import { useTranslation } from "react-i18next";

type Competitor = {
  id: string;
  name: string;
  category: string;
};

export default function CompetitorCard({
  competitor,
  position,
  fillLaneWithCompetitor,
  removeCompetitor,
}: {
  competitor: Competitor;
  position?: number;
  fillLaneWithCompetitor: (c: Competitor) => void;
  removeCompetitor: (c: Competitor) => void;
}) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const displayNumber =
    typeof position === "number" ? position : competitor.orderRank;

  return (
    <div
      key={competitor.id}
      className="bg-slate-100 rounded-lg p-3 space-y-3 group transition-all duration-300"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 min-w-0">
          {displayNumber ? (
            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-xs shrink-0">
              #{displayNumber}
            </span>
          ) : null}
          <div className="font-medium text-gray-900 whitespace-normal">
            {competitor.name}
          </div>
        </div>

        <Badge className={getBadgeColor(competitor.category)}>
          {t(competitor.category)}
        </Badge>
      </div>

      {isAdmin && (
        <div className="max-h-20">
          <div className="flex justify-between gap-1 pt-2">
            <Button
              onClick={() => removeCompetitor(competitor)}
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-700"
              aria-label={`${t("Remove")} ${competitor.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => fillLaneWithCompetitor(competitor)}
              variant="ghost"
              size="icon"
              className="text-blue-500 hover:text-blue-700"
              aria-label={`${t("SendToLane")} ${competitor.name}`}
            >
              <ArrowBigRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
