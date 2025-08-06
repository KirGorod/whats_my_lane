import { useState, useMemo } from "react";
import { useAuth } from "../../../context/AuthContext";
import AddCompetitorDialog from "./AddCompetitorDialog";
import UploadCompetitorsCSV from "./UploadCompetitorsCSV";
import { Users, Search } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";

const CompetitorsList = ({
  competitionId,
  competitors,
  removeCompetitor,
  addCompetitor,
  fillLaneWithCompetitor,
  getAvailableLanes,
}) => {
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCompetitors = useMemo(() => {
    return competitors.filter((c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [competitors, searchTerm]);

  const getBadgeVariant = (category: string) => {
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
        <div className="hidden lg:flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">
            Competitors ({competitors.length})
          </h2>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search competitors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredCompetitors.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchTerm
              ? "No competitors match your search"
              : "No competitors available"}
          </div>
        ) : (
          filteredCompetitors.map((competitor, index) => {
            const availableLanes = getAvailableLanes
              ? getAvailableLanes(competitor)
              : [];

            return (
              <div
                key={competitor.id}
                className="bg-gray-50 rounded-lg p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
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

                  {isAdmin && (
                    <div className="flex gap-2 text-xs">
                      <button
                        onClick={() => fillLaneWithCompetitor(competitor)}
                        className="text-green-500 hover:underline"
                      >
                        Fill Lane
                      </button>
                      <button
                        onClick={() => removeCompetitor(index)}
                        className="text-blue-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Lane buttons */}
                {availableLanes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {availableLanes.slice(0, 8).map((lane) => (
                      <Button
                        key={lane.id}
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs"
                        onClick={() =>
                          fillLaneWithCompetitor(competitor, lane.id)
                        }
                      >
                        <span className="lg:hidden">{lane.id}</span>
                        <span className="hidden lg:inline">Lane {lane.id}</span>
                      </Button>
                    ))}
                    {availableLanes.length > 8 && (
                      <span className="text-xs text-gray-500 self-center">
                        +{availableLanes.length - 8} more
                      </span>
                    )}
                  </div>
                )}

                {availableLanes.length === 0 && (
                  <div className="text-xs text-gray-500">
                    No available lanes
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <div className="p-4 border-t border-gray-200 space-y-2">
          <AddCompetitorDialog addCompetitor={addCompetitor} />
          <UploadCompetitorsCSV competitionId={competitionId} />
        </div>
      )}
    </div>
  );
};

export default CompetitorsList;
