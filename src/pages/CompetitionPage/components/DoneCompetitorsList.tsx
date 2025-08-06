import { useAuth } from "../../../context/AuthContext";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { CheckCircle, RotateCcw } from "lucide-react";

const DoneCompetitorsList = ({
  doneCompetitors,
  returnDoneCompetitorToLane,
}) => {
  const { isAdmin } = useAuth();

  const getBadgeVariant = (category: string | null) => {
    if (!category) return "outline";
    switch (category) {
      case "H":
        return "default";
      case "R":
        return "secondary";
      case "N":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="hidden lg:flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">
            Done ({doneCompetitors.length})
          </h2>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {doneCompetitors.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No completed competitors yet
          </div>
        ) : (
          // Show most recent first
          [...doneCompetitors].reverse().map((competitor, index) => (
            <div
              key={`${competitor.id}-${index}`}
              className="bg-green-50 border border-green-200 rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-medium text-gray-900">
                    {competitor.name}
                  </div>
                  <Badge
                    variant={getBadgeVariant(competitor.category)}
                    className="mt-1"
                  >
                    {competitor.category}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  #{doneCompetitors.length - index}
                </div>
              </div>

              {isAdmin && (
                <Button
                  onClick={() => returnDoneCompetitorToLane(competitor)}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Return
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DoneCompetitorsList;
