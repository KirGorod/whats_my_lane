import { ArrowBigLeft } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { useAuth } from "../../../context/AuthContext";
import { getBadgeColor } from "../../../utils/getBadgeColor";
import { Badge } from "../../../components/ui/badge";
import { useTranslation } from "react-i18next";

const DoneCompetitorCard = ({
  competitor,
  index,
  doneCompetitors,
  onReturn, // renamed for clarity
  isPending = false, // new prop
}) => {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  return (
    <div
      key={competitor.id}
      className={[
        "bg-slate-100 rounded-lg p-3 space-y-3 group transition-all duration-300",
        isPending ? "opacity-60 saturate-0" : "",
      ].join(" ")}
      aria-busy={isPending}
      aria-disabled={isPending}
    >
      <div className="flex justify-between items-center">
        <div className="flex gap-2 justify-center items-center">
          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-xs shrink-0">
            #{doneCompetitors.length - index}
          </span>
          <div className="font-medium text-gray-900">{competitor.name}</div>
        </div>

        <Badge className={getBadgeColor(competitor.category)}>
          {t(competitor.category)}
        </Badge>
      </div>

      {isAdmin && (
        <div className="max-h-20">
          <div className="flex justify-start gap-1 pt-2">
            <Button
              onClick={() => onReturn(competitor)}
              variant="ghost"
              size="icon"
              aria-label={`${t("ReturnToLane")} ${competitor.name}`}
              className="text-blue-500 hover:text-blue-700 disabled:opacity-50 disabled:pointer-events-none"
              disabled={isPending}
            >
              <ArrowBigLeft />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoneCompetitorCard;
