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
  orderRank?: number;
};

export default function CompetitorCard({
  competitor,
  position,
  onFill,
  onRemove,
  isPending = false,
}: {
  competitor: Competitor;
  position?: number;
  onFill: (c: Competitor) => void | Promise<void>;
  onRemove: (c: Competitor) => void | Promise<void>;
  isPending?: boolean;
}) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const displayNumber =
    typeof position === "number" ? position : competitor.orderRank;

  return (
    <div
      className={[
        "bg-slate-100 rounded-lg p-3 space-y-3 group transition-all duration-300",
        isPending ? "opacity-60 saturate-0" : "",
      ].join(" ")}
      aria-busy={isPending}
      aria-disabled={isPending}
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
              onClick={() => onRemove(competitor)}
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:pointer-events-none"
              aria-label={`${t("Remove")} ${competitor.name}`}
              disabled={isPending}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => onFill(competitor)}
              variant="ghost"
              size="icon"
              className="text-blue-500 hover:text-blue-700 disabled:opacity-50 disabled:pointer-events-none"
              aria-label={`${t("SendToLane")} ${competitor.name}`}
              disabled={isPending}
            >
              <ArrowBigRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
