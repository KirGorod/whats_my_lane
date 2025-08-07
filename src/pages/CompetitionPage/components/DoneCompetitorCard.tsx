import { ArrowBigLeft, ArrowBigRight, RotateCcw } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { useAuth } from "../../../context/AuthContext";
import { getBadgeColor } from "../../../utils/getBadgeColor";
import { Badge } from "../../../components/ui/badge";

const DoneCompetitorCard = ({
  competitor,
  index,
  doneCompetitors,
  returnDoneCompetitorToLane,
}) => {
  const { isAdmin } = useAuth();

  return (
    <div
      key={competitor.id}
      className="bg-slate-100 rounded-lg p-3 space-y-3 group transition-all duration-300"
    >
      <div className="flex justify-between items-center">
        <div className="flex gap-2 justify-center items-center">
          <div className="font-medium text-gray-900">{competitor.name}</div>
          <div className="text-xs text-gray-500">
            #{doneCompetitors.length - index}
          </div>
        </div>

        <Badge className={getBadgeColor(competitor.category)}>
          {competitor.category}
        </Badge>
      </div>

      {isAdmin && (
        <div className="max-h-20">
          <div className="flex justify-start gap-1 pt-2">
            <Button
              onClick={() => returnDoneCompetitorToLane(competitor)}
              variant="ghost"
              size="icon"
              className="text-blue-500 hover:text-blue-700"
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
