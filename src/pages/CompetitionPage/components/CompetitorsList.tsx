import { useState, useMemo } from "react";
import { useAuth } from "../../../context/AuthContext";
import AddCompetitorDialog from "./AddCompetitorDialog";
import UploadCompetitorsCSV from "./UploadCompetitorsCSV";
import {
  Users,
  Search,
  Plus,
  Trash2,
  ArrowBigRight,
  Upload,
} from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import CompetitorCard from "./CompetitorCard";

const CompetitorsList = ({
  exerciseId,
  competitors,
  removeCompetitor,
  addCompetitor,
  fillLaneWithCompetitor,
}) => {
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCompetitors = useMemo(() => {
    return competitors.filter((c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [competitors, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {/* Title */}
        <div className="hidden lg:flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">
            Competitors ({competitors.length})
          </h2>
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <AddCompetitorDialog
              addCompetitor={addCompetitor}
              triggerButtonClass="p-2 rounded-full hover:bg-gray-100"
              triggerIcon={<Plus className="w-5 h-5 text-blue-600" />}
            />
            <UploadCompetitorsCSV
              exerciseId={exerciseId}
              triggerButtonClass="p-2 rounded-full hover:bg-gray-100"
              triggerIcon={<Upload className="w-5 h-5 text-green-600" />}
            />
          </div>
        )}
      </div>

      {/* Search */}
      <div className="p-4 border-t border-gray-200">
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
          filteredCompetitors.map((competitor) => {
            return (
              <CompetitorCard
                key={competitor.id}
                competitor={competitor}
                fillLaneWithCompetitor={fillLaneWithCompetitor}
                removeCompetitor={removeCompetitor}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default CompetitorsList;
