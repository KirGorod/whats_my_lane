import { ArrowBigRight, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { useAuth } from "../../../context/AuthContext";
import { getBadgeColor } from "../../../utils/getBadgeColor";
import { Badge } from "../../../components/ui/badge";
import {
  Card,
  CardContent,
} from "../../../components/ui/card";
import { useTranslation } from "react-i18next";
import EditCompetitorDialog from "./EditCompetitorDialog";
import { cn } from "@/lib/utils";

type Competitor = {
  id: string;
  name: string;
  category: string;
  orderRank?: number;
};

export default function CompetitorCard({
  competitor,
  targetLaneId,
  onFill,
  onRemove,
  onUpdate,
  isPending = false,
}: {
  competitor: Competitor;
  targetLaneId?: number | null;
  onFill: (c: Competitor) => void | Promise<void>;
  onRemove: (c: Competitor) => void | Promise<void>;
  onUpdate: (
    c: Competitor,
    patch: Pick<Competitor, "name" | "category">
  ) => Promise<void> | void;
  isPending?: boolean;
}) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  return (
    <Card
      className={cn(
        "gap-0 py-0 shadow-sm transition-all duration-300",
        isPending && "opacity-60 saturate-0"
      )}
      aria-busy={isPending}
      aria-disabled={isPending}
      title={
        targetLaneId != null ? `${t("Lane")} ${targetLaneId}` : undefined
      }
    >
      <CardContent className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {targetLaneId != null ? (
              <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                #{targetLaneId}
              </span>
            ) : null}
            <div className="min-w-0 whitespace-normal font-medium text-foreground">
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
              <div className="flex gap-1">
                <Button
                  onClick={() => onRemove(competitor)}
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                  aria-label={`${t("Remove")} ${competitor.name}`}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <EditCompetitorDialog
                  competitor={competitor}
                  updateCompetitor={onUpdate}
                  disabled={isPending}
                />
              </div>
              <Button
                onClick={() => onFill(competitor)}
                variant="ghost"
                size="icon"
                className="text-primary hover:text-primary/80 disabled:pointer-events-none disabled:opacity-50"
                aria-label={`${t("SendToLane")} ${competitor.name}`}
                disabled={isPending}
              >
                <ArrowBigRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
