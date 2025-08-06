import { ArrowBigRight, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { useAuth } from "../../../context/AuthContext";
import { getBadgeColor } from "../../../utils/getBadgeColor";
import { Badge } from "../../../components/ui/badge";

const CompetitorCard = ({
  competitor,
  fillLaneWithCompetitor,
  removeCompetitor,
}) => {
  const { isAdmin } = useAuth();
  return (
    <div
      key={competitor.id}
      className="bg-slate-100 rounded-lg p-3 space-y-3 group transition-all duration-300"
    >
      <div className="flex justify-between items-center">
        <div className="font-medium text-gray-900">{competitor.name}</div>

        <Badge className={getBadgeColor(competitor.category)}>
          {competitor.category}
        </Badge>
      </div>

      {isAdmin && (
        <div
          className="max-h-0 opacity-0 overflow-hidden 
                 group-hover:max-h-20 group-hover:opacity-100
                 transition-all duration-300 ease-in-out"
        >
          <div className="flex justify-between gap-1 pt-2">
            <Button
              onClick={() => removeCompetitor(index)}
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => fillLaneWithCompetitor(competitor)}
              variant="ghost"
              size="icon"
              className="text-blue-500 hover:text-blue-700"
            >
              <ArrowBigRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorCard;
